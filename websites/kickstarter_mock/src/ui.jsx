import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getSessionId, withSid } from './utils/dataManager'

const Feedback = createContext(null)

export function FeedbackProvider({ children }) {
  const [notice, setNotice] = useState('')
  return <Feedback.Provider value={setNotice}>
    {children}
    <div className="notice-region" role="status">
      {notice && <div className="notice"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  </Feedback.Provider>
}

export const useFeedback = () => useContext(Feedback)
export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const projectPath = (id) => '/projects/' + encodeURIComponent(id)
export const childPath = (base, id) => base + '/' + encodeURIComponent(id)
export const includes = (value, query) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
export const labels = {
  draft: 'Draft', live: 'Live', funded: 'Funded', unsuccessful: 'Unsuccessful',
  active: 'Active', archived: 'Archived', sent: 'Sent', published: 'Published',
  tier: 'Reward tier', add_on: 'Add-on', public: 'Public', backers_only: 'Backers only',
}

export function SiteLink({ to, current, ...props }) {
  if (current) return <NavLink to={withSid(to)} {...props} />
  return <Link to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function sessionKey() {
  return getSessionId() || ''
}

export function Badge({ status }) {
  return <span className={'badge badge-' + status}>{labels[status] || status || 'Unknown'}</span>
}

export function money(value, currency = 'USD') {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2 }).format(value)
  } catch {
    return Number(value).toLocaleString('en-US') + (currency ? ' ' + currency : '')
  }
}

export function dateLabel(value, monthOnly = false) {
  if (!value) return '—'
  const input = /^\d{4}-\d{2}$/.test(value) ? value + '-01' : value
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', year: 'numeric', ...(monthOnly ? {} : { day: 'numeric' }), timeZone: 'UTC',
  }).format(date)
}

export const artwork = {
  floodlights: 'Floodlights', 'night-bus': 'Night bus', 'common-thread': 'Common thread',
  'signal-grain': 'Signal and grain', coast: 'Coast', paper: 'Paper garden',
}

export function Cover({ coverKey, className = '' }) {
  const hasArt = Object.hasOwn(artwork, coverKey)
  return <div className={'cover ' + className} aria-hidden="true">
    {hasArt && <img src={'/art/' + coverKey + '.png'} alt="" />}
  </div>
}

export function Funding({ project }) {
  const goal = Number(project.fundingGoal)
  const pledged = Number(project.pledgedAmount) || 0
  const progress = goal > 0 ? Math.max(0, Math.min(100, pledged / goal * 100)) : 0
  return <div className="funding">
    <div className="funding-values"><span><strong>{money(pledged, project.currency)}</strong> pledged</span><span>{goal > 0 ? money(goal, project.currency) + ' goal' : 'Goal unset'}</span></div>
    {goal > 0 && <progress max="100" value={progress} aria-label="Funding progress" />}
    <div>{(Number(project.backerCount) || 0).toLocaleString('en-US')} backers</div>
  </div>
}

export function PageHeading({ title, description, children }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children}
  </div>
}

export function SectionHeading({ title, description, children }) {
  return <div className="page-heading section-heading">
    <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </div>
}

export function Field({ label, error, hint, as: Tag = 'input', children, ...props }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <Tag id={id} aria-invalid={error ? true : undefined}
      aria-describedby={error ? id + '-error' : hint ? id + '-hint' : undefined} {...props}>{children}</Tag>
    {error ? <span className="field-error" id={id + '-error'}>{error}</span> : hint && <span className="hint" id={id + '-hint'}>{hint}</span>}
  </div>
}

export function Check({ label, ...props }) {
  return <label className="check"><input type="checkbox" {...props} />{label}</label>
}

export function Empty({ title, message, children }) {
  return <section className="empty panel"><h3>{title}</h3>{message && <p>{message}</p>}{children}</section>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id={titleId}>{title}</h2>
    {children}
  </dialog>
}

export function Confirm({ title, onClose, onConfirm, danger, children }) {
  return <Dialog title={title} onClose={onClose}>
    <div className="dialog-body">{children}</div>
    <div className="actions">
      <button type="button" className="button secondary" autoFocus onClick={onClose}>Cancel</button>
      <button type="button" className={'button ' + (danger ? 'danger' : 'primary')} onClick={onConfirm}>{title}</button>
    </div>
  </Dialog>
}

export function Readable({ children }) {
  return <p className="readable">{children || '—'}</p>
}

export function FilterCount({ count, noun, onReset, filtered }) {
  return <div className="filter-count"><span>{count} {noun}{count === 1 ? '' : 's'}</span>
    {filtered && <button type="button" className="text-button" onClick={onReset}>Clear filters</button>}
  </div>
}

