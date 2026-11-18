import { useRef, useState } from 'react'
import { ArrowLeft, Folder, FolderPlus, Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppLink, Confirm, Dialog, Empty, Field, PageHeading, Rail, SearchBox, Select } from '../components.jsx'
import { saveAdminRecord } from '../data/actions.js'
import { actor, find, PLACEHOLDERS, records, responseMatches, text, visibleResponse } from '../data/model.js'
import { useAccount } from '../store.jsx'

const VISIBILITY = ['everyone', 'groups', 'myself']

function FolderEditor({ folder, onClose, onSaved }) {
  const { state, commit } = useAccount()
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (!name) return setError('Enter a folder name.')
    if (records(state.cannedResponseFolders).some(item => item.id !== folder?.id && text(item.name) === text(name))) {
      return setError('A folder with this name already exists.')
    }
    const saved = commit(current => saveAdminRecord(current, 'canned_response_folder', folder?.id, { name }))
    onSaved(saved ? 'Folder saved.' : 'No folder changes to save.')
  }
  return <Dialog title={folder ? 'Rename folder' : 'New folder'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit} noValidate>
      <Field label="Folder name"><input name="name" defaultValue={folder?.name ?? ''} required /></Field>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button>
        <button className="button primary">Save folder</button></div>
    </form>
  </Dialog>
}

function ResponseEditor({ response, startFolder, onClose, onSaved }) {
  const { state, commit } = useAccount()
  const [body, setBody] = useState(response?.body ?? '')
  const [folderId, setFolderId] = useState(response?.folderId ?? startFolder ?? '')
  const [visibility, setVisibility] = useState(response?.visibility ?? 'everyone')
  const [groupIds, setGroupIds] = useState(() => Array.isArray(response?.groupIds) ? response.groupIds : [])
  const [error, setError] = useState('')
  const bodyRef = useRef(null)
  const caret = useRef(null)
  const folders = records(state.cannedResponseFolders)
  const groups = records(state.groups)

  function insert(token) {
    const [start, end] = caret.current ?? [body.length, body.length]
    setBody(body.slice(0, start) + token + body.slice(end))
    const after = start + token.length
    caret.current = [after, after]
    requestAnimationFrame(() => {
      bodyRef.current?.focus()
      bodyRef.current?.setSelectionRange(after, after)
    })
  }

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title')).trim()
    const shortCode = String(form.get('shortCode')).trim()
    if (!title || !body.trim()) return setError('Enter a response title and body.')
    if (folderId && !find(folders, folderId)) return setError('Choose an available folder or No folder.')
    if (shortCode && records(state.cannedResponses).some(item => !item.deletedAt && item.id !== response?.id &&
        text(item.shortCode) === text(shortCode))) return setError('This short code is already used by an active response.')
    if (visibility === 'groups' && (!groupIds.length || groupIds.some(id => !find(groups, id)))) {
      return setError('Choose at least one available group.')
    }
    if (visibility === 'myself' && (!actor(state) || (response && response.ownerId !== actor(state)))) {
      return setError('Only the owner can make a response personal.')
    }
    const fields = { title, body: body.trim(), shortCode, folderId: folderId || null, visibility, groupIds: visibility === 'groups' ? groupIds : [] }
    const action = response && fields.folderId !== (response.folderId ?? null) ? 'moved' : 'updated'
    const saved = commit(current => saveAdminRecord(current, 'canned_response', response?.id, fields, action))
    onSaved(saved ? (action === 'moved' ? 'Response moved.' : 'Response saved.') : 'No response changes to save.')
  }

  return <Dialog title={response ? 'Edit canned response' : 'New canned response'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit} noValidate>
      <Field label="Title"><input name="title" defaultValue={response?.title ?? ''} required /></Field>
      <div className="form-grid">
        <Field label="Short code"><input name="shortCode" defaultValue={response?.shortCode ?? ''} /></Field>
        <Field label="Folder"><Select options={folders} empty="No folder" value={folderId} onChange={event => setFolderId(event.target.value)} /></Field>
      </div>
      <Field label="Response body"><textarea ref={bodyRef} rows={6} value={body} required onChange={event => setBody(event.target.value)}
        onSelect={event => { caret.current = [event.currentTarget.selectionStart, event.currentTarget.selectionEnd] }} /></Field>
      <Field label="Insert placeholder"><select value="" onChange={event => insert(event.target.value)}>
        <option value="">Choose a placeholder</option>
        {Object.entries(PLACEHOLDERS).map(([token, name]) => <option value={token} key={token}>{name}</option>)}
      </select></Field>
      <Field label="Visibility"><Select options={VISIBILITY} value={visibility} onChange={event => setVisibility(event.target.value)} /></Field>
      {visibility === 'groups' && <fieldset>
        <legend>Allowed groups</legend>
        {groups.length ? <div className="group-checks">{groups.map(group => <label key={group.id} className="check-label">
          <input type="checkbox" checked={groupIds.includes(group.id)} onChange={event => setGroupIds(event.target.checked ?
            [...groupIds.filter(id => find(groups, id)), group.id] : groupIds.filter(id => id !== group.id && find(groups, id)))} />
          {group.name || 'Unnamed group'}</label>)}</div> : <p className="muted">No groups are available in this account.</p>}
      </fieldset>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button>
        <button className="button primary">Save response</button></div>
    </form>
  </Dialog>
}

