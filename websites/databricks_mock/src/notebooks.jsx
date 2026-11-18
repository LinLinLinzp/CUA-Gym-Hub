import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { fixtureOutput, languages } from './data/seed.js'
import { activity, changeRecord, created, dateLabel, find, list, matches, newest, pathFor, person, routeId, stamp, uid } from './model.js'
import { Confirm, Dialog, FormActions, Header, Missing, Output, SiteLink, Status, Table, sections, useSiteNavigate } from './ui.jsx'

const section = sections.workspace
const notebookUrl = (id) => section.to + '/notebooks/' + routeId(id)
const notebookName = (nb) => nb.name ?? 'Untitled notebook'
const defaultLanguage = (nb) => nb.language ?? 'python'
const newCell = (language, kind = 'code') => ({ id: uid('cell'), kind, language: kind === 'code' ? language : null, source: '' })

function LanguageOptions() {
  return Object.entries(languages).map(([key, name]) => <option key={key} value={key}>{name}</option>)
}

function NotebookForm({ notebook, mode, close, discardDraft }) {
  const { apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [name, setName] = useState(mode === 'duplicate' ? notebookName(notebook) + ' copy' : notebook?.name ?? '')
  const [folder, setFolder] = useState(notebook?.folder ?? '/Shared')
  const [language, setLanguage] = useState(notebook ? defaultLanguage(notebook) : 'python')
  const [error, setError] = useState('')
  const title = { create: 'New notebook', duplicate: 'Duplicate notebook', rename: 'Rename notebook', language: 'Change default language' }[mode]
  function submit(event) {
    event.preventDefault()
    if (mode !== 'language' && !name.trim()) return setError('Enter a notebook name.')
    if (mode !== 'language' && name.includes('/')) return setError('Enter a name without a slash.')
    if (mode === 'rename' || mode === 'language') {
      const changes = mode === 'rename' ? { name: name.trim() } : { language }
      apply((state, context) => changeRecord(state, 'notebooks', notebook, changes, context, 'notebook',
        mode === 'rename' ? 'renamed' : 'language_changed'))
      close()
      return
    }
    if (!folder.trim().startsWith('/')) return setError('Enter a folder path starting with /.')
    const id = uid('nb')
    apply((state, context) => {
      const record = { id, name: name.trim(), folder: folder.trim().replace(/\/+$/, '') || '/', language,
        ...created(context), clusterId: null, cells: mode === 'duplicate'
          ? list(notebook.cells).map((cell) => ({ ...cell, id: uid('cell') }))
          : [newCell(language)] }
      return { ...state, notebooks: [...list(state.notebooks), record],
        activity: activity(state, context, 'notebook', record, mode === 'duplicate' ? 'duplicated' : 'created',
          mode === 'duplicate' ? { sourceNotebookId: notebook.id } : {}, notebook?.id ?? null) }
    })
    discardDraft?.()
    close()
    navigate(notebookUrl(id))
  }
  return <Dialog title={title} onClose={close}><form onSubmit={submit}>
    {mode !== 'language' && <label>Notebook name<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></label>}
    {mode === 'create' && <label>Folder<input required value={folder} onChange={(e) => setFolder(e.target.value)} /></label>}
    {(mode === 'create' || mode === 'language') && <label>Default language
      <select autoFocus={mode === 'language'} value={language} onChange={(e) => setLanguage(e.target.value)}><LanguageOptions /></select></label>}
    {mode === 'duplicate' && <p className="muted">The copy will be saved in {folder}.</p>}
    {discardDraft && <p className="notice">The copy uses saved cells. Continuing will discard your unsaved edits.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <FormActions close={close} label={{ create: 'Create notebook', duplicate: 'Duplicate', rename: 'Rename', language: 'Save language' }[mode]} />
  </form></Dialog>
}

export function NotebookList() {
  const { state } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(params.get('new') === 'notebook')
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [sort, setSort] = useState('modified')
  const rows = list(state.notebooks).filter((nb) => matches(pathFor(nb), query) && (!language || defaultLanguage(nb) === language))
    .sort((a, b) => sort === 'modified' ? (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') : notebookName(a).localeCompare(notebookName(b)))
  function close() {
    setCreating(false)
    if (params.has('new')) {
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }
  return <>
    <Header title="Workspace" description="Browse and edit notebooks across your workspace.">
      <button className="primary" onClick={() => setCreating(true)}>+ New notebook</button>
    </Header>
    <div className="filters">
      <label>Search<input type="search" placeholder="Search by name or path" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="">All languages</option><LanguageOptions /></select></label>
      <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="modified">Recently modified</option><option value="name">Name A–Z</option></select></label>
    </div>
    <Table label="Notebooks" headers={['Notebook', 'Language', 'Folder', 'Owner', 'Compute', 'Modified']} empty="No notebooks match your view."
      rows={rows.map((nb) => {
        const cluster = find(state.clusters, nb.clusterId)
        return <tr key={nb.id}><td><SiteLink to={notebookUrl(nb.id)}>{notebookName(nb)}</SiteLink></td>
          <td>{languages[defaultLanguage(nb)] ?? defaultLanguage(nb)}</td><td>{nb.folder ?? '/'}</td><td>{person(state, nb.ownerId)}</td>
          <td>{cluster ? <SiteLink to={'/compute/' + routeId(cluster.id)}>{cluster.name ?? 'Unnamed cluster'}</SiteLink> : nb.clusterId ? 'Unavailable' : 'Detached'}</td>
          <td>{dateLabel(nb.updatedAt)}</td></tr>
      })} />
    {creating && <NotebookForm mode="create" close={close} />}
  </>
}

function AttachDialog({ state, notebook, close, attach }) {
  const clusters = list(state.clusters)
  const running = clusters.filter((cluster) => cluster.status === 'running')
  const stopped = clusters.filter((cluster) => cluster.status !== 'running')
  const [clusterId, setClusterId] = useState(running.some((cluster) => cluster.id === notebook.clusterId) ? notebook.clusterId : '')
  return <Dialog title="Attach compute" onClose={close}><form onSubmit={(e) => {
    e.preventDefault()
    if (running.some((cluster) => cluster.id === clusterId)) attach(clusterId)
  }}>
    <label>Running cluster<select autoFocus required value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
      <option value="">Choose a cluster</option>{running.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name ?? 'Unnamed cluster'} · {cluster.runtime ?? 'Runtime unavailable'}</option>)}
    </select></label>
    {!running.length && <p className="muted">No running clusters are available. <SiteLink to="/compute">Open Compute</SiteLink></p>}
    {stopped.length > 0 && <div className="compact"><strong>Stopped clusters</strong><ul>
      {stopped.map((cluster) => <li key={cluster.id}><SiteLink to={'/compute/' + routeId(cluster.id)}>{cluster.name ?? 'Unnamed cluster'}</SiteLink></li>)}
    </ul></div>}
    <FormActions close={close} label="Attach" disabled={!clusterId} />
  </form></Dialog>
}

export function NotebookEditor({ draft, setDraft }) {
  const { notebookId } = useParams()
  const { state } = useWorkspace()
  const notebook = find(state.notebooks, notebookId)
  return notebook ? <Editor notebook={notebook} draft={draft} setDraft={setDraft} /> : <Missing resource="Notebook" section={section} />
}

function Editor({ notebook, draft, setDraft }) {
  const { state, apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState('')
  const close = () => setModal('')
  const name = notebookName(notebook)
  const language = defaultLanguage(notebook)
  const cells = draft ?? list(notebook.cells)
  const cluster = find(state.clusters, notebook.clusterId)
  const jobs = list(state.jobs).filter((job) => list(job.tasks).some((task) => task.notebookId === notebook.id))
  const outputs = new Map()
  for (const run of newest(state.notebookRuns)) {
    if (run.notebookId !== notebook.id) continue
    for (const result of list(run.results)) {
      if (!outputs.has(result.cellId)) outputs.set(result.cellId, result.output)
    }
  }
  function persistCells(next, action, changes) {
    apply((world, context) => changeRecord(world, 'notebooks', notebook, { cells: next }, context, 'notebook', action, changes))
    setDraft(null)
    setNotice('Cells saved.')
  }
  function edit(cell, changes) {
    setDraft(cells.map((item) => item.id === cell.id ? { ...item, ...changes } : item))
    setNotice('')
  }
  function add(kind) {
    const cell = newCell(language, kind)
    persistCells([...cells, cell], 'cell_added', { cellId: cell.id, kind })
  }
  function move(from, to) {
    const next = [...cells]
    const [cell] = next.splice(from, 1)
    next.splice(to, 0, cell)
    persistCells(next, 'cell_moved', { cellId: cell.id, fromIndex: from, toIndex: to })
  }
  function attach(clusterId) {
    apply((world, context) => changeRecord(world, 'notebooks', notebook, { clusterId }, context, 'notebook', clusterId ? 'attached' : 'detached'))
    close()
    setNotice(clusterId ? 'Compute attached.' : 'Compute detached.')
  }
  function run(selectedId = null) {
    if (cluster?.status !== 'running') return setNotice('Attach a running cluster before running cells.')
    const runnable = cells.filter((cell) => cell.kind !== 'markdown' && (cell.source ?? '').trim() && (!selectedId || cell.id === selectedId))
    if (!runnable.length) return setNotice('There are no runnable code cells in this selection.')
    apply((world, context) => {
      const record = { id: uid('nbr'), notebookId: notebook.id, notebookName: name, clusterId: cluster.id,
        ...context, endedAt: context.createdAt, scope: selectedId ? 'cell' : 'all', status: 'succeeded',
        cellIds: runnable.map((cell) => cell.id), results: runnable.map((cell) => ({
          cellId: cell.id, language: cell.language ?? language, source: cell.source, status: 'succeeded',
          output: fixtureOutput(cell.language ?? language, cell.source),
        })) }
      return { ...world,
        notebookRuns: [...list(world.notebookRuns), record],
        ...(draft ? { notebooks: list(world.notebooks).map((item) => item.id === notebook.id ? { ...item, cells, ...stamp(context) } : item) } : {}),
        activity: activity(world, context, 'notebook', notebook, 'run_started', { cellIds: record.cellIds, clusterId: cluster.id, cellsSaved: Boolean(draft) }, record.id) }
    })
    setDraft(null)
    setNotice(selectedId ? 'Cell finished.' : runnable.length + ' code cells finished.')
  }
  function removeNotebook() {
    apply((world, context) => ({ ...world, notebooks: list(world.notebooks).filter((item) => item.id !== notebook.id),
      activity: activity(world, context, 'notebook', notebook, 'deleted') }))
    setDraft(null)
    navigate(section.to)
  }
  return <>
    <Header title={name} section={section} description={pathFor(notebook)}>
      <button onClick={() => setModal('rename')}>Rename</button>
      <button onClick={() => setModal('duplicate')}>Duplicate</button>
      <button onClick={() => setModal('delete')}>Delete notebook</button>
    </Header>
    <div className="panel pad toolbar filters">
      <div className="actions"><button onClick={() => setModal('language')}>Default language · {languages[language] ?? language}</button>
        <button onClick={() => setModal('attach')}>{notebook.clusterId ? 'Change compute' : 'Attach compute'}</button>
        {notebook.clusterId && <button onClick={() => attach(null)}>Detach</button>}
        {cluster ? <><SiteLink to={'/compute/' + routeId(cluster.id)}>{cluster.name ?? 'Unnamed cluster'}</SiteLink><Status value={cluster.status} /></>
          : <span className="muted">{notebook.clusterId ? 'Compute unavailable' : 'Detached'}</span>}
      </div>
      <div className="actions">
        {draft && <span role="status">Unsaved changes</span>}
        <button disabled={!draft} onClick={() => persistCells(cells, 'cells_saved', { cellIds: cells.map((cell) => cell.id) })}>Save changes</button>
        <button className="primary" onClick={() => run()}>Run all</button>
      </div>
    </div>
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="stack">
      {cells.map((cell, index) => {
        const markdown = cell.kind === 'markdown'
        const number = index + 1
        return <section className="panel cell" key={cell.id} aria-label={'Cell ' + number}>
          <div className="toolbar cell-head">
            <div className="actions"><span className="cell-index muted">{number}</span>
              <label className="inline-label">Type <select value={markdown ? 'markdown' : 'code'} onChange={(e) => edit(cell, {
                kind: e.target.value, language: e.target.value === 'markdown' ? null : language,
              })}><option value="code">Code</option><option value="markdown">Markdown</option></select></label>
              {!markdown && <span className="code">{languages[cell.language ?? language] ?? cell.language}</span>}
            </div>
            <div className="actions">
              {!markdown && <button onClick={() => run(cell.id)}>Run cell</button>}
              <button className="icon-btn" disabled={index === 0} aria-label={'Move cell ' + number + ' up'} onClick={() => move(index, index - 1)}>↑</button>
              <button className="icon-btn" disabled={index === cells.length - 1} aria-label={'Move cell ' + number + ' down'} onClick={() => move(index, index + 1)}>↓</button>
              <button onClick={() => persistCells(cells.filter((item) => item.id !== cell.id), 'cell_removed', { cellId: cell.id })}>Remove cell</button>
            </div>
          </div>
          <div className="cell-body">
            <textarea className="code" aria-label={'Cell ' + number + ' source'} value={cell.source ?? ''} spellCheck={false}
              onChange={(e) => edit(cell, { source: e.target.value })} onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey && !markdown) { e.preventDefault(); run(cell.id) }
              }} />
            {!markdown && outputs.has(cell.id) && <div className="cell-output"><small>Latest output</small><Output output={outputs.get(cell.id)} /></div>}
          </div>
        </section>
      })}
      {!cells.length && <div className="panel pad muted">Add a cell to start editing.</div>}
      <div className="actions"><button onClick={() => add('code')}>+ Code cell</button><button onClick={() => add('markdown')}>+ Markdown cell</button></div>
    </div>
    {['rename', 'duplicate', 'language'].includes(modal) && <NotebookForm notebook={notebook} mode={modal} close={close}
      discardDraft={modal === 'duplicate' && draft ? () => setDraft(null) : undefined} />}
    {modal === 'attach' && <AttachDialog state={state} notebook={notebook} close={close} attach={attach} />}
    {modal === 'delete' && <Confirm verb="Delete" name={name} close={close} submit={removeNotebook} blocked={jobs.length > 0}>
      {jobs.length ? <div><p>Remove this notebook from the following jobs before deleting it.</p><ul>{jobs.map((job) => (
        <li key={job.id}><SiteLink to={'/jobs/' + routeId(job.id)}>{job.name ?? 'Unnamed job'}</SiteLink></li>
      ))}</ul></div> : <p>Existing runs will remain in history. {draft && 'Unsaved edits will be discarded.'}</p>}
    </Confirm>}
  </>
}
