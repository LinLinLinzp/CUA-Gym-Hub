import { Download, FileText, Folder, FolderPlus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contentsPath, descendants, folderTrail, formatDate, formatSize, idFor, libraryPath, normalize, sameName, sitePath } from './model'
import { AppLink, Breadcrumb, ConfirmDelete, Empty, Field, FilterInput, FormActions, Modal, RowMenu, SortHeader, useDetail, usePaging, useRows } from './ui'
import { withSid } from './utils/dataManager'
import { useWorkspace } from './workspace'

const siblings = (entries, parentId) => entries.filter((entry) => (entry.parentId ?? null) === parentId)
const invalidName = (name) => !name || name === '.' || name === '..' || /[\\/\x00-\x1f]/.test(name)
const kindLabel = (entry) => entry.kind === 'folder' ? 'Folder' : (entry.name.split('.').length > 1 ? entry.name.split('.').at(-1).toUpperCase() + ' file' : 'File')
const sameOriginAsset = (path) => {
  if (typeof path !== 'string' || !/^\/(files|seed-files)\//.test(path)) return null
  const url = new URL(path, window.location.origin)
  return url.origin === window.location.origin && /^\/(files|seed-files)\//.test(url.pathname) ? url.pathname : null
}

export default function Library({ site }) {
  const { data } = useWorkspace()
  const { libraryId, folderId } = useParams()
  const library = data.libraries.find((record) => record.siteId === site.id && record.id === libraryId)
  if (!library) return <Empty title="Document library unavailable"><AppLink to={contentsPath(site.id)}>Return to site contents</AppLink></Empty>
  const entries = data.libraryEntries.filter((entry) => entry.libraryId === libraryId)
  const trail = folderTrail(entries, folderId)
  if (!trail) return <Empty title="Folder unavailable"><AppLink to={libraryPath(site.id, libraryId)}>Return to {library.name}</AppLink></Empty>
  return <LibraryView key={JSON.stringify([libraryId, folderId])} site={site} library={library} entries={entries} trail={trail} />
}

function LibraryView({ site, library, entries, trail }) {
  const { data, commit, notify } = useWorkspace()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadNotice, setUploadNotice] = useState('')
  const input = useRef(null)
  const [detailId, setDetail] = useDetail('file')
  const folder = trail.at(-1)
  const parentId = folder?.id ?? null
  const records = siblings(entries, parentId)
  const file = records.find((entry) => entry.id === detailId && entry.kind === 'file')
  const matches = records.filter((entry) => normalize(entry.name).includes(normalize(query)))
  const table = useRows(matches, (entry, field) => field === 'kind' ? kindLabel(entry) : entry[field], 'name')
  const page = usePaging(table.rows, JSON.stringify([query, table.sort]))
  const visible = page.rows.map((entry) => entry.id)
  const close = () => setDialog(null)
  const newFolder = () => setDialog({ type: 'folder' })

  const crumbs = [
    { name: 'Sites', to: '/sites' },
    { name: site.name, to: sitePath(site.id) },
    { name: 'Site contents', to: contentsPath(site.id) },
    { name: library.name, to: folder ? libraryPath(site.id, library.id) : undefined },
    ...trail.map((entry) => ({ name: entry.name, to: entry.id === parentId ? undefined : libraryPath(site.id, library.id, entry.id) })),
  ]

  function remove(ids) {
    commit((state, { removal }) => {
      const libraryRecords = state.libraryEntries.filter((entry) => entry.libraryId === library.id)
      const affected = descendants(libraryRecords, ids)
      return {
        ...state,
        libraryEntries: state.libraryEntries.filter((entry) => entry.libraryId !== library.id || !affected.has(entry.id)),
        removals: [...state.removals, removal('deleteLibraryEntries', library.id, [...affected])],
      }
    }, ids.length === 1 ? 'Entry deleted.' : ids.length + ' entries deleted.')
    table.toggle(ids, false)
  }

  async function upload(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length || uploading) return
    setUploading(true)
    setUploadNotice('')
    const accepted = []
    const rejected = []
    const names = new Set(records.map((entry) => normalize(entry.name)))
    for (const source of files) {
      const name = source.name.trim()
      if (invalidName(name)) rejected.push(source.name + ' (invalid name)')
      else if (names.has(normalize(name))) rejected.push(name + ' (name already exists)')
      else {
        names.add(normalize(name))
        accepted.push({ name, source })
      }
    }

    let uploaded = 0
    try {
      if (accepted.length) {
        const form = new FormData()
        for (const { name, source } of accepted) form.append('files', source, name)
        const response = await fetch(withSid('/upload'), { method: 'POST', body: form })
        if (!response.ok) throw new Error('Upload failed')
        const result = await response.json()
        if (!result.success || !Array.isArray(result.files) || result.files.length !== accepted.length) throw new Error('Upload response incomplete')

        commit((state, { created }) => {
          const libraryRecords = state.libraryEntries.filter((entry) => entry.libraryId === library.id)
          const destinationExists = state.libraries.some((record) => record.id === library.id) && folderTrail(libraryRecords, parentId)
          const reserved = new Set(siblings(libraryRecords, parentId).map((entry) => normalize(entry.name)))
          const added = []
          accepted.forEach(({ name }, index) => {
            const upload = result.files[index]
            const url = sameOriginAsset(upload?.url)
            if (!destinationExists) rejected.push(name + ' (folder unavailable)')
            else if (reserved.has(normalize(name))) rejected.push(name + ' (name already exists)')
            else if (!url || !Number.isFinite(upload.size) || upload.size < 0) rejected.push(name + ' (upload failed)')
            else {
              reserved.add(normalize(name))
              added.push({
                id: idFor('entry'), libraryId: library.id, parentId, kind: 'file', name,
                sizeBytes: upload.size, mimeType: upload.content_type || 'application/octet-stream', contentUrl: url, ...created,
              })
            }
          })
          uploaded = added.length
          return uploaded ? { ...state, libraryEntries: [...state.libraryEntries, ...added] } : state
        })
      }
    } catch {
      rejected.push(...accepted.map(({ name }) => name + ' (upload failed)'))
    } finally {
      setUploading(false)
    }
    if (rejected.length) setUploadNotice((uploaded ? uploaded + ' uploaded. ' : '') + 'Skipped: ' + rejected.join(', '))
    else notify(uploaded === 1 ? 'File uploaded.' : uploaded + ' files uploaded.')
  }

  const actionsFor = (entry) => [
    ['Rename', () => setDialog({ type: 'rename', entry })],
    ['Move to', () => setDialog({ type: 'move', entry })],
    ...(entry.kind === 'file' ? [['Copy to', () => setDialog({ type: 'copy', entry })]] : []),
    ['Delete', () => setDialog({ type: 'delete', ids: [entry.id] })],
  ]

  return <>
    <Breadcrumb links={crumbs} />
    <div className="page-heading"><div><h1>{folder?.name ?? library.name}</h1>{!folder && library.description && <p>{library.description}</p>}</div></div>
    <div className="toolbar">
      <button className="primary" disabled={uploading} onClick={() => input.current.click()}><Upload size={17} />{uploading ? 'Uploading…' : 'Upload files'}</button>
      <input ref={input} type="file" multiple hidden aria-label="Choose files to upload" onChange={upload} />
      <button onClick={newFolder}><FolderPlus size={17} />New folder</button>
      {!!table.selected.length && <><button onClick={() => setDialog({ type: 'delete', ids: table.selected })}><Trash2 size={16} />Delete</button>
        <span className="selection-count">{table.selected.length} selected</span></>}
      <div className="toolbar-end"><FilterInput label="Search this folder" value={query} setValue={setQuery} /></div>
    </div>
    <div aria-live="polite">{uploadNotice && <p className="warning">{uploadNotice}</p>}</div>
    {matches.length ? <div className="table-wrap">
      <table className="data-table library-table">
        <thead><tr>
          <th scope="col" className="check-cell"><input type="checkbox" aria-label="Select all entries on this page"
            checked={visible.every((id) => table.selected.includes(id))} onChange={(event) => table.toggle(visible, event.target.checked)} /></th>
          {[['Name', 'name'], ['Type', 'kind'], ['Modified', 'updatedAt']].map(([name, field]) =>
            <SortHeader key={field} name={name} field={field} sort={table.sort} setSort={table.setSort} />)}
          <th scope="col">Modified by</th>
          <th scope="col" className="row-actions">Actions</th>
        </tr></thead>
        <tbody>{page.rows.map((entry) => {
          const isFolder = entry.kind === 'folder'
          const actor = data.users.find((user) => user.id === entry.updatedBy)
          return <tr key={entry.id} data-selected={table.selected.includes(entry.id)}>
            <td className="check-cell"><input type="checkbox" aria-label={'Select ' + entry.name} checked={table.selected.includes(entry.id)}
              onChange={(event) => table.toggle([entry.id], event.target.checked)} /></td>
            <td>{isFolder ? <AppLink className="entry-name" to={libraryPath(site.id, library.id, entry.id)}>
              <Folder size={18} className="folder-icon" />{entry.name}
            </AppLink> : <button className="text-button entry-name" onClick={() => setDetail(entry.id)}>
              <FileText size={18} />{entry.name}
            </button>}</td>
            <td>{kindLabel(entry)}</td>
            <td>{formatDate(entry.updatedAt)}</td>
            <td>{actor?.displayName ?? '—'}</td>
            <td className="row-actions"><RowMenu label={'Actions for ' + entry.name} actions={actionsFor(entry)} /></td>
          </tr>
        })}</tbody>
      </table>
    </div> : <Empty title={query ? 'No matching entries' : 'This folder is empty'}>
      {query ? 'Try a different file or folder name.' : <button disabled={uploading} onClick={() => input.current.click()}>Upload files</button>}
    </Empty>}
    {page.controls}
    {dialog?.type === 'folder' && <NameForm library={library} parentId={parentId} records={records} onClose={close} />}
    {dialog?.type === 'rename' && <NameForm library={library} parentId={parentId} records={records} entry={dialog.entry} onClose={close} />}
    {(dialog?.type === 'move' || dialog?.type === 'copy') && <DestinationForm
      library={library} entries={entries} entry={dialog.entry} copy={dialog.type === 'copy'} onClose={close} />}
    {dialog?.type === 'delete' && <ConfirmDelete title={dialog.ids.length === 1 ? 'Delete entry' : 'Delete entries'}
      description={deleteDescription(entries, dialog.ids)} onClose={close} onConfirm={() => remove(dialog.ids)} />}
    {detailId && <Modal title={file?.name || 'File unavailable'} panel onClose={() => setDetail(null)}>
      {file ? <FilePreview key={file.id} file={file} /> : <p>This file is unavailable in the current folder.</p>}
    </Modal>}
  </>
}

