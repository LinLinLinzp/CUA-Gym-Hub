import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate, newRecordId } from './data/actions.js'
import {
  activeFolder, actorId, byId, destination, editable, fileName, filePath, find, folderPath,
  matches, owns, records, relativeDate, roleFor,
} from './data/model.js'
import { Preview } from './Preview.jsx'
import { Share } from './Share.jsx'
import { SessionLink, useWorkspace } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Avatar, Empty, FormFooter, Icon, Modal } from './ui.jsx'

const navigation = [['files', 'Files', '/'], ['drafts', 'Drafts', '/drafts'], ['starred', 'Starred', '/starred'], ['trash', 'Trash', '/trash']]
const titles = { files: 'Files', drafts: 'Drafts', starred: 'Starred', trash: 'Trash', missing: 'Page unavailable' }

export function Library({ scope }) {
  const { folderId } = useParams()
  return <LibraryView key={folderId ?? scope} scope={scope} folderId={folderId} />
}

function LibraryView({ scope, folderId }) {
  const { state, commit, notify } = useWorkspace()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('edited')
  const [view, setView] = useState('grid')
  const [allFolders, setAllFolders] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const query = search.trim().toLowerCase()
  const actor = find(state, 'users', actorId(state))
  const folders = records(state, 'folders').filter((folder) => folder.id && activeFolder(folder))
  const folder = folders.find((item) => item.id === folderId)
  const missing = scope === 'missing' || (scope === 'folder' && !folder)
  const stars = new Set(records(state, 'fileStars').filter((star) => star.userId === actorId(state) && star.status === 'starred').map((star) => star.fileId))
  const files = missing ? [] : records(state, 'files').filter((file) => {
    if (!file.id || !matches(fileName(file), query)) return false
    if (scope === 'trash') return file.status === 'trashed' && owns(state, file)
    if (!roleFor(state, file)) return false
    if (scope === 'drafts') return !file.folderId
    if (scope === 'starred') return stars.has(file.id)
    if (scope === 'folder') return file.folderId === folderId
    return true
  }).sort((a, b) => (sort === 'name'
    ? fileName(a).localeCompare(fileName(b), 'en', { sensitivity: 'base' })
    : String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))) || byId(a, b))
  const shownFolders = scope === 'files' ? (query ? folders.filter((item) => matches(item.name, query))
    : allFolders ? folders : folders.slice(0, 4)) : []
  const title = scope === 'folder' ? (folder?.name || 'Folder unavailable') : titles[scope]
  const canCreate = Boolean(actorId(state)) && !missing && scope !== 'trash'
  const close = () => setDialog(null)
  const openCreate = () => setDialog({ type: 'create' })
  function perform(action, message) {
    if (!commit((current) => mutate(current, action))) return false
    if (message) notify(message)
    return true
  }
  function openNew(action, message) {
    const newId = newRecordId('file')
    if (!perform({ ...action, newId }, message)) return false
    close()
    navigate(withSid(filePath(newId)))
    return true
  }

  return <div className="library">
    <button type="button" className="nav-toggle" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen}><span aria-hidden="true">☰ </span>Workspace</button>
    <aside className={'rail' + (navOpen ? ' expanded' : '')}>
      <SessionLink to="/" className="wordmark" onClick={() => setNavOpen(false)}>Figma</SessionLink>
      <p className="workspace-name">{state.account?.workspaceName || 'Workspace'}</p>
      <nav aria-label="Workspace navigation">
        {navigation.map(([id, text, path]) => <SessionLink key={id} to={path} onClick={() => setNavOpen(false)}
          className={scope === id || (scope === 'folder' && id === 'files') ? 'current' : undefined} aria-current={scope === id ? 'page' : undefined}><Icon name={id} />{text}</SessionLink>)}
      </nav>
      <div className="account"><Avatar name={actor?.name} color={actor?.avatarColor} /><div><b>{actor?.name || 'Workspace member'}</b>{actor?.email && <small>{actor.email}</small>}</div></div>
    </aside>
    <div className="library-content">
      <header className="library-toolbar">
        <div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="workspace-search">Search files and folders</label><input id="workspace-search" type="search" placeholder="Search files and folders" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        {canCreate && <button type="button" className="primary" onClick={openCreate}><Icon name="plus" />New design file</button>}
      </header>
      <main className="library-main">
        <div className="library-heading">
          {folder && <SessionLink to="/" className="back-link"><Icon name="back" /> All files</SessionLink>}
          <h1>{title}</h1>
          {folder?.description && <p>{folder.description}</p>}
        </div>
        {shownFolders.length > 0 && <section className="folders" aria-labelledby="folders-heading">
          <div className="section-heading"><h2 id="folders-heading">Folders</h2>
            {!query && folders.length > 4 && <button type="button" className="text-button" aria-expanded={allFolders} onClick={() => setAllFolders(!allFolders)}>{allFolders ? 'Show fewer folders' : 'Show all folders'} <Icon name="arrow" /></button>}
          </div>
          <div className="folder-grid">{shownFolders.map((item) => <SessionLink className="folder-card" to={folderPath(item.id)} key={item.id}>
            <span className="folder-glyph"><Icon name="folder" /></span><span><b>{item.name || 'Untitled folder'}</b>{item.description && <small>{item.description}</small>}</span>
          </SessionLink>)}</div>
        </section>}
        {!missing && <section aria-labelledby="file-list-heading">
          <div className="section-heading file-heading">
            <div className="section-label"><h2 id="file-list-heading">{query ? 'Matching files' : scope === 'files' ? 'All files' : 'Design files'}</h2><small>{files.length}</small></div>
            <div className="view-controls">
              <label className="sr-only" htmlFor="file-sort">Sort files</label>
              <select id="file-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="edited">Last edited</option><option value="name">Name</option></select>
              <div className="segmented" aria-label="File layout">
                <button type="button" aria-label="Card view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" /></button>
                <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" /></button>
              </div>
            </div>
          </div>
          {files.length ? <div className={view === 'grid' ? 'file-grid' : 'file-list'}>
            {files.map((file) => <FileTile key={file.id} file={file} list={view === 'list'} starred={stars.has(file.id)}
              onAction={(type) => {
                if (type === 'duplicate') openNew({ type, fileId: file.id }, 'File duplicated')
                else if (type === 'star') perform({ type, fileId: file.id }, stars.has(file.id) ? 'Removed from Starred' : 'Added to Starred')
                else if (type === 'restore') perform({ type, fileId: file.id }, 'File restored')
                else setDialog({ type, fileId: file.id })
              }} />)}
          </div> : <Empty title={query ? 'No matching files' : scope === 'trash' ? 'Trash is empty' : scope === 'starred' ? 'No starred files' : 'No designs here yet'}>
            {query ? <button onClick={() => setSearch('')}>Clear search</button> : ['trash', 'starred'].includes(scope)
              ? <SessionLink className="button" to="/">Browse files</SessionLink> : canCreate && <button onClick={openCreate}>New design file</button>}
          </Empty>}
        </section>}
        {missing && <Empty title="This location could not be opened"><SessionLink className="button" to="/">Back to files</SessionLink></Empty>}
      </main>
    </div>
    {dialog?.type === 'share' && <Share fileId={dialog.fileId} onClose={close} />}
    {dialog && dialog.type !== 'share' && <FileForm key={dialog.type} type={dialog.type} file={find(state, 'files', dialog.fileId)} folders={folders} onClose={close}
      onSave={(fields) => {
        const action = { ...fields, type: dialog.type, fileId: dialog.fileId }
        if (dialog.type === 'create') return openNew({ ...action, folderId: folder?.id ?? null }, 'Design file created')
        const messages = { rename: 'File renamed', move: 'File moved', trash: 'Moved to Trash' }
        if (perform(action, messages[dialog.type])) close()
      }} />}
  </div>
}

