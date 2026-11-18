import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { displayDate, initials, label } from '../data/model.js'
import { useWorkspace } from '../context/Workspace.jsx'
import { withSid } from '../utils/dataManager.js'

export function usePath() {
  const { search } = useLocation()
  return path => {
    if (new URLSearchParams(path.split('?')[1]).has('sid')) return path
    const sid = new URLSearchParams(search).get('sid')
    if (sid) return path + (path.includes('?') ? '&' : '?') + new URLSearchParams({ sid })
    return withSid(path)
  }
}

export function useGo() {
  const path = usePath()
  const navigate = useNavigate()
  return (to, options) => navigate(path(to), options)
}

export function RouteLink({ to, ...props }) {
  const path = usePath()
  return <Link to={path(to)} {...props} />
}

export const recordPath = (base, id) => base + '/' + encodeURIComponent(id)
const nav = [['/', 'Overview'], ['/contracts', 'Contracts'], ['/invoices', 'Invoices'], ['/time-off', 'Time off']]
export function Shell({ children }) {
  const { state } = useWorkspace()
  const path = usePath()
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="topbar">
      <div className="container header-inner">
        <RouteLink className="brand" to="/">Deel</RouteLink>
        <span className="workspace-name">{state.organization?.name || 'Workspace'}</span>
        <nav aria-label="Main navigation">
          {nav.map(([to, name]) => <NavLink key={to} end={to === '/'} to={path(to)}>{name}</NavLink>)}
        </nav>
        <div className="identity">
          <span className="avatar" aria-hidden="true">{initials(state.currentUser?.name) || '•'}</span>
          <span>{state.currentUser?.name || 'Account'}</span>
        </div>
      </div>
    </header>
    <main className="container content" id="main">{children}</main>
  </>
}

export function PageTitle({ title, description, actions, back }) {
  return <div className="page-heading">
    {back && <RouteLink className="back" to={back[0]}><span aria-hidden="true">← </span>{back[1]}</RouteLink>}
    <div className="heading-row">
      <div><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  </div>
}

export function Badge({ status }) {
  return <span className={'badge ' + (status || '')}>{label(status)}</span>
}
export const DateText = ({ value }) => <span className="date">{displayDate(value)}</span>
export function Person({ name, detail }) {
  return <span className="person"><span className="avatar" aria-hidden="true">{initials(name) || '—'}</span>
    <span><strong>{name || 'Unknown worker'}</strong>{detail && <small>{detail}</small>}</span>
  </span>
}

export function Panel({ title, action, children, className = '' }) {
  return <section className={'panel ' + className}>
    {(title || action) && <div className="panel-heading"><h2>{title}</h2>{action}</div>}
    {children}
  </section>
}
export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}
export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3>{children && <div>{children}</div>}</div>
}
export function Missing({ noun, back }) {
  return <><PageTitle title={noun + ' unavailable'} back={back} /><Panel><Empty title={noun + ' could not be found'}>Check the link or return to the list.</Empty></Panel></>
}

export function Field({ label: title, children, hint }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {cloneElement(children, { id, 'aria-describedby': hint ? id + '-hint' : undefined })}
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>
}
export function Select({ label: title, value, onChange, options }) {
  return <Field label={title}><select value={value} onChange={event => onChange(event.target.value)}>
    {options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></Field>
}
export function Search({ label: title, value, onChange, placeholder }) {
  return <Field label={title}><input type="search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></Field>
}
export function useFilters(defaults) {
  const { search } = useLocation()
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(search)
    return { ...defaults, status: params.get('status') || defaults.status }
  })
  const set = (key, value) => setFilters(previous => ({ ...previous, [key]: value }))
  return [filters, set, () => setFilters(defaults)]
}

export function Table({ columns, rows, render, empty = 'No records found', emptyHint, caption }) {
  return rows.length ? <div className="table-scroll"><table>
    {caption && <caption className="visually-hidden">{caption}</caption>}
    <thead><tr>{columns.map(({ name, content, className }) =>
      <th scope="col" key={name} className={className}>{content ?? name}</th>)}</tr></thead>
    <tbody>{rows.map(render)}</tbody>
  </table></div> : <Empty title={empty}>{emptyHint}</Empty>
}
export const cols = (...names) => names.map(name => ({ name }))
export function PagedTable({ rows, resetKey, noun = 'results', ...props }) {
  return <TablePage key={resetKey} rows={rows} noun={noun} {...props} />
}
function TablePage({ rows, noun, ...props }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / 15))
  const active = Math.min(page, pageCount - 1)
  const start = active * 15
  return <>
    <Table rows={rows.slice(start, start + 15)} emptyHint="Try clearing your filters or changing your search." {...props} />
    <div className="pagination">
      <span>{rows.length ? (start + 1) + '–' + Math.min(start + 15, rows.length) + ' of ' + rows.length : '0'} {noun}</span>
      {pageCount > 1 && <div className="actions">
        <button disabled={active === 0} onClick={() => setPage(active - 1)}>Previous</button>
        <button disabled={active + 1 === pageCount} onClick={() => setPage(active + 1)}>Next</button>
      </div>}
    </div>
  </>
}

export function Confirm({ title, confirmLabel, onConfirm, onClose, children, danger = false, error }) {
  const ref = useRef(null)
  const submitting = useRef(false)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
      else document.querySelector('#main h1')?.focus()
    }
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    try {
      await onConfirm()
    } finally {
      submitting.current = false
      setPending(false)
    }
  }
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!submitting.current) onClose() }}>
    <form onSubmit={submit} aria-busy={pending}>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <ErrorText message={error} />
      <div className="actions dialog-actions">
        <button type="button" autoFocus onClick={onClose} disabled={pending}>Cancel</button>
        <button className={danger ? 'danger' : 'primary'} disabled={pending}>{confirmLabel}</button>
      </div>
    </form>
  </dialog>
}

export function ErrorText({ message }) {
  return message ? <p role="alert" className="error">{message}</p> : null
}

export function downloadCsv(name, rows) {
  const quoted = value => {
    const text = String(value ?? '')
    const safe = typeof value === 'string' && /^[\t\r\n ]*[=+@-]/.test(text) ? "'" + text : text
    return '"' + safe.replaceAll('"', '""') + '"'
  }
  const url = URL.createObjectURL(new Blob([rows.map(row => row.map(quoted).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
