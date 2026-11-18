import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { statuses } from './model.js'

const glyphs = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
  expense: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  travel: 'M3 7h18v13H3z M8 7V4h8v3 M3 12h18 M10 12v2h4v-2',
  approval: 'M7 4h10v3h3v14H4V7h3z M8 14l3 3 5-6',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
}
export function Icon({ name }) {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={glyphs[name]} /></svg>
}
export const PageLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export const SidNav = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />
export function useSidNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function Badge({ status }) {
  return status ? <span className={'badge ' + status}>{statuses[status] || status}</span> : <span>—</span>
}
export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="page-header">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="actions">{actions}</div>}
  </div>
}
export function Missing({ title = 'Document unavailable', to = '/', label = 'Workspace' }) {
  return <><PageHeader title={title} /><div className="panel empty"><p>This item may have been removed or may be unavailable to this account.</p><PageLink to={to}>Back to {label}</PageLink></div></>
}
export function Field({ label, name, error, children }) {
  return <div className="field"><label htmlFor={name}>{label}</label>
    {React.cloneElement(children, { id: name, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? name + '-error' : undefined })}
    {error && <span className="field-error" id={name + '-error'}>{error}</span>}
  </div>
}
export function Dialog({ title, onClose, children, busy = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>
}
export function Confirm({ title, onClose, onConfirm, action, danger = false, children }) {
  return <Dialog title={title} onClose={onClose}>
    {children}
    <div className="dialog-actions"><button onClick={onClose}>Cancel</button><button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{action}</button></div>
  </Dialog>
}
export function Table({ columns, rows, renderRow, empty = 'No records found.', label, footer }) {
  return <div className="panel table-panel">
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table><thead><tr>{columns.map(column => <th key={column.label || column} scope="col" className={column.className}>{column.label || column}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(renderRow) : <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>}</tbody></table>
    </div>{footer}
  </div>
}
export const amountColumn = label => ({ label, className: 'numeric' })
const pageSize = 15
export function usePagination(rows) {
  const [page, setPage] = useState(1)
  const count = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, count)
  const offset = (current - 1) * pageSize
  const footer = <div className="pagination">
    <span>{rows.length ? (offset + 1) + '–' + Math.min(offset + pageSize, rows.length) + ' of ' + rows.length : '0 records'}</span>
    {count > 1 && <div className="actions">
      <button onClick={() => setPage(current - 1)} disabled={current === 1}>Previous</button>
      <button onClick={() => setPage(current + 1)} disabled={current === count}>Next</button>
    </div>}
  </div>
  return { visible: rows.slice(offset, offset + pageSize), footer, resetPage: () => setPage(1) }
}
