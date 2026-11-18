import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { date, label, matches, newest, tripLabel, useAccount } from './account.jsx'
import { withSid } from './utils/dataManager.js'

export const AccountLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export const AccountNav = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />

export function useAccountNavigation() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function useSelectedTrip() {
  return new URLSearchParams(useLocation().search).get('tripId') ?? ''
}

const paths = {
  trips: 'M3 18h18M4 14l2-6h12l2 6v4H4zM7 15h1m8 0h1',
  receipts: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6m-6 4h6',
  profiles: 'M4 8h16v12H4zM8 8V5h8v3m-12 5h16m-10 0v2h4v-2',
  lost: 'M6 8h12l2 13H4zM9 8V6a3 3 0 0 1 6 0v2m-3 4v5',
  refunds: 'M5 10a7 7 0 1 1 1 7M5 4v6h6m1 0v4l2 2',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
}

export function Icon({ name }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

export function PageTitle({ title, description, action }) {
  return <header className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>
}

export function Trail({ to, children }) {
  return <AccountLink to={to} className="trail">← {children}</AccountLink>
}

export function Badge({ status }) {
  const success = ['active', 'completed', 'returned', 'approved'].includes(status)
  const warning = ['submitted', 'in_progress', 'under_review', 'queued'].includes(status)
  const negative = ['canceled', 'declined', 'withdrawn'].includes(status)
  const tone = success ? ' good' : warning ? ' pending' : negative ? ' negative' : ''
  return <span className={'badge' + tone}>{status ? label(status) : 'Unknown'}</span>
}

export function Field({ label: name, children, error }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{name}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id + '-error' : undefined })}
    {error && <span className="field-error" id={id + '-error'}>{error}</span>}
  </div>
}

export function Search({ label: name = 'Search', value, onChange, placeholder }) {
  return <Field label={name}>{(props) => <input {...props} type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}</Field>
}

export function Filter({ label: name, value, onChange, options, all = 'All' }) {
  return <Field label={name}>{(props) => <select {...props} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">{all}</option>
    {options.map(([key, title]) => <option value={key} key={key}>{title}</option>)}
  </select>}</Field>
}

export function Ledger({ headers, rows, empty, filtered, clear, caption, showCount = true }) {
  const [limit, setLimit] = useState(12)
  return <section className="panel ledger" aria-label={caption}>
    {showCount && <div className="ledger-caption" aria-live="polite">{rows.length} {rows.length === 1 ? 'result' : 'results'}</div>}
    {rows.length ? <>
      <table>
        <thead><tr>{headers.map((head) => <th scope="col" key={head}>{head}</th>)}</tr></thead>
        <tbody>{rows.slice(0, limit).map(({ id, cells }) => <tr key={id}>{cells.map((cell, index) =>
          <td key={headers[index]}><span className="mobile-label" aria-hidden="true">{headers[index]}</span>{cell}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > limit && <div className="ledger-footer">
        <span>Showing {limit} of {rows.length}</span>
        <button className="button secondary" onClick={() => setLimit((count) => count + 12)}>Show more</button>
      </div>}
    </> : <div className="empty">
      <h2>{filtered ? 'No matching results' : empty}</h2>
      {filtered && <button className="button secondary" onClick={clear}>Clear filters</button>}
    </div>}
  </section>
}

export function Facts({ items }) {
  return <dl className="facts">{items.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Missing({ title, to, back }) {
  return <><Trail to={to}>{back}</Trail><PageTitle title={title} description="This record is unavailable in your account." /></>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const id = useId()
  useLayoutEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  return <dialog className="dialog" ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <h2 id={id}>{title}</h2>
    {children}
  </dialog>
}

export function Confirm({ title, children, action, onConfirm, onClose, destructive }) {
  return <Dialog title={title} onClose={onClose}>
    <p>{children}</p>
    <div className="form-actions">
      <button type="button" className="button secondary" onClick={onClose} autoFocus>Cancel</button>
      <button type="button" className={'button' + (destructive ? ' destructive' : '')} onClick={onConfirm}>{action}</button>
    </div>
  </Dialog>
}

export function TripPicker({ trips, value, onChange, error }) {
  const [query, setQuery] = useState('')
  const { data } = useAccount()
  const visible = newest(trips, 'startedAt').filter((trip) => trip.id === value || matches(query, trip.id, trip.city, trip.pickup, trip.destination, trip.driverName))
  return <>
    <Search label="Search trips" value={query} onChange={setQuery} placeholder="Address, city or driver" />
    <Field label="Trip" error={error}>{(props) => <select {...props} value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="" disabled>{visible.length ? 'Select a trip' : 'No matching trips'}</option>
      {visible.map((trip) => <option key={trip.id} value={trip.id}>{date(trip.startedAt, data.rider?.timeZone)} · {trip.pickup || 'Pickup'} → {tripLabel(trip)}</option>)}
    </select>}</Field>
  </>
}
