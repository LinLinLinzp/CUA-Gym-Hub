export const types = ['text', 'bigint', 'integer', 'numeric', 'boolean', 'uuid', 'date', 'timestamptz', 'jsonb']
export const defaultExpressions = ['identity', 'uuid', 'now()']
const integerTypes = ['bigint', 'integer', 'int8', 'int4', 'int2', 'smallint']
const numericTypes = ['numeric', 'decimal', 'float4', 'float8', 'real', 'double precision']
const dateTimeTypes = ['timestamptz', 'timestamp', 'timestamp with time zone', 'timestamp without time zone']
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function identifier(raw, title) {
  const name = raw.trim()
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(name)) {
    throw new Error(`${title} must start with a letter or underscore and contain up to 63 letters, digits, or underscores.`)
  }
  return name
}

export function parseValue(input, type, name) {
  const value = input.trim()
  const invalid = () => { throw new Error(`${name} needs a valid ${type} value.`) }
  if (integerTypes.includes(type)) {
    if (!/^[+-]?\d+$/.test(value)) invalid()
    const integer = BigInt(value)
    if (['bigint', 'int8'].includes(type)) {
      if (integer < -(2n ** 63n) || integer >= 2n ** 63n) invalid()
      const number = Number(integer)
      return Number.isSafeInteger(number) ? number : integer.toString()
    }
    const limit = ['smallint', 'int2'].includes(type) ? 32768n : 2147483648n
    if (integer < -limit || integer >= limit) invalid()
    return Number(integer)
  }
  if (numericTypes.includes(type)) {
    const number = Number(value)
    if (!Number.isFinite(number) || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) invalid()
    return number
  }
  if (type === 'boolean' || type === 'bool') {
    if (!['true', 'false'].includes(value)) invalid()
    return value === 'true'
  }
  if (type === 'uuid') {
    if (!uuidPattern.test(value)) invalid()
    return value.toLowerCase()
  }
  if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid()
    const day = new Date(`${value}T00:00Z`)
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) invalid()
    return value
  }
  if (dateTimeTypes.includes(type)) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) invalid()
    return date.toISOString()
  }
  if (type === 'jsonb' || type === 'json') {
    try { return JSON.parse(value) } catch { return invalid() }
  }
  return input
}

export function inputValue(value, type) {
  if (value == null) return ''
  if (type === 'json' || type === 'jsonb') return JSON.stringify(value)
  if (dateTimeTypes.includes(type)) {
    const time = new Date(value)
    if (!Number.isNaN(time.getTime())) {
      return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 23)
    }
  }
  return String(value)
}

export function defaultFor(column, rows, time) {
  switch (column.defaultExpression) {
    case 'uuid': return crypto.randomUUID()
    case 'now()': return column.type === 'date' ? time.slice(0, 10) : time
    case 'identity': {
      const highest = rows.reduce((maximum, row) => {
        const value = row.values?.[column.id]
        if (!/^[+-]?\d+$/.test(String(value))) return maximum
        const candidate = BigInt(value)
        return candidate > maximum ? candidate : maximum
      }, 0n)
      return parseValue(String(highest + 1n), column.type, column.name)
    }
    default: return column.defaultValue ?? null
  }
}

export function makeColumn(draft) {
  const { type, primaryKey, defaultText, defaultExpression } = draft
  const name = identifier(draft.name, 'Column name')
  const nullable = !primaryKey && draft.nullable
  if (defaultExpression === 'identity' && !integerTypes.includes(type)) throw new Error('Identity defaults require an integer type.')
  if (defaultExpression === 'uuid' && type !== 'uuid') throw new Error('UUID defaults require the uuid type.')
  if (defaultExpression === 'now()' && type !== 'date' && !dateTimeTypes.includes(type)) throw new Error('now() defaults require a date or timestamp type.')
  const defaultValue = defaultExpression || !defaultText.trim() ? null : parseValue(defaultText, type, name)
  return { id: draft.id || crypto.randomUUID(), name, type, nullable, primaryKey, defaultValue, ...(defaultExpression ? { defaultExpression } : {}) }
}

export function checkKey(columns, values, rows) {
  const key = columns.filter(column => column.primaryKey)
  if (!key.length) return
  const asKey = (column, value) => {
    if (value == null) return null
    if (integerTypes.includes(column.type)) {
      if (/^[+-]?\d+$/.test(String(value))) return BigInt(value).toString()
    }
    if (column.type === 'uuid') return String(value).toLowerCase()
    return JSON.stringify(value)
  }
  const candidate = key.map(column => asKey(column, values[column.id]))
  if (candidate.includes(null)) throw new Error('Primary key fields are required.')
  if (rows.some(row => key.every((column, index) => asKey(column, row.values?.[column.id]) === candidate[index]))) {
    throw new Error('That primary key already exists in this table.')
  }
}

export function compareValues(a, b, type) {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  if (integerTypes.includes(type) && /^[+-]?\d+$/.test(String(a)) && /^[+-]?\d+$/.test(String(b))) {
    return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return displayValue(a).localeCompare(displayValue(b), 'en', { numeric: true })
}

export function displayValue(value) {
  if (value == null) return 'NULL'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
