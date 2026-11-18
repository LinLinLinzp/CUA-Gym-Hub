import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LocalLink, entityPath, list, matches, record, replace, useLocalNavigate, useWorkspace, without } from './workspace.jsx'
import { Badge, Button, DataGrid, Dialog, Empty, Field, Filter, Icon, PageHead, Pager, Search, Toggle } from './ui.jsx'
import { checkKey, compareValues, defaultExpressions, defaultFor, displayValue, identifier, inputValue, makeColumn, parseValue, types } from './tableTypes.js'

const root = '/tables'
const qualify = table => `${table.schema || 'public'}.${table.name || table.id}`
const freshColumn = overrides => ({ name: '', type: 'text', nullable: true, primaryKey: false, defaultText: '', defaultExpression: '', ...overrides })
const starterColumns = () => [
  freshColumn({ name: 'id', type: 'bigint', nullable: false, primaryKey: true, defaultExpression: 'identity' }),
  freshColumn({ name: 'created_at', type: 'timestamptz', nullable: false, defaultExpression: 'now()' }),
]
const unique = (records, name, message) => {
  if (records.some(record => record.name?.toLowerCase() === name.toLowerCase())) throw new Error(message)
}

export function setRls(commit, id, rlsEnabled) {
  return commit((state, meta) => {
    const table = list(state.tables).find(item => item.id === id)
    const updated = { ...table, rlsEnabled, actorId: meta.actorId, updatedAt: meta.updatedAt }
    return record({ tables: replace(state.tables, id, updated) }, 'table.rls_updated', id, { tableId: id }, { rlsEnabled })
  }, rlsEnabled ? 'Row-level security enabled.' : 'Row-level security disabled.')
}

export function Tables() {
  const { tableId } = useParams()
  const [params, setParams] = useSearchParams()
  const schema = params.get('schema') || ''
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const { state } = useWorkspace()
  const tables = list(state.tables)
  const schemas = [...new Set(tables.map(table => table.schema || 'public'))].sort()
  if (schema && !schemas.includes(schema)) schemas.push(schema)
  const filtered = tables.filter(table => (!schema || (table.schema || 'public') === schema) && matches(query, table.name, table.schema, table.description))
  const table = tableId ? tables.find(item => item.id === tableId) : filtered[0]
  const schemaQuery = schema ? `?schema=${encodeURIComponent(schema)}` : ''
  return <>
    <PageHead eyebrow="Database" title="Tables" description="Browse project tables, inspect column definitions, and manage records.">
      <Button variant="primary" icon="plus" onClick={() => setEditor('create')}>New table</Button>
    </PageHead>
    <div className="split">
      <aside className="panel master" aria-label="Table list">
        <div className="master-tools"><div className="master-heading"><h2>Table list</h2><span>{filtered.length}</span></div>
          <Search title="Search tables" value={query} onChange={setQuery} />
          <Filter title="Schema" value={schema} options={[[ '', 'All schemas'], ...schemas]} onChange={next => {
            const updated = new URLSearchParams(params)
            if (next) updated.set('schema', next)
            else updated.delete('schema')
            setParams(updated, { replace: true })
          }} />
        </div>
        <div className="master-items">{filtered.length ? filtered.map(item =>
          <LocalLink key={item.id} to={entityPath(root, item.id) + schemaQuery} className={item.id === table?.id ? 'selected' : ''}
            aria-current={item.id === table?.id ? 'page' : undefined}>
            <Icon name="tables" /><span><strong>{item.name || item.id}</strong><small>{item.schema || 'public'}</small></span>
          </LocalLink>
        ) : <Empty title="No tables found">Change the filters or create a table.</Empty>}</div>
      </aside>
      {table ? <TableDetail key={table.id} table={table} back={root + schemaQuery} /> : <section className="panel">
        <Empty title={tableId ? 'Table unavailable' : 'No table selected'}>
          {tableId ? <LocalLink to={root + schemaQuery}>Return to tables</LocalLink> : 'Create a table or change the list filters.'}
        </Empty>
      </section>}
    </div>
    {editor === 'create' && <TableEditor schemas={schemas} initialSchema={schema || 'public'} close={() => setEditor(null)} />}
  </>
}

