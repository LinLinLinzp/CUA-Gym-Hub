import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

const symbols = {
  bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 1 1 0 6m2 3a4 4 0 0 1 3 4v2"/></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
  pass: <><rect x="3" y="6" width="18" height="12" rx="3"/><path d="m12 8-3 5h3l-1 3 4-5h-3l1-3"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  back: <path d="M19 12H5m6 6-6-6 6-6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
}

export function Icon({ name }) {
  return <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{symbols[name]}</svg>
}

export function SessionLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useSessionNavigate() {
  const navigate = useNavigate()
  return (to) => navigate(withSid(to))
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })
const time = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' })

export const money = (cents) => cents !== null && cents !== '' && Number.isFinite(Number(cents)) ? usd.format(Number(cents) / 100) : '—'
export const when = (value, showTime = false) => Number.isFinite(Date.parse(value)) ? (showTime ? time : date).format(new Date(value)) : '—'
export const label = (value) => typeof value === 'string' && value ? value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Unknown'
export const matches = (query, ...fields) => fields.filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())

const tones = {
  delivered: 'success', active: 'success', open: 'success', issued: 'success', paid: 'success',
  preparing: 'pending', requested: 'pending', paused: 'pending', placed: 'pending',
  canceled: 'error', declined: 'error',
}
export function Status({ value, children }) {
  return <span className={'status ' + (tones[value] || 'neutral')}><span aria-hidden="true" />{children || label(value)}</span>
}

const palette = {
  'm-juniper': 'sage', 'm-copper': 'gold', 'm-miso': 'rose', 'm-olive': 'sage',
  'm-luna': 'rose', 'm-ember': 'gold', 'm-lotus': 'sage', 'm-saffron': 'gold',
}
export function FoodArt({ merchantId }) {
  return <span aria-hidden="true" className={'food-art ' + (palette[merchantId] || 'rose')}><span /></span>
}

export function PageHeading({ title, description, children }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="actions">{children}</div>}
  </header>
}

export function Back({ to, children }) {
  return <SessionLink to={to} className="back"><Icon name="back" />{children}</SessionLink>
}

export function Missing({ title, to, back }) {
  return <><Back to={to}>{back}</Back><PageHeading title={title} /><Empty>No matching record was found in this account.</Empty></>
}

export function Empty({ children, action }) {
  return <div className="empty"><span className="empty-icon"><Icon name="search" /></span><p>{children}</p>{action}</div>
}

export function ListPanel({ title, placeholder, query, setQuery, filter, setFilter, filters, count, children }) {
  const filtered = Boolean(query.trim()) || filter !== 'all'
  function clear() { setQuery(''); setFilter('all') }

  return <section className="panel list-panel" aria-label={title}>
    <div className="list-toolbar">
      <label className="search"><Icon name="search" /><input type="search" aria-label={'Search ' + title.toLowerCase()} placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="filters" aria-label="Filter by status">
        {filters.map(([value, text]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{text}</button>)}
      </div>
    </div>
    <div className="result-count" role="status">{count} {count === 1 ? 'result' : 'results'}</div>
    {count ? <ul className="record-list">{children}</ul> : <Empty action={filtered && <button type="button" className="button secondary" onClick={clear}>Clear filters</button>}>{filtered ? 'No records match your search.' : 'There are no records here yet.'}</Empty>}
  </section>
}

export function RecordRow({ art, title, subtitle, status, amount, to, action = 'View details' }) {
  return <li className="record-row">
    {art}
    <div className="record-copy"><h2>{title}</h2><p>{subtitle}</p></div>
    <div className="record-status"><Status value={status} /></div>
    <span className="record-amount">{amount}</span>
    {to && <SessionLink className="row-action" to={to}>{action}<Icon name="arrow" /></SessionLink>}
  </li>
}

export function Amounts({ rows, total }) {
  return <dl className="amounts">
    {rows.map(([name, amount]) => <div key={name}><dt>{name}</dt><dd>{money(amount)}</dd></div>)}
    {total && <div className="grand-total"><dt>{total[0]}</dt><dd>{money(total[1])}</dd></div>}
  </dl>
}

export function Details({ rows }) {
  return <dl className="details">
    {rows.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([name, value]) =>
      <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
  </dl>
}

export const receiptRows = (totals) => [
  ['Subtotal', totals?.subtotalCents], ['Delivery fee', totals?.deliveryFeeCents],
  ['Service fee', totals?.serviceFeeCents], ['Tax', totals?.taxCents], ['Tip', totals?.tipCents],
]

export function Confirm({ title, submitLabel, onClose, onConfirm, children, disabled }) {
  const ref = useRef(null)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const trigger = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (failure) {
      setError(failure.message)
      submitting.current = false
      setBusy(false)
    }
  }

  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose() }}>
    <form onSubmit={submit}>
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="close" aria-label="Close dialog" onClick={onClose} disabled={busy}>×</button>
      </div>
      <div className="dialog-content">{children}{error && <p className="error-text" role="alert">{error}</p>}</div>
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Go back</button>
        <button className="button primary" type="submit" disabled={busy || disabled}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  </dialog>
}

export function QuantityField({ label: name, value, onChange, max = 99 }) {
  return <input aria-label={name} className="quantity" type="number" min="0" max={max} step="1" required
    value={value} onChange={(event) => onChange(event.target.value)} />
}
