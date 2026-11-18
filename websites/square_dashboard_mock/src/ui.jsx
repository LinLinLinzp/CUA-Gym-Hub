import React, { useEffect, useId, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { label } from './model.js'
import { useNotice } from './store.jsx'

export function useUrl() {
  const { search } = useLocation()
  return (path) => {
    const [base, query] = path.split('?')
    const params = new URLSearchParams(search)
    const next = new URLSearchParams(query)
    if (params.has('sid')) next.set('sid', params.get('sid'))
    return base + (next.size ? '?' + next.toString() : '')
  }
}
export function RouteLink({ to, children, ...props }) {
  const url = useUrl()
  return <Link to={url(to)} {...props}>{children}</Link>
}
export function useRoute() {
  const navigate = useNavigate()
  const url = useUrl()
  return (path) => navigate(url(path))
}
export function Header({ title, subtitle, back, action }) {
  return <>
    {back && <RouteLink className="back" to={back[0]}><span aria-hidden="true">← </span>{back[1]}</RouteLink>}
    <header className="page-heading">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </header>
  </>
}
export function Status({ value, text }) {
  return <span className={'status status-' + (value || 'unknown')}><i aria-hidden="true" />{text || label(value)}</span>
}
export function Notice({ id }) {
  const notice = useNotice()
  return notice?.id === id ? <p className="notice">{notice.message}</p> : null
}
export function Recovery({ title = 'Page unavailable', message = 'The requested page could not be found.', to = '/', action = 'Back to overview' }) {
  return <><Header title={title} /><section className="card empty"><p>{message}</p><RouteLink className="button secondary" to={to}>{action}</RouteLink></section></>
}
export function Field({ label: title, children, className = '' }) {
  const id = useId()
  return <div className={'field ' + className}>
    <label htmlFor={id}>{title}</label>
    {React.Children.map(children, (child) => React.isValidElement(child) && ['input', 'select', 'textarea'].includes(child.type)
      ? React.cloneElement(child, { id })
      : child)}
  </div>
}
export function Select({ title, value = '', change, options, empty, ...props }) {
  return <Field label={title}><select value={value} onChange={(event) => change(event.target.value)} {...props}>
    {empty !== undefined && <option value="">{empty}</option>}
    {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
  </select></Field>
}
export function Search({ title, value, change, placeholder }) {
  return <Field label={title} className="search"><input type="search" placeholder={placeholder} value={value} onChange={(event) => change(event.target.value)} /></Field>
}
export function DateFilters({ filters, change }) {
  return <>
    <Field label="From date"><input type="date" value={filters.from || ''} onChange={(event) => change('from', event.target.value)} /></Field>
    <Field label="To date"><input type="date" value={filters.to || ''} onChange={(event) => change('to', event.target.value)} /></Field>
  </>
}
export function Table({ headings, entries, render, label: title, empty = 'No records to display.', reset }) {
  return <div className="table-scroll">
    <table aria-label={title}>
      <thead><tr>{headings.map((heading) => <th key={heading} scope="col" className={heading.startsWith('$') ? 'number' : ''}>{heading.replace(/^\$/, '')}</th>)}</tr></thead>
      <tbody>
        {entries.map(render)}
        {!entries.length && <tr><td colSpan={headings.length} className="empty">{empty}{reset && <button className="text-button" onClick={reset}>Clear filters</button>}</td></tr>}
      </tbody>
    </table>
  </div>
}
export function ListCard({ children, count, noun, action }) {
  return <section className="card list-card">
    <div className="list-meta"><span role="status">{count} {count === 1 ? noun : noun + 's'}</span>{action}</div>
    {children}
  </section>
}
export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}
export function Dialog({ title, close, children, compact = false }) {
  const element = useRef(null)
  useEffect(() => {
    const dialog = element.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  useEffect(() => { element.current.querySelector('h2')?.focus() }, [title])
  function trap(event) {
    if (event.key !== 'Tab') return
    const controls = [...element.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], textarea:not(:disabled)')]
    if (!controls.length) return
    if (event.shiftKey && (document.activeElement === controls[0] || !controls.includes(document.activeElement))) {
      event.preventDefault()
      controls.at(-1).focus()
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault()
      controls[0].focus()
    }
  }
  return <dialog ref={element} className={compact ? 'compact' : ''} aria-labelledby="dialog-title" onKeyDown={trap} onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><h2 id="dialog-title" tabIndex={-1}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}>×</button></div>
    {children}
  </dialog>
}
export function Confirm({ title, children, action, submit, close, error }) {
  return <Dialog title={title} close={close} compact>
    <p>{children}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button className="button secondary" onClick={close}>Keep as is</button><button className="button primary" onClick={submit}>{action}</button></div>
  </Dialog>
}
export function useFilters(initial = {}) {
  const [filters, set] = React.useState(initial)
  return [filters, (key, value) => set((current) => ({ ...current, [key]: value })), () => set(initial)]
}
export const choices = (items) => items.map((value) => [value, label(value)])
export const options = (records) => records.map(({ id, name }) => [id, name || id])


