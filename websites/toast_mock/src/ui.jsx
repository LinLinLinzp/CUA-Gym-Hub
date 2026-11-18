import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export function NavLinkTo({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}
export function Back({ to, children }) {
  return <NavLinkTo className="back" to={to}><ArrowLeft size={16} /> {children}</NavLinkTo>
}
export function Header({ title, subtitle, actions }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
}
export function Field({ label, children, wide }) {
  const labelId = useId()
  return <label className={wide ? 'field wide' : 'field'}><span id={labelId}>{label}</span>{cloneElement(children, { 'aria-labelledby': labelId })}</label>
}
export function Select({ label, options, blank, value, onChange, required, disabled }) {
  return <Field label={label}><select value={value} onChange={event => onChange(event.target.value)} required={required} disabled={disabled}>
    {blank && <option value="">{blank}</option>}
    {options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></Field>
}
export function SearchBox({ label, value, onChange }) {
  return <label className="field search"><span>{label}</span><span className="search-input"><Search size={17} /><input type="search" value={value} placeholder={label} onChange={event => onChange(event.target.value)} /></span></label>
}
export function Button({ variant = '', className = '', ...props }) {
  return <button type="button" className={['button', variant, className].filter(Boolean).join(' ')} {...props} />
}
export function Badge({ value }) {
  if (!value || value === 'none') return <span className="muted">—</span>
  return <span className={'badge badge-' + value}>{value.replaceAll('_', ' ')}</span>
}
export function Empty({ title = 'No matching records', children }) {
  return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>
}

export function Ledger({ columns, rows, rowId = row => row.id, pageSize = 12, queryKey, emptyTitle, label }) {
  const [pagination, setPagination] = useState({ key: queryKey, page: 0 })
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = pagination.key === queryKey ? Math.min(pagination.page, pages - 1) : 0
  const start = page * pageSize
  const go = page => setPagination({ key: queryKey, page })
  if (!rows.length) return <Empty title={emptyTitle} />
  return <div className="ledger">
    <div className="table-scroll"><table aria-label={label}><thead><tr>{columns.map(([name], index) => <th scope="col" key={index}>{name}</th>)}</tr></thead>
      <tbody>{rows.slice(start, start + pageSize).map(row => <tr key={rowId(row)}>{columns.map(([name, render], index) => <td key={name || index}>{render(row)}</td>)}</tr>)}</tbody>
    </table></div>
    {pages > 1 && <div className="pagination"><span>{start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}</span><div>
      <Button aria-label="Previous page" disabled={page === 0} onClick={() => go(page - 1)}><ChevronLeft size={17} /></Button>
      <Button aria-label="Next page" disabled={page === pages - 1} onClick={() => go(page + 1)}><ChevronRight size={17} /></Button>
    </div></div>}
  </div>
}
export function Dialog({ title, children, onClose, onSubmit, submit, error, wide, extra, disabled }) {
  const dialog = useRef(null)
  const titleId = useId()
  const errorId = useId()
  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    const firstControl = node.querySelector('input, select, textarea, [data-initial-focus]') ?? node.querySelector('button')
    firstControl?.focus()
    return () => { node.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={dialog} className={wide ? 'modal wide-modal' : 'modal'} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <form onSubmit={onSubmit ? event => { event.preventDefault(); onSubmit() } : undefined} aria-describedby={error ? errorId : undefined}>
      <header><h2 id={titleId}>{title}</h2><Button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></Button></header>
      <div className="modal-body">{children}{error && <p className="error" id={errorId} role="alert">{error}</p>}</div>
      {submit && <footer>
        {extra}
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={disabled}>{submit}</Button>
      </footer>}
    </form>
  </dialog>
}

