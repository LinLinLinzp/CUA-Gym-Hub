import { useEffect, useRef } from 'react'
import { Armchair, CalendarDays, Check, Circle, Clock3, Copy, Package, X } from 'lucide-react'
import { products } from '../data/products.js'
import { byRecent, formatDate, label, money, records } from '../data/rules.js'
import { useToast } from './Feedback.jsx'

const positive = new Set(['delivered', 'confirmed', 'scheduled', 'completed', 'approved', 'resolved', 'received', 'refunded'])
const attention = new Set(['ready_to_schedule', 'partially_canceled', 'partially_delivered'])
const negative = new Set(['canceled', 'denied', 'withdrawn'])

export function Badge({ status }) {
  let tone = 'neutral'
  let Icon = Circle
  if (positive.has(status)) { tone = 'success'; Icon = Check }
  else if (attention.has(status)) { tone = 'warning'; Icon = Clock3 }
  else if (negative.has(status)) { tone = 'error'; Icon = X }
  return <span className={'badge ' + tone}><Icon size={12} aria-hidden="true" />{label(status)}</span>
}

export function ProductImage({ item, size = 56 }) {
  const key = item?.imageKey
  return Object.hasOwn(products, key)
    ? <img className="product-image" width={size} height={size} src={'/images/' + key + '.webp'} alt="" />
    : <span className="product-placeholder" style={{ width: size, height: size }} aria-hidden="true"><Armchair size={Math.min(24, size / 2)} /></span>
}

export function CopyIdentifier({ value, name }) {
  const toast = useToast()
  if (!value) return null
  const title = 'Copy ' + name

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(value))
      toast('Copied ' + name + ' ' + value + '.')
    } catch {
      toast('Couldn’t copy the ' + name + '. You can select and copy it from the page.')
    }
  }

  return <button type="button" className="icon-button" aria-label={title} title={title} onClick={copy}>
    <Copy size={16} aria-hidden="true" />
  </button>
}

export function PageTitle({ title, description, focusOnMount, children }) {
  const heading = useRef(null)
  useEffect(() => { if (focusOnMount) heading.current.focus() }, [focusOnMount])
  return <header className="page-title">
    <div><h1 ref={heading} tabIndex={-1}>{title}</h1>{description && <p className="muted">{description}</p>}</div>
    {children}
  </header>
}

export function Empty({ title, children }) {
  return <div className="card empty">
    <span className="section-icon"><Package size={21} aria-hidden="true" /></span>
    <h2>{title}</h2>
    {children}
  </div>
}

export function Address({ address }) {
  if (!address?.line1) return <p className="muted">Address unavailable</p>
  const locality = [address.city, [address.region, address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return <address>
    {[address.name, address.line1, address.line2, locality, address.country].filter(Boolean).map((line, i) => <span key={i}>{line}</span>)}
  </address>
}

export function Timeline({ shipment, zone }) {
  const events = records(shipment.trackingEvents).sort((a, b) => byRecent(b.at, a.at))
  return <div className="timeline-panel">
    <h3>Tracking timeline</h3>
    {events.length ? <ol className="timeline">
      {events.map((event, index) => <li key={index}>
        <strong>{event.label || 'Shipment update'}</strong>
        <span className="muted meta">{formatDate(event.at, zone, {
          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        })}{event.location && ' · ' + event.location}</span>
      </li>)}
    </ol> : <p className="muted">Tracking updates are unavailable.</p>}
  </div>
}

export function Quote({ rows, currency }) {
  return <dl className="quote">
    {rows.map(([name, amount, total]) => <div className={total ? 'quote-total' : undefined} key={name}>
      <dt>{name}</dt><dd>{money(amount, currency)}</dd>
    </div>)}
  </dl>
}

export function AppointmentWindow({ children }) {
  return <p className="appointment-window"><CalendarDays size={17} aria-hidden="true" /><span>{children}</span></p>
}
