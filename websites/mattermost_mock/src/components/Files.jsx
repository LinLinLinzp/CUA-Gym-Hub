import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText, Search } from 'lucide-react'
import { withSid } from '../utils/dataManager.js'
import { byId, localAsset } from '../data/selectors.js'
import { fileSize } from './Composer.jsx'
import { useFeedback } from './Feedback.jsx'
import { Dialog, Empty, IconButton } from './UI.jsx'

const extension = file => file.extension?.toLowerCase() ?? ''
const supportedImage = file => /^(?:png|jpe?g|gif|webp|avif|bmp|ico)$/.test(extension(file))
const text = file => /^(?:txt|md|log|csv|json|xml|ya?ml|js|ts|css|py|sh|go|sql)$/.test(extension(file))
export function fileType(file) {
  if (file.mimeType?.startsWith('image/') || supportedImage(file)) return 'Images'
  if (/^(?:csv|xlsx?|ods|tsv)$/.test(extension(file))) return 'Spreadsheets'
  if (/^(?:json|xml|ya?ml|js|ts|css|py|sh|go|sql|log)$/.test(extension(file))) return 'Code'
  if (text(file) || /^(?:pdf|docx?|odt|rtf|pptx?)$/.test(extension(file))) return 'Documents'
  return 'Other'
}

export function visibleFiles(state, filterPost) {
  const allowed = new Map(state.posts.filter(post => post && !post.deletedAt && filterPost(post)).map(post => [post.id, post]))
  return state.files.filter(file => file?.status === 'posted' && allowed.get(file.postId)?.channelId === file.channelId &&
    allowed.get(file.postId)?.fileIds?.includes(file.id))
}

async function readPreviewText(response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  const limit = 50000
  let text = ''
  try {
    while (text.length < limit) {
      const { done, value } = await reader.read()
      if (done) return text + decoder.decode()
      text += decoder.decode(value, { stream: true })
    }
    return text.slice(0, limit)
  } finally {
    await reader.cancel().catch(() => {})
  }
}

function useFilePreview(file, allowText) {
  const local = localAsset(file?.url)
  const [data, setData] = useState(null)
  const supported = Boolean(local && (supportedImage(file) || allowText && text(file)))
  useEffect(() => {
    if (!supported) return
    const controller = new AbortController()
    let objectUrl
    async function load() {
      try {
        const response = await fetch(withSid(local), { signal: controller.signal })
        if (!response.ok) throw new Error()
        if (supportedImage(file)) {
          const bytes = await response.arrayBuffer()
          if (controller.signal.aborted) return
          const ext = extension(file)
          objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) }))
          setData({ local, kind: 'image', value: objectUrl })
        } else {
          const value = await readPreviewText(response)
          if (!controller.signal.aborted) setData({ local, kind: 'text', value })
        }
      } catch {
        if (!controller.signal.aborted) setData({ local, kind: 'error' })
      }
    }
    load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [local, supported, file?.extension])
  return supported ? data?.local === local ? data : { kind: 'loading' } : null
}

function DownloadButton({ file, compact = false }) {
  const { notify } = useFeedback()
  const [downloading, setDownloading] = useState(false)
  const local = localAsset(file.url)
  if (!local) return null
  const name = file.name || 'attachment'

  async function download() {
    setDownloading(true)
    try {
      const response = await fetch(withSid(local))
      if (!response.ok) throw new Error('Download failed')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.append(link)
      try {
        link.click()
      } finally {
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch {
      notify('Could not download ' + name + '. Try again.', true)
    } finally {
      setDownloading(false)
    }
  }

  return compact ? <IconButton icon={Download} size={17} label={'Download ' + name} onClick={download} disabled={downloading} /> :
    <button type="button" className="primary" onClick={download} disabled={downloading}><Download size={16} /> Download</button>
}

export function FileCard({ file, onPreview, inlineImage = true }) {
  const preview = useFilePreview(inlineImage ? file : null, false)
  const Icon = { Images: FileImage, Documents: FileText, Spreadsheets: FileSpreadsheet, Code: FileCode, Other: FileArchive }[fileType(file)]
  return <div className="attachment">
    {inlineImage && preview?.kind === 'image' && <button type="button" className="attachment-image" onClick={onPreview} aria-label={'Preview ' + file.name}>
      <img src={preview.value} alt={file.name} /></button>}
    <div className="file-card">
      <button type="button" className="file-open" onClick={onPreview}>
        <Icon size={32} /><span><strong>{file.name || 'Attachment'}</strong>
          <small>{(extension(file) || 'File').toUpperCase()} · {fileSize(file.size)}</small></span>
      </button>
      <DownloadButton file={file} compact />
    </div>
  </div>
}

export function FilesPane({ state, channel, openDialog, jumpTo }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All files')
  const [sort, setSort] = useState('Newest')
  const rows = visibleFiles(state, post => post.channelId === channel.id)
    .filter(file => (type === 'All files' || fileType(file) === type) && String(file.name ?? '').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (sort === 'Newest' ? -1 : 1) * String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
  return <>
    <div className="file-filters">
      <label className="search-field"><Search size={15} /><input aria-label="Search channel files" placeholder="Search files" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div>
        <select aria-label="File type" value={type} onChange={event => setType(event.target.value)}>
          {['All files', 'Images', 'Documents', 'Spreadsheets', 'Code', 'Other'].map(option => <option key={option}>{option}</option>)}
        </select>
        <select aria-label="Sort files" value={sort} onChange={event => setSort(event.target.value)}>
          <option>Newest</option><option>Oldest</option>
        </select>
      </div>
    </div>
    <div className="pane-results scroll">
      {!rows.length && <Empty icon={FileText} title={query || type !== 'All files' ? 'No files match' : 'No files in this channel yet'} />}
      {rows.map(file => <div className="file-result" key={file.id}>
        <FileCard file={file} inlineImage={false} onPreview={() => openDialog({ kind: 'file', ids: rows.map(row => row.id), fileId: file.id })} />
        <button type="button" className="text-button source-jump" onClick={() => jumpTo(byId(state.posts, file.postId))}>Jump to message</button>
      </div>)}
    </div>
  </>
}

export function FilePreview({ state, ids, fileId, close }) {
  const [index, setIndex] = useState(() => Math.max(0, ids.indexOf(fileId)))
  const file = state.files.find(row => row?.id === ids[index] && row.status === 'posted')
  const preview = useFilePreview(file, true)
  return <Dialog title={file?.name ?? 'File unavailable'} close={close} wide>
    <div className="content file-preview">
      {preview?.kind === 'image' ? <img src={preview.value} alt={file.name} /> :
        preview?.kind === 'text' ? <pre>{preview.value}</pre> :
          <Empty icon={FileText} title={preview?.kind === 'loading' ? 'Loading preview…' : 'Preview unavailable'} />}
      {file && <p className="muted-text">{file.mimeType || 'File'} · {fileSize(file.size)}</p>}
    </div>
    <footer className="dialog-actions">
      {ids.length > 1 && <>
        <IconButton icon={ArrowLeft} label="Previous file" disabled={index === 0} onClick={() => setIndex(value => value - 1)} />
        <small>{index + 1} of {ids.length}</small>
        <IconButton icon={ArrowRight} label="Next file" disabled={index === ids.length - 1} onClick={() => setIndex(value => value + 1)} />
      </>}
      {file && <DownloadButton key={file.id} file={file} />}
    </footer>
  </Dialog>
}
