import { useEffect, useId, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export const nameOf = (record, fallback = 'Untitled') => record?.name || fallback
export const titleOf = document => document?.title || 'Untitled proposal'
export const capitalize = value => value ? value[0].toUpperCase() + value.slice(1) : 'Unknown'
export const initials = value => value?.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '•'
export const cleanPath = value => encodeURIComponent(value)
export const editPath = document => '/documents/' + cleanPath(document.id)
export const signingPath = (document, recipient) => '/sign/' + cleanPath(document.id) + '/' + cleanPath(recipient.id)
export const money = (value, currency = 'USD') => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return Number(value).toFixed(2)
  }
}
export const shortDate = value => {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  const elapsed = (new Date() - date) / 86_400_000
  if (elapsed >= 0 && elapsed < 1) return 'Today'
  if (elapsed >= 1 && elapsed < 2) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)
}
export const includesText = (query, ...values) => values.join(' ').toLowerCase().includes(query.trim().toLowerCase())

export function LocalLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useLocalNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Status({ value }) {
  return <span className={'status status-' + (value || 'unknown')}>{capitalize(value)}</span>
}

export function Notice({ error, message }) {
  if (error) return <p className="notice error" role="alert">{error}</p>
  if (message) return <p className="notice success" role="status">{message}</p>
  return null
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children}</div>
}

export function PageHead({ title, children, action }) {
  return <div className="page-head">
    <div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}
  </div>
}

export function NewDocumentButton() {
  return <LocalLink to="/documents/new" className="button primary"><span aria-hidden="true">＋</span> New document</LocalLink>
}

export function Pagination({ total, page, size, onPage }) {
  const last = Math.max(1, Math.ceil(total / size))
  return <div className="pagination">
    <span>{total ? (page - 1) * size + 1 + '–' + Math.min(total, page * size) + ' of ' + total : '0 results'}</span>
    <div>
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
      <span>Page {page} of {last}</span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= last}>Next</button>
    </div>
  </div>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="search">
    <span className="search-icon" aria-hidden="true" />
    <input type="search" aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
  </label>
}

export function Dialog({ title, children, onClose, wide = false }) {
  const dialog = useRef(null)
  const heading = useRef(null)
  const headingId = useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    heading.current.focus()
    return () => {
      element.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby={headingId}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-head">
      <h2 id={headingId} ref={heading} tabIndex={-1}>{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close dialog">×</button>
    </div>
    {children}
  </dialog>
}
