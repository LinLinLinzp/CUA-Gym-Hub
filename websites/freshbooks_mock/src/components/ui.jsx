import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, FileText, Search, X } from 'lucide-react'
import { withSid } from '../utils/dataManager.js'
import { titleCase } from '../utils/format.js'

export const AppLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export const RailLink = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />
export function useGo() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function useFilters() {
  const [params, setParams] = useSearchParams()
  return [params, (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous)
    if (value === '' || value == null) next.delete(key)
    else next.set(key, value)
    return next
  }, { replace: key === 'q' })]
}

export function PageHead({ title, description, back, children }) {
  return <header className="page-head">
    <div>
      {back && <AppLink className="breadcrumb" to={back.to}><ArrowLeft size={15} />{back.label}</AppLink>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children && <div className="actions">{children}</div>}
  </header>
}

export function Field({ label, hint, error, children, className = '' }) {
  return <label className={`field ${className}`}>
    <span>{label}</span>{children}{hint && <small>{hint}</small>}
    {error && <small className="error">{error}</small>}
  </label>
}

export function SearchBox({ value, onChange, placeholder = 'Search', label = placeholder }) {
  return <label className="search-box"><Search size={16} aria-hidden="true" />
    <input aria-label={label} type="search" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </label>
}

export function Pick({ rows, value, onChange, empty = 'Select…', label, disabled, required }) {
  const missing = value && !rows.some(row => row.id === value)
  return <select aria-label={label} value={value || ''} disabled={disabled} required={required} onChange={e => onChange(e.target.value)}>
    {empty !== null && <option value="">{empty}</option>}
    {missing && <option value={value}>Unavailable record</option>}
    {rows.map(row => <option key={row.id} value={row.id}>{row.name || 'Unnamed record'}</option>)}
  </select>
}

export function SearchPick({ rows, value, onChange, empty = 'Search clients', label = 'Client', disabled }) {
  const selected = rows.find(row => row.id === value)
  const [query, setQuery] = useState(null)
  const [active, setActive] = useState(0)
  const choices = rows.filter(row => `${row.name || ''} ${row.email || ''}`.toLowerCase().includes((query || '').toLowerCase())).slice(0, 30)
  function select(id) { onChange(id); setQuery(null) }
  return <div className="search-pick" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setQuery(null) }}>
    <input aria-label={label} role="combobox" aria-expanded={query !== null} autoComplete="off" disabled={disabled} placeholder={empty}
      value={query ?? selected?.name ?? (value ? 'Unavailable client' : '')}
      onFocus={() => { setQuery(''); setActive(0) }} onChange={e => { setQuery(e.target.value); setActive(0) }}
      onKeyDown={e => {
        if (e.key === 'Escape') setQuery(null)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setQuery(query ?? ''); setActive(Math.min(choices.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1))))
        }
        if (e.key === 'Enter' && query !== null && choices[active]) { e.preventDefault(); select(choices[active].id) }
      }} />
    {query !== null && <div className="dropdown picker-results">
      {value && <button type="button" onClick={() => select('')}>Clear selection</button>}
      {choices.map((row, i) => <button className={i === active ? 'highlight' : ''} key={row.id} type="button" onClick={() => select(row.id)}>{row.name}</button>)}
      {!choices.length && <p className="picker-empty">No clients match.</p>}
    </div>}
  </div>
}

export function Tabs({ values, value, change, className = '' }) {
  return <div className={`tabs ${className}`}>
    {values.map(item => {
      const [key, label] = Array.isArray(item) ? item : [item, titleCase(item)]
      return <button key={key} type="button" aria-pressed={value === key} className={value === key ? 'selected' : ''} onClick={() => change(key)}>{label}</button>
    })}
  </div>
}

