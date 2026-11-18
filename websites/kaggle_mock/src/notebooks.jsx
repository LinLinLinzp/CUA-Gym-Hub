import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  activity, canRead, createNotebook, entityPath, findEntity, getOwner, latestVersion, notebookDraft, replaceRecord, scopedRecords,
  useStore, versionsFor, withRecord,
} from './store.jsx'
import {
  AppLink, Art, Catalog, Empty, ErrorMessage, FormActions, Heading, Icon, Missing, Modal, Tags, Visibility,
  compareUpdated, count, date, languageName, titleOf, useAppNavigate,
} from './ui.jsx'

export function Notebooks() {
  const { state } = useStore()
  const records = scopedRecords(state, 'notebooks').map(record => {
    const owner = getOwner(state, record.ownerId)
    return { ...record, owner, search: [record.title, owner?.displayName, owner?.username, ...(record.tags ?? [])] }
  })
  return <Catalog label="Notebooks" type="code" description="Explore other analyses or build a notebook of your own." records={records}
    searchPlaceholder="Search notebooks" sortDefault="votes"
    actions={<AppLink className="button" to="/code/new"><Icon name="plus" size={18} />New Notebook</AppLink>}
    filters={[
      { key: 'language', label: 'Language', any: 'All languages', options: [['python', 'Python'], ['r', 'R']], match: (item, value) => item.language === value },
      { key: 'ownership', label: 'Ownership', any: 'All notebooks', options: [['mine', 'My Notebooks']], match: item => item.ownerId === state.account.id },
    ]}
    sorts={[[ 'votes', 'Most votes', (a, b) => (b.votes ?? 0) - (a.votes ?? 0) ], [ 'updated', 'Recently updated', compareUpdated ]]}
    render={(record, index) => <AppLink to={entityPath(state, 'code', record)} className="panel record-card" key={record.id}>
      <Art type="code" variant={index} /><div className="record-kicker">{languageName(record.language)}<Visibility item={record} /></div>
      <div><h3>{titleOf(record, 'Untitled notebook')}</h3><p>{record.owner?.displayName ?? record.owner?.username ?? 'Unknown owner'}</p>
        {record.summary && <p>{record.summary}</p>}</div>
      <Tags values={record.tags} /><div className="record-end"><span>{count(record.votes)} votes</span><span>Updated {date(record.updatedAt)}</span></div>
    </AppLink>} />
}

export function NewNotebook() {
  const { state, command } = useStore()
  const navigate = useAppNavigate()
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('python')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return setError('Enter a notebook title.')
    let created
    command(current => {
      created = createNotebook(current, { title, language })
      return created && withRecord(current, 'notebooks', created)
    })
    if (created) navigate(`${entityPath(state, 'code', created)}/edit`, { replace: true })
  }
  return <div className="form-page"><AppLink to="/code" className="breadcrumb">← Notebooks</AppLink>
    <Heading title="New Notebook" eyebrow="Kaggle Notebooks" type="code" description="Start with a private draft and a starter code cell." />
    <form className="panel stack" onSubmit={submit}>
      <label>Notebook title<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Language<select value={language} onChange={event => setLanguage(event.target.value)}><option value="python">Python</option><option value="r">R</option></select></label>
      <ErrorMessage error={error} /><FormActions submit="Create Notebook" onCancel={() => navigate('/code')} />
    </form>
  </div>
}

export function NotebookRoute({ edit = false }) {
  const { owner, slug } = useParams()
  const { state } = useStore()
  const notebook = findEntity(state, 'notebooks', owner, slug)
  if (!notebook || (edit && notebook.ownerId !== state.account.id)) return <Missing group="code" label="Notebook" />
  return edit ? <NotebookEditor key={notebook.id} notebook={notebook} initialDraft={notebookDraft(state, notebook)} />
    : <NotebookView key={notebook.id} notebook={notebook} />
}

