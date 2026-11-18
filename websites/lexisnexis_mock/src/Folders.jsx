import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  activeFolder, byId, docPath, duplicateItem, filterLabel, filterSnapshot, folderLabel, folderPath,
  folderTrail, includes, nameOf, newest, patchRows, researchPath, titleCase, validateFolder,
} from './model.js'
import { useWorkspace } from './store.jsx'
import { Badge, Confirm, Icon, List, Missing, Modal, Moment, PageHead, Panel, Select, SiteLink } from './ui.jsx'

const activeItems = (items, id) => items.filter((item) => item.folderId === id && item.status !== 'removed')
const choices = (folders, excluded) => Object.fromEntries(folders
  .filter((row) => row.id !== excluded && activeFolder(folders, row.id))
  .map((row) => [row.id, folderLabel(folders, row.id)]).sort((a, b) => a[1].localeCompare(b[1])))
const updateRow = (rows, row, changes, update) => patchRows(rows, new Map([[row.id, { ...row, ...changes, ...update }]]))

function FolderEditor({ folder, parentId, onClose }) {
  const { state, commit } = useWorkspace()
  const [name, setName] = useState(folder?.name || '')
  const [parent, setParent] = useState(parentId || '')
  const [error, setError] = useState('')
  return <Modal title={folder ? 'Rename folder' : 'New folder'} onClose={onClose}>
    <form className="compact-stack" onSubmit={(event) => {
      event.preventDefault()
      const cleaned = name.trim()
      const issue = commit((current, meta) => {
        const row = folder && byId(current.folders, folder.id)
        if (folder && !activeFolder(current.folders, folder.id)) return 'This folder is unavailable.'
        const parentId = row ? row.parentId ?? null : parent || null
        const validation = validateFolder(current.folders, cleaned, parentId, row?.id)
        if (validation) return validation
        return { folders: row ? updateRow(current.folders, row, { name: cleaned }, meta.update) :
          [...current.folders, { id: meta.id('folder'), name: cleaned, parentId, status: 'active', ...meta.create }] }
      }, folder ? 'Folder renamed.' : 'Folder created.')
      if (issue) setError(issue)
      else onClose()
    }}>
      <label className="field"><span>Folder name</span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></label>
      {!folder && <Select label="Parent folder" options={choices(state.folders)} empty="No parent (top level)" value={parent} onChange={setParent} />}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{folder ? 'Save changes' : 'Create folder'}</button></div>
    </form>
  </Modal>
}

function FolderRow({ folder }) {
  const { state } = useWorkspace()
  const count = activeItems(state.folderItems, folder.id).length
  return <li className="row"><div className="row-main"><span className="row-icon"><Icon name="folder" /></span>
    <div className="row-copy"><SiteLink to={folderPath(folder.id)}>{nameOf(folder, 'name')}</SiteLink>
      {folder.parentId && <p className="meta">{folderLabel(state.folders, folder.parentId)}</p>}</div></div>
    <div className="row-data"><span>{count} {count === 1 ? 'item' : 'items'}</span><Moment value={folder.updatedAt || folder.createdAt} /></div>
  </li>
}

function restoreFolder(commit, folderId) {
  return commit((current, meta) => {
    const row = byId(current.folders, folderId)
    if (!row || row.status !== 'archived') return 'This folder is no longer in the recycle bin.'
    if (folderTrail(current.folders, row.id) === null) return 'The parent folder is unavailable.'
    const validation = validateFolder(current.folders, row.name || '', row.parentId ?? null, row.id)
    if (validation) return validation
    return { folders: updateRow(current.folders, row, { status: 'active' }, meta.update) }
  }, 'Folder restored.')
}

function restoreItem(commit, itemId) {
  return commit((current, meta) => {
    const item = byId(current.folderItems, itemId)
    if (!item || item.status !== 'removed') return 'This item is no longer in the recycle bin.'
    if (!activeFolder(current.folders, item.folderId)) return 'Restore the destination folder before restoring this item.'
    if (duplicateItem(current.folderItems, item, item.folderId, item.id)) return 'An active copy already exists in this folder.'
    return { folderItems: updateRow(current.folderItems, item, { status: 'active' }, meta.update) }
  }, 'Item restored.')
}

