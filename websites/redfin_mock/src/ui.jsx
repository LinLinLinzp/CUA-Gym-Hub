import React, { useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpRight, House, X } from 'lucide-react'
import { withSid } from './utils/dataManager'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}
export function SiteNav({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}
export function useSiteNavigate() {
  const navigate = useNavigate()
  return path => navigate(withSid(path))
}

const labels = { in_person: 'In person', video: 'Video', fha: 'FHA', va: 'VA' }
export const label = value => labels[value] || (typeof value === 'string' && value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : '—')
export const matching = (query, ...values) => values.filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'RF'
export function money(amount) {
  const value = typeof amount === 'string' && /^\d+\.\d{2}$/.test(amount) ? Number(amount) : amount
  return Number.isFinite(value) ? value.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }) : 'Price unavailable'
}
export const zone = value => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value || 'America/Los_Angeles' }).resolvedOptions().timeZone
  } catch {
    return 'America/Los_Angeles'
  }
}
export function dateTime(value, timeZone, options = {}) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', { timeZone: zone(timeZone), month: 'short', day: 'numeric', ...options }).format(date)
}
export const appointment = (value, timeZone) => dateTime(value, timeZone, { weekday: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
export const localDate = value => value ? dateTime(value + 'T12:00:00Z', 'UTC', { year: 'numeric' }) : 'Flexible'
export const homePlace = home => [home?.neighborhood, [home?.city, home?.region].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
export const homeAddress = home => home?.address || 'Listing unavailable'

export function PageTitle({ title, children, action }) {
  return <div className="page-title"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>
}
export function TextLink({ to, children }) {
  return <SiteLink className="text-link" to={to}>{children}<ArrowUpRight size={15} aria-hidden="true" /></SiteLink>
}
export function Empty({ title, children, action }) {
  return <div className="empty"><House size={23} aria-hidden="true" /><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}
export function Status({ value }) {
  return <span className={'status status-' + value}>{label(value)}</span>
}
export function Field({ label: name, id, error, children }) {
  return <div className="field"><label htmlFor={id}>{name}</label>{children}
    {error && <p className="field-error" id={id + '-error'}>{error}</p>}
  </div>
}
export const invalid = (id, error) => ({ 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error ? id + '-error' : undefined })

export function Modal({ title, onClose, returnFocus, children }) {
  const dialog = useRef(null)

  useEffect(() => {
    const element = dialog.current
    const previous = returnFocus || document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected && previous !== document.body) previous.focus()
      else document.querySelector('main')?.focus()
    }
  }, [returnFocus])

  return <dialog ref={dialog} aria-label={title}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>
}
export function Confirm({ title, body, action, onClose, onConfirm, returnFocus }) {
  return <Modal title={title} onClose={onClose} returnFocus={returnFocus}>
    <p className="dialog-body">{body}</p>
    <div className="form-actions">
      <button type="button" className="secondary" onClick={onClose}>Keep {action === 'Cancel tour' ? 'tour' : 'offer'}</button>
      <button type="button" className="primary" onClick={onConfirm}>{action}</button>
    </div>
  </Modal>
}
export function Missing({ title = 'Page unavailable', to = '/', link = 'Back to My Redfin' }) {
  return <><PageTitle title={title} /><Empty title="We couldn’t find that record" action={<TextLink to={to}>{link}</TextLink>} /></>
}