function NotebookView({ notebook }) {
  const { state, command } = useStore()
  const navigate = useAppNavigate()
  const [selectedId, setSelectedId] = useState('')
  const [copy, setCopy] = useState(false)
  const [error, setError] = useState('')
  const versions = versionsFor(state.notebookVersions, 'notebookId', notebook.id)
  const latest = latestVersion(versions, notebook)
  const selected = versions.find(version => version.id === selectedId)
  const snapshot = selected ?? { ...notebook, ...notebookDraft(state, notebook) }
  const owner = getOwner(state, notebook.ownerId)
  const isOwner = notebook.ownerId === state.account.id
  const path = entityPath(state, 'code', notebook)
  function copyNotebook(event) {
    event.preventDefault()
    let created
    command(current => {
      created = createNotebook(current, { sourceId: notebook.id })
      return created && withRecord(current, 'notebooks', created)
    })
    if (created) navigate(`${entityPath(state, 'code', created)}/edit`)
    else setError('The source notebook is no longer available.')
  }
  return <>
    <AppLink to="/code" className="breadcrumb">← Notebooks</AppLink>
    <Heading eyebrow={languageName(notebook.language)} type="code" title={titleOf(snapshot, 'Untitled notebook')} description={notebook.summary}
      actions={<>{isOwner && <AppLink className="button" to={`${path}/edit`}>Edit Notebook</AppLink>}
        <button className={isOwner ? 'button secondary' : 'button'} onClick={() => { setError(''); setCopy(true) }}>Copy &amp; Edit</button></>} />
    <div className="detail-grid">
      <section className="panel stack">
        <div className="section-heading"><h2>{selected ? `Version ${selected.number} cells` : 'Saved cells'}</h2><Visibility item={notebook} /></div>
        {snapshot.cells?.length ? snapshot.cells.map(cell => <div className="cell" key={cell.id}>
          <div className="cell-head"><strong>{cell.type === 'markdown' ? 'Markdown' : languageName(notebook.language)}</strong></div>
          {cell.type === 'markdown' ? <p className="cell-source">{cell.source}</p> : <pre className="cell-source">{cell.source}</pre>}
        </div>) : <Empty title="No saved cells" />}
        {notebook.id === 'nb-ferry-baseline' && snapshot.cells?.some(cell => cell.type === 'code') && <div className="example-output">
          <strong>Example output</strong><pre>66.75</pre>
        </div>}
      </section>
      <aside className="stack">
        <section className="panel stack"><h2>Notebook details</h2>
          <dl><div><dt>Owner</dt><dd>{owner?.displayName ?? owner?.username ?? 'Unknown owner'}</dd></div>
            <div><dt>Updated</dt><dd>{date(notebook.updatedAt)}</dd></div>
            <div><dt>Latest version</dt><dd>{latest ? `Version ${latest.number}` : 'No versions'}</dd></div></dl>
          <Tags values={notebook.tags} />
        </section>
        <section className="panel stack"><h2>Version history</h2>
          {versions.length ? <><label>View version<select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
            <option value="">Saved cells</option>{versions.map(version => <option key={version.id} value={version.id}>Version {version.number}</option>)}
          </select></label>
          {selected && <div className="version-meta"><span>{date(selected.createdAt)}</span>{selected.message && <p>{selected.message}</p>}</div>}</>
          : <p className="muted">No versions saved yet.</p>}
        </section>
        <section className="panel stack"><h2>Dataset inputs</h2><DatasetLinks state={state} ids={snapshot.datasetIds} /></section>
      </aside>
    </div>
    {copy && <Modal title="Copy & Edit" onClose={() => setCopy(false)}>
      <form className="stack" onSubmit={copyNotebook}><p>Create a private draft from the saved cells of {titleOf(notebook)}.</p>
        <ErrorMessage error={error} /><FormActions submit="Create Copy" onCancel={() => setCopy(false)} />
      </form>
    </Modal>}
  </>
}

function DatasetLinks({ state, ids = [] }) {
  if (!ids.length) return <p className="muted">No dataset inputs.</p>
  return <ul className="workspace-list">{ids.map(id => {
    const dataset = state.datasets.find(item => item.id === id)
    return <li key={id}>{canRead(state, dataset) ? <AppLink to={entityPath(state, 'datasets', dataset)}>{titleOf(dataset)}<Icon name="arrow" size={14} /></AppLink>
      : <span className="muted">Dataset unavailable</span>}</li>
  })}</ul>
}