function RecycleBin() {
  const { state, commit } = useWorkspace()
  const [error, setError] = useState('')
  const folders = state.folders.filter((folder) => folder.status === 'archived')
  const items = state.folderItems.filter((item) => item.status === 'removed')
  return <div className="stack">
    {error && <p className="error" role="alert">{error}</p>}
    <Panel title="Archived folders"><List count={folders.length} label="folder" empty="There are no archived folders.">
      {folders.map((folder) => <li className="row" key={folder.id}>
        <div className="row-main"><div className="row-copy"><strong>{nameOf(folder, 'name')}</strong>{folder.parentId && <p className="meta">{folderLabel(state.folders, folder.parentId)}</p>}</div></div>
        <button onClick={() => setError(restoreFolder(commit, folder.id))}>Restore folder</button>
      </li>)}
    </List></Panel>
    <Panel title="Removed items"><List count={items.length} label="item" empty="There are no removed items.">
      {items.map((item) => <li className="row" key={item.id}>
        <div className="row-main"><div className="row-copy"><strong>{nameOf(item)}</strong><p className="meta">{folderLabel(state.folders, item.folderId)}</p></div></div>
        <button onClick={() => setError(restoreItem(commit, item.id))}>Restore item</button>
      </li>)}
    </List></Panel>
  </div>
}

export function Folders() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [recycle, setRecycle] = useState(false)
  const [editing, setEditing] = useState(false)
  const folders = state.folders.filter((folder) => activeFolder(state.folders, folder.id) && includes(folder.name, query))
    .sort((a, b) => sort === 'name' ? nameOf(a, 'name').localeCompare(nameOf(b, 'name')) : newest(a, b))
  return <>
    <PageHead title={recycle ? 'Recycle bin' : 'Folders'} description={recycle ? 'Restore archived folders and removed research items.' : 'Organize research, citations and saved searches by matter.'}
      actions={recycle ? <button onClick={() => setRecycle(false)}>Back to folders</button> : <>
        <button onClick={() => setRecycle(true)}><Icon name="archive" />Recycle bin</button>
        <button className="primary" onClick={() => setEditing(true)}><Icon name="plus" />New folder</button>
      </>} />
    {recycle ? <RecycleBin /> : <Panel>
      <div className="toolbar filters"><label className="field search-field"><span>Search folders</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Folder name" /></label>
        <Select label="Sort by" options={{ recent: 'Recently updated', name: 'Folder name' }} value={sort} onChange={setSort} /></div>
      <List count={folders.length} label="folder" empty={query ? 'No folders match this name.' : 'Create a folder to start organizing your research.'}>
        {folders.map((folder) => <FolderRow folder={folder} key={folder.id} />)}
      </List>
    </Panel>}
    {editing && <FolderEditor onClose={() => setEditing(false)} />}
  </>
}

function DestinationPicker({ title, action, item, sourceId, onClose, onSubmit }) {
  const { state } = useWorkspace()
  const [selected, setSelected] = useState('')
  const [filter, setFilter] = useState('')
  const [inline, setInline] = useState(false)
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [itemTitle, setItemTitle] = useState(item?.title || '')
  const [error, setError] = useState('')
  const locations = Object.entries(choices(state.folders, sourceId)).filter(([, label]) => includes(label, filter))
  return <Modal title={title} onClose={onClose}>
    <form className="compact-stack" onSubmit={(event) => {
      event.preventDefault()
      const issue = onSubmit({
        folderId: selected, newFolder: inline ? { name: name.trim(), parentId: parent || null } : null,
        itemTitle: itemTitle.trim(),
      })
      if (issue) setError(issue)
      else onClose()
    }}>
      {item?.kind === 'search' && <label className="field"><span>Saved search name</span><input autoFocus value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} /></label>}
      {item && <p className="muted">{item.kind === 'search' ? [item.query, filterLabel(item.filters)].filter(Boolean).join(' · ') : item.title}</p>}
      <div className="actions"><button type="button" onClick={() => { setInline(!inline); setError('') }}>{inline ? 'Choose existing folder' : 'Create a folder here'}</button></div>
      {inline ? <>
        <label className="field"><span>Folder name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <Select label="Parent folder" options={choices(state.folders)} empty="No parent (top level)" value={parent} onChange={setParent} />
      </> : <>
        <label className="field"><span>Find a folder</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
        <fieldset><legend>Destination folder</legend><div className="picker-list">
          {locations.length ? locations.map(([id, label]) => <label key={id} className="check">
            <input type="radio" name="destination" checked={selected === id} onChange={() => { setSelected(id); setError('') }} />{label}
          </label>) : <p className="empty">No available folders match.</p>}
        </div></fieldset>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{action}</button></div>
    </form>
  </Modal>
}

