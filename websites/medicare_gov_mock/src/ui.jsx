import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export const money = (amount) => Number.isFinite(amount)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : 'Unavailable'
export const dateLabel = (date) => {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(date ?? '')
  if (!match) return 'Unavailable'
  const value = new Date(match[1] + 'T00:00:00Z')
  return Number.isNaN(value.valueOf()) ? 'Unavailable' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(value)
}

const iconPaths = {
  overview: 'M3 10 12 3l9 7v10H3z M9 20v-6h6v6',
  plans: 'M4 5h6v14H4z M14 5h6v14h-6z M6 9h2 M16 9h2 M6 13h2 M16 13h2',
  claims: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  enrollment: 'M13 5H5v15h14v-8 M9 14l7-7 3 3-7 7H9z M16 7l2-2 3 3-2 2',
  arrow: 'M4 12h15 M14 7l5 5-5 5',
  shield: 'M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6z M8 12l3 3 5-6',
}

export function Icon({ name }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]} /></svg>
}

export function PageTitle({ title, description, children }) {
  return <header className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</header>
}

export function Missing({ title = 'Page unavailable', to = '/', link = 'Back to overview' }) {
  return <><PageTitle title={title} /><div className="panel"><p>This page or record is unavailable in your account.</p><AccountLink to={to}>{link}</AccountLink></div></>
}

export function Status({ value }) {
  const labels = { available: 'Available', processed: 'Processed', pending: 'Pending', denied: 'Denied', reviewed: 'Reviewed', saved: 'Saved', submitted: 'Submitted', closed: 'Closed', withdrawn: 'Withdrawn', archived: 'Archived', open: 'Open' }
  return <span className={'status status-' + (labels[value] ? value : 'unknown')}>{labels[value] ?? 'Unavailable'}</span>
}

export function DataTable({ label, headers, children }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label}><table><thead><tr>
    {headers.map((header) => <th scope="col" key={header}>{header}</th>)}
  </tr></thead><tbody>{children}</tbody></table></div>
}

export function Field({ label, id, error, hint, children }) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {hint && <small id={id + '-hint'}>{hint}</small>}
    {children}
    {error && <p className="field-error" id={id + '-error'}>{error}</p>}
  </div>
}