function TableDetail({ table, back }) {
  const { state, commit, reportError } = useWorkspace()
  const navigate = useLocalNavigate()
  const [view, setView] = useState('Data')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState(null)
  const [editor, setEditor] = useState(null)
  const columns = list(table.columns)
  const rows = list(state.rows).filter(row => row.tableId === table.id)
  const policies = list(state.policies).filter(policy => policy.targetType === 'table' && policy.targetId === table.id)
  const filtered = rows.filter(row => !query.trim() || matches(query, row.id, ...Object.values(row.values || {}).map(displayValue)))
  const sortColumn = columns.find(column => column.id === sort?.id)
  if (sortColumn) filtered.sort((a, b) => sort.direction * compareValues(a.values?.[sort.id], b.values?.[sort.id], sortColumn.type))
  const pageSize = 12
  const activePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const close = () => setEditor(null)

  async function deleteTable() {
    await commit(current => record({
      tables: without(current.tables, table.id),
      rows: list(current.rows).filter(row => row.tableId !== table.id),
      policies: list(current.policies).filter(policy => policy.targetType !== 'table' || policy.targetId !== table.id),
    }, 'table.deleted', table.id, { tableId: table.id }, {
      schema: table.schema || 'public', name: table.name, rowIds: rows.map(row => row.id), policyIds: policies.map(policy => policy.id),
    }), 'Table deleted.')
    navigate(back, { replace: true })
  }

  async function deleteRow(row) {
    await commit(current => record({ rows: without(current.rows, row.id) }, 'row.deleted', row.id, { tableId: table.id, rowId: row.id }, { values: row.values || {} }), 'Row deleted.')
  }

  return <section className="panel detail" aria-label={qualify(table)}>
    <div className="panel-heading">
      <div><div className="eyebrow">{table.schema || 'public'} schema</div><h2 className="mono">{table.name || table.id}</h2>
        {table.description && <p>{table.description}</p>}
      </div>
      <div className="actions"><Button onClick={() => setEditor({ kind: 'editTable' })}>Edit table</Button>
        <Button variant="danger-outline" onClick={() => setEditor({ kind: 'deleteTable' })}>Delete table</Button>
      </div>
    </div>
    <div className="detail-bar"><div className="tabs" aria-label="Table views">
      {['Data', 'Columns'].map(tab => <button key={tab} type="button" aria-pressed={tab === view} onClick={() => setView(tab)}>{tab}</button>)}
    </div><Toggle title="Row-level security (RLS)" checked={table.rlsEnabled} onChange={value => setRls(commit, table.id, value).catch(reportError)} /></div>
    {view === 'Data' ? <>
      <div className="toolbar">
        <Search title="Search rows" value={query} onChange={value => { setQuery(value); setPage(0) }} />
        <span className="result-count">{filtered.length} {filtered.length === 1 ? 'row' : 'rows'}</span>
        <Button variant="primary" icon="plus" onClick={() => setEditor({ kind: 'row' })}>Insert row</Button>
      </div>
      {filtered.length ? <>
        <DataGrid title={`Rows in ${table.name}`}><thead><tr>{columns.map(column => {
          const sorted = sortColumn?.id === column.id
          return <th key={column.id} scope="col" aria-sort={sorted ? sort.direction === 1 ? 'ascending' : 'descending' : undefined}>
            <button type="button" className="sort" onClick={() => { setSort({ id: column.id, direction: sorted ? -sort.direction : 1 }); setPage(0) }}>
              <strong>{column.name || column.id}{sorted && (sort.direction === 1 ? ' ↑' : ' ↓')}</strong><small>{column.type || 'text'}</small>
            </button>
          </th>
        })}<th scope="col">Actions</th></tr></thead>
          <tbody>{filtered.slice(activePage * pageSize, (activePage + 1) * pageSize).map(row => <tr key={row.id}>
            {columns.map(column => <td className={`mono cell-value ${row.values?.[column.id] == null ? 'null' : ''}`} key={column.id}>{displayValue(row.values?.[column.id])}</td>)}
            <td><div className="row-actions"><Button variant="quiet" onClick={() => setEditor({ kind: 'row', row })}>Edit row</Button>
              <Button variant="quiet destructive" onClick={() => setEditor({ kind: 'deleteRow', row })}>Delete row</Button></div></td>
          </tr>)}</tbody>
        </DataGrid>
        <Pager total={filtered.length} page={activePage} pageSize={pageSize} onChange={setPage} />
      </> : <Empty title={query.trim() ? 'No matching rows' : 'No rows yet'}>{query.trim() ? 'Try another search.' : 'Insert a row to populate this table.'}</Empty>}
    </> : <>
      <div className="toolbar"><span className="result-count">{columns.length} columns</span>
        <Button variant="primary" icon="plus" onClick={() => setEditor({ kind: 'column' })}>Add column</Button></div>
      {columns.length ? <DataGrid title={`Columns in ${table.name}`}><thead><tr>
        <th>Name</th><th>Type</th><th>Constraints</th><th>Default</th><th>Actions</th>
      </tr></thead><tbody>{columns.map(column => <tr key={column.id}>
        <td className="mono">{column.name || column.id}</td><td className="mono">{column.type || 'text'}</td>
        <td>{column.primaryKey ? <Badge tone="info">Primary key</Badge> : column.nullable === false ? 'Required' : 'Nullable'}</td>
        <td className="mono">{column.defaultExpression || (column.defaultValue == null ? '—' : displayValue(column.defaultValue))}</td>
        <td><Button variant="quiet" onClick={() => setEditor({ kind: 'column', column })}>Rename column</Button></td>
      </tr>)}</tbody></DataGrid> : <Empty title="No columns defined">Add a column to define a record field.</Empty>}
    </>}
    {editor?.kind === 'editTable' && <TableEditor table={table} close={close} />}
    {editor?.kind === 'column' && <ColumnEditor table={table} column={editor.column} close={close} />}
    {editor?.kind === 'row' && <RowEditor table={table} row={editor.row} close={close} />}
    {editor?.kind === 'deleteTable' && <Dialog title="Delete table" confirm danger onClose={close} onSubmit={deleteTable} submitLabel="Delete table">
      <p>Delete <strong className="mono">{qualify(table)}</strong>, its {rows.length} {rows.length === 1 ? 'row' : 'rows'}, and {policies.length} {policies.length === 1 ? 'policy' : 'policies'}?</p>
      {!!rows.length && <div className="delete-preview">{rows.slice(0, 3).map(row => <code key={row.id}>{row.id}</code>)}{rows.length > 3 && <span>and {rows.length - 3} more</span>}</div>}
    </Dialog>}
    {editor?.kind === 'deleteRow' && <Dialog title="Delete row" confirm danger onClose={close} onSubmit={() => deleteRow(editor.row)} submitLabel="Delete row">
      <p>Delete this row from <strong>{qualify(table)}</strong>?</p>
      <dl className="properties">{columns.slice(0, 6).map(column => <React.Fragment key={column.id}>
        <dt>{column.name}</dt><dd className="mono">{displayValue(editor.row.values?.[column.id])}</dd>
      </React.Fragment>)}</dl><code>{editor.row.id}</code>
    </Dialog>}
  </section>
}

