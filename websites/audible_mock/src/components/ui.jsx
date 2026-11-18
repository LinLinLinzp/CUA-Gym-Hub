import { useState } from 'react'
import { Icon } from './Icon.jsx'
import { SiteLink } from './links.jsx'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const dateLabel = (value) => Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : '—'
export const moneyLabel = (value) => Number.isFinite(value) ? moneyFormat.format(value) : '—'

export function runtime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 1) return null
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return [hours && `${hours} hr`, remainder && `${remainder} min`].filter(Boolean).join(' ')
}

export const matches = (query, ...values) => {
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const text = values.map(normalize).join(' ')
  return normalize(query).trim().split(/\s+/).every((word) => text.includes(word))
}

export const recentFirst = (left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
export const alphabetic = (left, right) => String(left || '').localeCompare(String(right || ''), 'en')

export function Cover({ title, large = false, eager = false }) {
  const [failedPath, setFailedPath] = useState(null)
  const path = title?.coverPath
  const local = typeof path === 'string' && /^\/(?!\/)[\w./-]+\.(webp|png|jpg|jpeg|avif)$/i.test(path)
  return (
    <div className={`cover ${large ? 'cover-large' : ''}`} aria-hidden="true">
      {local && path !== failedPath
        ? <img src={path} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setFailedPath(path)} />
        : <Icon name="book" />}
    </div>
  )
}

export function Heading({ title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}

export function BackLink({ to, children }) {
  return <SiteLink className="back-link" to={to}><Icon name="arrow" />{children}</SiteLink>
}

export function SearchField({ id, label, value, onChange, placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-search">
        <Icon name="search" />
        <input id={id} type="search" value={value} placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  )
}

export function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </div>
  )
}

export function Filters({ label, options, value, onChange }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)}>{text}</button>
      ))}
    </div>
  )
}

export function TitleButton({ title, children, className = 'button secondary', ...props }) {
  return (
    <button className={className} type="button" {...props}
      aria-label={title ? `${children} — ${title}` : undefined}>{children}</button>
  )
}
