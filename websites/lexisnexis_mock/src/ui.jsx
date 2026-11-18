import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { dateText, nameOf, signals, titleCase } from './model.js'
import { withSid } from './utils/dataManager.js'

const lines = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  search: 'M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  folder: 'M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  citation: 'M10 7H5v6h5v-6zm0 6c0 3-2 4-4 4m13-10h-5v6h5v-6zm0 6c0 3-2 4-4 4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm9 6 6 6-6 6',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6',
  archive: 'M4 8h16v12H4zM3 4h18v4H3zm6 8h6',
  close: 'm6 6 12 12M6 18 18 6',
}

export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={lines[name]} /></svg>
}

export function useSidNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

const nav = [
  ['/', 'Workspace', 'home'], ['/research', 'Research', 'search'], ['/folders', 'Folders', 'folder'],
  ['/citations', 'Citations', 'citation'], ['/alerts', 'Alerts', 'bell'],
]

export function Shell({ profile, children }) {
  const { pathname } = useLocation()
  const section = nav.find(([path]) => path !== '/' && pathname.startsWith(path))
  const name = nameOf(profile, 'name')
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <div className="layout">
    <a href="#main" className="skip">Skip to content</a>
    <aside className="rail">
      <SiteLink to="/" className="brand"><span>LexisNexis<span className="brand-period">.</span></span><small>Research workspace</small></SiteLink>
      <nav aria-label="Main navigation">{nav.map(([path, label, icon]) =>
        <NavLink key={path} to={withSid(path)} end={path === '/'}><Icon name={icon} />{label}</NavLink>
      )}</nav>
      <div className="account"><span className="avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong>{profile?.organization && <small>{profile.organization}</small>}</div></div>
    </aside>
    <div className="surface-layout">
      <header className="topbar">
        <div className="top-path"><SiteLink to="/">Research workspace</SiteLink>{section && <><Icon name="chevron" size={13} /><SiteLink to={section[0]}>{section[1]}</SiteLink></>}</div>
        <span className="top-account">{profile?.organization}</span>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  </div>
}

export function PageHead({ title, description, actions, children }) {
  return <header className="page-head">
    {children}
    <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
  </header>
}
export function Panel({ title, action, children, className = '' }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <header className="panel-head">{title && <h2>{title}</h2>}{action}</header>}
    {children}
  </section>
}
export function List({ count, label, children, empty = 'No records to display.' }) {
  return <div className="list">
    <div className="list-count">{count} {count === 1 ? label : `${label}s`}</div>
    {count ? <ul className="rows">{children}</ul> : <div className="empty">{empty}</div>}
  </div>
}
export function Badge({ value, label }) {
  if (!value && !label) return null
  const tone = ['positive', 'followed', 'active', 'unread'].includes(value) ? 'positive'
    : ['caution', 'distinguished', 'paused', 'expired'].includes(value) ? 'caution'
      : ['negative', 'criticized', 'deleted'].includes(value) ? 'negative' : 'neutral'
  return <span className={`badge ${tone}`}>{label || signals[value] || titleCase(value)}</span>
}
export const Moment = ({ value }) => <time dateTime={value || undefined}>{dateText(value)}</time>
export function Select({ label, options, value, onChange, empty, compact, ...props }) {
  const id = useId()
  return <div className="field"><label htmlFor={id} className={compact ? 'sr-only' : undefined}>{label}</label><select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...props}>
    {empty && <option value="">{empty}</option>}
    {value && !Object.hasOwn(options, value) && <option value={value}>{value}</option>}
    {Object.entries(options).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
  </select></div>
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-head"><h2>{title}</h2><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>
}
export function Confirm({ title, description, action, onClose, onConfirm, onSuccess = onClose, danger = true }) {
  const [error, setError] = useState('')
  return <Modal title={title} onClose={onClose}>
    <p>{description}</p>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="dialog-actions"><button onClick={onClose}>Cancel</button>
      <button className={danger ? 'danger primary' : 'primary'} onClick={() => {
        const issue = onConfirm()
        if (issue) setError(issue)
        else onSuccess()
      }}>{action}</button></div>
  </Modal>
}
export function Missing({ title, description, to, label }) {
  return <><PageHead title={title} description={description} /><SiteLink className="button" to={to}>{label}</SiteLink></>
}
