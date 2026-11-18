import { cloneElement, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { dateLabel, flightTime } from './domain.js'

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function Icon({ name, size = 20 }) {
  const paths = {
    trips: 'M3 7h18v13H3z M8 7V4h8v3 M3 12h18 M10 11v3h4v-3',
    miles: 'm12 2 2.7 6.4 6.8.6-5.2 4.5 1.6 6.7-5.9-3.6-5.9 3.6 1.6-6.7L2.5 9l6.8-.6z',
    credits: 'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 9v1m0 2v1m0 2v1',
    arrow: 'M4 12h15m-5-5 5 5-5 5',
    back: 'M20 12H5m5-5-5 5 5 5',
    search: 'M15.5 15.5 21 21 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z',
    close: 'm5 5 14 14M19 5 5 19',
    check: 'm5 12 4 4L19 6',
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

export function Heading({ title, description, children }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children}
  </header>
}

export function Back({ to, children }) {
  return <AccountLink className="back-link" to={to}><Icon name="back" size={17} />{children}</AccountLink>
}

export function Badge({ children }) {
  return <span className={`badge ${String(children).toLowerCase().replace(/\s/g, '-')}`}>{children}</span>
}

export function Tabs({ label, choices, selected, onSelect }) {
  return <div className="tabs" role="group" aria-label={label}>
    {choices.map((choice) => <button type="button" key={choice}
      aria-pressed={selected === choice} onClick={() => onSelect(choice)}>{choice}</button>)}
  </div>
}

export function Empty({ title, children }) {
  return <div className="card empty"><h2>{title}</h2>{children && <div>{children}</div>}</div>
}

export function RouteLine({ segment, times = false }) {
  return <div className="route-line">
    <div><strong>{segment.origin || '—'}</strong><span>{segment.originCity || segment.origin || 'Origin'}</span>
      {times && <span>{flightTime(segment.departureAt)}</span>}</div>
    <span className="route-drawing" aria-hidden="true"><i /></span>
    <div><strong>{segment.destination || '—'}</strong><span>{segment.destinationCity || segment.destination || 'Destination'}</span>
      {times && <span>{flightTime(segment.arrivalAt)}</span>}</div>
  </div>
}

export function FlightCard({ segment }) {
  return <article className="card flight-card">
    <div className="flight-meta"><strong>{segment.flightNumber || 'Flight'}</strong><span>{dateLabel(segment.departureAt, true)}</span></div>
    <RouteLine segment={segment} times />
    {segment.durationMinutes > 0 && <p className="muted">{Math.floor(segment.durationMinutes / 60)}h {segment.durationMinutes % 60}m · Local airport times</p>}
  </article>
}

export function Field({ label, children, ...props }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {children ? cloneElement(children, { id }) : <input {...props} id={id} />}
  </div>
}

export function ErrorMessage({ children, id }) {
  return children ? <p id={id} role="alert" className="error-message">{children}</p> : null
}

export function Summary({ title, lines }) {
  return <aside className="card summary">
    <h2>{title}</h2>
    <dl>{lines.map(([label, value], index) =>
      <div key={label} className={index === lines.length - 1 ? 'summary-total' : ''}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </aside>
}

export function Success({ title, children, to, link }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <section className="card success">
    <div className="success-icon"><Icon name="check" /></div>
    <h1 tabIndex={-1} ref={heading}>{title}</h1>
    {children}
    <AccountLink to={to} className="button primary">{link}<Icon name="arrow" size={17} /></AccountLink>
  </section>
}

export function Dialog({ title, children, onClose }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      opener?.focus()
    }
  }, [])
  return <dialog className="dialog" ref={ref} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
    </div>
    {children}
  </dialog>
}
