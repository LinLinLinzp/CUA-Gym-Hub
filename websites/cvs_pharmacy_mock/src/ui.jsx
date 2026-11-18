import { useEffect, useId, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { dateLabel, instantLabel, list, medication, money } from './domain.js'

export function RouteLink({ to, nav, ...props }) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  if (!params.get('sid')) {
    const Component = nav ? NavLink : Link
    return <Component to={withSid(to)} {...props} />
  }
  const target = new URL(to, 'http://localhost')
  target.searchParams.set('sid', params.get('sid'))
  const Component = nav ? NavLink : Link
  return <Component to={target.pathname + target.search + target.hash} {...props} />
}

const icons = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  prescriptions: <><path d="M7 4h10M8 4v4l-3 4v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6l-3-4V4M5 13h14M10 16h4"/></>,
  refills: <><path d="M20 7v5h-5M4 17v-5h5M6 8a7 7 0 0 1 12-2l2 3M4 15l2 3a7 7 0 0 0 12-2"/></>,
  pickup: <><path d="M5 8h14l2 13H3L5 8zM9 9V6a3 3 0 0 1 6 0v3"/></>,
  vaccines: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18m-12 5h6m-3-3v6"/></>,
  arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>,
  back: <path d="M20 12H5m5-5-5 5 5 5"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  location: <><path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/></>,
}

export function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export function PageHeader({ title, children, description, back, backLabel }) {
  return <header className="page-heading">
    {back && <RouteLink className="back-link" to={back}><Icon name="back" size={17}/>{backLabel}</RouteLink>}
    <div className="heading-line"><h1>{title}</h1>{children}</div>
    {description && <p>{description}</p>}
  </header>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Missing({ back, label, record }) {
  return <><PageHeader title={record + ' unavailable'} back={back} backLabel={label}/><Empty>We couldn’t find that record in this account.</Empty></>
}

const statusStyles = {
  ready: ['Ready', 'good'], preparing: ['Preparing', 'progress'], checked_in: ['Checked in', 'good'],
  picked_up: ['Picked up', 'neutral'], cancelled: ['Cancelled', 'neutral'], scheduled: ['Scheduled', 'good'],
  completed: ['Completed', 'neutral'], active: ['Active', 'good'], inactive: ['Inactive', 'neutral'],
  hidden: ['Hidden', 'neutral'], past: ['Past visit', 'neutral'],
}
export function Status({ status }) {
  const [label, color] = statusStyles[status] || ['Status unavailable', 'neutral']
  return <span className={'status ' + color}>{label}</span>
}

export function SelectField({ label, children, ...props }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>
}

export function AppointmentTime({ slots, store, day, setDay, value, setValue }) {
  if (!slots.length) return <Empty>No available times at this pharmacy. Choose another location to continue.</Empty>
  const days = [...new Set(slots.map((slot) => slot.day))]
  return <div className="fields">
    <SelectField label="Day" value={day} onChange={(event) => { setDay(event.target.value); setValue('') }} required>
      <option value="">Choose a day</option>
      {days.map((date) => <option key={date} value={date}>{dateLabel(date)}</option>)}
    </SelectField>
    <SelectField label="Time" value={value} onChange={(event) => setValue(event.target.value)} required disabled={!day}>
      <option value="">Choose a time</option>
      {slots.filter((slot) => slot.day === day).map(({ instant }) => <option key={instant} value={instant}>{instantLabel(instant, store, { timeStyle: 'short' })}</option>)}
    </SelectField>
  </div>
}

export function Dialog({ title, children, close }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      trigger?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); close() }}>
    <h2>{title}</h2>{children}
  </dialog>
}

export function ErrorMessage({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null
}

export function Details({ entries }) {
  return <dl className="details">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Items({ items }) {
  return list(items).length ? <ul className="item-list">{list(items).map((item, index) => <li key={item.prescriptionId || index}>
    <div><strong>{medication(item)}</strong><small>Rx {item.rxNumber || '—'} · {item.quantity ?? '—'} {item.unit}</small></div>
    <span>{money(item.estimatedAmount)}</span>
  </li>)}</ul> : <Empty>No prescription items are available.</Empty>
}

export function Receipt({ title, children, to, label }) {
  return <section className="panel receipt" role="status"><span className="receipt-mark"><Icon name="check" size={28}/></span>
    <h1>{title}</h1>{children}<RouteLink className="button primary" to={to}>{label}<Icon name="arrow" size={17}/></RouteLink>
  </section>
}

export function RecordLink({ to, title, meta, end, icon }) {
  return <RouteLink to={to} className="record-link">
    {icon && <span className="record-icon"><Icon name={icon}/></span>}
    <span className="record-main"><strong>{title}</strong>{meta && <small>{meta}</small>}</span>
    {end && <span className="record-end">{end}</span>}
    <Icon name="arrow" size={17}/>
  </RouteLink>
}
