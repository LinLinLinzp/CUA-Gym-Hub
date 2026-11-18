import React, { useState } from 'react'
import { Grid2X2, List, UploadCloud, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { changeAttachment, createMedia, deleteMedia, mediaAccept, mediaImpact, updateMedia } from '../data/media.js'
import { typeLabel } from '../data/content.js'
import { difference } from '../data/records.js'
import { contentFor, displayDate, named, rows, titleOf } from '../utils/display.js'
import { editorPath, mediaPath, SiteLink, useSessionRouting } from '../utils/navigation.jsx'
import { withSid } from '../utils/dataManager.js'
import { uploadFile } from '../utils/upload.js'
import { BulkActions, Confirm, Field, Modal, MonthFilter, monthOf, Pagination, RowMenu, SearchBox, StatusPill, useSelection } from '../components/Controls.jsx'
import { mediaMatches } from '../components/MediaPicker.jsx'
import MediaPreview, { localMediaPath, mediaKind } from '../components/MediaPreview.jsx'

const PAGE_SIZE = 24
const metadataFields = [['title', 'Title'], ['altText', 'Alt text'], ['caption', 'Caption'], ['description', 'Description']]
const mediaTitle = (item) => item.title || item.fileName || 'Untitled file'

function UploadPanel({ commit }) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [failed, setFailed] = useState([])
  const [commitError, setCommitError] = useState('')
  const inputId = React.useId()
  const send = async (files) => {
    if (!files.length || uploading) return
    setUploading(true)
    setCommitError('')
    const outcomes = await Promise.allSettled(files.map(uploadFile))
    const uploads = outcomes.flatMap((outcome) => outcome.status === 'fulfilled' ? [outcome.value] : [])
    const errors = outcomes.flatMap((outcome, i) => outcome.status === 'rejected' ? [{ file: files[i], message: outcome.reason.message }] : [])
    if (uploads.length) {
      const result = commit((state, stamp) => createMedia(state, stamp, uploads))
      if (result.error) setCommitError(result.error)
    }
    setFailed(errors)
    setUploading(false)
  }
  return <div className="upload-area">
    <section className={'dropzone' + (dragging ? ' dragging' : '')} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={(event) => {
      event.preventDefault(); setDragging(false); send([...event.dataTransfer.files])
    }} aria-label="Upload media">
      <UploadCloud size={28} aria-hidden="true" />
      <h2>Drop files to upload</h2>
      <p className="meta">Images, PDFs, audio, and video</p>
      <input id={inputId} type="file" aria-label="Select files" accept={mediaAccept} className="visually-hidden upload-input" multiple disabled={uploading} onChange={(event) => {
        const files = [...event.target.files]
        event.target.value = ''
        send(files)
      }} />
      <label htmlFor={inputId} className="button primary">{uploading ? 'Uploading…' : 'Select Files'}</label>
      {uploading && <p role="status" className="meta">Uploading selected files…</p>}
    </section>
    {failed.length > 0 && <div className="upload-errors" role="alert">
      <ul>{failed.map(({ file, message }, i) => <li key={file.name + i}><strong>{file.name}</strong> {message}</li>)}</ul>
      <button type="button" className="button" disabled={uploading} onClick={() => send(failed.map(({ file }) => file))}>Retry failed files</button>
    </div>}
    {commitError && <p role="alert" className="text-danger">{commitError}</p>}
  </div>
}

export function MediaDetails({ item, close, actions }) {
  const { commit } = useStore()
  const [initial, setInitial] = useState(() => Object.fromEntries(metadataFields.map(([key]) => [key, item[key] ?? ''])))
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const formId = React.useId()
  const save = (event) => {
    event.preventDefault()
    const trimmed = { ...values, title: values.title.trim() }
    const result = commit((state, stamp) => updateMedia(state, stamp, item.id, difference(initial, trimmed)))
    if (result.error) { setError(result.error); return }
    setInitial(trimmed)
    setValues(trimmed)
    setError('')
    setFeedback(result.unchanged ? 'No changes to save.' : 'Media details saved.')
  }
  const url = localMediaPath(item.url)
  return <Modal title="Attachment details" close={close} className="attachment-modal" footer={<>
    {actions}
    <button type="button" className="button" onClick={close}>Close</button><button className="button primary" form={formId}>Save</button>
  </>}>
    <div className="attachment-layout">
      <div className="attachment-preview"><MediaPreview item={item} full /></div>
      <div className="attachment-properties">
        <dl className="file-facts">
          <div><dt>File name</dt><dd>{item.fileName || mediaTitle(item)}</dd></div>
          <div><dt>File type</dt><dd>{item.mimeType || 'Unknown'}</dd></div>
          <div><dt>File size</dt><dd>{Number.isFinite(item.sizeBytes) ? item.sizeBytes.toLocaleString('en-US') + ' bytes' : '—'}</dd></div>
          <div><dt>Uploaded on</dt><dd>{displayDate(item.createdAt, true)}</dd></div>
          {item.width && item.height && <div><dt>Dimensions</dt><dd>{item.width} × {item.height}</dd></div>}
          {url && <div><dt>File</dt><dd><a href={withSid(url)} download={item.fileName}>Download file</a></dd></div>}
        </dl>
        <form id={formId} className="metadata-form" onSubmit={save}>
          {metadataFields.map(([key, label]) => <Field key={key} label={label}>
            {key === 'caption' || key === 'description'
              ? <textarea rows="2" value={values[key]} onChange={(event) => { setFeedback(''); setValues({ ...values, [key]: event.target.value }) }} />
              : <input value={values[key]} onChange={(event) => { setFeedback(''); setValues({ ...values, [key]: event.target.value }) }} />}
          </Field>)}
          {error && <p role="alert" className="text-danger">{error}</p>}
          {feedback && <p role="status" className="meta">{feedback}</p>}
        </form>
      </div>
    </div>
  </Modal>
}

