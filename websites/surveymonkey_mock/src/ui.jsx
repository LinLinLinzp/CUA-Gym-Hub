import { useEffect, useId, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

const glyphs = {
  survey: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/></>,
  ellipsis: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  left: <path d="m14 6-6 6 6 6"/>,
  right: <path d="m10 6 6 6-6 6"/>,
  up: <path d="m6 14 6-6 6 6"/>,
  down: <path d="m6 10 6 6 6-6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  download: <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>,
  link: <><path d="m9 15 6-6m-8 3-2 2a3.5 3.5 0 0 0 5 5l2-2m0-10 2-2a3.5 3.5 0 0 1 5 5l-2 2"/></>,
}

export function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{glyphs[name]}</svg>
}

function useDestination() {
  const location = useLocation()
  const sid = new URLSearchParams(location.search).get('sid')
  return path => sid
    ? path + (path.includes('?') ? '&' : '?') + 'sid=' + encodeURIComponent(sid)
    : withSid(path)
}

export function SiteLink({ to, active, ...props }) {
  const destination = useDestination()(to)
  const Component = active ? NavLink : Link
  return <Component to={destination} {...props}/>
}

export function useSiteNavigate() {
  const destination = useDestination()
  const navigate = useNavigate()
  return (to, options) => navigate(destination(to), options)
}

export function Modal({ title, onClose, children, className = '' }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    ;(node.querySelector('[data-initial-focus]') ?? node.querySelector('input, textarea, select') ?? node.querySelector('button'))?.focus()
    return () => {
      node.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-label={title} className={'dialog ' + className} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>
    {children}
  </dialog>
}

export function Confirm({ title, message, label, onClose, onConfirm }) {
  return <Modal title={title} onClose={onClose}>
    <p>{message}</p>
    <div className="dialog-actions">
      <button className="button secondary" data-initial-focus onClick={onClose}>Cancel</button>
      <button className="button danger" onClick={onConfirm}>{label}</button>
    </div>
  </Modal>
}

export function Badge({ children }) {
  return <span className={'badge ' + String(children).toLowerCase()}><span aria-hidden="true"/>{children}</span>
}

export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}

export function Table({ headers, children, empty, label }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
    <table aria-label={label}><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
    {empty}
  </div>
}

export function Pager({ page, count, size, onChange, noun }) {
  const last = Math.max(1, Math.ceil(count / size))
  return <div className="pager">
    <span>{count ? (page - 1) * size + 1 : 0}–{Math.min(page * size, count)} of {count} {noun}</span>
    <div className="inline">
      <button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><Icon name="left" size={17}/></button>
      <span>Page {page} of {last}</span>
      <button className="icon-button" aria-label="Next page" disabled={page >= last} onClick={() => onChange(page + 1)}><Icon name="right" size={17}/></button>
    </div>
  </div>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="field search-field"><span>{label}</span><span className="search-input">
    <Icon name="search" size={17}/><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/>
  </span></label>
}

export function Select({ label, value, onChange, children }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)}>{children}</select>
  </div>
}

export function TextField({ label, value, onChange, error, id, multiline, ...props }) {
  const Control = multiline ? 'textarea' : 'input'
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <Control id={id} value={value} onChange={event => onChange(event.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? id + '-error' : undefined} {...props}/>
    {error && <span className="error" id={id + '-error'}>{error}</span>}
  </div>
}

export function Missing({ title = 'Page unavailable', to = '/surveys', label = 'Back to surveys' }) {
  return <section className="surface missing"><h1>{title}</h1><SiteLink className="button secondary" to={to}>{label}</SiteLink></section>
}
