import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, CheckCircle2, Folder, Inbox, Plus, Upload } from 'lucide-react'
import { ancestry, availableRequest, changeRequestStatus, cleanName, emailValue, getFile, pathLabel, routeFor, saveRequest, submitRequest, uploadBytes, validEmail } from '../model'
import { FolderPicker } from '../fileDialogs'
import { dateLabel, Dialog, DialogActions, Empty, ErrorText, Field, LinkCopy, Missing, PageHeading, timeLabel } from '../ui'
import { useStore } from '../store'
import { withSid } from '../utils/dataManager'

const detailPath = id => '/requests/' + encodeURIComponent(id)
const receivePath = token => '/receive/' + encodeURIComponent(token)
const statusLabel = status => status === 'closed' ? 'Closed' : 'Open'

function RequestStatus({ request }) {
  return <span className={'status ' + (request.status || 'open')}>{statusLabel(request.status)}</span>
}

function RequestForm({ request, onClose, onCreated }) {
  const { state, commit, notify } = useStore()
  const [title, setTitle] = useState(request?.title || '')
  const [description, setDescription] = useState(request?.description || '')
  const [destination, setDestination] = useState(request?.destinationFolderId ?? null)
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    try {
      let created
      commit(latest => {
        const next = saveRequest(latest, request?.id, { title, description, destinationFolderId: destination })
        if (!request) created = next.fileRequests.at(-1)
        return next
      })
      notify(request ? 'Request saved.' : 'File request created.')
      onClose()
      if (created) onCreated(created)
    } catch (failure) { setError(failure.message) }
  }
  return <Dialog title={request ? 'Edit file request' : 'New file request'} onClose={onClose}><form onSubmit={submit}>
    <Field label="Title"><input data-autofocus value={title} onChange={event => setTitle(event.target.value)} maxLength={140} required /></Field>
    <Field label="Description (optional)"><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} /></Field>
    <div>
      <strong>Destination folder</strong>
      <FolderPicker value={destination} onChange={setDestination} allowRoot={false} />
    </div>
    <ErrorText>{error}</ErrorText>
    <DialogActions label={request ? 'Save changes' : 'Create request'} disabled={!destination || !ancestry(state, destination).valid} onClose={onClose} />
  </form></Dialog>
}

export function RequestsPage() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('open')
  const [creating, setCreating] = useState(false)
  const counts = new Map()
  for (const submission of state.requestSubmissions) counts.set(submission.requestId, (counts.get(submission.requestId) || 0) + 1)
  const requests = state.fileRequests.filter(request => (request.status || 'open') === tab)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  return <section>
    <PageHeading title="File requests" subtitle="Collect files from clients and coworkers in a folder you choose.">
      <button className="button primary" onClick={() => setCreating(true)}><Plus size={17} />New file request</button>
    </PageHeading>
    <div className="segmented" aria-label="Request status">
      {['open', 'closed'].map(status => <button key={status} type="button" aria-pressed={tab === status} onClick={() => setTab(status)}>{statusLabel(status)}</button>)}
    </div>
    {requests.length ? <div className="table-card"><table>
      <thead><tr><th>Title</th><th className="file-meta">Destination</th><th>Submissions</th><th>Status</th><th className="row-end" aria-label="Open" /></tr></thead>
      <tbody>{requests.map(request => <tr key={request.id}>
        <td><Link className="item-name" to={withSid(detailPath(request.id))}><span className="file-mark document"><Inbox size={17} /></span>{request.title || 'Untitled request'}</Link></td>
        <td className="file-meta">{request.destinationFolderId ? pathLabel(state, request.destinationFolderId) : '—'}</td>
        <td>{counts.get(request.id) || 0}</td><td><RequestStatus request={request} /></td>
        <td className="row-end"><Link className="icon-button" aria-label={'Open ' + (request.title || 'request')} to={withSid(detailPath(request.id))}><ChevronRight size={18} /></Link></td>
      </tr>)}</tbody>
    </table></div> : <Empty title={'No ' + tab + ' requests'} text={tab === 'open' ? 'Create a request to collect files.' : 'Requests you close appear here.'} />}
    {creating && <RequestForm onClose={() => setCreating(false)} onCreated={request => navigate(withSid(detailPath(request.id)))} />}
  </section>
}

function StatusDialog({ request, onClose }) {
  const { commit, notify } = useStore()
  const [error, setError] = useState('')
  return <Dialog title="Close request" onClose={onClose}><form onSubmit={event => {
    event.preventDefault()
    try {
      commit(latest => changeRequestStatus(latest, request.id, false))
      notify('Request closed.')
      onClose()
    } catch (failure) { setError(failure.message) }
  }}>
    <p>Close “{request.title || 'Untitled request'}”? Contributors can upload again if you reopen the request.</p>
    <ErrorText>{error}</ErrorText>
    <DialogActions label="Close request" danger onClose={onClose} />
  </form></Dialog>
}

