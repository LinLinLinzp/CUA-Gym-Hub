import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { withSid } from './utils/dataManager'

export function Icon({ name }) {
  const paths = {
    right: 'm9 6 6 6-6 6',
    back: 'm12 19-7-7 7-7M5 12h14',
    plus: 'M12 5v14M5 12h14',
    split: 'M12 20v-6m0 0 6-6m-6 6L6 8m9-2h5v5M4 11V6h5',
    down: 'M12 4v11m-4-4 4 4 4-4M5 16v4h14v-4',
    close: 'm6 6 12 12M18 6 6 18',
    search: 'm21 21-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

export function Avatar({ person }) {
  const name = person?.name?.trim() || ''
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('') || '?'
  const tint = Array.from(String(person?.id || '')).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 5
  return <span className={'avatar tint-' + tint} aria-hidden="true">{initials.toUpperCase()}</span>
}

const statusLabels = {
  completed: 'Completed', pending: 'Pending', paid: 'Paid', declined: 'Declined', cancelled: 'Cancelled',
  partial: 'Partially settled', settled: 'Settled', closed: 'Closed',
}

export function Status({ value }) {
  return <span className={'status status-' + (statusLabels[value] ? value : 'unknown')}>{statusLabels[value] || 'Unavailable'}</span>
}

export function AppLink({ to, children, ...props }) {
  return <Link to={withSid(to)} {...props}>{children}</Link>
}

export function Back({ to, children }) {
  return <AppLink className="back-link" to={to}><Icon name="back" />{children}</AppLink>
}

export function Heading({ title, description, children }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="actions">{children}</div>}
  </div>
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function Switch({ label, value, options, onChange }) {
  return <div className="switch" role="group" aria-label={label}>
    {options.map(([key, text]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}
  </div>
}

export function Field({ label, children, error, id, className = '' }) {
  return <div className={'field ' + className}>
    <label htmlFor={id}>{label}</label>{children}
    {error && <small id={id + '-error'} className="error" role="alert">{error}</small>}
  </div>
}

export function Facts({ entries }) {
  return <dl className="facts">{entries.filter(([, value]) => value != null).map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>,
  )}</dl>
}

export function Sheet({ title, close, children, footer }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    document.body.classList.add('sheet-open')
    return () => {
      element.close()
      document.body.classList.remove('sheet-open')
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} className="sheet" aria-labelledby="sheet-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <header className="sheet-header">
      <h2 id="sheet-title">{title}</h2>
      <button className="icon-button" type="button" aria-label="Close" onClick={close}><Icon name="close" /></button>
    </header>
    <div className="sheet-body">{children}</div>
    <footer className="sheet-footer">{footer}</footer>
  </dialog>
}