function deleteDescription(entries, ids) {
  const children = descendants(entries, ids).size - ids.length
  const count = ids.length === 1 ? 'this entry' : ids.length + ' selected entries'
  return 'Permanently delete ' + count + (children ? ' and ' + children + (children === 1 ? ' descendant' : ' descendants') : '') + '?'
}

function NameForm({ library, parentId, records, entry, onClose }) {
  const { commit } = useWorkspace()
  const [name, setName] = useState(entry?.name ?? '')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const value = name.trim()
    if (invalidName(value)) {
      setError(value ? 'Use a name without slashes or reserved dots.' : 'Enter a name.')
      return
    }
    if (sameName(records, value, entry?.id)) {
      setError('An entry with this name already exists in this folder.')
      return
    }
    if (entry && value === entry.name) {
      onClose()
      return
    }
    commit((state, { created, modified }) => ({
      ...state, libraryEntries: entry
        ? state.libraryEntries.map((record) => record.id === entry.id && record.libraryId === library.id
          ? { ...record, name: value, ...modified } : record)
        : [...state.libraryEntries, { id: idFor('entry'), libraryId: library.id, parentId, kind: 'folder', name: value, ...created }],
    }), entry ? 'Entry renamed.' : 'Folder created.')
    onClose()
  }
  return <Modal title={entry ? 'Rename' : 'New folder'} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <Field label="Name" error={error}><input autoFocus aria-invalid={!!error} aria-required="true" value={name} onChange={(event) => {
        setName(event.target.value)
        setError('')
      }} /></Field>
      <FormActions action={entry ? 'Rename' : 'Create'} onClose={onClose} />
    </form>
  </Modal>
}

