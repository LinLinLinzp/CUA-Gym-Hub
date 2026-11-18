import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Printer } from 'lucide-react'
import { routes } from '../data/routes'
import { addressParts } from '../data/display'
import { withSid } from '../utils/dataManager'

export function SiteLink({ to, children, ...props }) {
  return <Link to={withSid(to)} {...props}>{children}</Link>
}

export function ButtonLink({ to, secondary, children, ...props }) {
  return <SiteLink to={to} className={`button${secondary ? ' button-secondary' : ''}`} {...props}>{children}</SiteLink>
}

export function ActionLink({ to, children }) {
  return <SiteLink to={to} className="action-link">{children}<ArrowRight size={17} aria-hidden="true" /></SiteLink>
}

export function Page({ title, section, compact = false, children }) {
  useEffect(() => {
    document.title = `${title} | California DMV`
  }, [title])
  return <main id="main" tabIndex={-1} className={`container page${compact ? ' page-compact' : ''}`}>
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <SiteLink to={routes.home}>Home</SiteLink><ChevronRight size={14} aria-hidden="true" />
      {section && <><SiteLink to={section.to}>{section.label}</SiteLink><ChevronRight size={14} aria-hidden="true" /></>}
      <span aria-current="page">{title}</span>
    </nav>
    <h1>{title}</h1>
    {children}
  </main>
}

export function Address({ value }) {
  const parts = addressParts(value)
  return parts.length ? <span>{parts.map((part, index) => <span className="address-line" key={index}>{part}</span>)}</span> : 'Address unavailable'
}

export function Summary({ rows }) {
  return <dl className="summary">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Unavailable'}</dd></div>)}</dl>
}

export function Notice({ kind = 'info', children }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : undefined}>{children}</div>
}

const statusLabels = { scheduled: 'Scheduled', cancelled: 'Cancelled', completed: 'Completed', paid: 'Paid', issued: 'Issued', submitted: 'Submitted', due: 'Due', expired: 'Expired', active: 'Active' }

export function Status({ value }) {
  return <span className={`status status-${value || 'unknown'}`}>{statusLabels[value] || 'Status unavailable'}</span>
}

export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}

export function Steps({ labels, step }) {
  return <ol className="steps" aria-label="Progress">
    {labels.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index < step ? 'step-done' : ''}>
      <span className="step-number">{index + 1}</span><span>{label}</span>
    </li>)}
  </ol>
}

export function Field({ label, hint, error, ...props }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <input id={id} aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-hint` : undefined} {...props} />
    {(hint || error) && <small id={`${id}-hint`} className={error ? 'field-error' : undefined}>{error || hint}</small>}
  </div>
}

export function Disclosure({ title, children }) {
  return <details className="disclosure"><summary>{title}</summary><div>{children}</div></details>
}

export function PrintButton() {
  return <button className="button button-secondary" type="button" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Print</button>
}

export function ConfirmDialog({ title, children, onClose, onConfirm, confirmLabel, busy }) {
  const dialog = useRef(null)
  const safe = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    safe.current.focus()
    return () => {
      node.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => {
    event.preventDefault()
    if (!busy) onClose()
  }}>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{children}</p>
    <div className="actions">
      <button ref={safe} className="button button-secondary" type="button" disabled={busy} onClick={onClose}>Keep Appointment</button>
      <button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </dialog>
}
