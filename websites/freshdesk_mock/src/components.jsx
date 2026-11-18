import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { withSid } from './utils/dataManager.js'
import { label } from './data/model.js'

export function AppLink({ to, ...props }) {
  return <Link {...props} to={withSid(to)} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  return to => navigate(withSid(to))
}

export function PageHeading({ eyebrow, title, description, children }) {
  return <header className="page-heading">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>
      {description && <p>{description}</p>}</div>
    {children}
  </header>
}

export function Field({ label: name, children }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{name}</label>{cloneElement(children, { id })}</div>
}

export function Select({ options, empty, value, ...props }) {
  const isKnown = options.some(option => (typeof option === 'string' ? option : option.id) === value)
  return <select {...props} value={value ?? ''}>
    {empty && <option value="">{empty}</option>}
    {value && !isKnown && <option value={value}>Unavailable</option>}
    {options.map(option => typeof option === 'string'
      ? <option key={option} value={option}>{label(option)}</option>
      : <option key={option.id} value={option.id}>{option.name || 'Unnamed'}</option>)}
  </select>
}

export function Pill({ value }) {
  return <span className={`pill pill-${value || 'unknown'}`}>{label(value)}</span>
}

export function SearchBox({ value, onChange, placeholder, name = 'Search' }) {
  return <label className="searchbox"><Search size={17} aria-hidden="true" />
    <input type="search" aria-label={name} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
  </label>
}

export function Rail({ title, children }) {
  const [expanded, setExpanded] = useState(true)
  const id = useId()
  return <aside className="panel rail" aria-label={title}>
    <h2>{title}</h2>
    <button className="rail-toggle" type="button" aria-expanded={expanded} aria-controls={id}
      onClick={() => setExpanded(!expanded)}>{title}<ChevronDown size={16} /></button>
    <div className="rail-content" data-expanded={expanded} id={id}>{children}</div>
  </aside>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-initial-focus], input:not([type=checkbox]), textarea')?.focus()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
    </header>
    {children}
  </dialog>
}

export function Confirm({ title, message, onClose, onConfirm }) {
  return <Dialog title={title} onClose={onClose}>
    <p>{message}</p><div className="form-actions">
      <button type="button" data-initial-focus className="button" onClick={onClose}>Cancel</button>
      <button type="button" className="button danger" onClick={onConfirm}>Delete</button>
    </div>
  </Dialog>
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children}</div>
}
