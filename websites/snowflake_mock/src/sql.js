import { byId, label, list } from './model.js'

function splitSql(sql, separator = ';') {
  const segments = []
  let start = 0
  let quote = ''
  let comment = ''
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const pair = sql.slice(i, i + 2)
    if (comment) {
      if (comment === 'line' && char === '\n') comment = ''
      if (comment === 'block' && pair === '*/') { comment = ''; i++ }
    } else if (quote) {
      if (char === quote && sql[i + 1] === quote) i++
      else if (char === quote) quote = ''
    } else if (pair === '--' || pair === '/*') {
      comment = pair === '--' ? 'line' : 'block'
      i++
    } else if (char === "'" || char === '"') {
      quote = char
    } else if (char === separator) {
      segments.push({ start, end: i, text: sql.slice(start, i) })
      start = i + 1
    }
  }
  segments.push({ start, end: sql.length, text: sql.slice(start) })
  return segments
}

function withoutComments(sql) {
  return sql.replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\r\n]*|\/\*[\s\S]*?\*\//g, token =>
    token.startsWith('--') || token.startsWith('/*') ? ' '.repeat(token.length) : token)
}

export function selectedStatement(sql, start, end) {
  if (start !== end) {
    const selected = sql.slice(start, end).trim()
    return withoutComments(selected).replaceAll(';', '').trim() ? selected : ''
  }
  const statements = splitSql(sql).flatMap(segment => {
    const content = withoutComments(segment.text)
    if (!content.trim()) return []
    return [{
      text: segment.text.trim(), start: segment.start + content.search(/\S/),
      end: segment.start + content.trimEnd().length,
    }]
  })
  return (statements.find(statement => start >= statement.start && start <= statement.end) ?? statements[0])?.text ?? ''
}

export function contextSnapshot(catalog, roles, warehouses, context) {
  const role = byId(roles, context.roleId)
  const warehouse = byId(warehouses, context.warehouseId)
  const database = byId(catalog, context.databaseId)
  const schema = byId(database?.schemas, context.schemaId)
  return {
    roleId: context.roleId ?? null, roleName: role?.name ?? null,
    warehouseId: context.warehouseId ?? null, warehouseName: warehouse?.name ?? null,
    databaseId: context.databaseId ?? null, databaseName: database?.name ?? null,
    schemaId: context.schemaId ?? null, schemaName: schema?.name ?? null,
  }
}

const sqlIdentifier = '[A-Z_][A-Z0-9_$]*'
const sqlAlias = '(?!(?:AS|FROM|WHERE|LIMIT|SELECT|ORDER|GROUP|HAVING|JOIN|UNION)\\b)' + sqlIdentifier
const ordersSyntax = new RegExp('^SELECT\\s+\\*\\s+FROM\\s+(?:(' + sqlIdentifier + ')\\s*\\.\\s*(' + sqlIdentifier + ')\\s*\\.\\s*)?ORDERS(?:\\s+LIMIT\\s+(\\d+))?$', 'i')
const expressionSyntax = new RegExp(
  "^\\s*(CURRENT_ROLE\\s*\\(\\s*\\)|CURRENT_WAREHOUSE\\s*\\(\\s*\\)|'(?:[^']|'')*'|[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?|TRUE|FALSE|NULL)(?:\\s+(?:AS\\s+)?(\"(?:[^\"]|\"\")+\"|" + sqlAlias + "))?\\s*$", 'i',
)

const failure = (code, message) => ({ columns: [], rows: [], error: { code, message } })
const result = (columns, rows) => ({ columns, rows, error: null })

function literal(expression, snapshot) {
  const [, token, alias] = expression
  const key = token.replace(/\s+/g, '').toUpperCase()
  const column = alias?.startsWith('"') ? alias.slice(1, -1).replaceAll('""', '"') : alias?.toUpperCase() ?? (token.startsWith("'") ? token : key)
  if (token.startsWith("'")) return [column, token.slice(1, -1).replaceAll("''", "'")]
  if (key === 'CURRENT_ROLE()') return [column, snapshot.roleName]
  if (key === 'CURRENT_WAREHOUSE()') return [column, snapshot.warehouseName]
  if (key === 'TRUE' || key === 'FALSE') return [column, key === 'TRUE']
  if (key === 'NULL') return [column, null]
  return [column, Number(token)]
}

export function executeSql(sql, state, context, snapshot) {
  const statement = withoutComments(sql).trim().replace(/;\s*$/, '').trim()
  if (/^SHOW\s+WAREHOUSES$/i.test(statement)) return result(['NAME', 'SIZE', 'STATUS', 'RUNNING', 'QUEUED'],
    list(state.warehouses).map(item => [item.name ?? null, item.size ?? null, item.status ?? null, item.running ?? null, item.queued ?? null]))
  if (/^SHOW\s+ROLES$/i.test(statement)) return result(['NAME', 'TYPE', 'OWNER', 'COMMENT'],
    list(state.roles).map(item => [item.name ?? null, item.type ?? null, item.ownerRoleId ? label(state.roles, item.ownerRoleId) : null, item.comment ?? null]))

  const orders = ordersSyntax.exec(statement)
  const select = /^SELECT\s+([\s\S]+)$/i.exec(statement)
  const expressions = select && !orders ? splitSql(select[1], ',').map(part => expressionSyntax.exec(part.text)) : []
  if (!orders && (!expressions.length || expressions.some(match => !match))) {
    return failure('UNSUPPORTED_SQL', 'Use a literal SELECT, CURRENT_ROLE() or CURRENT_WAREHOUSE(), SHOW WAREHOUSES, SHOW ROLES, or SELECT * FROM ORDERS with an optional LIMIT.')
  }

  const warehouse = byId(state.warehouses, context.warehouseId)
  if (!warehouse) return failure('WAREHOUSE_REQUIRED', 'Select an available warehouse in the worksheet toolbar, then run the statement again.')
  if (warehouse.status === 'SUSPENDED' && !warehouse.autoResume) {
    return failure('WAREHOUSE_SUSPENDED', 'Resume the warehouse or enable auto resume in its compute settings, then run the statement again.')
  }
  if (warehouse.status !== 'STARTED' && warehouse.status !== 'SUSPENDED') {
    return failure('WAREHOUSE_UNAVAILABLE', 'Select a warehouse with a known status, then run the statement again.')
  }

  let response
  if (orders) {
    const [, databaseName, schemaName, limit] = orders
    const database = databaseName ? list(state.catalog).find(item => item.name?.toUpperCase() === databaseName.toUpperCase()) : byId(state.catalog, context.databaseId)
    const schema = schemaName ? list(database?.schemas).find(item => item.name?.toUpperCase() === schemaName.toUpperCase()) : byId(database?.schemas, context.schemaId)
    const table = list(schema?.tables).find(item => item.name?.toUpperCase() === 'ORDERS')
    response = table ? result(list(table.columns), list(table.rows).slice(0, limit == null ? undefined : Number(limit))) :
      failure('ORDERS_NOT_FOUND', 'Select a database and schema containing ORDERS, or specify the full database.schema.ORDERS name.')
  } else {
    const cells = expressions.map(expression => literal(expression, snapshot))
    response = cells.some(([, value]) => typeof value === 'number' && !Number.isFinite(value)) ?
      failure('INVALID_LITERAL', 'Use a numeric literal within the supported range.') : result(cells.map(([name]) => name), [cells.map(([, value]) => value)])
  }
  return { ...response, resumeWarehouse: warehouse.status === 'SUSPENDED' }
}
