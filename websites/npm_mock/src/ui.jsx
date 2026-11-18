import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from './utils/dataManager.js'

export function useDestination() {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  return (path) => sid ? path + (path.includes('?') ? '&' : '?') + 'sid=' + encodeURIComponent(sid) : path
}

export function AppLink({ to, ...props }) {
  return <Link to={useDestination()(to)} {...props} />
}

export function AppNav({ to, ...props }) {
  return <NavLink to={useDestination()(to)} {...props} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  const destination = useDestination()
  return (path, options) => navigate(destination(path), options)
}

export const packagePath = (id) => '/packages/' + encodeURIComponent(id)
export const tokenPath = (id) => '/access-tokens/' + encodeURIComponent(id)
export const orgPath = (id) => '/organizations/' + encodeURIComponent(id)
export const teamPath = (orgId, id) => orgPath(orgId) + '/teams/' + encodeURIComponent(id)

export function Icon({ name }) {
  return <span className={'icon icon-' + name} aria-hidden="true">
    {({ packages: '◈', tokens: '⌘', organizations: '▦', search: '⌕', close: '×', arrow: '→' })[name]}
  </span>
}

export function Heading({ title, description, children, mono = false }) {
  return <div className="heading">
    <div><h1 className={mono ? 'mono' : undefined}>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="heading-actions">{children}</div>}
  </div>
}

export function Badge({ value }) {
  return <span className={'badge badge-' + value}>{labels[value] || value || '—'}</span>
}

export const labels = {
  active: 'Active', expired: 'Expired', revoked: 'Revoked', deprecated: 'Deprecated', pending: 'Pending',
  public: 'Public', private: 'Private', owner: 'Owner', admin: 'Admin', member: 'Member', none: 'No access',
  'read-only': 'Read-only', 'read-write': 'Read and write', 'stage-only': 'Stage-only',
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function Missing({ title, to, label }) {
  return <><Heading title={title} /><Empty title="This record is unavailable."><AppLink to={to}>{label}</AppLink></Empty></>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="search">
    <Icon name="search" />
    <input type="search" aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
  </label>
}

export function Select({ label, value, onChange, options, disabled, hiddenLabel = false, name }) {
  const labelId = useId()
  return <div className="field">
    <span id={labelId} className={hiddenLabel ? 'sr-only' : 'field-label'}>{label}</span>
    <select aria-labelledby={labelId} name={name} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {options.map(option => {
        const [id, text] = Array.isArray(option) ? option : [option, labels[option] || option]
        return <option key={id} value={id}>{text}</option>
      })}
    </select>
  </div>
}

export function TextField({ label, value, onChange, multiline, ...props }) {
  const Control = multiline ? 'textarea' : 'input'
  return <label className="field"><span className="field-label">{label}</span>
    <Control value={value} onChange={event => onChange(event.target.value)} {...props} />
  </label>
}

export function ErrorText({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function Panel({ title, description, children, className = '' }) {
  return <section className={'panel ' + className}>
    {title && <h2>{title}</h2>}{description && <p className="muted">{description}</p>}{children}
  </section>
}

export function Info({ entries }) {
  return <dl className="info">
    {entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}
  </dl>
}

export function Tabs({ entries, label }) {
  const { pathname, search } = useLocation()
  return <nav className="tabs" aria-label={label}>
    {entries.map(([to, name]) => {
      const url = to.split('?')[0]
      const query = to.includes('?') ? new URLSearchParams(to.split('?')[1]) : null
      return <AppLink key={to} to={to} aria-current={pathname === url && ((query?.get('tab') ?? null) === new URLSearchParams(search).get('tab')) ? 'page' : undefined}>{name}</AppLink>
    })}
  </nav>
}


export function Confirm({ title, children, action, onConfirm, onClose, disabled, danger = true }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    node.showModal()
    return () => {
      if (node.open) node.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} className="dialog" aria-labelledby="confirm-title"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <form onSubmit={event => { event.preventDefault(); onConfirm() }}>
      <h2 id="confirm-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="actions dialog-actions">
        <button type="button" className="button" autoFocus onClick={onClose}>Cancel</button>
        <button className={'button ' + (danger ? 'danger' : 'primary')} disabled={disabled}>{action}</button>
      </div>
    </form>
  </dialog>
}

export function Table({ label, headers, children }) {
  return <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
    <table><thead><tr>{headers.map(([key, text, className]) => <th key={key} className={className} scope="col">{text}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
}

export function Copy({ value, label = 'Copy' }) {
  const [status, setStatus] = useState('')
  return <div className="actions">
    <button type="button" className="button compact" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setStatus('Copied') }
      catch { setStatus('Select the text to copy it manually.') }
    }}>{label}</button>
    {status && <span className="muted" role="status">{status}</span>}
  </div>
}

const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
export function dateLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return formatter.format(new Date(value))
}

export function relativeDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Never'
  const days = Math.floor((new Date().getTime() - Date.parse(value)) / 86400000)
  if (days < 0 || days >= 30) return dateLabel(value)
  if (days === 0) return 'Today'
  return days === 1 ? 'Yesterday' : days + ' days ago'
}

export const numberLabel = (value) => typeof value === 'number' ? value.toLocaleString('en-US') : '—'
export const contains = (value, search) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())