function FileTile({ file, list, starred, onAction }) {
  const { state } = useWorkspace()
  const trashed = file.status === 'trashed'
  const title = fileName(file)
  const info = <><b title={title}>{title}</b><small>{destination(state, file)}<span aria-hidden="true"> · </span>{relativeDate(file.updatedAt)}</small></>
  const actions = trashed ? [] : [
    ...(editable(state, file) ? [['rename', 'Rename'], ['move', 'Move']] : []),
    ['duplicate', 'Duplicate'], ['star', starred ? 'Unstar' : 'Star'], ['share', 'Share'],
    ...(owns(state, file) ? [['trash', 'Move to Trash']] : []),
  ]
  const content = <><Preview variant={file.preview} compact={list} /><span className="file-info">{info}</span></>
  return <article className="file-card">
    {trashed ? <div className="file-open">{content}</div> : <SessionLink to={filePath(file.id)} className="file-open" aria-label={title}>{content}</SessionLink>}
    <div className="file-tools">
      {starred && !trashed && <span className="star-mark" aria-label="Starred" title="Starred">★</span>}
      {trashed ? <button type="button" onClick={() => onAction('restore')} aria-label={'Restore ' + title}>Restore</button>
        : <FileMenu title={title} actions={actions} onAction={onAction} />}
    </div>
  </article>
}