export function CannedResponses() {
  const { state, commit } = useAccount()
  const [folderId, setFolderId] = useState('')
  const [query, setQuery] = useState('')
  const [folderEditor, setFolderEditor] = useState(null)
  const [responseEditor, setResponseEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState('')
  const folders = records(state.cannedResponseFolders)
  const folder = find(folders, folderId)
  const responses = records(state.cannedResponses).filter(response => visibleResponse(state, response, true))
  const results = responses.filter(response => (!folderId || response.folderId === folderId) && responseMatches(response, query))

  return <>
    <AppLink to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</AppLink>
    <PageHeading title="Canned responses" description="Find and organize the replies your team uses most.">
      <button className="button primary" onClick={() => setResponseEditor({})}><Plus size={18} /> New response</button>
    </PageHeading>
    {notice && <p className="notice page-notice" role="status">{notice}</p>}
    <div className="workspace-grid">
      <Rail title="Folders">
        <button className="rail-item" aria-pressed={!folderId} onClick={() => setFolderId('')}><Library size={16} /><span>All responses</span><span className="count">{responses.length}</span></button>
        {folders.map(item => <button key={item.id} className="rail-item" aria-pressed={folderId === item.id}
          onClick={() => setFolderId(item.id)}><Folder size={16} /><span>{item.name || 'Unnamed folder'}</span>
          <span className="count">{responses.filter(response => response.folderId === item.id).length}</span>
        </button>)}
        <button className="button rail-action" onClick={() => setFolderEditor({})}><FolderPlus size={16} /> New folder</button>
      </Rail>
      <section className="panel">
        <div className="section-heading"><div><h2>{folder?.name || 'All responses'}</h2><span className="muted">{results.length} {results.length === 1 ? 'response' : 'responses'}</span></div>
          {folder && <button className="button" onClick={() => setFolderEditor({ folder })}><Pencil size={15} /> Rename folder</button>}
        </div>
        <div className="toolbar"><SearchBox name="Search response library" value={query} onChange={setQuery} placeholder="Search title, body, or short code" /></div>
        {results.length ? <ul className="response-list">{results.map(response => {
          const name = response.title || 'Untitled response'
          const scope = response.visibility === 'groups' ? 'Groups' : response.visibility === 'myself' ? 'Myself' : 'Everyone'
          return <li key={response.id} className="response-row">
            <div className="response-info"><h3>{name}</h3><p>{response.body || 'No response text.'}</p>
              <div className="metadata"><span className="pill">{scope}</span>
                {response.shortCode && <code>{response.shortCode}</code>}
                <span>{find(folders, response.folderId)?.name || (response.folderId ? 'Unavailable folder' : 'No folder')}</span></div></div>
            <div className="item-actions">
              <button className="button" aria-label={`Edit ${name}`} onClick={() => setResponseEditor({ response })}>Edit</button>
              <button className="icon-button" aria-label={`Delete ${name}`} onClick={() => setDeleting(response)}><Trash2 size={16} /></button>
            </div>
          </li>
        })}</ul> : <Empty title={folder ? `No responses in ${folder.name || 'this folder'}` : 'No matching responses'}>
          {query ? <button className="button" onClick={() => setQuery('')}>Clear search</button> :
            <button className="button" onClick={() => setResponseEditor({})}>Add a response</button>}
        </Empty>}
      </section>
    </div>
    {folderEditor && <FolderEditor folder={folderEditor.folder} onClose={() => setFolderEditor(null)}
      onSaved={message => { setNotice(message); setFolderEditor(null) }} />}
    {responseEditor && <ResponseEditor response={responseEditor.response} startFolder={folderId} onClose={() => setResponseEditor(null)}
      onSaved={message => { setNotice(message); setResponseEditor(null) }} />}
    {deleting && <Confirm title={`Delete ${deleting.title || 'response'}?`} message="This response will be removed from the library and reply picker."
      onClose={() => setDeleting(null)} onConfirm={() => {
        if (commit(current => saveAdminRecord(current, 'canned_response', deleting.id, {}, 'deleted'))) setNotice('Response deleted.')
        setDeleting(null)
      }} />}
  </>
}
