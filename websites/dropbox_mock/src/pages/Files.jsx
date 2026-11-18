import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Folder, FolderPlus, Info, Upload } from 'lucide-react'
import { accessLabel, active, ancestry, getFile, parentOf, pathLabel, routeFor } from '../model'
import { Breadcrumbs, dateLabel, Dialog, Empty, FileMark, Missing, PageHeading, RowMenu, sizeLabel, userName } from '../ui'
import { NameDialog, OrganizeDialog, UploadDialog } from '../fileDialogs'
import { ShareDialog } from '../shareDialog'
import { useStore } from '../store'
import { withSid } from '../utils/dataManager'

function ItemName({ item }) {
  return <Link className="item-name" data-item-link to={withSid(routeFor(item))}><FileMark item={item} /><span>{item.name || 'Untitled item'}</span></Link>
}

function Sidebar({ state, folderId }) {
  const [open, setOpen] = useState(false)
  const branches = ancestry(state, folderId).items
  const visibleParents = new Set([null, ...branches.map(folder => folder.id)])
  const byParent = new Map()
  for (const file of state.files) {
    const parent = parentOf(file)
    if (file.kind !== 'folder' || !active(file) || !visibleParents.has(parent)) continue
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(file)
  }
  function rows(parent, visited = new Set()) {
    return [...(byParent.get(parent) || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')).filter(item => !visited.has(item.id)).map(item => <li key={item.id}>
      <Link to={withSid(routeFor(item))} aria-current={item.id === folderId ? 'page' : undefined}><Folder size={15} />{item.name || 'Untitled folder'}</Link>
      {visibleParents.has(item.id) && <ul>{rows(item.id, new Set([...visited, item.id]))}</ul>}
    </li>)
  }
  return <aside className="folder-rail">
    <button className="button folder-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}><Folder size={16} />Folders</button>
    <nav aria-label="Folders" className={open ? 'rail-links open' : 'rail-links'}>
      <h2>Folders</h2>
      <Link className="root-folder" to={withSid('/files')} aria-current={folderId == null ? 'page' : undefined}><Folder size={16} />All files</Link>
      <ul>{rows(null)}</ul>
    </nav>
  </aside>
}

const columns = [['name', 'Name'], ['updatedAt', 'Modified'], ['access', 'Access'], ['sizeBytes', 'Size']]
const matchesType = (file, type) => type === 'all' || (type === 'folders' ? file.kind === 'folder' : type === 'images' ? file.mimeType?.startsWith('image/') : file.kind !== 'folder')

export function FilesPage() {
  const { state } = useStore()
  const { id } = useParams()
  const parent = id ?? null
  const folder = getFile(state, parent)
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const [type, setType] = useState('all')
  const [sort, setSort] = useState({ key: 'name', descending: false })
  const [details, setDetails] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [dialog, setDialog] = useState(null)
  const [uploads, setUploads] = useState([])
  const [dragging, setDragging] = useState(false)
  const uploadInput = useRef()
  const dragDepth = useRef(0)
  const table = useRef(null)
  useEffect(() => {
    function shortcut(event) {
      const target = event.target
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        target.closest('input, textarea, select, [contenteditable], dialog, details[open]')) return
      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('workspace-search')?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp'].includes(event.key) || (target !== document.body && !target.matches('[data-item-link]'))) return
      const links = Array.from(table.current?.querySelectorAll('[data-item-link]') || [])
      if (!links.length) return
      event.preventDefault()
      const index = links.indexOf(target)
      const next = event.key === 'ArrowDown' ? Math.min(index + 1, links.length - 1) : index < 0 ? links.length - 1 : Math.max(index - 1, 0)
      links[next].focus()
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])
  function queueUploads(list) {
    if (list.length) setUploads(Array.from(list))
  }
  const files = useMemo(() => {
    const rows = state.files.filter(file => active(file) && (query ? (file.name || '').toLowerCase().includes(query.toLowerCase()) : parentOf(file) === parent) && matchesType(file, type))
    const values = new Map(rows.map(file => [file.id, sort.key === 'access' ? accessLabel(state, file) : file[sort.key]]))
    return rows.sort((a, b) => {
      const first = values.get(a.id)
      const second = values.get(b.id)
      const comparison = sort.key === 'sizeBytes' ? (first ?? -1) - (second ?? -1) : String(first ?? '').localeCompare(String(second ?? ''), 'en', { numeric: true, sensitivity: 'base' })
      return sort.descending ? -comparison : comparison
    })
  }, [state, parent, query, type, sort])
  if (id && !ancestry(state, id).valid) return <Missing title="Folder unavailable" />
  const detail = files.find(item => item.id === details)
  const selection = files.filter(item => selected.has(item.id))
  const allChecked = files.length > 0 && selection.length === files.length
  function toggle(id) {
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return <div className="files-layout">
    <Sidebar state={state} folderId={parent} />
    <section className={dragging ? 'file-index dragging' : 'file-index'} onDragEnter={event => {
      if (query || !event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      dragDepth.current++
      setDragging(true)
    }} onDragOver={event => {
      if (event.dataTransfer.types.includes('Files')) {
        event.preventDefault()
        event.dataTransfer.dropEffect = query ? 'none' : 'copy'
      }
    }} onDragLeave={() => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (!dragDepth.current) setDragging(false)
    }} onDrop={event => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      if (!query) queueUploads(event.dataTransfer.files)
    }}>
      {folder && <Breadcrumbs state={state} parentId={parentOf(folder)} last={folder.name} />}
      <PageHeading title={query ? 'Search results' : folder?.name || 'All files'} subtitle={query ? 'Names matching “' + query + '” across your workspace' : undefined}>
        {!query && <>
          <button className="button" onClick={() => setDialog({ mode: 'folder' })}><FolderPlus size={17} />New folder</button>
          <button className="button primary" onClick={() => uploadInput.current.click()}><Upload size={17} />Upload files</button>
          <input type="file" multiple hidden ref={uploadInput} aria-label="Select files to upload" onChange={event => {
            queueUploads(event.currentTarget.files)
            event.currentTarget.value = ''
          }} />
        </>}
      </PageHeading>
      {dragging && <div className="drop-message"><Upload size={21} />Drop files to upload</div>}
      <div className="index-tools"><label className="inline"><span>Type</span><select aria-label="Filter by type" value={type} onChange={event => setType(event.target.value)}>
        <option value="all">All items</option><option value="folders">Folders</option><option value="files">Files</option><option value="images">Images</option>
      </select></label><span className="metadata">{files.length} {files.length === 1 ? 'item' : 'items'}</span></div>
      {!!selection.length && <div className="selection-bar">
        <strong>{selection.length} selected</strong>
        <button type="button" className="button" onClick={() => setDialog({ mode: 'move', items: selection })}>Move selected</button>
        <button type="button" className="button" onClick={() => setDialog({ mode: 'delete', items: selection })}>Delete selected</button>
        <button type="button" className="text-button" onClick={() => setSelected(new Set())}>Clear selection</button>
      </div>}
      {files.length ? <div className="table-card"><table className="file-table" ref={table}>
        <thead><tr>
          <th className="check-cell"><input type="checkbox" aria-label="Select all visible items" checked={allChecked} ref={node => {
            if (node) node.indeterminate = selection.length > 0 && !allChecked
          }} onChange={() => setSelected(allChecked ? new Set() : new Set(files.map(item => item.id)))} /></th>
          {columns.map(([key, label]) => <th key={key} className={key === 'name' ? 'name-cell' : 'file-meta'} aria-sort={sort.key === key ? sort.descending ? 'descending' : 'ascending' : undefined}>
            <button className="sort" type="button" onClick={() => setSort({ key, descending: sort.key === key && !sort.descending })}>{label}{sort.key === key && (sort.descending ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}</button>
          </th>)}
          <th aria-label="Actions" className="row-end" />
        </tr></thead>
        <tbody>{files.map(item => <tr key={item.id} className={selected.has(item.id) ? 'selected' : undefined}>
          <td className="check-cell"><input type="checkbox" aria-label={'Select ' + (item.name || 'untitled item')} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
          <td className="name-cell"><ItemName item={item} />{query && <span className="file-location metadata">{pathLabel(state, parentOf(item))}</span>}</td>
          <td className="file-meta">{dateLabel(item.updatedAt)}</td><td className="file-meta">{accessLabel(state, item)}</td><td className="file-meta">{sizeLabel(item.sizeBytes)}</td>
          <td className="row-end"><RowMenu label={item.name || 'untitled item'}>
            <button className="mobile-details" type="button" onClick={() => setDetails(item.id)}><Info size={16} />Details</button>
            <button type="button" onClick={() => setDialog({ mode: 'share', items: [item] })}>Share</button>
            <button type="button" onClick={() => setDialog({ mode: 'rename', items: [item] })}>Rename</button>
            <button type="button" onClick={() => setDialog({ mode: 'move', items: [item] })}>Move</button>
            <button type="button" onClick={() => setDialog({ mode: 'copy', items: [item] })}>Copy</button>
            {item.kind === 'file' && <Link to={withSid(routeFor(item) + '/versions')}>Version history</Link>}
            <button type="button" className="danger-text" onClick={() => setDialog({ mode: 'delete', items: [item] })}>Delete</button>
          </RowMenu></td>
        </tr>)}</tbody>
      </table></div> : <Empty title={query || type !== 'all' ? 'No matching items' : 'This folder is empty'} text={query || type !== 'all' ? 'Try a different search or file type.' : 'Add files to start organizing this folder.'} />}
      {dialog?.mode === 'folder' && <NameDialog mode="folder" parentId={parent} onClose={() => setDialog(null)} />}
      {dialog?.mode === 'share' && <ShareDialog fileId={dialog.items[0].id} onClose={() => setDialog(null)} />}
      {dialog?.mode === 'rename' && <NameDialog mode="rename" item={dialog.items[0]} onClose={() => setDialog(null)} />}
      {dialog && ['move', 'copy', 'delete'].includes(dialog.mode) && <OrganizeDialog operation={dialog.mode} items={dialog.items} onClose={committed => {
        if (committed === true) setSelected(new Set())
        setDialog(null)
      }} />}
      {!!uploads.length && <UploadDialog files={uploads} parentId={parent} onClose={() => setUploads([])} />}
      {detail && <Dialog title={detail.name || 'Item details'} onClose={() => setDetails(null)}>
        <dl className="file-details"><dt>Modified</dt><dd>{dateLabel(detail.updatedAt)}</dd><dt>Access</dt><dd>{accessLabel(state, detail)}</dd><dt>Size</dt><dd>{sizeLabel(detail.sizeBytes)}</dd></dl>
      </Dialog>}
    </section>
  </div>
}

export function DeletedPage() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const rows = state.files.filter(file => file.status === 'deleted' && (!file.deletionRootId || file.deletionRootId === file.id) &&
    (file.name || '').toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
  return <section>
    <PageHeading title="Deleted files" subtitle="Restore items to their original location or choose another folder." />
    <div className="index-tools"><input type="search" aria-label="Search deleted files" placeholder="Search deleted files" value={query} onChange={event => setQuery(event.target.value)} /><span className="metadata">{rows.length} {rows.length === 1 ? 'item' : 'items'}</span></div>
    {rows.length ? <div className="table-card"><table>
      <thead><tr><th>Name</th><th className="file-meta">Original location</th><th className="file-meta">Deleted</th><th className="file-meta">Deleted by</th><th aria-label="Actions" /></tr></thead>
      <tbody>{rows.map(item => <tr key={item.id}>
        <td><span className="item-name"><FileMark item={item} />{item.name || 'Untitled item'}</span>
          <span className="deleted-mobile metadata">{pathLabel(state, parentOf(item), true)} · {dateLabel(item.deletedAt)} · {userName(state, item.deletedBy)}</span></td>
        <td className="file-meta">{pathLabel(state, parentOf(item), true)}</td><td className="file-meta">{dateLabel(item.deletedAt)}</td><td className="file-meta">{userName(state, item.deletedBy)}</td>
        <td><button type="button" className="button compact" aria-label={'Restore ' + item.name} onClick={() => setSelected(item)}>Restore</button></td>
      </tr>)}</tbody>
    </table></div> : <Empty title={query ? 'No matching deleted files' : 'No deleted files'} text={query ? 'Try another filename.' : 'Items you delete appear here.'} />}
    {selected && <OrganizeDialog operation="restore" items={[selected]} onClose={() => setSelected(null)} />}
  </section>
}
