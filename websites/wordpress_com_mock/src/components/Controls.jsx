import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Ellipsis, Lock, Search, X } from 'lucide-react'
import { formatStatus } from '../utils/display.js'
import { SiteLink } from '../utils/navigation.jsx'

export function StatusPill({ status, editorial = false }) {
  return <span className={'pill ' + (status || '')}>{status === 'private' && <Lock size={11} aria-hidden="true" />}{editorial && status === 'pending' ? 'Pending Review' : formatStatus(status)}</span>
}

export function TabBar({ label, items, current, path }) {
  return <nav className="tabs" aria-label={label}>
    {items.map(([value, name, count]) => <SiteLink key={value} to={path(value)} aria-current={current === value ? 'page' : undefined}>{name} <span>{count}</span></SiteLink>)}
  </nav>
}

export function SearchBox({ label, value, onChange, onSearch, placeholder, buttonLabel = 'Search' }) {
  const textbox = <label className="search-box"><Search size={16} aria-hidden="true" /><span className="visually-hidden">{label}</span>
    <input type="search" placeholder={placeholder || label} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
  if (!onSearch) return textbox
  return <form className="search-form" onSubmit={(event) => { event.preventDefault(); onSearch(value) }}>{textbox}<button className="button">{buttonLabel}</button></form>
}

export function RowMenu({ label, actions }) {
  const [position, setPosition] = useState(null)
  const trigger = useRef(null)
  const close = () => { setPosition(null); trigger.current?.focus() }
  const toggle = (event) => {
    if (position) { close(); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const above = window.innerHeight - rect.bottom < actions.length * 37 + 18 && rect.top > window.innerHeight / 2
    setPosition({
      right: Math.max(6, window.innerWidth - rect.right),
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    })
  }
  return <div className="menu-anchor row-menu" onKeyDown={(event) => { if (event.key === 'Escape' && position) { event.stopPropagation(); close() } }}>
    <button ref={trigger} type="button" className="icon-button" aria-label={label} aria-expanded={Boolean(position)} onClick={toggle}><Ellipsis size={18} /></button>
    {position && <><button className="menu-scrim" tabIndex={-1} aria-label="Close actions" onClick={close} /><div className="popup" style={position}>
      {actions.map(({ label: name, to, run, danger }) => to
        ? <SiteLink key={name} to={to} onClick={() => setPosition(null)}>{name}</SiteLink>
        : <button type="button" key={name} className={danger ? 'text-danger' : ''} onClick={() => { close(); run() }}>{name}</button>)}
    </div></>}
  </div>
}

export function Modal({ title, close, children, footer, className = '' }) {
  const dialog = useRef(null)
  const heading = React.useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} className={'modal ' + className} aria-labelledby={heading} onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }}>
    <section className="modal-inner">
      <header className="modal-header"><h2 id={heading}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X size={19} /></button></header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </section>
  </dialog>
}

export function Confirm({ title, children, action, close, confirm, destructive = false }) {
  return <Modal title={title} close={close} footer={<><button type="button" className="button" autoFocus onClick={close}>Cancel</button><button type="button" className={'button ' + (destructive ? 'danger' : 'primary')} onClick={confirm}>{action}</button></>}>{children}</Modal>
}

export function Field({ label, error, children }) {
  return <label className="field"><span>{label}</span>{children}{error && <small role="alert" className="text-danger">{error}</small>}</label>
}

const NO_SELECTION = []
export function useSelection(scope) {
  const [selection, setSelection] = useState({ scope, ids: NO_SELECTION })
  const ids = selection.scope === scope ? selection.ids : NO_SELECTION
  useEffect(() => {
    setSelection((previous) => previous.scope === scope ? previous : { scope, ids: NO_SELECTION })
  }, [scope])
  const set = (next) => setSelection({ scope, ids: next })
  return {
    ids, clear: () => set(NO_SELECTION),
    toggle: (id) => setSelection((previous) => {
      const current = previous.scope === scope ? previous.ids : NO_SELECTION
      return { scope, ids: current.includes(id) ? current.filter((value) => value !== id) : [...current, id] }
    }),
    toggleAll: (options) => set(ids.length === options.length ? NO_SELECTION : options),
  }
}

export function BulkActions({ actions, count, submit }) {
  const [action, setAction] = useState('')
  return <form className="inline-controls" onSubmit={(event) => { event.preventDefault(); if (action && count) submit(action) }}>
    <select aria-label="Bulk actions" value={actions.some(([value]) => value === action) ? action : ''} onChange={(event) => setAction(event.target.value)}>
      <option value="">Bulk actions</option>{actions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
    </select>
    <button className="button" disabled={!count || !actions.some(([value]) => value === action)}>Apply</button>
    {count > 0 && <span className="meta">{count} selected</span>}
  </form>
}

export function Pagination({ count, page, size, change }) {
  const total = Math.max(1, Math.ceil(count / size))
  return <div className="pagination">
    <span className="meta">{count ? (page - 1) * size + 1 + '–' + Math.min(page * size, count) + ' of ' : ''}{count} {count === 1 ? 'item' : 'items'}</span>
    {total > 1 && <nav className="inline-controls" aria-label="Pagination">
      <button className="icon-button" type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => change(page - 1)}><ChevronLeft size={17} /></button>
      <span className="meta">Page {page} of {total}</span>
      <button className="icon-button" type="button" aria-label="Next page" disabled={page >= total} onClick={() => change(page + 1)}><ChevronRight size={17} /></button>
    </nav>}
  </div>
}

export const monthOf = (value) => /^\d{4}-\d{2}/.test(value || '') ? value.slice(0, 7) : ''
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export function MonthFilter({ dates, value, change }) {
  const months = [...new Set(dates.map(monthOf).filter((month) => month && Number.isFinite(Date.parse(month + '-01T00:00:00Z'))))].sort().reverse()
  return <select aria-label="Filter by month" value={value} onChange={(event) => change(event.target.value)}>
    <option value="">All dates</option>
    {months.map((month) => <option key={month} value={month}>{monthFormatter.format(new Date(month + '-01T00:00:00Z'))}</option>)}
  </select>
}

export function moveOptionFocus(event, columns = 1) {
  const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }
  if (!Object.hasOwn(movement, event.key) && event.key !== 'Home' && event.key !== 'End') return
  const options = [...event.currentTarget.querySelectorAll('[data-keyboard-option]:not(:disabled)')]
  const index = options.indexOf(event.target)
  if (index < 0) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : index + movement[event.key]
  options[Math.max(0, Math.min(options.length - 1, next))]?.focus()
}