function AttachDialog({ state, item, close, attach }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const size = 10
  const content = [['post', rows(state.posts)], ['page', rows(state.pages)]]
    .flatMap(([type, collection]) => collection.filter((row) => row.status !== 'trash').map((record) => ({ record, type })))
    .filter(({ record }) => titleOf(record).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => titleOf(a.record).localeCompare(titleOf(b.record)))
  const target = content.find(({ record }) => record.id === selected)
  const current = Math.min(page, Math.max(1, Math.ceil(content.length / size)))
  return <Modal title="Attach to existing content" close={close} className="picker-modal attach-modal" footer={<>
    <button type="button" className="button" onClick={close}>Cancel</button>
    <button type="button" className="button primary" disabled={!target} onClick={() => attach(item.id, { id: target.record.id, type: target.type })}>Attach</button>
  </>}>
    <div className="picker-body">
      <SearchBox label="Search posts and pages" value={search} onChange={(value) => { setSearch(value); setPage(1) }} />
      {content.length ? <div className="table-wrap"><table><thead><tr><th><span className="visually-hidden">Select content</span></th><th>Title</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>{content.slice((current - 1) * size, current * size).map(({ record, type }) => <tr key={record.id}>
          <td className="check-cell"><input type="radio" name="attachment-target" aria-label={titleOf(record)} checked={selected === record.id} onChange={() => setSelected(record.id)} /></td>
          <td>{titleOf(record)}</td><td>{typeLabel(type)}</td><td><StatusPill status={record.status} /></td>
        </tr>)}</tbody></table></div> : <p className="muted">No content found.</p>}
      <Pagination count={content.length} page={current} size={size} change={setPage} />
    </div>
  </Modal>
}

