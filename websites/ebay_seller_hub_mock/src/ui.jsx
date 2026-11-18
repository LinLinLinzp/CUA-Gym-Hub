import React, { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { rows, date, statusLabels } from './model.js'
import { useStore } from './store.jsx'

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  tag: 'M3 4h8l10 10-7 7L3 10z M7 8h.01',
  box: 'm3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10 M7.5 5l9 4',
  return: 'm8 4-5 5 5 5 M3 9h11a6 6 0 0 1 0 12h-3',
  spark: 'M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10z',
  chevron: 'm9 5 7 7-7 7', arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6',
  shop: 'M4 10v10h16V10 M3 10l2-6h14l2 6z M9 20v-6h6v6',
  plus: 'M12 5v14M5 12h14', search: 'M15 15l5 5 M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M18 6 6 18',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M12 6v6l4 2',
}

export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function useHrefFor() {
  const sid = new URLSearchParams(useLocation().search).get('sid')
  return to => {
    if (!sid) return withSid(to)
    const [base, hash] = to.split('#')
    const [pathname, query] = base.split('?')
    const params = new URLSearchParams(query)
    params.set('sid', sid)
    return pathname + '?' + params.toString() + (hash ? '#' + hash : '')
  }
}

export function LinkTo({ to, ...props }) {
  const hrefFor = useHrefFor()
  return <Link to={hrefFor(to)} {...props} />
}

export function Status({ value }) {
  const tone = ({
    active: 'good', shipped: 'good', refunded: 'good', received: 'good', paid: 'good', closed: 'good',
    requested: 'warn', awaiting_shipment: 'warn', canceled: 'bad',
  })[value] || 'neutral'
  return <span className={'status ' + tone}>{statusLabels[value] || value || 'Unknown'}</span>
}

export function PageTitle({ title, children, action }) {
  return <div className="page-title"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</div>
}

export function Missing({ name, to, label }) {
  return <section className="panel empty"><h1>{name} unavailable</h1><p>This record may have been removed or the link may be out of date.</p><LinkTo className="button primary" to={to}>{label}</LinkTo></section>
}

export function Back({ to, children }) {
  return <LinkTo className="back" to={to}><Icon name="back" size={16} />{children}</LinkTo>
}

export function Field({ label, children, hint, error, wide }) {
  const id = useId()
  const help = error || hint
  return <div className={wide ? 'field wide' : 'field'}>
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(children, { id, 'aria-describedby': help ? id + '-help' : undefined })}
    {help && <small id={id + '-help'} className={error ? 'form-error' : undefined}>{help}</small>}
  </div>
}

export function ErrorMessage({ children }) {
  return children ? <p role="alert" className="error-box">{children}</p> : null
}

export function Dialog({ title, children, confirm, danger, onClose, onConfirm }) {
  const ref = useRef(null)
  const heading = useId()
  const [error, setError] = useState('')
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose() }}>
    <form onSubmit={event => {
      event.preventDefault()
      const result = onConfirm(new FormData(event.currentTarget))
      if (result?.error) setError(result.error)
      else onClose()
    }}>
      <h2 id={heading}>{title}</h2>
      <div className="dialog-body">{children}</div>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className={'button ' + (danger ? 'danger' : 'primary')} type="submit">{confirm}</button></div>
    </form>
  </dialog>
}

export function useBrowse(defaultSort) {
  const [params, setParams] = useSearchParams()
  const update = values => {
    const next = new URLSearchParams(params)
    if (!Object.hasOwn(values, 'page')) next.delete('page')
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }
  return { status: params.get('status') || '', query: params.get('q') || '', filter: params.get('filter') || '',
    sort: params.get('sort') || defaultSort, page: Math.max(1, parseInt(params.get('page'), 10) || 1), update,
    clear: () => update({ status: '', q: '', filter: '', sort: '' }) }
}

export const QUEUE_PAGE_SIZE = 12

export function Queue({ browse, records, statusOf = item => item.status, statuses, filterLabel, filters, searchLabel, sorts,
  filtered, columns, renderRow, label, bulk, toolbarAction, emptyAction }) {
  const pageSize = QUEUE_PAGE_SIZE
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(browse.page, pages)
  const first = (page - 1) * pageSize
  const counts = new Map()
  for (const record of records) {
    const status = statusOf(record)
    counts.set(status, (counts.get(status) || 0) + 1)
  }
  const active = browse.query || browse.status || browse.filter
  return <section className="panel queue" aria-label={label}>
    <div className="tabs" aria-label="Filter by status">{[['', 'All'], ...statuses].map(([status, text]) =>
      <button key={status} type="button" aria-pressed={browse.status === status} onClick={() => browse.update({ status })}>{text}<span>{status ? counts.get(status) || 0 : records.length}</span></button>)}</div>
    <div className="toolbar">
      <label className="search"><Icon name="search" size={18} /><input type="search" aria-label={searchLabel} placeholder={searchLabel} value={browse.query} onChange={event => browse.update({ q: event.target.value })} /></label>
      {filters && <Select label={filterLabel} value={browse.filter} onChange={filter => browse.update({ filter })} options={filters} />}
      {toolbarAction}
      <div className="sort"><Select label="Sort by" value={browse.sort} onChange={sort => browse.update({ sort })} options={sorts} /></div>
    </div>
    {bulk}
    {filtered.length ? <div className="table-scroll" role="region" aria-label={label + ' table'} tabIndex={0}>
      <table><thead><tr>{columns.map(({ label, numeric, content }, index) => <th scope="col" key={index} className={numeric ? 'numeric' : undefined}>{content || label}</th>)}</tr></thead>
        <tbody>{filtered.slice(first, first + pageSize).map(renderRow)}</tbody></table>
    </div> : <div className="empty"><h3>{active ? 'No results match your filters' : 'No records yet'}</h3>{active ? <button type="button" className="button" onClick={browse.clear}>Clear filters</button> : emptyAction}</div>}
    <div className="pagination"><span>{filtered.length ? `${first + 1}–${Math.min(first + pageSize, filtered.length)} of ${filtered.length}` : '0 results'}</span>
      {pages > 1 && <div><button type="button" className="button" disabled={page === 1} onClick={() => browse.update({ page: page - 1 })}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="button" disabled={page === pages} onClick={() => browse.update({ page: page + 1 })}>Next</button></div>}
    </div>
  </section>
}

export function Select({ label, options, value, onChange }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    {options.map(([key, title]) => <option value={key} key={key}>{title}</option>)}
  </select>
}

export function History({ kind, id }) {
  const { state } = useStore()
  const events = rows(state.activity).filter(item => item.entityType === kind && item.entityId === id)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return <section className="panel padded"><h2>History</h2>{events.length ? <ul className="history">{events.map(item =>
    <li key={item.id}><Icon name="clock" size={16} /><div><strong>{eventLabel(item.type)}</strong><small>{date(item.createdAt, true)}</small></div></li>)}</ul> : <p className="muted">No activity recorded.</p>}</section>
}

export const eventLabel = value => {
  const text = String(value || 'Activity').replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}