function FileMenu({ title, actions, onAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const trigger = useRef(null)
  const last = useRef(false)
  useEffect(() => {
    if (!open) return
    const buttons = ref.current.querySelectorAll('[role=menuitem]')
    buttons[last.current ? buttons.length - 1 : 0]?.focus()
    const outside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function keys(event) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Tab'].includes(event.key)) return
    if (event.key === 'Tab') { setOpen(false); return }
    event.preventDefault()
    if (event.key === 'Escape') { setOpen(false); trigger.current.focus(); return }
    const buttons = [...ref.current.querySelectorAll('[role=menuitem]')]
    const index = buttons.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }
  return <div className="file-menu" ref={ref}>
    <button type="button" ref={trigger} className="icon-button quiet" aria-label={'Actions for ' + title} aria-haspopup="menu" aria-expanded={open}
      onClick={() => { last.current = false; setOpen(!open) }}
      onKeyDown={(event) => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); last.current = event.key === 'ArrowUp'; setOpen(true) } }}><Icon name="more" /></button>
    {open && <div role="menu" aria-label={'Actions for ' + title} className="menu" onKeyDown={keys}>
      {actions.map(([type, label]) => <button key={type} type="button" role="menuitem" className={type === 'trash' ? 'destructive-text' : ''}
        onClick={() => { trigger.current.focus(); setOpen(false); onAction(type) }}>{label}</button>)}
    </div>}
  </div>
}

function FileForm({ type, file, folders, onClose, onSave }) {
  const [name, setName] = useState(file?.name || '')
  const [folder, setFolder] = useState(file?.folderId ?? '')
  const validName = Boolean(name.trim()) && (type === 'create' || name.trim() !== file?.name)
  const validMove = folder !== (file?.folderId ?? '') && (!folder || folders.some((item) => item.id === folder))
  const titles = { create: 'New design file', rename: 'Rename file', move: 'Move file', trash: 'Move file to Trash?' }
  const labels = { create: 'Create file', rename: 'Save name', move: 'Move file', trash: 'Move to Trash' }
  const named = type === 'create' || type === 'rename'
  const disabled = (named && !validName) || (type === 'move' && !validMove)
  return <Modal title={titles[type]} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (!disabled) onSave({ name, folderId: folder || null }) }}>
      {named && <div className="field"><label htmlFor="file-form-name">File name</label><input id="file-form-name" data-focus value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your design" required aria-describedby={name && !name.trim() ? 'file-form-hint' : undefined} />
        {name && !name.trim() && <small id="file-form-hint" className="destructive-text">Enter a nonblank name.</small>}</div>}
      {type === 'move' && <div className="field"><label htmlFor="file-form-destination">Destination</label><select id="file-form-destination" data-focus value={folder} onChange={(event) => setFolder(event.target.value)} aria-describedby={!validMove ? 'file-form-hint' : undefined}>
        <option value="">Drafts</option>
        {folder && !folders.some((item) => item.id === folder) && <option value={folder}>Unavailable folder</option>}
        {folders.map((item) => <option key={item.id} value={item.id}>{item.name || 'Untitled folder'}</option>)}
      </select>{!validMove && <small id="file-form-hint">Choose a different destination.</small>}</div>}
      {type === 'trash' && <p><strong>{fileName(file)}</strong> will move to Trash. You can restore it later.</p>}
      <FormFooter onClose={onClose} label={labels[type]} disabled={disabled} danger={type === 'trash'} />
    </form>
  </Modal>
}

