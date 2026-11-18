import React, { useId, useLayoutEffect, useRef, useState } from 'react'
import { display } from './workspace.jsx'

export function Heading({ title, description, action, children }) {
  return <header className="page-heading"><div>{children}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>
}
export function Button({ variant, className = '', type = 'button', ...props }) {
  return <button type={type} className={['button', variant, className].filter(Boolean).join(' ')} {...props} />
}
export function Pill({ tone = '', children }) {
  return <span className={'pill ' + tone}>{children}</span>
}
export function Empty({ children = 'No records to display.' }) {
  return <div className="empty">{children}</div>
}
export function Field({ label, error, hint, children, ...props }) {
  const id = useId()
  const control = children || <input {...props} />
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(control, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? id + '-note' : undefined })}
    {(error || hint) && <small id={id + '-note'} className={error ? 'error' : 'muted'}>{error || hint}</small>}
  </div>
}
export function Select({ options, placeholder, ...props }) {
  const entries = Array.isArray(options)
    ? options.map(value => Array.isArray(value) ? value : [value, value])
    : Object.entries(options || {})
  return <select {...props}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {entries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>
}
export function Search({ label, value, onChange }) {
  return <Field label={label} type="search" placeholder={label} value={value} onChange={e => onChange(e.target.value)} />
}
export function Filter({ label, value, onChange, options, placeholder = 'All' }) {
  return <Field label={label}><Select options={options} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></Field>
}
export function Dialog({ title, onClose, children, mode = 'panel', submit, submitLabel = 'Save', danger, disabled }) {
  const dialog = useRef()
  const titleId = useId()
  useLayoutEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (opener?.isConnected) opener.focus()
      else document.querySelector('main h1')?.focus()
    }
  }, [])
  return <dialog ref={dialog} className={mode} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose() }}>
    <form noValidate onSubmit={e => { e.preventDefault(); submit?.() }}>
      <header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header>
      <div className="dialog-body">{children}</div>
      <footer><Button onClick={onClose}>{submit ? 'Cancel' : 'Close'}</Button>
        {submit && <Button type="submit" variant={danger ? 'danger-fill' : 'primary'} disabled={disabled}>{submitLabel}</Button>}
      </footer>
    </form>
  </dialog>
}
export function Confirm({ title, onClose, submit, submitLabel, children, danger }) {
  return <Dialog mode="confirm" title={title} onClose={onClose} submit={submit} submitLabel={submitLabel} danger={danger}>{children}</Dialog>
}
export function RowActions({ label, actions }) {
  const menu = useRef()
  return <details className="row-actions" ref={menu} onToggle={e => {
    const element = e.currentTarget
    if (!element.open) return
    const trigger = element.querySelector('summary').getBoundingClientRect()
    const panel = element.querySelector('.action-menu')
    const left = Math.min(window.innerWidth - panel.offsetWidth - 8, trigger.right - panel.offsetWidth)
    const below = trigger.bottom + 4
    const top = below + panel.offsetHeight <= window.innerHeight - 8
      ? below : Math.max(8, trigger.top - panel.offsetHeight - 4)
    Object.assign(panel.style, { left: Math.max(8, left) + 'px', top: top + 'px' })
  }} onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false
  }} onKeyDown={e => {
    if (e.key === 'Escape' && menu.current.open) {
      menu.current.open = false
      menu.current.querySelector('summary').focus()
    }
  }}>
    <summary aria-label={label} title={label}>⋯</summary>
    <div className="action-menu">{actions.map(([name, run, danger]) => <button type="button" className={danger ? 'danger-text' : ''} key={name} onClick={() => {
      menu.current.open = false
      menu.current.querySelector('summary').focus()
      run()
    }}>{name}</button>)}</div>
  </details>
}
export function Table({ columns, data, filters, filterKey = '', empty, noResults, filtered, pageSize = 10, label = 'Records' }) {
  const [sort, setSort] = useState({ key: '', direction: 1 })
  const [paging, setPaging] = useState({ filterKey, page: 1 })
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 })
  const selected = columns.find(column => column.key === sort.key)
  const sorted = selected?.sort ? [...data].sort((a, b) => {
    const x = selected.sort(a)
    const y = selected.sort(b)
    const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'en', { numeric: true })
    return sort.direction * result
  }) : data
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = paging.filterKey === filterKey ? Math.min(paging.page, pages) : 1
  const start = (page - 1) * pageSize
  const move = next => setPaging({ filterKey, page: next })
  return <section className="table-card" aria-label={label}>
    {filters && <div className="filters">{filters}</div>}
    {sorted.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={label + " table area"}><table aria-label={label}>
      <thead><tr>{columns.map(c => <th key={c.key} scope="col" className={c.align}
        aria-sort={sort.key === c.key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}>
        {c.sort ? <button onClick={() => {
          setSort({ key: c.key, direction: sort.key === c.key ? -sort.direction : 1 })
          move(1)
        }}>{c.label} <span aria-hidden="true">{sort.key === c.key ? (sort.direction === 1 ? '↑' : '↓') : '↕'}</span></button> : c.label}
      </th>)}</tr></thead>
      <tbody>{sorted.slice(start, start + pageSize).map(row => <tr key={row.id}>
        {columns.map(c => <td key={c.key} className={c.align}>{c.cell ? c.cell(row) : display(row[c.key])}</td>)}
      </tr>)}</tbody>
    </table></div> : <Empty>{filtered ? noResults || 'No results match these filters.' : empty}</Empty>}
    <div className="table-footer"><span aria-live="polite">{sorted.length ? (start + 1) + '–' + Math.min(start + pageSize, sorted.length) + ' of ' + sorted.length : '0 results'}</span>
      {pages > 1 && <div className="pagination"><Button aria-label="Previous page" onClick={() => move(page - 1)} disabled={page === 1}>‹</Button><span>Page {page} of {pages}</span><Button aria-label="Next page" onClick={() => move(page + 1)} disabled={page === pages}>›</Button></div>}
    </div>
  </section>
}
export function Details({ items }) {
  return <dl className="details">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{typeof value === 'object' && value !== null ? value : display(value)}</dd></div>)}</dl>
}
export function Missing({ message, children }) {
  return <section className="card missing"><h2>{message}</h2>{children}</section>
}