export default function MediaLibrary() {
  const { state, commit, notify } = useStore()
  const { go } = useSessionRouting()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [attaching, setAttaching] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const media = rows(state.media)
  const layout = params.get('mode') === 'list' ? 'list' : 'grid'
  const month = params.get('m') || ''
  const kind = params.get('media_type') || ''
  const unattached = params.get('attachment') === 'unattached'
  const selectedId = params.get('item')
  const detail = selectedId && media.find((item) => item.id === selectedId)
  const url = (patch) => {
    const next = new URLSearchParams(params)
    if (Object.keys(patch).some((key) => ['media_type', 'm', 'attachment', 'mode'].includes(key))) next.delete('paged')
    for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key)
    return mediaPath + (next.size ? '?' + next : '')
  }
  const change = (patch) => go(url(patch))
  const filtered = media.filter((item) => (!kind || mediaKind(item.mimeType) === kind) &&
    (!month || monthOf(item.createdAt) === month) && (!unattached || !item.uploadedTo) && mediaMatches(item, search)
  ).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  const page = Math.min(Math.max(1, Number.parseInt(params.get('paged'), 10) || 1), Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selection = useSelection(JSON.stringify([kind, month, unattached, search, page, layout, filtered.map((item) => item.id)]))
  const closeDetails = () => change({ item: '' })
  const attach = (id, link) => {
    const result = commit((current, stamp) => changeAttachment(current, stamp, id, link))
    if (result.error) notify(result.error)
    setAttaching(null)
  }
  const remove = () => {
    const result = commit((current, stamp) => deleteMedia(current, stamp, deleting.map((item) => item.id)))
    if (result.error) notify(result.error)
    if (deleting.some((item) => item.id === selectedId)) closeDetails()
    setDeleting(null)
    selection.clear()
  }
  const showUpload = params.get('add') === '1'
  return <section className="list-screen media-screen">
    <header className="screen-header"><h1>Media Library</h1><button className="button primary" type="button" aria-expanded={showUpload} onClick={() => change({ add: showUpload ? '' : '1' })}><Plus size={16} /> Add Media File</button></header>
    {showUpload && <UploadPanel commit={commit} />}
    {selectedId && !detail && <div className="card" role="status"><p>Media item unavailable. <button className="button subtle" onClick={closeDetails}>Dismiss</button></p></div>}
    <div className="list-toolbar media-toolbar">
      <div className="inline-controls toolbar-filters">
        <div className="view-toggle" aria-label="Library view">
          <button type="button" className="icon-button" aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => change({ mode: '' })}><Grid2X2 size={17} /></button>
          <button type="button" className="icon-button" aria-label="List view" aria-pressed={layout === 'list'} onClick={() => change({ mode: 'list' })}><List size={18} /></button>
        </div>
        <select aria-label="Filter by media type" value={kind} onChange={(event) => change({ media_type: event.target.value })}>
          <option value="">All media types</option><option value="image">Images</option><option value="document">Documents</option><option value="audio">Audio</option><option value="video">Video</option>
        </select>
        {layout === 'list' && <BulkActions actions={[[ 'delete', 'Delete permanently' ]]} count={selection.ids.length} submit={() => setDeleting(visible.filter((item) => selection.ids.includes(item.id)))} />}
        <MonthFilter dates={media.map((item) => item.createdAt)} value={month} change={(value) => change({ m: value })} />
        <select aria-label="Filter by attachment" value={unattached ? 'unattached' : ''} onChange={(event) => change({ attachment: event.target.value })}>
          <option value="">All attachments</option><option value="unattached">Unattached</option>
        </select>
      </div>
      <SearchBox label="Search media" value={search} onChange={(value) => { setSearch(value); if (params.has('paged')) change({ paged: '' }) }} />
    </div>
    {visible.length === 0 ? <div className="empty card"><h2>No media found</h2>{!media.length && !showUpload && <button className="button" onClick={() => change({ add: '1' })}>Add Media File</button>}</div>
      : layout === 'grid' ? <div className="media-grid">
        {visible.map((item) => <SiteLink to={url({ item: item.id })} className="media-tile" key={item.id}>
          <span className="tile-image"><MediaPreview item={item} decorative /></span>
          <span className="tile-title">{mediaTitle(item)}</span>
        </SiteLink>)}
      </div> : <div className="table-wrap" tabIndex={0} role="region" aria-label="Media table">
        <table><thead><tr>
          <th className="check-cell"><input type="checkbox" aria-label="Select all media on this page" checked={selection.ids.length === visible.length} onChange={() => selection.toggleAll(visible.map((item) => item.id))} /></th>
          <th>File</th><th>Author</th><th>Uploaded to</th><th>Date</th><th className="action-cell"><span className="visually-hidden">Actions</span></th>
        </tr></thead>
          <tbody>{visible.map((item) => {
            const link = item.uploadedTo
            const target = link && contentFor(state, link.type, link.id)
            return <tr key={item.id} className={selection.ids.includes(item.id) ? 'selected-row' : undefined}>
              <td className="check-cell"><input type="checkbox" aria-label={'Select ' + mediaTitle(item)} checked={selection.ids.includes(item.id)} onChange={() => selection.toggle(item.id)} /></td>
              <td className="title-cell"><div className="media-row-file"><span className="media-thumb"><MediaPreview item={item} decorative /></span><div>
                <SiteLink className="record-title" to={url({ item: item.id })}>{mediaTitle(item)}</SiteLink><div className="meta">{item.fileName}</div>
              </div></div></td>
              <td>{named(state.users, item.authorId)}</td>
              <td><div>{target ? <SiteLink to={editorPath(target.id)}>{titleOf(target)}</SiteLink> : <span className="meta">{link ? 'Content unavailable' : 'Unattached'}</span>}</div>
                {link ? <button className="text-button" type="button" onClick={() => attach(item.id, null)}>Detach</button>
                  : <button className="text-button" type="button" onClick={() => setAttaching(item)}>Attach</button>}
              </td>
              <td className="meta nowrap">{displayDate(item.createdAt)}</td>
              <td className="action-cell"><RowMenu label={'Actions for ' + mediaTitle(item)} actions={[
                { label: 'Edit details', to: url({ item: item.id }) },
                ...(link ? [{ label: 'Change attachment', run: () => setAttaching(item) }] : []),
                { label: 'Delete permanently', danger: true, run: () => setDeleting([item]) },
              ]} /></td>
            </tr>
          })}</tbody>
        </table>
      </div>}
    <Pagination count={filtered.length} page={page} size={PAGE_SIZE} change={(next) => change({ paged: next === 1 ? '' : String(next) })} />
    {detail && <MediaDetails item={detail} key={detail.id} close={closeDetails} actions={<button type="button" className="button subtle text-danger delete-media-details" onClick={() => setDeleting([detail])}>Delete permanently</button>} />}
    {attaching && <AttachDialog state={state} item={attaching} close={() => setAttaching(null)} attach={attach} />}
    {deleting && <Confirm title="Delete media permanently?" action="Delete permanently" destructive close={() => setDeleting(null)} confirm={remove}>
      <p>The selected files will be removed from the library. Their featured-image and block references will be cleared.</p>
      <ul>{deleting.map((item) => {
        const names = mediaImpact(state, item).map(titleOf)
        return <li key={item.id}><strong>{mediaTitle(item)}</strong>{names.length > 0 && <div className="meta">Affected content · {names.join(', ')}</div>}</li>
      })}</ul>
    </Confirm>}
  </section>
}
