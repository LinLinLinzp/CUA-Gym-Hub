import React, { useEffect, useId, useRef } from 'react'
import { SiteLink, dateLabel, initials, label } from './workspace.jsx'

export function Icon({ name, size = 18 }) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    search: 'M21 21l-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    arrow: 'm9 18 6-6-6-6',
    back: 'm12 19-7-7 7-7m-7 7h14',
    file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7',
    audio: 'M3 10v4m4-8v12m5-15v18m5-15v12m4-8v4',
    image: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 8h.01',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
    message: 'M4 4h16v13H9l-5 4zM8 9h8m-8 4h5',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function Avatar({ name, className = '' }) {
  return <span className={`avatar ${className}`} aria-hidden="true">{initials(name)}</span>
}

export function PageHeader({ title, description, children }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children}
  </div>
}

export function BackLink({ section, children }) {
  return <SiteLink className="back-link" to={`/${section}`}><Icon name="back" size={16} />{children}</SiteLink>
}

export function Missing({ title = 'Page unavailable', section = 'posts' }) {
  return <div className="paper empty"><h1>{title}</h1><SiteLink className="button" to={`/${section}`}>Back to {label(section)}</SiteLink></div>
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children && <p>{children}</p>}</div>
}

export function Status({ value }) {
  return <span className={`status status-${value || 'unknown'}`}>{label(value)}</span>
}

export function DateText({ value, withTime, timeZone }) {
  return <time dateTime={value || undefined}>{dateLabel(value, withTime, timeZone)}</time>
}

export function Search({ name, value, onChange, placeholder = name }) {
  return <label className="search-control">
    <Icon name="search" size={17} /><span className="sr-only">{name}</span>
    <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
  </label>
}

export function Select({ name, value, onChange, options }) {
  return <label className="select-control">
    <span className="sr-only">{name}</span>
    <select aria-label={name} value={value} onChange={event => onChange(event.target.value)}>
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  </label>
}

export function FieldError({ children }) {
  return children && <span className="field-error" role="alert">{children}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'wide-dialog' : ''} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading">
      <h2 id={titleId}>{title}</h2>
      <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>
}

export function Confirm({ title, children, action, onClose, onConfirm, error, danger }) {
  return <Modal title={title} onClose={onClose}>
    <p>{children}</p>
    <FieldError>{error}</FieldError>
    <div className="actions dialog-actions">
      <button type="button" onClick={onClose} autoFocus>Cancel</button>
      {onConfirm && <button type="button" className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{action}</button>}
    </div>
  </Modal>
}

