import { useEffect, useId, useRef, useState } from 'react'
import { label, nameOf, rows } from '../utils/model.js'

export function PageHeader({ title, before, identity, status, badge, children }) {
  return <header className="page-header">
    {before && <div className="breadcrumbs">{before}</div>}
    <h1>{title}</h1>
    {(identity || status || badge) && <div className="identity">{identity && <span>{identity}</span>}{status && <Status value={status} />}{badge && <Status value={badge} />}</div>}
    {children && <div className="toolbar">{children}</div>}
  </header>
}

export function Status({ value }) {
  const kind = /closed|cancelled|voided|rejected|overdue|inactive/i.test(value) ? 'blocked'
    : /pending|partial|picked|packed/i.test(value) ? 'pending'
      : /billed|paid|shipped|received|active|deposited|cleared|posted/i.test(value) && value !== 'Not Deposited' ? 'positive' : 'neutral'
  return <span className={`status ${kind}`}>{value}</span>
}

export function Section({ title, children, className = '' }) {
  return <details open className={`panel section ${className}`}><summary>{title}</summary>{children}</details>
}

export function Field({ label: title, value, onChange, options, type = 'text', required, disabled, min, step, placeholder, children }) {
  const id = useId()
  return <div className={`field ${type === 'checkbox' ? 'check-field' : ''}`}>
    <label htmlFor={id}>{title}{required && <span className="required" aria-hidden="true"> *</span>}</label>
    {children || (!onChange ? <span className="field-value">{value ?? '—'}</span>
      : options ? <select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} aria-required={required} disabled={disabled}>
        <option value="">— Select —</option>{options.map(({ id: key, text }) => <option key={key} value={key}>{text}</option>)}
      </select> : type === 'textarea' ? <textarea id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
        : <input id={id} type={type} value={type !== 'checkbox' ? value ?? '' : undefined} checked={type === 'checkbox' ? !!value : undefined}
          onChange={(event) => onChange(type === 'checkbox' ? event.target.checked : event.target.value)} aria-required={required} disabled={disabled} min={min} step={step} placeholder={placeholder} />)}
  </div>
}

export const optionsFor = (state, key, selected) => rows(state, key).filter((row) => !row.inactive || row.id === selected)
  .map((row) => ({ id: row.id, text: nameOf(state, key, row.id) }))
export const choices = (...values) => values.map((value) => ({ id: value, text: value }))

export function Picker({ title, entries, value, onChange, required, disabled }) {
  const id = useId()
  const [text, setText] = useState(null)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const selected = entries.find((entry) => entry.id === value)
  const filtered = entries.filter((entry) => !entry.disabled && entry.text.toLowerCase().includes((text || '').toLowerCase()))
  const visible = filtered.slice(0, 12)
  const choose = (entry) => {
    onChange(entry.id)
    setText(null)
    setOpen(false)
    setIndex(0)
  }
  return <div className="field picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setText(null) } }}>
    <label htmlFor={id}>{title}{required && <span className="required" aria-hidden="true"> *</span>}</label>
    <div className="combo">
      <input id={id} role="combobox" value={text ?? selected?.text ?? ''} placeholder="Search or select" autoComplete="off" aria-required={required} disabled={disabled}
        aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-list`}
        aria-activedescendant={open && visible[index] ? `${id}-option-${index}` : undefined}
        onFocus={(event) => event.target.select()}
        onChange={(event) => { setText(event.target.value); setIndex(0); setOpen(true); if (!event.target.value) onChange('') }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setIndex(open ? Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))) : 0)
            setOpen(true)
          }
          if ((event.key === 'Enter' || event.key === 'Tab') && open && visible[index]) {
            if (event.key === 'Enter') event.preventDefault()
            choose(visible[index])
          }
          if (event.key === 'Escape') { setText(null); setOpen(false) }
        }} />
      <button type="button" aria-label={`Show ${title.toLowerCase()} choices`} tabIndex={-1} disabled={disabled}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { document.getElementById(id)?.focus(); setOpen(!open); setIndex(0) }}>▾</button>
    </div>
    {open && <div id={`${id}-list`} className="popup" role="listbox" aria-label={title}>
      {visible.map((entry, row) => <div key={entry.id} id={`${id}-option-${row}`} role="option" aria-selected={index === row}
        onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setIndex(row)} onClick={() => choose(entry)}>{entry.text}</div>)}
      {!visible.length && <div className="muted popup-empty">No matches</div>}
      {filtered.length > visible.length && <div className="muted popup-empty">Type to narrow the results.</div>}
    </div>}
  </div>
}

export function pickerEntries(state, key, selected) {
  return rows(state, key).filter((row) => !row.inactive || row.id === selected)
    .map((row) => ({ id: row.id, text: [row.entityId || row.itemId, label(row)].filter(Boolean).join(' · '), disabled: row.inactive }))
}

export function Dialog({ title, message, confirm = 'OK', onConfirm, onClose, reason = false }) {
  const id = useId()
  const ref = useRef(null)
  const [value, setValue] = useState('')
  useEffect(() => {
    const dialog = ref.current
    const active = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (active?.isConnected) active.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm ? onConfirm(value) : onClose() }}>
      <header><h2 id={id}>{title || 'NetSuite'}</h2></header>
      <div className="dialog-content"><p>{message}</p>{reason && <Field label="Rejection Reason" type="textarea" value={value} onChange={setValue} required />}</div>
      <footer className="toolbar">
        {onConfirm && <button type="button" onClick={onClose}>Cancel</button>}
        <button className="primary" disabled={reason && !value.trim()}>{confirm}</button>
      </footer>
    </form>
  </dialog>
}

export function DataTable({ columns, records, rowKey = (row) => row.id, sort, onSort, empty = 'No records to show.' }) {
  return <div className="table-scroll" tabIndex={0} aria-label="Scrollable table">
    <table>
      <thead><tr>{columns.map(({ key, title, numeric, sortValue }) =>
        <th key={key} className={numeric ? 'numeric' : ''} scope="col"
          aria-sort={sort?.key === key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}>
          {sortValue && onSort ? <button type="button" className="header-sort" onClick={() => onSort(key)}>{title}{sort?.key === key && (sort.direction === 1 ? ' ↑' : ' ↓')}</button> : title}
        </th>)}</tr></thead>
      <tbody>
        {records.map((row, index) => <tr key={rowKey(row, index) ?? index}>{columns.map(({ key, render, numeric }) =>
          <td key={key} className={numeric ? 'numeric' : ''}>{render ? render(row, index) : row[key] ?? '—'}</td>)}</tr>)}
        {!records.length && <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>}
      </tbody>
    </table>
  </div>
}
