import { cloneElement, useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { list, person } from './data/account.js'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const number = new Intl.NumberFormat('en-US')
export const money = value => Number.isFinite(value) ? currency.format(value) : '—'
export const count = value => Number.isFinite(value) ? number.format(value) : '—'
export const titleCase = value => String(value ?? '').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
export const creditType = type => type === 'future_flight_credit' ? 'Future flight credit' :
  type === 'electronic_travel_certificate' ? 'Electronic travel certificate' : 'Travel credit'

export function dateTime(value, timeZone, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(value))
  }
}

export const dateOnly = day => dateTime(day && day + 'T00:00:00Z', 'UTC')
export const time = (value, airport) => dateTime(value, airport?.timeZone, { hour: 'numeric', minute: '2-digit' })
export const segmentDay = segment => dateTime(segment?.departureAt, segment?.origin?.timeZone)
export const tripPath = booking => '/trips/' + encodeURIComponent(booking.id)
export const routeTitle = segment => (segment?.origin?.city || segment?.origin?.code || 'Departure') + ' to ' +
  (segment?.destination?.city || segment?.destination?.code || 'Arrival')
export const tripTitle = booking => routeTitle(list(booking?.segments)[0])
export const names = booking => list(booking?.passengers).map(person).filter(Boolean).join(', ')

export function AppLink({ to, children, ...props }) {
  return <Link to={withSid(to)} {...props}>{children}</Link>
}

export function Heading({ title, children, actions }) {
  return <div className="page-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{actions}</div>
}

export function Status({ value }) {
  return <span className={'badge ' + value}>{titleCase(value) || 'Unknown'}</span>
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <div>{children}</div>}</div>
}

export function Field({ label, children }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}

export function Tabs({ label, options, selected, onChange }) {
  return <div className="tabs" role="group" aria-label={label}>
    {options.map(([value, text]) => <button type="button" key={value} aria-pressed={selected === value} onClick={() => onChange(value)}>{text}</button>)}
  </div>
}

export function ErrorMessage({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function Dialog({ title, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const launcher = document.activeElement
    node.showModal()
    return () => {
      node.close()
      launcher?.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="dialog-title">{title}</h2>
    {children}
  </dialog>
}

export function RouteFocus() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    document.querySelector('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}
