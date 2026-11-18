import { useEffect, useState } from 'react'
import { FileText, Paperclip, UploadCloud } from 'lucide-react'
import { withSid } from '../utils/dataManager.js'

const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' }
export function receiptType(file) {
  const type = types[file.name.split('.').at(-1)?.toLowerCase()]
  return type && (!file.type || file.type === type) ? type : null
}
export async function uploadReceipt(file) {
  const payload = new FormData()
  payload.append('file', file.type ? file : new File([file], file.name, { type: receiptType(file) }))
  const response = await fetch(withSid('/upload'), { method: 'POST', body: payload })
  const result = await response.json()
  const saved = result.files?.[0]
  if (!response.ok || !result.success || !saved) throw new Error('The receipt could not be uploaded. Try again.')
  return { url: saved.url, originalName: saved.original_name, storedName: saved.stored_name, size: saved.size, contentType: saved.content_type }
}

function receiptPath(receipt) {
  return /^\/(?:receipts|files)\/[\w./%-]+$/.test(receipt?.url || '') && !receipt.url.split('/').includes('..') ? withSid(receipt.url) : ''
}
export function ReceiptPreview({ receipt, file, onRemove, busy }) {
  const [imageUrl, setImageUrl] = useState('')
  const path = receiptPath(receipt)
  const type = file ? receiptType(file) : receipt?.contentType
  const label = file?.name || receipt?.originalName || 'Receipt'
  useEffect(() => {
    setImageUrl('')
    if (!type?.startsWith('image/')) return
    let href
    const controller = new AbortController()
    async function show() {
      try {
        const raw = file || (path ? await fetch(path, { signal: controller.signal }).then(response => {
          if (!response.ok) throw new Error('Receipt unavailable')
          return response.blob()
        }) : null)
        if (raw && !controller.signal.aborted) {
          href = URL.createObjectURL(new Blob([raw], { type }))
          setImageUrl(href)
        }
      } catch { /* The download link remains available. */ }
    }
    show()
    return () => { controller.abort(); if (href) URL.revokeObjectURL(href) }
  }, [file, path, type])
  if (!receipt && !file) return null
  return <div className="receipt-preview">
    {imageUrl ? <img src={imageUrl} alt={`Receipt for ${label}`} /> : <FileText size={24} />}
    <div>{path && !file ? <a href={path} download={label}>{label}</a> : <strong>{label}</strong>}{file && <small>Ready to attach</small>}</div>
    {onRemove && <button className="button danger" type="button" disabled={busy} onClick={onRemove}>Remove Receipt</button>}
  </div>
}
export function ReceiptPicker({ receipt, file, onChoose, onRemove, error, busy }) {
  const [dragging, setDragging] = useState(false)
  return <div className="form-stack">
    <h3>Receipt</h3>
    <ReceiptPreview receipt={receipt} file={file} onRemove={onRemove} busy={busy} />
    <label className={`receipt-drop ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true) }} onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && e.dataTransfer.files[0]) onChoose(e.dataTransfer.files[0]) }}>
      {receipt || file ? <Paperclip size={19} /> : <UploadCloud size={25} />}
      <strong>{receipt || file ? 'Replace receipt' : 'Choose a file or drop it here'}</strong>
      <small>JPEG, PNG or PDF</small>
      <input type="file" aria-label="Attach Receipt" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" disabled={busy}
        onChange={e => { if (e.target.files[0]) onChoose(e.target.files[0]); e.target.value = '' }} />
    </label>
    {error && <small className="error" role="alert">{error}</small>}
  </div>
}
