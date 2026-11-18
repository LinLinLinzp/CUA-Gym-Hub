import { useState } from 'react'
import { ChevronRight, Folder, UploadCloud } from 'lucide-react'
import { active, ancestry, commitUploads, createFolder, deleteFiles, organizeFiles, parentOf, planUploads, renameFile, restoreFile, uploadBytes } from './model'
import { Dialog, DialogActions, ErrorText, Field } from './ui'
import { useStore } from './store'

export function FolderPicker({ value, onChange, exclude = [], allowRoot = true }) {
  const { state } = useStore()
  const chain = ancestry(state, value)
  const blocked = new Set(exclude)
  const currentBlocked = chain.items.some(folder => blocked.has(folder.id))
  const usable = chain.valid && !currentBlocked
  const current = usable ? value : null
  const folders = state.files.filter(item => active(item) && item.kind === 'folder' && parentOf(item) === current && !blocked.has(item.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  return <div className="picker">
    <div className="picker-path" aria-label="Destination path">
      <button type="button" onClick={() => onChange(null)}>All files</button>
      {usable && chain.items.map(folder => <span key={folder.id}><ChevronRight size={13} /><button type="button" onClick={() => onChange(folder.id)}>{folder.name || 'Untitled folder'}</button></span>)}
    </div>
    {!usable && <p className="metadata">Choose a new location.</p>}
    {usable && current == null && !allowRoot && <p className="metadata">Choose a folder below.</p>}
    <div className="picker-list">
      {folders.map(folder => <button key={folder.id} type="button" onClick={() => onChange(folder.id)}><Folder size={17} /><span>{folder.name || 'Untitled folder'}</span><ChevronRight size={15} /></button>)}
      {!folders.length && <p className="metadata">No subfolders</p>}
    </div>
  </div>
}

export function NameDialog({ mode, item, parentId, onClose }) {
  const { commit, notify } = useStore()
  const [name, setName] = useState(item?.name || '')
  const [error, setError] = useState('')
  const isFolder = mode === 'folder'
  const title = isFolder ? 'New folder' : 'Rename'
  return <Dialog title={title} onClose={onClose}><form onSubmit={event => {
    event.preventDefault()
    try {
      commit(state => isFolder ? createFolder(state, parentId, name) : renameFile(state, item.id, name))
      if (isFolder || name.trim() !== item.name) notify(isFolder ? 'Folder created.' : 'Item renamed.')
      onClose()
    } catch (failure) { setError(failure.message) }
  }}>
    <Field label={isFolder ? 'Folder name' : 'Name'}><input data-autofocus value={name} onChange={event => setName(event.target.value)} maxLength={255} required /></Field>
    <ErrorText>{error}</ErrorText>
    <DialogActions label={isFolder ? 'Create folder' : 'Save name'} onClose={onClose} />
  </form></Dialog>
}

export function UploadDialog({ files, parentId, onClose }) {
  const { state, commit, notify } = useStore()
  const [choices, setChoices] = useState({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  let plan = []
  let validation = ''
  try { plan = planUploads(state, parentId, files, choices) }
  catch (error) { validation = error.message }

  async function submit(event) {
    event.preventDefault()
    if (busy || validation || plan.some(entry => entry.needsChoice)) return
    setBusy(true)
    setFailure('')
    try {
      const bytes = await uploadBytes(files)
      commit(latest => commitUploads(latest, parentId, files, choices, bytes, plan))
      notify(files.length === 1 ? 'File uploaded.' : files.length + ' files uploaded.')
      onClose()
    } catch (error) {
      setFailure(error.message)
      setBusy(false)
    }
  }

  return <Dialog title="Upload files" onClose={onClose} busy={busy}><form onSubmit={submit}>
    <ul className="upload-list">{files.map((file, index) => <li key={index}>
      <UploadCloud size={18} /><div><strong>{file.name}</strong>
        {plan[index]?.conflict && <Field label={'A name conflict for ' + file.name}><select value={choices[index] || ''} disabled={busy} required onChange={event => setChoices({ ...choices, [index]: event.target.value })}>
          <option value="">Choose how to proceed</option>
          {plan[index].canReplace && <option value="replace">Replace</option>}
          <option value="keep">Keep both</option>
        </select></Field>}
        {plan[index]?.name !== file.name && plan[index]?.name && <span className="metadata">Save as {plan[index].name}</span>}
      </div>
    </li>)}</ul>
    <ErrorText>{validation || failure}</ErrorText>
    <DialogActions label="Upload" onClose={onClose} busy={busy} disabled={!!validation || plan.some(entry => entry.needsChoice)} />
  </form></Dialog>
}

export function OrganizeDialog({ operation, items, onClose }) {
  const { state, commit, notify } = useStore()
  const [destination, setDestination] = useState(operation === 'restore' && ancestry(state, parentOf(items[0])).valid ? parentOf(items[0]) : null)
  const [error, setError] = useState('')
  const ids = items.map(item => item.id)
  const first = items[0].name || 'Untitled item'
  const name = items.length === 1 ? '“' + first + '”' : items.length + ' items'
  const label = operation[0].toUpperCase() + operation.slice(1)
  return <Dialog title={label + ' ' + name} onClose={onClose}><form onSubmit={event => {
    event.preventDefault()
    try {
      commit(latest => {
        if (operation === 'delete') return deleteFiles(latest, ids)
        if (operation === 'restore') return restoreFile(latest, ids[0], destination)
        return organizeFiles(latest, ids, destination, operation)
      })
      const feedback = { delete: 'Moved to Deleted files.', restore: 'Item restored.', move: 'Move complete.', copy: 'Copy created.' }
      notify(feedback[operation])
      onClose(true)
    } catch (failure) { setError(failure.message) }
  }}>
    {operation === 'delete'
      ? <p>Move {name} to Deleted files? You can restore {items.length === 1 ? 'it' : 'them'} later.</p>
      : <><p className="metadata">Destination folder</p><FolderPicker value={destination} onChange={setDestination} exclude={ids} /></>}
    <ErrorText>{error}</ErrorText>
    <DialogActions label={label} danger={operation === 'delete'} onClose={() => onClose()} />
  </form></Dialog>
}