function ColumnFields({ draft, onChange, index }) {
  const edit = patch => onChange({ ...draft, ...patch })
  return <fieldset className="column-fields">
    <legend>{index == null ? 'Column definition' : `Column ${index + 1}`}</legend>
    <div className="field-pair">
      <Field title="Column name"><input value={draft.name} required onChange={event => edit({ name: event.target.value })} /></Field>
      <Field title="Type"><select value={draft.type} onChange={event => edit({ type: event.target.value, defaultExpression: '' })}>
        {types.map(type => <option key={type}>{type}</option>)}
      </select></Field>
    </div>
    <div className="actions"><Toggle title="Primary key" checked={draft.primaryKey} onChange={checked => edit({ primaryKey: checked, nullable: checked ? false : draft.nullable })} />
      {!draft.primaryKey && <Toggle title="Allow null" checked={draft.nullable} onChange={checked => edit({ nullable: checked })} />}</div>
    <Field title="Default expression"><select value={draft.defaultExpression} onChange={event => edit({ defaultExpression: event.target.value })}>
      <option value="">None</option>{defaultExpressions.map(expression => <option key={expression}>{expression}</option>)}
    </select></Field>
    {!draft.defaultExpression && <Field title="Default value"><input value={draft.defaultText} onChange={event => edit({ defaultText: event.target.value })} /></Field>}
  </fieldset>
}

