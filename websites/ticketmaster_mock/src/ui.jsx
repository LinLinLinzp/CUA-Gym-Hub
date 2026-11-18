import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cents, find } from './data/model.js'
import { withSid } from './utils/dataManager.js'

const formatMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const money = (amount) => cents(amount) ? formatMoney.format(amount / 100) : '—'
export const human = (value) => typeof value === 'string' && value ? value.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()) : 'Unknown'
export const seatLabel = (seat) => [seat.section && `Section ${seat.section}`, seat.row && `Row ${seat.row}`, seat.seat && `Seat ${seat.seat}`].filter(Boolean).join(' · ') || 'Seat details unavailable'
export const paymentLabel = (method) => [method?.label, method?.last4 && `•••• ${method.last4}`].filter(Boolean).join(' ') || 'Payment details unavailable'
export const orderPath = (id) => withSid(`/orders/${encodeURIComponent(id)}`)
export const ticketCount = (quantity) => Number.isSafeInteger(quantity) ? `${quantity} ${quantity === 1 ? 'ticket' : 'tickets'}` : 'Ticket count unavailable'

export function dateLabel(value, timeZone, withTime = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date to be announced'
  const options = { month: 'short', day: 'numeric', year: 'numeric', ...(withTime && { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) }
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timeZone || 'UTC' }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(value))
  }
}

export function Status({ value }) {
  return <span className={`status status-${value || 'unknown'}`}><span aria-hidden="true" />{human(value)}</span>
}

export function EventArt({ event, large = false }) {
  const category = ['music', 'sports', 'arts'].includes(event?.category) ? event.category : 'general'
  const palette = /^[0-4]$/.test(event?.artKey?.split('-').at(-1) || '') ? event.artKey.split('-').at(-1) : '0'
  return <div aria-hidden="true" className={`event-art art-${category} palette-${palette}${large ? ' art-large' : ''}`}><span /><i /></div>
}

export function EventInfo({ event, fallback = 'Event details unavailable', as: Tag = 'h2' }) {
  return <div className="event-info">
    <Tag tabIndex={Tag === 'h1' ? -1 : undefined}>{event?.name || fallback}</Tag>
    <p>{dateLabel(event?.startsAt, event?.timeZone, true)}</p>
    <p>{[event?.venue, event?.city].filter(Boolean).join(' · ') || 'Venue details unavailable'}</p>
  </div>
}

export function PageHeading({ title, description }) {
  return <div className="page-heading"><h1 tabIndex={-1}>{title}</h1><p>{description}</p></div>
}

export function Filters({ options, value, onChange, label }) {
  return <div className="filters" role="group" aria-label={label}>
    {options.map(([id, name]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>{name}</button>)}
  </div>
}

export function Empty({ title, description, children }) {
  return <div className="empty panel"><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>
}

export function Pager({ page, total, size, onChange, label }) {
  if (total <= size) return null
  return <nav className="pager" aria-label={label}>
    <button type="button" className="button secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button>
    <span>Page {page + 1} of {Math.ceil(total / size)}</span>
    <button type="button" className="button secondary" disabled={(page + 1) * size >= total} onClick={() => onChange(page + 1)}>Next</button>
  </nav>
}

export function Receipt({ totals, finalLabel = 'Total paid' }) {
  return <dl className="receipt">
    <div><dt>Ticket subtotal</dt><dd>{money(totals.subtotalCents)}</dd></div>
    <div><dt>Fees</dt><dd>{money(totals.feeCents)}</dd></div>
    <div><dt>Taxes</dt><dd>{money(totals.taxCents)}</dd></div>
    <div className="receipt-total"><dt>{finalLabel}</dt><dd>{money(totals.totalCents)}</dd></div>
  </dl>
}

export function SeatSummary({ world, ticketIds }) {
  const ids = Array.isArray(ticketIds) ? ticketIds : []
  return ids.length ? <ul className="seat-summary" aria-label="Selected seats">
    {ids.map((id, index) => {
      const ticket = find(world, 'tickets', id)
      return <li key={`${id}-${index}`}>{ticket ? seatLabel(ticket) : `Seat details unavailable (${id})`}</li>
    })}
  </ul> : <p className="muted">Seat details unavailable</p>
}

export function OrderLink({ order, children = 'View order' }) {
  return order?.id ? <Link className="text-link" to={orderPath(order.id)}>{children}</Link> : <span className="muted">Order details unavailable</span>
}

export function Dialog({ title, onClose, pending, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected && !trigger.matches(':disabled')) trigger.focus()
      else document.querySelector('h1')?.focus()
    }
  }, [])

  return <dialog ref={ref} aria-labelledby={titleId} aria-busy={pending} onCancel={(e) => { e.preventDefault(); if (!pending) onClose() }}>
    <div className="dialog-top"><h2 id={titleId}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" disabled={pending} onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>
}

export function useDialog() {
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  return {
    dialog,
    notice,
    open: (value) => { setNotice(''); setDialog(value) },
    close: () => setDialog(null),
    success: (message) => { setDialog(null); setNotice(message) },
    setNotice,
  }
}

export function Confirmation({ title, description, label, pending, onClose, onConfirm, children }) {
  const [error, setError] = useState('')
  async function confirm() {
    const problem = await onConfirm()
    if (problem) setError(problem)
  }
  return <Dialog title={title} onClose={onClose} pending={pending}>
    <p>{description}</p>
    {children}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="dialog-actions">
      <button type="button" className="button secondary" disabled={pending} onClick={onClose}>Cancel</button>
      <button type="button" className="button primary" disabled={pending} onClick={confirm}>{label}</button>
    </div>
  </Dialog>
}
