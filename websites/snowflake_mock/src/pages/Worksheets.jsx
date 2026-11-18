import { useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Confirm, Dialog, Field, Missing, PageTitle, Pill, SiteLink, Table } from '../components/ui.jsx'
import { RunDetails, RunResult } from '../components/runs.jsx'
import { activity, byId, byName, byRecent, filterText, formatDate, list, transactionInfo, uid } from '../model.js'
import { selectedStatement } from '../sql.js'
import { useAccount } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'
import { defaultContext, runWorksheet, saveWorksheet, worksheetChanges, worksheetDraft } from '../worksheets.js'

const path = '/worksheets'
const detailLink = id => path + '/' + encodeURIComponent(id)

export function Worksheets() {
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('Untitled worksheet')
  const [error, setError] = useState('')
  const worksheets = list(state.worksheets)
  const matches = worksheets.filter(item => filterText(query, item.title, item.sql)).sort(sort === 'recent' ? byRecent : byName)

  function create(event) {
    event.preventDefault()
    const name = title.trim()
    if (!name) { setError('Enter a worksheet title.'); return }
    const id = uid('ws')
    commit(current => {
      const tx = transactionInfo(current)
      const item = {
        id, title: name, sql: '', context: defaultContext(current),
        ownerUserId: tx.actorUserId, createdAt: tx.createdAt, updatedAt: tx.createdAt,
      }
      return activity({ ...current, worksheets: [...list(current.worksheets), item] }, tx, 'worksheet.created', item)
    })
    setCreating(false)
    navigate(withSid(detailLink(id)))
  }
  return <>
    <PageTitle title="Worksheets" description="Write, run, and revisit SQL in your account."
      actions={<>
        <SiteLink className="button" to="/query-history">Query history</SiteLink>
        <button className="primary" onClick={() => { setTitle('Untitled worksheet'); setError(''); setCreating(true) }}>New worksheet</button>
      </>} />
    <div className="toolbar">
      <div className="search"><Field label="Search worksheets"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title or SQL" /></Field></div>
      <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="recent">Last updated</option><option value="name">Name</option>
      </select></Field>
    </div>
    <Table caption="Worksheets" columns={['Title', 'SQL', 'Owner', 'Last updated']}
      empty={!matches.length && (worksheets.length ? 'No worksheets match your search.' : 'No worksheets yet.')}>
      {matches.map(item => {
        const owner = byId(state.users, item.ownerUserId)
        return <tr key={item.id}>
          <td>{item.id ? <SiteLink to={detailLink(item.id)}>{item.title || 'Untitled worksheet'}</SiteLink> : item.title || '—'}</td>
          <td className="mono"><span className="sql-summary" title={item.sql}>{item.sql || '—'}</span></td>
          <td>{owner?.displayName ?? owner?.name ?? (item.ownerUserId ? 'Historical user' : '—')}</td>
          <td>{formatDate(item.updatedAt)}</td>
        </tr>
      })}
    </Table>
    <div className="list-summary">{matches.length} of {worksheets.length} worksheets</div>
    {creating && <Dialog title="New worksheet" onClose={() => setCreating(false)}>
      <form onSubmit={create} noValidate>
        <Field label="Title" error={error}><input autoFocus value={title} onFocus={event => event.target.select()} onChange={event => setTitle(event.target.value)} /></Field>
        <div className="form-actions"><button type="button" onClick={() => setCreating(false)}>Cancel</button><button className="primary">Create worksheet</button></div>
      </form>
    </Dialog>}
  </>
}

export function WorksheetDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const item = byId(state.worksheets, id)
  return item ? <WorksheetEditor key={id} item={item} /> : <Missing area="Worksheets" />
}

function ContextField({ label, items, value, onChange }) {
  const choices = list(items).filter(item => item.id)
  const unavailable = value && !byId(choices, value)
  return <Field label={label}><select value={value ?? ''} disabled={!choices.length && !value} onChange={event => onChange(event.target.value || null)}>
    <option value="">No {label.toLowerCase()} selected</option>
    {unavailable && <option value={value}>Unavailable {label.toLowerCase()}</option>}
    {[...choices].sort(byName).map(item => <option value={item.id} key={item.id}>{item.name ?? 'Unnamed ' + label.toLowerCase()}</option>)}
  </select></Field>
}