export function Menu({ label, icon, children, className = '', buttonClass = 'button' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { pathname, search } = useLocation()
  useEffect(() => setOpen(false), [pathname, search])
  useEffect(() => {
    if (!open) return
    const outside = event => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div ref={ref} className={`menu ${className}`} onKeyDown={e => {
    if (e.key === 'Escape' && open) { setOpen(false); ref.current?.querySelector('button')?.focus() }
  }}>
    <button className={buttonClass} type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>{icon}{label && !className.includes('icon-menu') && label}{!className.includes('icon-menu') && <ChevronDown size={15} />}</button>
    {open && <div className="dropdown" onClick={e => { if (e.target.closest('button:not(:disabled), a')) setOpen(false) }}>{children}</div>}
  </div>
}

export function Dialog({ title, onClose, wide, children }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-label={title}
    onCancel={e => { e.preventDefault(); closeRef.current() }}
    onClick={e => { if (e.target === e.currentTarget) closeRef.current() }}>
    <div className="dialog-inner">
      <div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" type="button" onClick={onClose}><X size={19} /></button></div>
      {children}
    </div>
  </dialog>
}

export const Status = ({ value }) => <span className={`status status-${value}`}>{titleCase(value || 'Unknown')}</span>

export function Empty({ title = 'No records found', text, children }) {
  return <div className="empty"><span className="empty-icon"><FileText size={22} /></span><h3>{title}</h3>{text && <p>{text}</p>}{children}</div>
}

export const Missing = ({ title, to, label }) => <section className="card"><Empty title={title} text="This record may have been removed or is unavailable in this session."><AppLink className="button" to={to}>{label}</AppLink></Empty></section>

export function Ledger({ columns, rows, render, empty, selected, onSelect, sort, setSort, size = 15 }) {
  const [page, setPage] = useState(0)
  const last = Math.max(0, Math.ceil(rows.length / size) - 1)
  const current = Math.min(page, last)
  const window = rows.slice(current * size, (current + 1) * size)
  const all = window.length > 0 && window.every(row => selected?.includes(row.id))
  return <>
    <div className="table-scroll"><table>
      <thead><tr>
        {onSelect && <th className="check-cell"><input type="checkbox" aria-label="Select all on page" checked={all} onChange={() => onSelect(all ? selected.filter(id => !window.some(row => row.id === id)) : [...new Set([...selected, ...window.map(row => row.id)])])} /></th>}
        {columns.map(column => <th key={column.key || column.label} className={column.number ? 'number' : ''} aria-sort={sort?.key === column.key && column.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
          {column.key && setSort ? <button className="sort" type="button" onClick={() => { setPage(0); setSort({ key: column.key, desc: sort?.key === column.key ? !sort.desc : false }) }}>
            {column.label}{sort?.key === column.key && (sort.desc ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}
          </button> : column.label}
        </th>)}
      </tr></thead>
      <tbody>{window.map(row => <tr key={row.id} className={selected?.includes(row.id) ? 'row-selected' : ''}>
        {onSelect && <td className="check-cell"><input type="checkbox" aria-label={`Select ${row.invoiceNumber || row.merchant || row.notes || row.id}`} checked={selected.includes(row.id)} onChange={() => onSelect(selected.includes(row.id) ? selected.filter(id => id !== row.id) : [...selected, row.id])} /></td>}
        {render(row)}
      </tr>)}</tbody>
    </table></div>
    {!rows.length && (empty || <Empty />)}
    {rows.length > size && <div className="pagination"><span>{current * size + 1}–{Math.min(rows.length, (current + 1) * size)} of {rows.length}</span>
      <button type="button" className="icon-button" aria-label="Previous page" disabled={!current} onClick={() => setPage(current - 1)}><ChevronLeft size={18} /></button>
      <button type="button" className="icon-button" aria-label="Next page" disabled={current >= last} onClick={() => setPage(current + 1)}><ChevronRight size={18} /></button>
    </div>}
  </>
}

export function sortRows(rows, sort) {
  return [...rows].sort((a, b) => {
    const x = a[sort.key] ?? '', y = b[sort.key] ?? ''
    const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true })
    return sort.desc ? -result : result
  })
}

export function ErrorNote({ children }) {
  return children ? <p className="error-banner" role="alert">{children}</p> : null
}
