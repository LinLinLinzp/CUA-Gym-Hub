import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, File, FileText, Image, Paperclip, Search, X } from 'lucide-react'
import { activity, record, useStore } from '../store.jsx'
import { array, displayAddress, isDraft, lower, visibleMail } from '../data/model.js'
import { fileSize, localFilePath } from '../data/filesAccess.js'
import { withSid } from '../utils/dataManager.js'
import { Empty, IconButton, Modal, useInterface } from './ui.jsx'

const raster = /^image\/(?:png|jpeg|gif|webp|avif|bmp)$/i
const viewable = file => raster.test(file.mimeType) || file.mimeType === 'application/pdf'

export const fileDetails = file => ({
  attachmentId: file.id, name: file.name || '', size: Number(file.size) || 0,
  mimeType: file.mimeType || 'application/octet-stream', url: file.url || '',
})

export function eligibleAttachments(messages) {
  return array(messages).filter(message => visibleMail(message) && !isDraft(message))
    .flatMap(message => array(message.attachments).map(file => ({ message, file })))
}

export async function uploadFiles(files) {
  const data = new FormData()
  for (const file of files) data.append('files', file)
  const response = await fetch(withSid('/upload'), { method: 'POST', body: data })
  const uploaded = response.ok ? (await response.json()).files : null
  if (!Array.isArray(uploaded) || uploaded.length !== files.length || uploaded.some((file, index) =>
    !localFilePath(file?.url) || Number(file.size) !== files[index].size
  )) throw new Error('Upload failed. Try attaching the files again.')
  return uploaded.map((item, index) => ({
    name: files[index].name, size: Number(item.size), mimeType: item.content_type,
    kind: item.content_type?.startsWith('image/') ? 'image' : /pdf|document|sheet|text\/|csv|office/.test(item.content_type) ? 'document' : 'other',
    url: item.url, source: 'upload', uploadedAt: new Date().toISOString(),
  }))
}

export function AttachmentThumbnail({ file }) {
  const path = localFilePath(file.url)
  const [failed, setFailed] = useState(false)
  const Icon = file.kind === 'image' ? Image : file.kind === 'document' ? FileText : File
  return <span className="attachment-thumb">{path && raster.test(file.mimeType) && !failed
    ? <img loading="lazy" src={withSid(path)} alt="" onError={() => setFailed(true)} />
    : <Icon size={28} />}</span>
}

export function AttachmentTiles({ items, onOpen, onDownload, onMessage, compact }) {
  return <div className={'attachment-grid' + (compact ? ' attachment-list' : '')}>
    {items.map(({ message, file }, index) => <article className="attachment-card" key={message.id + '/' + file.id + '/' + index}>
      <button type="button" className="attachment-main" onClick={() => onOpen(index)} aria-label={'Preview ' + file.name}><AttachmentThumbnail file={file} /><span><strong>{file.name || 'Attachment'}</strong><small>{fileSize(file.size)}{onMessage && ' · ' + displayAddress(message.from)}</small></span></button>
      <div className="attachment-actions">
        {onMessage && <button className="link-button" onClick={() => onMessage(message)}>Open email</button>}
        <IconButton icon={Download} label={'Download ' + (file.name || 'attachment')} onClick={() => onDownload(index)} />
      </div>
    </article>)}
  </div>
}

export function RecentFiles({ items, close, choose }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter(({ message, file }) => lower([file.name, message.subject, displayAddress(message.from)].join(' ')).includes(lower(query)))
  return <Modal title="Attach files from recent emails" close={close}>
    <label className="field">Find a file<input autoFocus placeholder="Search by filename or sender" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {!filtered.length && <Empty title="No matching attachments" icon={Paperclip} />}
    <div className="recent-files">{filtered.map(({ message, file }, index) => <button type="button" className="menu-item" key={message.id + '/' + file.id + '/' + index} onClick={() => choose(message, file)}>
      <Paperclip size={16} /><span><strong>{file.name || 'Attachment'}</strong><small>{fileSize(file.size)} · {displayAddress(message.from)}</small></span>
    </button>)}</div>
  </Modal>
}