function resolveDestination(current, meta, request) {
  if (!request.newFolder) return activeFolder(current.folders, request.folderId)
    ? { folderId: request.folderId } : 'Choose an available destination folder.'
  const { name, parentId } = request.newFolder
  const issue = validateFolder(current.folders, name, parentId)
  if (issue) return issue
  const row = { id: meta.id('folder'), name, parentId, status: 'active', ...meta.create }
  return { folderId: row.id, folders: [...current.folders, row] }
}

export function SaveToFolder({ item, onClose, onSaved }) {
  const { commit } = useWorkspace()
  const title = item.kind === 'citation' ? 'Save citation to folder' : item.kind === 'search' ? 'Save search' : 'Save to folder'
  return <DestinationPicker title={title} action="Save to folder" item={item} onClose={onClose} onSubmit={(request) => {
    if (item.kind === 'search' && !request.itemTitle) return 'Enter a name for the saved search.'
    const issue = commit((current, meta) => {
      if (item.documentId && !byId(current.documents, item.documentId)) return 'This document is unavailable.'
      const destination = resolveDestination(current, meta, request)
      if (typeof destination === 'string') return destination
      const { folderId, ...related } = destination
      const newItem = { ...item, id: meta.id('item'), folderId, title: request.itemTitle || item.title, note: '', status: 'active', ...meta.create }
      if (item.kind === 'search') newItem.filters = filterSnapshot(item.filters)
      if (duplicateItem(current.folderItems, newItem, folderId)) return 'This item is already saved in that folder.'
      if (item.kind === 'citation') {
        const { documentId, format, includeLink, citationText } = newItem
        related.citationActions = [...current.citationActions, {
          id: meta.id('cite-action'), type: 'saved', documentId, format, includeLink, citationText, folderId, folderItemId: newItem.id, ...meta.create,
        }]
      }
      return { ...related, folderItems: [...current.folderItems, newItem] }
    }, item.kind === 'citation' ? 'Citation saved to folder.' : item.kind === 'search' ? 'Search saved to folder.' : 'Document saved to folder.')
    if (!issue) onSaved?.()
    return issue
  }} />
}

function ItemEditor({ item, mode, onClose }) {
  const { commit } = useWorkspace()
  const renaming = mode === 'rename'
  const [value, setValue] = useState((renaming ? item.title : item.note) || '')
  const [error, setError] = useState('')
  return <Modal title={renaming ? 'Rename saved search' : 'Edit item note'} onClose={onClose}>
    <form className="compact-stack" onSubmit={(event) => {
      event.preventDefault()
      const cleaned = value.trim()
      if (renaming && !cleaned) { setError('Enter a name for the saved search.'); return }
      const issue = commit((current, meta) => {
        const row = byId(current.folderItems, item.id)
        if (!row || row.status === 'removed' || !activeFolder(current.folders, row.folderId)) return 'This item is unavailable.'
        return { folderItems: updateRow(current.folderItems, row, renaming ? { title: cleaned } : { note: cleaned }, meta.update) }
      }, renaming ? 'Saved search renamed.' : cleaned ? 'Note saved.' : 'Note cleared.')
      if (issue) setError(issue)
      else onClose()
    }}>
      <label className="field"><span>{renaming ? 'Saved search name' : 'Note'}</span>{renaming
        ? <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
        : <textarea autoFocus value={value} onChange={(event) => setValue(event.target.value)} />}</label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {!renaming && <button type="button" className="text-button" onClick={() => setValue('')}>Clear note</button>}
        <button type="button" onClick={onClose}>Cancel</button><button className="primary">{renaming ? 'Save changes' : 'Save note'}</button>
      </div>
    </form>
  </Modal>
}

