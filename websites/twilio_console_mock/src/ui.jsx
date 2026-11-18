import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export const rows = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const display = (value) => value == null || value === '' ? '—' : String(value)
export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : '—'
export const contains = (value, query) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
export const phoneMatches = (value, query) => contains(value, query) || (/^[+\d().\s-]+$/.test(query) && query.replace(/\D/g, '') !== '' && String(value ?? '').replace(/\D/g, '').includes(query.replace(/\D/g, '')))
export const byId = (items, id) => id == null ? undefined : rows(items).find((item) => item.id === id)
export const active = (item) => (item.status ?? 'active') === 'active'
export const smsCapable = (item) => active(item) && rows(item.capabilities).includes('sms')
export function routeId(value) {
  const id = String(value)
  const reserved = id === '' || id === '.' || id === '..' || id.toLowerCase() === 'buy' || id.startsWith('~')
  return encodeURIComponent(reserved ? '~' + id : id)
}

export function useRouteId() {
  const { pathname } = useLocation()
  const segment = pathname.replace(/\/+$/, '').split('/').at(-1)
  try {
    // Decode the URL segment once to distinguish literal %2F text from a slash.
    const id = decodeURIComponent(segment)
    return id.startsWith('~') ? id.slice(1) : id
  } catch {
    return undefined
  }
}
export const dateValue = (value) => value ? Date.parse(value) : NaN
const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
export const formatDate = (value) => Number.isFinite(dateValue(value)) ? dateTime.format(new Date(dateValue(value))) : '—'
export const utcDate = (value) => Number.isFinite(dateValue(value)) ? new Date(dateValue(value)).toISOString().slice(0, 10) : ''
export const statuses = ['accepted', 'queued', 'sent', 'delivered', 'received', 'undelivered', 'failed']
export const useCases = ['notifications', 'customer_care', 'verification', 'marketing']

const icons = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  numbers: <path d="M5 3h4l2 5-3 2c1.5 3 3 4.5 6 6l2-3 5 2v4c0 1-1 2-2 2C10 20 4 14 3 5c0-1 1-2 2-2Z"/>,
  buy: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8"/></>,
  services: <><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16m-12 4h4"/></>,
  send: <path d="m3 4 18 8-18 8 4-8-4-8Zm4 8h14"/>,
  logs: <path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7"/>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  left: <path d="m14 6-6 6 6 6"/>,
  right: <path d="m10 6 6 6-6 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>,
}
export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export function useSidNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function AppLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}
export function RailLink({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}
export function Page({ title, description, action, back, children }) {
  return <>
    {back && <AppLink className="back" to={back.to}><Icon name="left" size={15} />{back.label}</AppLink>}
    <div className="page-head">
      <div><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </>
}
export function Empty({ title = 'No results', text, action }) {
  return <div className="empty"><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>
}
export function Missing({ title, to, back }) {
  return <Page title={title}><section className="panel"><Empty title="Record unavailable" text="This record could not be found in the current account." action={<AppLink className="button secondary" to={to}>{back}</AppLink>} /></section></Page>
}
export function Badge({ value }) {
  return <span className={'badge ' + (value ?? '')}><span className="dot" />{label(value)}</span>
}
export function Table({ headers, children }) {
  return <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
export function List({ headers, items, render, empty, size = 10, pageIndex, changePage }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(pageIndex ?? page, pages)
  const go = changePage ?? setPage
  const start = (current - 1) * size
  if (!items.length) return empty
  return <>
    <Table headers={headers}>{items.slice(start, start + size).map(render)}</Table>
    <footer className="table-footer">
      <span>{start + 1}–{Math.min(start + size, items.length)} of {items.length}</span>
      <div className="pagination">
        <button type="button" className="icon-button" aria-label="Previous page" disabled={current === 1} onClick={() => go(current - 1)}><Icon name="left" size={16} /></button>
        <span>Page {current} of {pages}</span>
        <button type="button" className="icon-button" aria-label="Next page" disabled={current === pages} onClick={() => go(current + 1)}><Icon name="right" size={16} /></button>
      </div>
    </footer>
  </>
}
export function Field({ label: title, error, hint, options, children, ...props }) {
  const id = useId()
  const description = error || hint
  const attributes = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': description ? id + '-hint' : undefined, ...props }
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {options ? <select {...attributes}>{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
      : props.rows ? <textarea {...attributes} />
        : <input {...attributes} />}
    {description && <small id={id + '-hint'} className={error ? 'field-error' : undefined}>{description}</small>}
    {children}
  </div>
}
export function Toolbar({ children, count, clear, noun = 'result' }) {
  return <div className="toolbar">
    <div className="filters">{children}</div>
    <div className="filter-foot"><span role="status">{count} {noun}{count === 1 ? '' : 's'}</span>{clear && <button type="button" className="text-button" onClick={clear}>Clear filters</button>}</div>
  </div>
}
export function Notice({ error, children }) {
  return <div role={error ? 'alert' : 'status'} className={error ? 'notice error' : 'notice'}>{children}</div>
}
export function Modal({ title, description, onClose, children }) {
  const dialog = useRef(null)
  const heading = useId()
  const details = useId()
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current
    element.showModal()
    element.querySelector('[data-initial-focus]')?.focus()
    return () => {
      element.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby={heading} aria-describedby={description ? details : undefined}
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-content">
      <h2 id={heading}>{title}</h2>
      {description && <p id={details}>{description}</p>}
      {children}
    </div>
  </dialog>
}
export function Confirm({ title, description, action, danger, onClose, onConfirm }) {
  return <Modal title={title} description={description} onClose={onClose}>
    <div className="actions">
      <button type="button" className="button secondary" data-initial-focus onClick={onClose}>Cancel</button>
      <button type="button" className={'button ' + (danger ? 'danger' : 'primary')} onClick={onConfirm}>{action}</button>
    </div>
  </Modal>
}
export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  function setValue(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
  }
  const bind = (name) => ({
    value: values[name] ?? '',
    error: errors[name],
    onChange: (event) => setValue(name, event.target.value),
  })
  return { values, setErrors, bind, setValue }
}
export function httpUrl(value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname) && /^https?:\/\//i.test(value)
  } catch {
    return false
  }
}
export function useRouteFocus(ref) {
  const { pathname } = useLocation()
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    ref.current?.querySelector('h1')?.focus()
    window.scrollTo(0, 0)
  }, [pathname, ref])
}