function TableEditor({ table, schemas = [], initialSchema, close }) {
  const { commit } = useWorkspace()
  const navigate = useLocalNavigate()
  const [rlsEnabled, setRlsEnabled] = useState(true)
  const [columns, setColumns] = useState(() => starterColumns().map(column => ({ ...column, id: crypto.randomUUID() })))
  const [schema, setSchema] = useState(initialSchema || 'public')
  async function save(form) {
    const name = identifier(form.get('name'), 'Table name')
    const description = form.get('description').trim()
    const id = table?.id || crypto.randomUUID()
    const targetSchema = table?.schema || schema
    const definitions = table ? null : columns.map(makeColumn)
    if (definitions && new Set(definitions.map(column => column.name.toLowerCase())).size !== definitions.length) throw new Error('Column names must be unique within a table.')

    await commit((state, meta) => {
      const records = list(state.tables)
      unique(records.filter(item => (item.schema || 'public') === targetSchema && item.id !== id), name, 'A table with this name already exists in this schema.')
      const next = table
        ? { ...records.find(item => item.id === id), name, description, actorId: meta.actorId, updatedAt: meta.updatedAt }
        : { id, schema: targetSchema, name, description, rlsEnabled, columns: definitions, ...meta }
      return record({ tables: table ? replace(records, id, next) : [...records, next] },
        table ? 'table.updated' : 'table.created', id, { tableId: id }, { schema: targetSchema, name, description })
    }, table ? 'Table details saved.' : 'Table created.')
    if (!table) navigate(`${entityPath(root, id)}?schema=${encodeURIComponent(targetSchema)}`)
  }
  const schemaOptions = [...new Set(['public', 'operations', 'reporting', ...schemas])]
  return <Dialog title={table ? 'Edit table' : 'New table'} onClose={close} onSubmit={save} submitLabel={table ? 'Save changes' : 'Create table'}>
    {!table && <Field title="Schema"><select value={schema} onChange={event => setSchema(event.target.value)}>
      {schemaOptions.map(item => <option key={item}>{item}</option>)}
    </select></Field>}
    <Field title="Table name"><input name="name" defaultValue={table?.name || ''} required maxLength={63} /></Field>
    <Field title="Description"><textarea name="description" defaultValue={table?.description || ''} rows="3" /></Field>
    {!table && <>
      <Toggle title="Enable row-level security (RLS)" checked={rlsEnabled} onChange={setRlsEnabled} />
      <h3>Columns</h3>
      {columns.map((column, index) => <div key={column.id}>
        <ColumnFields draft={column} index={index} onChange={next => setColumns(items => replace(items, column.id, next))} />
        <Button aria-label={`Remove column ${index + 1}`} variant="quiet destructive" disabled={columns.length === 1} onClick={() => setColumns(items => without(items, column.id))}>Remove column</Button>
      </div>)}
      <Button icon="plus" onClick={() => setColumns(items => [...items, freshColumn({ id: crypto.randomUUID() })])}>Add column</Button>
    </>}
  </Dialog>
}

function ColumnEditor({ table, column, close }) {
  const { commit } = useWorkspace()
  const [draft, setDraft] = useState(() => freshColumn())
  async function save(form) {
    const next = column ? { ...column, name: identifier(form.get('name'), 'Column name') } : makeColumn(draft)
    const backfillText = form.get('backfill') || ''
    await commit((state, meta) => {
      const current = list(state.tables).find(item => item.id === table.id)
      const columns = list(current.columns)
      unique(columns.filter(item => item.id !== next.id), next.name, 'A column with this name already exists.')
      const definitions = column ? replace(columns, next.id, next) : [...columns, next]
      const changes = { tables: replace(state.tables, table.id, { ...current, columns: definitions, actorId: meta.actorId, updatedAt: meta.updatedAt }) }
      const rowIds = []
      if (!column) {
        const accumulated = []
        const explicit = backfillText.trim() ? parseValue(backfillText, next.type, next.name) : undefined
        const updated = list(state.rows).map(row => {
          if (row.tableId !== table.id) return row
          const value = explicit !== undefined ? explicit : defaultFor(next, accumulated, meta.createdAt)
          if (value == null && next.nullable === false) throw new Error('Supply a backfill or default for an existing row in this required column.')
          const values = { ...row.values, [next.id]: value }
          checkKey(definitions, values, accumulated)
          const result = { ...row, values, actorId: meta.actorId, updatedAt: meta.updatedAt }
          accumulated.push(result)
          rowIds.push(row.id)
          return result
        })
        if (rowIds.length) changes.rows = updated
      }
      return record(changes, column ? 'column.renamed' : 'column.added', next.id, { tableId: table.id, columnId: next.id },
        column ? { fromName: column.name, toName: next.name } : { name: next.name, rowIds })
    }, column ? 'Column renamed.' : 'Column added.')
  }
  return <Dialog title={column ? 'Rename column' : 'Add column'} onClose={close} onSubmit={save} submitLabel={column ? 'Save name' : 'Add column'}>
    {column ? <Field title="Column name"><input required name="name" defaultValue={column.name} /></Field> : <>
      <ColumnFields draft={draft} onChange={setDraft} />
      <Field title="Backfill value" note="Applies to existing rows. Leave empty to use the column default."><input name="backfill" /></Field>
    </>}
  </Dialog>
}