export function RequestPage() {
  const { id } = useParams()
  const { state, commit, notify } = useStore()
  const [dialog, setDialog] = useState('')
  const [error, setError] = useState('')
  const request = state.fileRequests.find(record => record.id === id)
  if (!request) return <Missing title="Request unavailable" to="/requests" label="File requests" />
  const isOpen = request.status !== 'closed'
  const folder = getFile(state, request.destinationFolderId)
  const validDestination = !!folder && ancestry(state, folder.id).valid
  const submissions = state.requestSubmissions.filter(record => record.requestId === id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  function reopen() {
    try {
      commit(latest => changeRequestStatus(latest, id, true))
      setError('')
      notify('Request reopened.')
    } catch (failure) { setError(failure.message) }
  }

  return <section>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to={withSid('/requests')}>File requests</Link><ChevronRight size={13} /><span aria-current="page">{request.title || 'Untitled request'}</span></nav>
    <PageHeading title={request.title || 'Untitled request'}>
      {isOpen ? <><button className="button" onClick={() => setDialog('close')}>Close request</button>
        <button className="button primary" onClick={() => setDialog('edit')}>Edit request</button></>
        : <button className="button primary" onClick={reopen}>Reopen request</button>}
    </PageHeading>
    <ErrorText>{error}</ErrorText>
    <div className="request-layout">
      <article className="card request-info">
        <div className="card-title"><h2>Request details</h2><RequestStatus request={request} /></div>
        <dl><dt>Description</dt><dd>{request.description || 'No description'}</dd>
          <dt>Destination folder</dt><dd>{validDestination ? <Link className="inline" to={withSid(routeFor(folder))}><Folder size={16} />{pathLabel(state, folder.id)}</Link> : 'Destination unavailable'}</dd>
          <dt>Created</dt><dd>{dateLabel(request.createdAt)}</dd>
          {!isOpen && <><dt>Closed</dt><dd>{dateLabel(request.closedAt)}</dd></>}
        </dl>
        {request.token && <><h3>Recipient link</h3><LinkCopy path={receivePath(request.token)} /></>}
      </article>
      <article className="card submission-card">
        <div className="card-title"><h2>Submissions</h2><span className="metadata">{submissions.length} {submissions.length === 1 ? 'file' : 'files'}</span></div>
        {submissions.length ? <ul className="submissions">{submissions.map(submission => {
          const file = getFile(state, submission.fileId)
          return <li key={submission.id}>
            {file && file.status !== 'deleted' ? <Link to={withSid(routeFor(file))}>{file.name || submission.originalName || 'Untitled file'}</Link> : <strong>{submission.originalName || 'Untitled file'}</strong>}
            <span className="metadata">{submission.uploaderName || submission.uploaderEmail || 'Contributor'} · {timeLabel(submission.createdAt)}</span>
            {submission.originalName && file?.name && submission.originalName !== file.name && <span className="metadata">Uploaded as {submission.originalName}</span>}
          </li>
        })}</ul> : <p className="metadata">No files submitted yet.</p>}
      </article>
    </div>
    {dialog === 'edit' && <RequestForm request={request} onClose={() => setDialog('')} />}
    {dialog === 'close' && <StatusDialog request={request} onClose={() => setDialog('')} />}
  </section>
}

export function ReceivePage() {
  const { token } = useParams()
  const { state, commit } = useStore()
  const request = availableRequest(state, token)
  const record = state.fileRequests.find(item => item.token === token)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(0)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!name.trim() || !validEmail(emailValue(email)) || !files.length) {
      setError('Provide your name, a valid email, and at least one file.')
      return
    }
    setBusy(true)
    try {
      files.forEach(file => cleanName(file.name))
      const bytes = await uploadBytes(files)
      commit(latest => submitRequest(latest, token, { name, email }, files, bytes))
      setSent(files.length)
      setFiles([])
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  if (!request && !sent) return <div className="recipient-card"><Empty title={record?.status === 'closed' ? 'This request is closed' : 'Request unavailable'}
    text="This link is no longer accepting files." /></div>

  return <article className="card recipient-card">
    <div className="recipient-icon"><Inbox size={25} /></div>
    <h1>{record?.title || 'Upload files'}</h1>
    {sent ? <div className="receipt" role="status">
      <CheckCircle2 size={23} /><div><h2>Files submitted</h2><p>{sent} {sent === 1 ? 'file was' : 'files were'} sent to the request owner.</p></div>
      {request && <button className="button" onClick={() => setSent(0)}>Submit more files</button>}
    </div> : <>
      {request.description && <p className="recipient-description">{request.description}</p>}
      <form onSubmit={submit}>
        <Field label="Your name"><input autoComplete="name" value={name} onChange={event => setName(event.target.value)} disabled={busy} required /></Field>
        <Field label="Your email"><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} required /></Field>
        <Field label="Files to submit"><input type="file" multiple required disabled={busy} onChange={event => setFiles(Array.from(event.target.files))} /></Field>
        {!!files.length && <ul className="recipient-files">{files.map((file, index) => <li key={index}>{file.name}</li>)}</ul>}
        <ErrorText>{error}</ErrorText>
        <button className="button primary" type="submit" disabled={busy}><Upload size={16} />{busy ? 'Uploading…' : 'Submit files'}</button>
      </form>
    </>}
  </article>
}
