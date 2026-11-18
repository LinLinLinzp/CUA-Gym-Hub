import { useId } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { date, label, money } from './model.js'
import { withSid } from './utils/dataManager.js'

export const sections = [
  { path: '/', name: 'Overview' }, { path: '/cards', name: 'Cards', entity: 'card' },
  { path: '/expenses', name: 'Expenses', entity: 'expense' }, { path: '/receipts', name: 'Receipts', entity: 'receipt' },
  { path: '/limits', name: 'Spend limits', entity: 'limit' },
]

export function useSiteLink() {
  const { search } = useLocation()
  return (pathname, filters = {}) => {
    const params = new URLSearchParams(search)
    const sid = params.get('sid')
    const next = new URLSearchParams(filters)
    if (sid) next.set('sid', sid)
    return sid ? `${pathname}?${next}` : withSid(`${pathname}${next.size ? `?${next}` : ''}`)
  }
}

const symbols = {
  arrow: 'M5 12h14m-6-6 6 6-6 6', plus: 'M12 5v14M5 12h14', search: 'M21 21l-4.3-4.3M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  card: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 2h18M7 15h4',
  expenses: 'M4 19h16M7 15l4-4 3 3 5-7M15 7h4v4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6',
  limits: 'M6 5v14m6-14v14m6-14v14M4 9h4m2 6h4m2-7h4',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2',
  x: 'm6 6 12 12M18 6 6 18',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  left: 'm14 6-6 6 6 6', right: 'm10 6 6 6-6 6',
}
export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={symbols[name]} />
  </svg>
}

export const Badge = ({ value }) => <span className={`badge badge--${value ?? 'unknown'}`}>{label(value)}</span>
export const Money = ({ amount, currency }) => <span className="numbers">{money(amount, currency)}</span>
export const CalendarDate = ({ value }) => <span className="numbers">{date(value)}</span>
export const recordPath = (base, id) => `${base}/${encodeURIComponent(id)}`

export function RecordLink({ base, record, name, fallback = 'Unavailable' }) {
  const siteLink = useSiteLink()
  return record?.id ? <Link to={siteLink(recordPath(base, record.id))}>{name || 'Untitled record'}</Link> : fallback
}

export function Filters({ children }) {
  return <div className="filters">{children}</div>
}

export function Filter({ name, value, onChange, options, placeholder }) {
  const id = useId()
  return <div className="filter">
    <label htmlFor={id}>{name}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
}

export function Search({ value, onChange, placeholder = 'Search records' }) {
  return <label className="filter search">
    <span>Search</span>
    <span className="search-input"><Icon name="search" /><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></span>
  </label>
}

export function Ledger({ columns, rows, empty }) {
  if (!rows.length) return <div className="empty">{empty}</div>
  return <div className="table-scroll"><table>
    <thead><tr>{columns.map(([heading, , numeric]) => <th key={heading} scope="col" className={numeric ? 'amount' : undefined}>{heading}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map(([heading, render, numeric]) => <td key={heading} className={numeric ? 'amount' : undefined}>{render(row)}</td>)}</tr>)}</tbody>
  </table></div>
}

export function PageTitle({ title, description, action, children }) {
  return <div className="page-title">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action || children}
  </div>
}

export function Facts({ values }) {
  return <dl className="facts">{values.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}
