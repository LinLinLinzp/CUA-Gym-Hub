import React, { useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { cents, list } from './records.js'

export { cents, list }

export const paths = {
  overview: '/',
  orders: '/account/orders',
  beauty: '/account/beauty-insider',
  returns: '/account/returns',
  order: (id) => '/account/orders/' + encodeURIComponent(id),
  request: (id) => '/account/returns/' + encodeURIComponent(id),
  newReturn: (id) => '/account/returns/new/' + encodeURIComponent(id),
}

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function AccountNav({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}

export const human = (value) => typeof value === 'string'
  ? value.replaceAll('_', ' ').replace(/^./, (initial) => initial.toUpperCase())
  : 'Status unavailable'
export const orderNumber = (order) => order.orderNumber || order.id || 'Order number unavailable'
export const returnNumber = (request) => request.returnNumber || request.id || 'Return number unavailable'
export const dateValue = (value) => Date.parse(value)
export const newest = (entries, field) => [...entries].sort((a, b) => (dateValue(b[field]) || 0) - (dateValue(a[field]) || 0))
export const points = (value) => Number.isInteger(value) ? value.toLocaleString('en-US') : '—'
export function date(value, withTime = false) {
  if (!Number.isFinite(dateValue(value))) return 'Date unavailable'
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  if (withTime) Object.assign(options, { hour: 'numeric', minute: '2-digit' })
  return new Intl.DateTimeFormat('en-US', options).format(new Date(value))
}

export function money(value, currency = 'USD') {
  if (cents(value) === null) return '—'
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value))
}

export function paymentLabel(payment) {
  if (!payment) return 'Payment details unavailable'
  const label = payment.brand || (payment.type === 'card' ? 'Card' : human(payment.type))
  return payment.last4 ? label + ' ending in ' + payment.last4 : label
}

export function Badge({ status }) {
  return <span className={'badge status-' + (status || 'unknown')}>{human(status)}</span>
}

export function Heading({ title, description, children }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>
}

export function SectionHeading({ title, children }) {
  return <div className="section-heading"><h2>{title}</h2>{children}</div>
}

export function Empty({ title, children }) {
  return <div className="empty card"><h2>{title}</h2>{children}</div>
}

export function Back({ to, children }) {
  return <AccountLink to={to} className="back"><span aria-hidden="true">←</span> {children}</AccountLink>
}

export function SelectFilter({ label, value, onChange, options }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
  </select></label>
}

export function ProductArt({ category }) {
  const kind = ['skincare', 'makeup', 'fragrance', 'hair', 'body'].includes(category) ? category : 'skincare'
  return <span className={'product-art art-' + kind} aria-hidden="true"><i /></span>
}

export function Timeline({ events }) {
  const entries = list(events).sort((a, b) => (dateValue(a.at) || 0) - (dateValue(b.at) || 0))
  if (!entries.length) return <p className="muted">No tracking events yet.</p>
  return <ol className="timeline">{entries.map((entry, index) => (
    <li key={index}><strong>{human(entry.status)}</strong>
      <span>{date(entry.at, true)}{entry.location && ' · ' + entry.location}</span>
    </li>
  ))}</ol>
}

export function Dialog({ title, close, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    const trigger = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="dialog-heading">
      <h2 id="dialog-title">{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={close} autoFocus>×</button>
    </div>
    {children}
  </dialog>
}
