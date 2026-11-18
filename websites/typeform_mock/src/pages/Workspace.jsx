import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpRight, Copy, FileText, Filter, FolderInput, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../state.jsx'
import { copyForm, dateText, defaultEnding, items, newId, statuses } from '../model.js'
import { AppLink, BackHome, Confirm, Dialog, Empty, formPath, Status, useAppNavigate } from '../ui.jsx'

function FormDialog({ mode, form, workspace, onClose, onSave }) {
  const { state } = useAccount()
  const [name, setName] = useState(form?.title || '')
  const destinations = items(state.workspaces).filter((entry) => entry.id !== workspace.id)
  const [destination, setDestination] = useState(destinations[0]?.id || '')
  const [error, setError] = useState('')
  const title = { create: 'Create a form', rename: 'Rename form', move: 'Move form' }[mode]
  const label = { create: 'Create form', rename: 'Save name', move: 'Move form' }[mode]
  return <Dialog title={title} onClose={onClose}>
    <form noValidate onSubmit={(event) => {
      event.preventDefault()
      if (mode !== 'move' && !name.trim()) { setError('Enter a form name.'); return }
      if (mode === 'move' && !destination) { setError('Choose a destination workspace.'); return }
      onSave(mode === 'move' ? destination : name.trim())
    }}>
      {mode === 'move' ? <label className="field">Destination workspace<select autoFocus value={destination} onChange={(event) => setDestination(event.target.value)}>
        {destinations.length === 0 && <option value="">No other workspaces</option>}
        {destinations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || 'Untitled workspace'}</option>)}
      </select></label> : <label className="field">Form name<input autoFocus value={name} maxLength={160} placeholder="e.g. Customer feedback" onChange={(event) => setName(event.target.value)} /></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={mode === 'move' && !destinations.length}>{label}</button></div>
    </form>
  </Dialog>
}

const actions = [['rename', 'Rename', Pencil], ['duplicate', 'Duplicate', Copy], ['move', 'Move', FolderInput], ['delete', 'Delete', Trash2]]

function RowActions({ form, onAction }) {
  return <details className="row-menu" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      event.currentTarget.open = false
      event.currentTarget.querySelector('summary').focus()
    }
  }}>
    <summary className="icon-button" aria-label={'Actions for ' + (form.title || 'Untitled form')}><MoreHorizontal size={20} /></summary>
    <div className="menu-panel">
      {actions.map(([key, label, Icon]) => <button key={key} type="button" className={key === 'delete' ? 'text-danger' : ''}
        onClick={(event) => {
          const details = event.currentTarget.closest('details')
          details.open = false
          details.querySelector('summary').focus()
          onAction(key, form)
        }}><Icon size={16} />{label}</button>)}
    </div>
  </details>
}