function DestinationForm({ library, entries, entry, copy, onClose }) {
  const { commit } = useWorkspace()
  const from = entry.parentId ?? null
  const [destination, setDestination] = useState(from ?? '')
  const [error, setError] = useState('')
  const blocked = descendants(entries, [entry.id])
  const folders = entries.filter((record) => record.kind === 'folder' && !blocked.has(record.id))
    .map((record) => ({ id: record.id, trail: folderTrail(entries, record.id) }))
    .filter((record) => record.trail)
    .map((record) => ({ id: record.id, label: record.trail.map((folder) => folder.name).join(' / ') }))
    .sort((a, b) => a.label.localeCompare(b.label))
  function submit(event) {
    event.preventDefault()
    const parentId = destination || null
    if (!copy && parentId === from) {
      setError('Choose a different destination folder.')
      return
    }
    if (sameName(siblings(entries, parentId), entry.name)) {
      setError('An entry with this name already exists in the destination.')
      return
    }
    commit((state, { modified, created }) => ({
      ...state,
      libraryEntries: copy
        ? [...state.libraryEntries, { ...entry, id: idFor('entry'), parentId, ...created }]
        : state.libraryEntries.map((record) => record.id === entry.id && record.libraryId === library.id
          ? { ...record, parentId, ...modified } : record),
    }), copy ? 'File copied.' : 'Entry moved.')
    onClose()
  }
  return <Modal title={copy ? 'Copy to' : 'Move to'} onClose={onClose}>
    <form onSubmit={submit}>
      <p className="destination-name">{entry.name}</p>
      <Field label="Destination" error={error}><select autoFocus value={destination} onChange={(event) => {
        setDestination(event.target.value)
        setError('')
      }}>
        <option value="">{library.name} (root)</option>
        {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
      </select></Field>
      <FormActions action={copy ? 'Copy' : 'Move'} onClose={onClose} />
    </form>
  </Modal>
}

function FilePreview({ file }) {
  const { data, notify } = useWorkspace()
  const actor = data.users.find((user) => user.id === file.updatedBy)
  const url = sameOriginAsset(file.contentUrl)
  const mime = normalize(file.mimeType).split(';')[0]
  const plain = ['text/plain', 'text/csv', 'text/markdown', 'application/json'].includes(mime)
  const image = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'].includes(mime)
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if (!url || (!plain && !image)) return
    const controller = new AbortController()
    let objectUrl
    fetch(withSid(url), { signal: controller.signal, redirect: 'error' }).then(async (response) => {
      if (!response.ok) throw new Error('Content unavailable')
      if (plain) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let remaining = 65536
        let excerpt = ''
        while (remaining > 0) {
          const { done, value } = await reader.read()
          if (done) break
          excerpt += decoder.decode(value.subarray(0, remaining), { stream: true })
          remaining -= value.length
        }
        excerpt += decoder.decode()
        if (remaining <= 0) await reader.cancel()
        if (!controller.signal.aborted) setPreview({ text: excerpt, limited: remaining <= 0 })
      } else {
        const buffer = await response.arrayBuffer()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(new Blob([buffer], { type: mime }))
        setPreview({ image: objectUrl })
      }
    }).catch(() => {
      if (!controller.signal.aborted) setPreview({ failed: true })
    })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, mime, plain, image])

  async function download() {
    try {
      const response = await fetch(withSid(url), { redirect: 'error' })
      if (!response.ok) throw new Error('Content unavailable')
      const blobUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = file.name
      link.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch {
      notify('Download unavailable.')
    }
  }

  return <>
    <dl className="metadata">
      <div><dt>Type</dt><dd>{kindLabel(file)}</dd></div>
      <div><dt>Size</dt><dd>{formatSize(file.sizeBytes)}</dd></div>
      <div><dt>Modified</dt><dd>{formatDate(file.updatedAt)}</dd></div>
      <div><dt>Modified by</dt><dd>{actor?.displayName ?? '—'}</dd></div>
    </dl>
    {url && (plain || image) ? <section className="preview" aria-label="File preview">
      {!preview && <p>Loading preview…</p>}
      {preview?.failed && <p>Preview unavailable.</p>}
      {preview?.text !== undefined && <><pre>{preview.text}</pre>{preview.limited && <p>Preview limited to the first 64 KB.</p>}</>}
      {preview?.image && <img src={preview.image} alt={file.name} onError={() => setPreview({ failed: true })} />}
    </section> : <p className="preview">Preview unavailable.</p>}
    {url && <button className="primary" onClick={download}><Download size={16} />Download</button>}
  </>
}
