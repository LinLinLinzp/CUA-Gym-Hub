import { Clock3, MapPin } from 'lucide-react'
import { list, showTime } from '../data/display'
import { Address } from './ui'

export function OfficeHours({ hours }) {
  const valid = list(hours).filter(Boolean)
  return valid.length ? <span>{valid.map(({ days, opens, closes }, index) => (
    <span className="address-line" key={index}>{days || 'Hours'} · {showTime(opens)}–{showTime(closes)}</span>
  ))}</span> : 'Hours unavailable'
}

export function OfficeCard({ office, children, selected = false, onFocus }) {
  return <article className={`card office-card${selected ? ' is-selected' : ''}`} onFocus={onFocus}>
    <h3>{office.name || 'DMV office'}</h3>
    <div className="icon-detail"><MapPin size={18} aria-hidden="true" /><Address value={office.address} /></div>
    <div className="icon-detail"><Clock3 size={18} aria-hidden="true" /><OfficeHours hours={office.hours} /></div>
    {children}
  </article>
}