function RowEditor({ table, row, close }) {
  const { commit } = useWorkspace()
  const columns = list(table.columns)
  async function save(form) {
    const id = row?.id || crypto.randomUUID()
    await commit((state, meta) => {
      const rows = list(state.rows)
      const existing = rows.filter(item => item.tableId === table.id && item.id !== id)
      const values = { ...row?.values }
      for (const [index, column] of columns.entries()) {
        const input = form.get(`value-${index}`)
        const setNull = form.has(`null-${index}`)
        const edited = row && row.values?.[column.id] != null
        let value = null
        if (!setNull && input !== '') value = parseValue(input, column.type, column.name)
        if (!setNull && input === '' && edited && column.type === 'text') value = ''
        if (!setNull && input === '' && !row) value = defaultFor(column, existing, meta.createdAt)
        if (value == null && (column.nullable === false || column.primaryKey)) throw new Error(`${column.name} is required.`)
        values[column.id] = value
      }
      checkKey(columns, values, existing)
      const next = row ? { ...row, values, actorId: meta.actorId, updatedAt: meta.updatedAt } : { id, tableId: table.id, values, ...meta }
      return record({ rows: row ? replace(rows, id, next) : [...rows, next] }, row ? 'row.updated' : 'row.inserted', id,
        { tableId: table.id, rowId: id }, { columnIds: columns.map(column => column.id) })
    }, row ? 'Row updated.' : 'Row inserted.')
  }
  return <Dialog title={row ? 'Edit row' : 'Insert row'} onClose={close} onSubmit={save} submitLabel={row ? 'Save row' : 'Insert row'}>
    <p className="mono">{qualify(table)}</p>
    {columns.map((column, index) => <RowField key={column.id} column={column} index={index} row={row} />)}
    {!columns.length && <p>This table accepts an empty row.</p>}
  </Dialog>
}

function RowField({ column, row, index }) {
  const existing = row?.values?.[column.id]
  const name = `value-${index}`
  const optional = !column.primaryKey && column.nullable !== false
  const [setNull, setSetNull] = useState(false)
  const initial = inputValue(existing, column.type)
  const note = [column.type || 'text', optional ? 'nullable' : 'required', !row && (column.defaultExpression || column.defaultValue != null) ? `default ${column.defaultExpression || displayValue(column.defaultValue)}` : ''].filter(Boolean).join(' · ')
  const props = { name, defaultValue: initial, disabled: setNull }
  const dateTypes = { date: 'date', timestamp: 'datetime-local', timestamptz: 'datetime-local' }
  return <div className="row-field"><Field title={column.name || column.id} note={note}>
    {['boolean', 'bool'].includes(column.type) ? <select {...props}><option value="">—</option><option value="true">True</option><option value="false">False</option></select>
      : ['jsonb', 'json'].includes(column.type) ? <textarea {...props} rows="3" />
      : <input {...props} type={dateTypes[column.type] || 'text'} step={dateTypes[column.type] === 'datetime-local' ? '0.001' : undefined}
        inputMode={['integer', 'bigint'].includes(column.type) ? 'numeric' : column.type === 'numeric' ? 'decimal' : undefined} />}
  </Field>{optional && <label className="toggle"><input type="checkbox" name={`null-${index}`} checked={setNull} onChange={event => setSetNull(event.target.checked)} />Set {column.name || column.id} to NULL</label>}</div>
}
