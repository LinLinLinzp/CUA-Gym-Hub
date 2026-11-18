import React, { useEffect, useState } from 'react'
import { File, FileAudio, FileText, Film, ImageOff } from 'lucide-react'

export const mediaKind = (mime) => {
  if (mime === 'application/pdf') return 'document'
  return /^(image|audio|video)\//.exec(mime || '')?.[1] || 'file'
}

export function localMediaPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
  try {
    const url = new URL(path, window.location.origin)
    return url.origin === window.location.origin ? url.pathname + url.search : null
  } catch { return null }
}

function FileTile({ kind, item, failed }) {
  const Icon = { image: ImageOff, audio: FileAudio, video: Film, document: FileText }[kind] || File
  return <span className="file-tile"><Icon size={28} aria-hidden="true" /><span>{item?.fileName || item?.title || 'Image unavailable'}</span>{failed && <span>Preview unavailable</span>}</span>
}

export default function MediaPreview({ item, full = false, decorative = false }) {
  const url = localMediaPath(item?.url)
  const kind = mediaKind(item?.mimeType)
  const previewable = kind === 'image'
    ? /^image\/(jpeg|png|gif|webp|avif|bmp)$/i.test(item?.mimeType || '')
    : full && ['audio', 'video', 'document'].includes(kind)
  const inlineFile = url?.startsWith('/files/')
  const [preview, setPreview] = useState(null)
  const [failedUrl, setFailedUrl] = useState(null)

  useEffect(() => {
    if (!url || !inlineFile || !previewable) return
    let objectUrl
    const request = new AbortController()
    fetch(url, { signal: request.signal }).then(async (response) => {
      if (!response.ok) throw new Error('File unavailable')
      const bytes = await response.arrayBuffer()
      if (request.signal.aborted) return
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: item.mimeType }))
      setPreview({ url, source: objectUrl })
    }).catch(() => { if (!request.signal.aborted) setFailedUrl(url) })
    return () => {
      request.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, inlineFile, previewable, item?.mimeType])

  const source = inlineFile ? (preview?.url === url && preview.source) : url
  const failed = Boolean(url && failedUrl === url)
  if (!source || !previewable || failed) return <FileTile kind={kind} item={item} failed={failed} />
  const onError = () => setFailedUrl(url)
  if (kind === 'image') return <img src={source} alt={decorative ? '' : item.altText || item.title || item.fileName || ''} onError={onError} loading={full ? 'eager' : 'lazy'} />
  if (kind === 'audio') return <audio src={source} controls onError={onError} aria-label={item.title || item.fileName || 'Audio preview'} />
  if (kind === 'video') return <video src={source} controls onError={onError} aria-label={item.title || item.fileName || 'Video preview'} />
  return <iframe src={source} title={item.title || item.fileName || 'PDF preview'} />
}
