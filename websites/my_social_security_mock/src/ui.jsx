import React, { useId } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { addStatementActivity, markNoticeRead, useAccount } from './account.jsx'
import { withSid } from './utils/dataManager.js'

const iconPaths = {
  home: 'M2.5 9 10 2.5 17.5 9v8.5h-5V12h-5v5.5h-5z',
  statement: 'M4.5 2.5h7l4 4v11h-11z M11.5 2.5v4h4 M7 10h6 M7 13.5h6',
  bank: 'M2 7l8-4.5L18 7H2z M3 17h14 M5 10v4.5 M10 10v4.5 M15 10v4.5',
  letter: 'M2.5 4.5h15v11h-15z M3 5l7 5.5L17 5',
  payments: 'M3 3h14v14H3z M6 7h8 M6 10h8 M6 13h4',
  arrow: 'M3 10h13 M11 5l5 5-5 5',
  back: 'M17 10H4 M9 5l-5 5 5 5',
  download: 'M10 2.5V13 M6 9l4 4 4-4 M3 13.5V17h14v-3.5',
  print: 'M6 7V3h8v4 M5.5 14H3V7h14v7h-2.5 M6 11h8v6H6z M14.5 9.5h.2',
  check: 'M3.5 10l4 4 9-9',
  person: 'M13.5 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z M3.5 17a6.5 6.5 0 0 1 13 0',
}

export function Icon({ name }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]} /></svg>
}

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function AccountNavLink({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}

function isPlainClick(event) {
  return event.button === 0 && !event.defaultPrevented && !event.metaKey &&
    !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function StatementLink({ statement, children }) {
  const { commit } = useAccount()
  if (!statement.id) return children
  return <AccountLink to={'/statements/' + encodeURIComponent(statement.id)} onClick={event => {
    if (isPlainClick(event)) addStatementActivity(commit, statement, 'viewed')
  }}>{children}</AccountLink>
}

export function LetterLink({ letter, children }) {
  const { commit } = useAccount()
  if (!letter.id) return children
  return <AccountLink to={'/letters/' + encodeURIComponent(letter.id)} onClick={event => {
    if (isPlainClick(event)) markNoticeRead(commit, letter.id)
  }}>{children}</AccountLink>
}

export function PageHeading({ title, description, action }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action}
  </div>
}

export function BackLink({ to, children }) {
  return <AccountLink className="back-link" to={to}><Icon name="back" />{children}</AccountLink>
}

export function Unavailable({ title, to, linkText }) {
  return <>
    <PageHeading title={title} />
    <div className="panel"><p>This page is unavailable in your account.</p><BackLink to={to}>{linkText}</BackLink></div>
  </>
}

export function Facts({ items, className = '' }) {
  return <dl className={'facts ' + className}>
    {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>
}

export function SortButton({ order, setOrder, label = 'Date' }) {
  return <button type="button" className="sort-button" onClick={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}>
    {label} <span aria-hidden="true">{order === 'newest' ? '↓' : '↑'}</span>
    <span className="sr-only">, {order === 'newest' ? 'newest' : 'oldest'} first. Reverse sort order</span>
  </button>
}

export function Results({ count, noun, empty, reset }) {
  return <>
    <p className="result-count" role="status">{count} {noun}{count === 1 ? '' : 's'}</p>
    {count === 0 && <div className="empty"><p>{empty}</p>{reset && <button type="button" className="button secondary" onClick={reset}>Reset filters</button>}</div>}
  </>
}

export function YearFilter({ year, setYear, years }) {
  const id = useId()
  return <div>
    <label htmlFor={id}>Year</label>
    <select id={id} value={year} onChange={event => setYear(event.target.value)}>
      <option value="">All years</option>
      {years.map(option => <option key={option}>{option}</option>)}
    </select>
  </div>
}
