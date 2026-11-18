import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from './utils/dataManager'

export function useAccountNavigation() {
  const { search } = useLocation()
  const navigate = useNavigate()
  function path(destination, query = {}) {
    const params = new URLSearchParams(query)
    const sid = new URLSearchParams(search).get('sid') || getSessionId()
    if (sid) params.set('sid', sid)
    const suffix = params.toString()
    return suffix ? destination + '?' + suffix : destination
  }
  return { path, go: (destination, query, options) => navigate(path(destination, query), options) }
}

export function AccountLink({ to, query, ...props }) {
  const { path } = useAccountNavigation()
  return <Link to={path(to, query)} {...props} />
}

export function Title({ title, description, children, back }) {
  return <>
    {back && <AccountLink to={back[0]} className="back">← {back[1]}</AccountLink>}
    <header className="page-title">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {children}
    </header>
  </>
}

export const labels = {
  upcoming: 'Upcoming', in_progress: 'In progress', completed: 'Completed',
  cancelled: 'Cancelled', available: 'Available', unavailable: 'Unavailable',
  submitted: 'Submitted', in_review: 'In review', resolved: 'Resolved',
  stay: 'Stay credit', bonus: 'Bonus', redemption: 'Redemption', adjustment: 'Adjustment',
  hotel_service: 'Hotel service', missing_stay_credit: 'Missing stay credit', folio_copy: 'Folio copy',
  extra_towels: 'Extra towels', extra_pillows: 'Extra pillows', housekeeping: 'Housekeeping',
}

export const label = value => labels[value] || value || '—'
export const records = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const recordPath = (list, id) => '/' + list + '/' + encodeURIComponent(id)
export const integer = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—'
export const signed = value => (Number(value) > 0 ? '+' : Number(value) < 0 ? '−' : '') + integer(Math.abs(Number(value) || 0))
export const balance = data => records(data.pointsActivity).reduce((sum, row) => sum + (Number(row.points) || 0), 0)
export const matches = (search, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase()))

export function dateText(value) {
  if (!value) return '—'
  const date = new Date(String(value).slice(0, 10) + 'T00:00:00Z')
  return Number.isNaN(+date) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function dates(stay) {
  return dateText(stay.checkIn) + ' – ' + dateText(stay.checkOut)
}

export function money(value, currency = 'USD') {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency
}

export function sorted(rows, getDate, direction = 'newest') {
  return [...rows].sort((left, right) => {
    const a = String(getDate(left) || '')
    const b = String(getDate(right) || '')
    if (!a || !b) return Number(Boolean(b)) - Number(Boolean(a))
    return direction === 'oldest' ? a.localeCompare(b) : b.localeCompare(a)
  })
}

export function Badge({ value }) {
  return <span className={'badge badge-' + value}>{label(value)}</span>
}

export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([name, value]) => <div key={name}>
    <dt>{name}</dt><dd>{value ?? '—'}</dd>
  </div>)}</dl>
}

export function Missing({ collection, name }) {
  return <Title title={name + ' unavailable'} description="This record could not be found in your account."
    back={['/' + collection.toLowerCase(), 'Back to ' + collection.toLowerCase()]} />
}

export function Field({ label: title, error, children }) {
  const controlId = useId()
  const errorId = controlId + '-error'
  return <div className="field">
    <label htmlFor={controlId}>{title}</label>
    {cloneElement(children, { id: controlId, 'aria-describedby': error ? errorId : undefined })}
    {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
  </div>
}

export function Search({ value, onChange, placeholder }) {
  return <Field label="Search"><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></Field>
}

export function Select({ label: title, value, onChange, options }) {
  return <Field label={title}><select value={value} onChange={event => onChange(event.target.value)}>
    {options.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
  </select></Field>
}

export function Sort({ value, onChange }) {
  return <Select label="Sort by date" value={value} onChange={onChange} options={[['newest', 'Newest first'], ['oldest', 'Oldest first']]} />
}

export function Results({ rows, render, empty }) {
  const [page, setPage] = useState(1)
  const size = 12
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(page, pages)
  const start = (current - 1) * size
  if (!rows.length) return <div className="panel empty">{empty}</div>
  return <>
    <ul className="panel results">{rows.slice(start, start + size).map(render)}</ul>
    <div className="pagination">
      <span>{start + 1}–{Math.min(start + size, rows.length)} of {rows.length}</span>
      <div className="actions"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>
        <button disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></div>
    </div>
  </>
}

export function Confirm({ title, children, action, onClose, onConfirm, danger }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (trigger?.isConnected) trigger.focus()
      else document.getElementById('account-main')?.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby="confirm-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="confirm-title">{title}</h2>
    {children}
    <div className="actions dialog-actions">
      <button autoFocus onClick={onClose}>Go back</button>
      <button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{action}</button>
    </div>
  </dialog>
}