export function useAttachmentViewer(items) {
  const { dispatch } = useStore()
  const { notify } = useInterface()
  const [preview, setPreview] = useState(null)
  const generation = useRef(0)
  const liveUrl = useRef(null)
  useEffect(() => () => { generation.current++; if (liveUrl.current) URL.revokeObjectURL(liveUrl.current) }, [])
  function clear() {
    generation.current++
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current)
    liveUrl.current = null
    setPreview(null)
  }
  function log(type, message, file) {
    dispatch(state => record(state, {}, activity(state, 'attachment.' + type, fileDetails(file), { messageIds: [message.id] })))
  }
  async function get(file) {
    const path = localFilePath(file.url)
    if (!path) throw new Error('Unavailable file')
    const response = await fetch(withSid(path))
    if (!response.ok || response.headers.get('content-type')?.includes('text/html') && !file.mimeType?.includes('text/html')) throw new Error('Unavailable file')
    return response.blob()
  }
  async function open(index) {
    const item = items[index]
    if (!item) return
    clear()
    const request = generation.current
    setPreview({ ...item, index, pending: true })
    try {
      const blob = await get(item.file)
      if (generation.current !== request) return
      const url = viewable(item.file) ? URL.createObjectURL(blob.slice(0, blob.size, item.file.mimeType)) : null
      liveUrl.current = url
      setPreview({ ...item, index, url })
      log('preview', item.message, item.file)
    } catch {
      if (generation.current === request) setPreview({ ...item, index, failed: true })
    }
  }
  async function download(index) {
    const item = items[index]
    if (!item) return
    try {
      const blob = await get(item.file)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = item.file.name || 'attachment'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      log('download', item.message, item.file)
    } catch { notify('Unable to download this attachment.') }
  }
  const modal = preview && <Modal title={preview.file.name || 'Attachment'} close={clear} className="attachment-modal">
    <div className="preview-body">
      {preview.pending ? <p role="status">Loading attachment…</p> : preview.failed ? <p role="alert" className="error">This file is unavailable.</p>
        : preview.url && raster.test(preview.file.mimeType) ? <img src={preview.url} alt={preview.file.name || 'Attachment'} />
        : preview.url && preview.file.mimeType === 'application/pdf' ? <object data={preview.url} type="application/pdf" aria-label={preview.file.name}><p>Use Download to open this PDF.</p></object>
        : <div className="file-placeholder"><FileText size={40} /><p>{preview.file.mimeType || 'File'} · {fileSize(preview.file.size)}</p><p>Download to open this file.</p></div>}
    </div>
    <footer className="dialog-actions">
      <IconButton label="Previous attachment" icon={ChevronLeft} disabled={preview.index === 0} onClick={() => open(preview.index - 1)} />
      <IconButton label="Next attachment" icon={ChevronRight} disabled={preview.index >= items.length - 1} onClick={() => open(preview.index + 1)} />
      <button className="primary" disabled={preview.pending || preview.failed} onClick={() => download(preview.index)}><Download size={17} /> Download</button>
    </footer>
  </Modal>
  return { open, download, modal }
}

export function MessageAttachments({ message }) {
  const items = array(message.attachments).map(file => ({ message, file }))
  const viewer = useAttachmentViewer(items)
  if (!items.length) return null
  return <section className="message-attachments" aria-label="Attachments">
    <div className="attachment-heading"><h3>{items.length} {items.length === 1 ? 'attachment' : 'attachments'}</h3>{items.length > 1 && <button className="tool-button" onClick={() => items.forEach((_, index) => viewer.download(index))}><Download size={16} />Download all</button>}</div>
    <AttachmentTiles items={items} onOpen={viewer.open} onDownload={viewer.download} />
    {viewer.modal}
  </section>
}