function transferItems(commit, ids, sourceId, mode, request) {
  let skipped = 0
  return commit((current, meta) => {
    if (!activeFolder(current.folders, sourceId)) return 'The source folder is unavailable.'
    const destination = resolveDestination(current, meta, request)
    if (typeof destination === 'string') return destination
    const { folderId, ...related } = destination
    if (folderId === sourceId) return 'Select a different folder.'
    const items = [...current.folderItems]
    const changes = new Map()
    for (const id of ids) {
      const item = byId(current.folderItems, id)
      if (!item || item.folderId !== sourceId || item.status === 'removed' || duplicateItem(items, item, folderId)) {
        skipped++
        continue
      }
      if (mode === 'move') {
        const moved = { ...item, folderId, ...meta.update }
        changes.set(id, moved)
        items.push(moved)
      } else {
        const { updatedAt, updatedBy, ...copy } = item
        items.push({ ...copy, id: meta.id('item'), folderId, ...meta.create })
        changes.set(id, item)
      }
    }
    if (!changes.size) return ids.length === 1 ? 'This item is unavailable or already exists in the destination.' : `No selected items can be transferred. ${skipped} skipped.`
    return { ...related, folderItems: mode === 'move' ? patchRows(current.folderItems, changes) : items }
  }, () => `${ids.length - skipped} ${ids.length - skipped === 1 ? 'item' : 'items'} ${mode === 'move' ? 'moved' : 'copied'}.${skipped ? ` ${skipped} skipped.` : ''}`)
}

function removeItems(commit, ids, folderId) {
  let skipped = 0
  return commit((current, meta) => {
    if (!activeFolder(current.folders, folderId)) return 'This folder is unavailable.'
    const changes = new Map()
    for (const id of ids) {
      const item = byId(current.folderItems, id)
      if (item?.folderId === folderId && item.status !== 'removed') changes.set(id, { ...item, status: 'removed', ...meta.update })
      else skipped++
    }
    if (!changes.size) return 'No selected items are available to remove.'
    return { folderItems: patchRows(current.folderItems, changes) }
  }, () => `${ids.length - skipped} ${ids.length - skipped === 1 ? 'item' : 'items'} moved to the recycle bin.${skipped ? ` ${skipped} skipped.` : ''}`)
}

function ItemRow({ item, document, selected, onSelect, onAction }) {
  const queryDescription = [item.query, filterLabel(item.filters)].filter(Boolean).join(' · ')
  const itemTitle = nameOf(item)
  const citation = item.kind === 'citation' ? String(item.citationText || '') : ''
  const documentPath = document && docPath(document.id)
  const path = documentPath && citation.endsWith(`\n${documentPath}`) ? documentPath : null
  return <li className="row">
    {onSelect && <input type="checkbox" aria-label={`Select ${itemTitle}`} checked={selected} onChange={onSelect} />}
    <div className="row-main"><span className="row-icon"><Icon name={item.kind === 'search' ? 'search' : item.kind === 'citation' ? 'citation' : 'file'} /></span>
      <div className="row-copy">
        {document ? <SiteLink to={docPath(document.id)}>{itemTitle}</SiteLink> : <strong>{itemTitle}</strong>}
        <p className="meta">{item.kind === 'search' ? queryDescription || 'Query unavailable' : document?.citation || (document ? 'Citation unavailable' : 'Document unavailable')}</p>
        {citation && <p className="meta">{path ? citation.slice(0, -(path.length + 1)) : citation}{path && document && <> · <SiteLink to={path}>Local citation link</SiteLink></>}</p>}
        {item.note && <p className="result-excerpt"><strong>Note</strong> {item.note}</p>}
      </div>
    </div>
    <div className="row-data"><Badge label={titleCase(item.kind) || 'Item'} /></div>
    <div className="actions item-actions">
      {item.kind === 'search' && item.query && <SiteLink to={researchPath(item.query, item.filters)} className="button">Run saved search</SiteLink>}
      <Select label={`Actions for ${itemTitle}`} options={{ note: 'Edit note', ...(item.kind === 'search' ? { rename: 'Rename saved search' } : {}), move: 'Move', copy: 'Copy', remove: 'Remove' }}
        empty="Item actions" value="" onChange={onAction} compact />
    </div>
  </li>
}

export function FolderDetail() {
  const { folderId } = useParams()
  return <FolderView key={folderId} folderId={folderId} />
}