function WorksheetEditor({ item }) {
  const { state, commit } = useAccount()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => worksheetDraft(item))
  const [tab, setTab] = useState('results')
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const editor = useRef(null)
  const allowNavigation = useRef(false)
  const dirty = Object.keys(worksheetChanges(worksheetDraft(item), draft)).length > 0
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowNavigation.current &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  const database = byId(state.catalog, draft.context.databaseId)
  const runs = list(state.queryRuns).filter(run => run.worksheetId === item.id).reverse().sort(byRecent)
  const selectedRun = (selectedRunId && byId(runs, selectedRunId)) || runs[0]

  function setContext(key, value) {
    setDraft(previous => ({
      ...previous, context: { ...previous.context, [key]: value, ...(key === 'databaseId' && { schemaId: null }) },
    }))
  }

  function save(run = false) {
    setError('')
    let sql = ''
    if (run) {
      const { selectionStart, selectionEnd } = editor.current
      sql = selectedStatement(draft.sql, selectionStart, selectionEnd)
      if (!sql || /^[;\s]+$/.test(sql)) { setError('Enter or select a SQL statement before running.'); return }
    }
    const title = draft.title.trim()
    if (!title) { setError('Enter a worksheet title before saving.'); return }
    const nextDraft = { ...draft, title }
    commit(current => {
      const target = byId(current.worksheets, item.id)
      if (!target) return current
      const tx = transactionInfo(current)
      return run ? runWorksheet(current, tx, target, nextDraft, sql) : saveWorksheet(current, tx, target, nextDraft)
    })
    setDraft(nextDraft)
    if (run) { setSelectedRunId(null); setTab('results') }
  }

  function shortcuts(event) {
    if (!event.ctrlKey && !event.metaKey) return
    if (event.key.toLowerCase() === 's' || event.key === 'Enter') {
      event.preventDefault()
      save(event.key === 'Enter')
    }
  }

  function remove() {
    commit(current => {
      const target = byId(current.worksheets, item.id)
      if (!target) return current
      return activity({ ...current, worksheets: list(current.worksheets).filter(worksheet => worksheet.id !== item.id) },
        transactionInfo(current), 'worksheet.deleted', target)
    })
    allowNavigation.current = true
    navigate(withSid(path))
  }

  return <>
    <PageTitle title={item.title || 'Untitled worksheet'} description="SQL worksheet" back={{ to: path, label: 'Worksheets' }}
      actions={<button className="destructive" onClick={() => setDeleting(true)}>Delete worksheet</button>} />
    <section className="editor-panel" aria-label="Worksheet editor" onKeyDown={shortcuts}>
      <div className="editor-controls">
        <div className="editor-heading">
          <Field label="Title"><input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></Field>
          <div className="actions">
            <span className={dirty ? 'pending' : 'muted'} role="status">{dirty ? 'Unsaved changes' : 'Saved'}</span>
            <button onClick={() => save()} title="Ctrl+S">Save</button>
            <button className="primary" onClick={() => save(true)} title="Ctrl+Enter">Run</button>
          </div>
        </div>
        <div className="context-fields">
          <ContextField label="Role" items={state.roles} value={draft.context.roleId} onChange={value => setContext('roleId', value)} />
          <ContextField label="Warehouse" items={state.warehouses} value={draft.context.warehouseId} onChange={value => setContext('warehouseId', value)} />
          <ContextField label="Database" items={state.catalog} value={draft.context.databaseId} onChange={value => setContext('databaseId', value)} />
          <ContextField label="Schema" items={database?.schemas} value={draft.context.schemaId} onChange={value => setContext('schemaId', value)} />
        </div>
      </div>
      <div className="editor-content">
        <Field label="SQL"><textarea ref={editor} className="sql-editor" value={draft.sql} wrap="off" spellCheck={false}
          placeholder="SELECT * FROM ORDERS LIMIT 10;"
          onChange={event => setDraft({ ...draft, sql: event.target.value })} /></Field>
        {error && <p className="notice error" role="alert">{error}</p>}
      </div>
    </section>
    <section className="panel result-panel" aria-label="Worksheet results">
      <div className="view-switch" role="group" aria-label="Worksheet result view">
        <button aria-pressed={tab === 'results'} onClick={() => setTab('results')}>Results</button>
        <button aria-pressed={tab === 'recent'} onClick={() => setTab('recent')}>Recent runs</button>
      </div>
      {tab === 'results' ? <RunResult run={selectedRun} /> :
        <Table caption="Recent runs" columns={['SQL', 'Status', 'Rows', 'Run time']} empty={!runs.length && 'No queries have run in this worksheet.'}>
          {runs.map(run => <tr key={run.id}>
            <td><button className="link-button sql-summary" onClick={() => { setSelectedRunId(run.id); setTab('results') }}>{run.sql ?? 'View results'}</button></td>
            <td><Pill value={run.status} /></td><td className="number">{run.rowCount ?? '—'}</td><td>{formatDate(run.createdAt)}</td>
          </tr>)}
        </Table>}
      {tab === 'results' && selectedRunId && selectedRun && <details className="run-inspect"><summary>Run details</summary><RunDetails run={selectedRun} showResult={false} /></details>}
    </section>
    {deleting && <Confirm title="Delete worksheet" action="Delete" danger description={'Delete ' + (item.title || 'this worksheet') + '? Its query history will be retained.'} submit={remove} onClose={() => setDeleting(false)} />}
    {blocker.state === 'blocked' && <Confirm title="Discard unsaved changes?" action="Discard changes"
      description="Changes to the worksheet title, SQL, or context will be lost." danger
      submit={() => { setDraft(worksheetDraft(item)); blocker.proceed() }} onClose={() => blocker.reset()} />}
  </>
}
