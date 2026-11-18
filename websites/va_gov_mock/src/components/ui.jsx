import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { label } from '../records'

export function AccountLink({ to, ...props }) {
  const { search } = useLocation()
  return <Link to={to + search} {...props} />
}

export function Page({ title, back = 'Overview', to = '/', action, description, children }) {
  return <div className="service-page">
    <nav className="breadcrumb" aria-label="Breadcrumb"><AccountLink to={to}>← {back}</AccountLink></nav>
    <div className="page-heading">
      <div><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </div>
}

export function Panel({ title, children }) {
  return <section className="panel content-panel">
    {title && <h2>{title}</h2>}
    {children}
  </section>
}

export function Details({ rows }) {
  return <dl className="details">
    {rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}
  </dl>
}

export function Badge({ value, text = label(value) }) {
  return <span className={`badge status-${value}`}>{text}</span>
}

export function Notice({ children, error = false }) {
  return <div className={`notice${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>
}

export function Field({ title, error, children }) {
  const id = useId()
  const errorId = error ? id + '-error' : undefined
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {cloneElement(children, { id, 'aria-describedby': errorId })}
    {error && <span className="field-error" id={errorId}>{error}</span>}
  </div>
}

export function Dialog({ title, children, onDismiss }) {
  const dialog = useRef(null)
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    return () => {
      element.close()
      const target = trigger?.isConnected ? trigger : document.querySelector('main h1')
      target?.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby="dialog-heading" onCancel={event => {
    event.preventDefault()
    dismiss.current()
  }}>
    <h2 id="dialog-heading">{title}</h2>
    {children}
  </dialog>
}

export function useFilters(defaultFilter = 'all') {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(defaultFilter)
  const [page, setPage] = useState(1)
  return {
    query, filter, page, setPage,
    setQuery(value) { setQuery(value); setPage(1) },
    setFilter(value) { setFilter(value); setPage(1) },
  }
}

export function Search({ title, filters }) {
  return <Field title={title}><input type="search" value={filters.query} onChange={event => filters.setQuery(event.target.value)} /></Field>
}

export function Filter({ title, options, filters }) {
  return <Field title={title}><select value={filters.filter} onChange={event => filters.setFilter(event.target.value)}>
    {options.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
  </select></Field>
}

export function Tabs({ title, options, filters }) {
  return <div className="tabs" role="group" aria-label={title}>
    {options.map(option => <button type="button" key={option} aria-pressed={filters.filter === option} onClick={() => filters.setFilter(option)}>{option}</button>)}
  </div>
}

export function RecordList({ title, columns, records, cells, filters, empty }) {
  const last = Math.max(1, Math.ceil(records.length / 10))
  const page = Math.min(filters.page, last)
  const start = (page - 1) * 10
  return <div className="panel record-panel">
    {records.length ? <>
      <table aria-label={title}>
        <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{records.slice(start, start + 10).map(record => <tr key={record.id}>
          {cells(record).map((cell, index) => <td key={columns[index]}><span className="cell-label" aria-hidden="true">{columns[index]}</span>{cell}</td>)}
        </tr>)}</tbody>
      </table>
      <div className="pagination">
        <span aria-live="polite">{start + 1}–{Math.min(start + 10, records.length)} of {records.length}</span>
        {last > 1 && <div className="button-row">
          <button className="button secondary" disabled={page === 1} onClick={() => filters.setPage(page - 1)}>Previous</button>
          <button className="button secondary" disabled={page === last} onClick={() => filters.setPage(page + 1)}>Next</button>
        </div>}
      </div>
    </> : <p className="empty">{empty}</p>}
  </div>
}

export function RecordLink({ to, title, detail }) {
  return <div className="record-title"><AccountLink to={to}>{title}</AccountLink>{detail && <small>{detail}</small>}</div>
}

export function FormActions({ submit, back, onBack, disabled }) {
  return <div className="button-row">
    <button className="button" type="submit" disabled={disabled}>{submit}</button>
    {back && <AccountLink className="button secondary" to={back}>Cancel</AccountLink>}
    {onBack && <button className="button secondary" type="button" onClick={onBack}>Back</button>}
  </div>
}