function NotebookEditor({ notebook, initialDraft }) {
  const { state, command } = useStore()
  const [title, setTitle] = useState(notebook.title ?? '')
  const [cells, setCells] = useState(initialDraft.cells)
  const [datasetIds, setDatasets] = useState(initialDraft.datasetIds)
  const [modal, setModal] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const path = entityPath(state, 'code', notebook)
  const datasets = scopedRecords(state, 'datasets')
  const nextVisibility = notebook.visibility === 'public' ? 'private' : 'public'
  function move(index, offset) {
    setCells(current => {
      const next = [...current]
      const [cell] = next.splice(index, 1)
      next.splice(index + offset, 0, cell)
      return next
    })
  }
  function addCell(type) {
    setCells(current => [...current, { id: crypto.randomUUID(), type, source: '' }])
  }
  function open(action) {
    setFeedback('')
    setError('')
    setMessage('')
    if (action !== 'visibility' && !title.trim()) return setError('Enter a notebook title.')
    setModal(action)
  }
  function confirm(event) {
    event.preventDefault()
    let note = 'The notebook could not be saved.'
    const saved = command(current => {
      const target = current.notebooks.find(item => item.id === notebook.id && item.ownerId === current.account.id)
      if (!target) return null
      const updatedAt = new Date().toISOString()
      if (modal === 'visibility') {
        if (target.visibility === nextVisibility) return null
        note = `Notebook is now ${nextVisibility}.`
        return withRecord(replaceRecord(current, 'notebooks', { ...target, visibility: nextVisibility, updatedAt }), 'visibilityChanges',
          activity(current, { entityType: 'notebook', entityId: notebook.id, from: target.visibility ?? null, to: nextVisibility }))
      }
      const updated = { ...target, title: title.trim(), cells, datasetIds, updatedAt }
      if (!updated.title) return null
      if (modal === 'draft') {
        const previous = notebookDraft(current, target)
        if (updated.title === target.title && JSON.stringify(cells) === JSON.stringify(previous.cells)
          && JSON.stringify(datasetIds) === JSON.stringify(previous.datasetIds)) {
          note = 'There are no changes to save.'
          return null
        }
        note = 'Draft saved.'
        return withRecord(replaceRecord(current, 'notebooks', updated), 'notebookDraftSaves',
          activity(current, { notebookId: notebook.id, status: 'saved' }))
      }
      const versions = versionsFor(current.notebookVersions, 'notebookId', notebook.id)
      const number = (versions[0]?.number ?? 0) + 1
      const version = activity(current, { notebookId: notebook.id, number, title: updated.title, cells, datasetIds, message: message.trim() })
      note = `Version ${number} saved.`
      return withRecord(replaceRecord(current, 'notebooks', { ...updated, latestVersionId: version.id }), 'notebookVersions', version)
    })
    setModal('')
    if (saved || note === 'There are no changes to save.') setFeedback(note)
    else setError(note)
  }
  const modalTitle = { draft: 'Save Draft', version: 'Save Version', visibility: 'Change Visibility' }[modal]
  return <>
    <AppLink to={path} className="breadcrumb">← Back to notebook</AppLink>
    <Heading eyebrow={languageName(notebook.language)} type="code" title="Edit Notebook"
      actions={<><button className="button secondary" onClick={() => open('draft')}>Save Draft</button>
        <button className="button" onClick={() => open('version')}>Save Version</button></>} />
    <div className="detail-grid">
      <div className="stack">
        <p className="notice" aria-live="polite">{feedback}</p>
        <ErrorMessage error={error} />
        <section className="panel stack">
          <label>Notebook title<input value={title} maxLength={120} required onChange={event => setTitle(event.target.value)} /></label>
          <h2>Cells</h2>
          {cells.map((cell, index) => <div className="cell" key={cell.id}>
            <div className="cell-head"><strong>{cell.type === 'markdown' ? 'Markdown' : 'Code'} · {index + 1}</strong>
              <div className="actions">
                <button className="icon-button" aria-label={`Move cell ${index + 1} up`} disabled={!index} onClick={() => move(index, -1)}>↑</button>
                <button className="icon-button" aria-label={`Move cell ${index + 1} down`} disabled={index === cells.length - 1} onClick={() => move(index, 1)}>↓</button>
                <button className="icon-button" aria-label={`Remove cell ${index + 1}`} onClick={() => setCells(current => current.filter(item => item.id !== cell.id))}><Icon name="close" size={15} /></button>
              </div>
            </div>
            <textarea value={cell.source ?? ''} aria-label={`${cell.type === 'markdown' ? 'Markdown' : 'Code'} cell ${index + 1}`}
              onChange={event => setCells(current => current.map(item => item.id === cell.id ? { ...item, source: event.target.value } : item))} />
          </div>)}
          {!cells.length && <Empty title="No cells">Add a code or Markdown cell to begin.</Empty>}
          <div className="actions"><button className="button secondary compact" onClick={() => addCell('code')}><Icon name="plus" size={15} />Add Code Cell</button>
            <button className="button secondary compact" onClick={() => addCell('markdown')}><Icon name="plus" size={15} />Add Markdown Cell</button></div>
        </section>
      </div>
      <aside className="stack">
        <section className="panel stack"><h2>Dataset inputs</h2>
          <label>Dataset input<select value="" disabled={!datasets.some(item => !datasetIds.includes(item.id))} onChange={event => {
            if (event.target.value) setDatasets(current => [...current, event.target.value])
          }}><option value="">Select a dataset</option>{datasets.filter(item => !datasetIds.includes(item.id)).map(item =>
            <option key={item.id} value={item.id}>{titleOf(item)}</option>)}</select></label>
          {datasetIds.length ? <ul className="input-list">{datasetIds.map(id => {
            const input = datasets.find(item => item.id === id)
            const name = input ? titleOf(input) : 'Dataset unavailable'
            return <li key={id}>{name}<button className="icon-button" aria-label={`Remove input ${name}`}
              onClick={() => setDatasets(current => current.filter(item => item !== id))}><Icon name="close" size={14} /></button></li>
          })}</ul> : <p className="muted">No dataset inputs selected.</p>}
        </section>
        <section className="panel stack"><h2>Visibility</h2><div><Visibility item={notebook} /></div>
          <button className="button secondary" onClick={() => open('visibility')}>Make {nextVisibility === 'public' ? 'Public' : 'Private'}</button>
        </section>
      </aside>
    </div>
    {modal && <Modal title={modalTitle} onClose={() => setModal('')}><form className="stack" onSubmit={confirm}>
      {modal === 'draft' && <p>Save these edits to the notebook draft?</p>}
      {modal === 'version' && <label>Version message (optional)<textarea maxLength={500} rows={3} value={message} onChange={event => setMessage(event.target.value)} /></label>}
      {modal === 'visibility' && <p>Confirm that you want to make this notebook {nextVisibility}.</p>}
      <FormActions submit={modalTitle} onCancel={() => setModal('')} />
    </form></Modal>}
  </>
}