function FolderView({ folderId }) {
  const { state, commit } = useWorkspace()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [selection, setSelection] = useState([])
  const close = () => setModal(null)
  const folder = byId(state.folders, folderId)
  if (!folder || !activeFolder(state.folders, folderId)) return <Missing title="Folder unavailable" description="This folder may be archived or its parent may be unavailable." to="/folders" label="Back to folders" />
  const trail = folderTrail(state.folders, folderId)
  const children = state.folders.filter((row) => row.parentId === folderId && activeFolder(state.folders, row.id))
  const rows = activeItems(state.folderItems, folderId).filter((row) => {
    const linked = byId(state.documents, row.documentId)
    return includes([row.title, row.query, row.note, row.citationText, linked?.citation].join(' '), query)
  }).sort(newest)
  const selected = rows.filter((row) => selection.includes(row.id)).map((row) => row.id)
  const name = nameOf(folder, 'name')
  const pickedIds = modal?.item ? [modal.item.id] : modal?.ids || []
  const complete = () => { close(); setSelection((previous) => previous.filter((id) => !pickedIds.includes(id))) }
  const itemTarget = modal?.item ? `“${nameOf(modal.item)}”` : `${pickedIds.length} selected items`
  return <>
    <PageHead title={name} actions={<>
      <button onClick={() => setModal({ mode: 'rename-folder' })}>Rename folder</button>
      <button onClick={() => setModal({ mode: 'archive' })}>Archive folder</button>
      <button className="primary" onClick={() => setModal({ mode: 'new' })}><Icon name="plus" />New folder</button>
    </>}>
      <nav className="crumbs" aria-label="Breadcrumb"><SiteLink to="/folders">Folders</SiteLink>
        {trail.map((row) => <span className="crumbs-part" key={row.id}><Icon name="chevron" size={13} />
          {row.id === folderId ? <span aria-current="page">{name}</span> : <SiteLink to={folderPath(row.id)}>{nameOf(row, 'name')}</SiteLink>}</span>)}
      </nav>
    </PageHead>
    <div className="stack">
      {children.length > 0 && <Panel title="Subfolders"><List count={children.length} label="subfolder">
        {children.map((row) => <FolderRow folder={row} key={row.id} />)}
      </List></Panel>}
      <Panel title="Saved material">
        <div className="toolbar"><label className="field"><span>Search within folder</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, citation, query or note" /></label>
          {rows.length > 0 && <div className="actions">
            <label className="check"><input type="checkbox" checked={selected.length === rows.length} onChange={() => {
              setSelection(selected.length === rows.length ? [] : rows.map((row) => row.id))
            }} />Select all visible</label>
            {selected.length > 0 && <><span className="meta">{selected.length} selected</span>{['move', 'copy', 'remove'].map((mode) =>
              <button key={mode} onClick={() => setModal({ mode, ids: selected })}>{titleCase(mode)} selected</button>)}</>}
          </div>}
        </div>
        <List count={rows.length} label="item" empty={query ? 'No items match this search.' : 'This folder has no saved material.'}>
          {rows.map((item) => <ItemRow key={item.id} item={item} document={byId(state.documents, item.documentId)}
            selected={selection.includes(item.id)} onSelect={() => setSelection((previous) => previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])}
            onAction={(mode) => { if (mode) setModal({ mode, item }) }} />)}
        </List>
      </Panel>
    </div>
    {modal?.mode === 'new' && <FolderEditor parentId={folderId} onClose={close} />}
    {modal?.mode === 'rename-folder' && <FolderEditor folder={folder} onClose={close} />}
    {modal?.mode === 'archive' && <Confirm title="Archive folder" description={`Archive “${name}”? Its subfolders and saved material will be hidden until the folder is restored.`} action="Archive folder" onClose={close}
      onConfirm={() => commit((current, meta) => {
        const row = byId(current.folders, folderId)
        if (!activeFolder(current.folders, folderId)) return 'This folder is unavailable.'
        return { folders: updateRow(current.folders, row, { status: 'archived' }, meta.update) }
      }, 'Folder moved to the recycle bin.')} />}
    {['note', 'rename'].includes(modal?.mode) && <ItemEditor item={modal.item} mode={modal.mode} onClose={close} />}
    {['move', 'copy'].includes(modal?.mode) && <DestinationPicker title={`${titleCase(modal.mode)} ${modal.item ? 'item' : 'selected items'}`} action={`${titleCase(modal.mode)} to folder`}
      sourceId={folderId} onClose={close} onSubmit={(request) => {
        const issue = transferItems(commit, pickedIds, folderId, modal.mode, request)
        if (!issue) complete()
        return issue
      }} />}
    {modal?.mode === 'remove' && <Confirm title={modal.item ? 'Remove item' : 'Remove selected items'} description={`Move ${itemTarget} to the recycle bin?`} action="Remove" onClose={close} onSuccess={complete}
      onConfirm={() => removeItems(commit, pickedIds, folderId)} />}
  </>
}