function WorkspacePage({ workspace }) {
  const { state, admin, editForm } = useAccount()
  const navigate = useAppNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('edited')
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState('')
  const forms = items(state.forms).filter((form) => form.workspaceId === workspace.id)
  const counts = useMemo(() => {
    const result = new Map()
    for (const response of items(state.responses)) result.set(response.formId, (result.get(response.formId) || 0) + 1)
    return result
  }, [state.responses])
  const shown = forms.filter((form) => (!status || (form.status || 'draft') === status) &&
    (form.title || 'Untitled form').toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => {
      const byTitle = (a.title || '').localeCompare(b.title || '')
      if (sort === 'title') return byTitle
      if (sort === 'title_desc') return -byTitle
      return ((b.updatedAt || '').localeCompare(a.updatedAt || '')) * (sort === 'oldest' ? -1 : 1) || byTitle
    })

  function action(mode, form) {
    setMessage('')
    if (mode === 'duplicate') {
      const id = newId('form')
      if (admin('form_duplicated', id, (before, { actorId, createdAt }) => {
        const source = items(before.forms).find((entry) => entry.id === form.id)
        if (!source) return null
        return { fields: { forms: [...items(before.forms), copyForm(source, items(before.forms), actorId, createdAt, id)] }, entityIds: [source.id] }
      })) setMessage('Draft copy created.')
    } else setDialog({ mode, form })
  }

  function finish(value) {
    const { mode, form } = dialog
    let changed
    if (mode === 'create') {
      const id = newId('form')
      changed = admin('form_created', id, (before, { actorId, createdAt }) => ({
        fields: { forms: [...items(before.forms), {
          id, title: value, workspaceId: workspace.id, status: 'draft', questions: [], endings: [defaultEnding()], logic: [],
          publishedAt: null, publishedVersion: 0, publishedSnapshot: null,
          createdBy: actorId, updatedBy: actorId, createdAt, updatedAt: createdAt,
        }] },
      }))
      if (changed) navigate(formPath(id))
    }
    if (mode === 'rename') {
      changed = editForm(form.id, 'form_renamed', (current) => current.title === value ? null : { fields: { title: value } })
      if (changed) setMessage('Form renamed.')
    }
    if (mode === 'move') {
      changed = editForm(form.id, 'form_moved', (current) => current.workspaceId === value ? null : { fields: { workspaceId: value } })
      if (changed) setMessage('Form moved.')
    }
    if (mode === 'delete') {
      changed = admin('form_deleted', form.id, (before) => {
        const responses = items(before.responses)
        if (!items(before.forms).some((entry) => entry.id === form.id)) return null
        return {
          fields: { forms: items(before.forms).filter((entry) => entry.id !== form.id), responses: responses.filter((entry) => entry.formId !== form.id) },
          entityIds: [form.id, ...responses.filter((entry) => entry.formId === form.id).map((entry) => entry.id)],
        }
      })
      if (changed) setMessage('Form deleted.')
    }
    setDialog(null)
  }

  return <>
    <div className="workspace-heading">
      <div className="eyebrow">Workspace</div>
      <div className="page-heading"><div><h1>{workspace.name || 'Untitled workspace'}</h1><p className="muted">Create, organize, and review your forms.</p></div>
        <button className="primary" onClick={() => action('create')}><Plus size={18} /> Create form</button>
      </div>
    </div>
    <section className="panel" aria-label="Forms">
      <div className="list-heading"><h2>Forms</h2><span className="count">{forms.length}</span></div>
      <div className="toolbar">
        <label className="search"><Search size={17} /><input aria-label="Search forms" placeholder="Search forms" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="control-label"><Filter size={16} /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="control-label"><ArrowDownWideNarrow size={17} /><select aria-label="Sort forms" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="edited">Recently edited</option><option value="oldest">Least recently edited</option><option value="title">Title A–Z</option><option value="title_desc">Title Z–A</option>
        </select></label>
      </div>
      {shown.length ? <div className="table-scroll"><table className="forms-table">
        <thead><tr><th scope="col">Form name</th><th scope="col">Status</th><th scope="col">Last edited</th><th scope="col">Responses</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{shown.map((form, index) => <tr key={form.id}>
          <td><AppLink className="form-name" to={formPath(form.id)}><span className={'file-icon tone-' + index % 3}><FileText size={17} /></span>{form.title || 'Untitled form'}</AppLink></td>
          <td><Status status={form.status} /></td>
          <td className="muted">{dateText(form.updatedAt)}</td>
          <td><AppLink className="response-link" to={formPath(form.id, 'responses')} aria-label={(counts.get(form.id) || 0) + ' responses for ' + (form.title || 'Untitled form')}>{counts.get(form.id) || 0}<ArrowUpRight size={14} /></AppLink></td>
          <td><RowActions form={form} onAction={action} /></td>
        </tr>)}</tbody>
      </table></div> : <Empty title={forms.length ? 'No matching forms' : 'No forms yet'}
        action={forms.length ? <button onClick={() => { setSearch(''); setStatus('') }}>Clear filters</button> : <button className="primary" onClick={() => action('create')}><Plus size={17} /> Create form</button>}>
        {forms.length ? 'Try a different search or status.' : 'Create a form to start collecting responses in this workspace.'}
      </Empty>}
      {shown.length > 0 && <footer className="table-footer">Showing {shown.length} of {forms.length} forms</footer>}
    </section>
    {forms.length === 0 && <div className="workspace-back"><BackHome /></div>}
    {message && <p className="notice" role="status">{message}</p>}
    {dialog?.mode === 'delete' && <Confirm title="Delete form?" description={'“' + (dialog.form.title || 'Untitled form') + '” and its ' + (counts.get(dialog.form.id) || 0) + ' responses will be removed.'}
      label="Delete form" onConfirm={() => finish()} onClose={() => setDialog(null)} />}
    {dialog && dialog.mode !== 'delete' && <FormDialog {...dialog} workspace={workspace} onSave={finish} onClose={() => setDialog(null)} />}
  </>
}

export default function Workspace() {
  const { workspaceId } = useParams()
  const { state } = useAccount()
  const workspace = items(state.workspaces).find((entry) => entry.id === workspaceId)
  return workspace ? <WorkspacePage key={workspace.id} workspace={workspace} /> :
    <Empty title="Workspace not found" action={<BackHome />}>This workspace is no longer available.</Empty>
}
