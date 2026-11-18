import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Search, X } from './icons.jsx'
import { Link, useLocation } from 'react-router-dom'
import { byId, label, rows } from './data/format.js'
import { withSid } from './utils/dataManager.js'

export function useDestination() {
  const { search } = useLocation()
  return (path) => search ? path + search : withSid(path)
}

export function RouteLink({ to, ...props }) {
  const destination = useDestination()
  return <Link to={destination(to)} {...props} />
}

export function Heading({ title, description, back, actions, status, icon: Icon }) {
  return <>
    {back && <div className="breadcrumb"><RouteLink to={back[0]}><ArrowLeft size={15} />{back[1]}</RouteLink><ChevronRight size={14} /><span>{title}</span></div>}
    <div className="page-heading">
      <div className="heading-title">
        {Icon && <span className="heading-icon"><Icon size={24} strokeWidth={1.8} /></span>}
        <div><div className="title-line"><h1>{title}</h1>{status && <Pill value={status} />}</div>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  </>
}

export function Missing({ back, entity }) {
  return <>
    <Heading title={`${entity} unavailable`} back={back} />
    <div className="panel empty"><p>This record is unavailable in this workspace.</p><RouteLink className="button" to={back[0]}>Back to {back[1]}</RouteLink></div>
  </>
}

export function Pill({ value }) {
  const tone = {
    active: 'success', available: 'success', approved: 'success', assigned: 'purple',
    pending: 'warning', draft: 'warning', declined: 'negative',
  }[value] || 'neutral'
  return <span className={`pill ${tone}`}>{label(value)}</span>
}

export function Avatar({ name, size }) {
  const initials = typeof name === 'string' ? name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : '—'
  const shade = initials.charCodeAt(0) % 4 || 0
  return <span className={`avatar avatar-${shade}${size ? ` ${size}` : ''}`} aria-hidden="true">{initials || '—'}</span>
}

export function Fields({ values }) {
  return <dl className="facts">{values.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Panel({ title, children, count }) {
  return <section className="panel detail-panel"><div className="panel-title"><h2>{title}</h2>{count != null && <span className="count">{count}</span>}</div>{children}</section>
}

export function Related({ items, empty }) {
  if (!items.length) return <p className="subtle">{empty}</p>
  return <ul className="related-list">{items.map(({ id, to, title, sub, status }) => (
    <li key={id}><RouteLink to={to} className="related-link">
      <span><strong>{title || id}</strong>{sub && <small>{sub}</small>}</span>
      <span className="related-tail">{status && <Pill value={status} />}<ChevronRight size={16} /></span>
    </RouteLink></li>
  ))}</ul>
}

export function useList(defaultSort = '', defaultDirection = 'asc') {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [order, setOrder] = useState({ field: defaultSort, dir: defaultDirection })
  const [page, setPage] = useState(1)

  const change = (key, value) => { setFilters((old) => ({ ...old, [key]: value })); setPage(1) }
  const search = (value) => { setQuery(value); setPage(1) }
  const clear = () => { setFilters({}); setQuery(''); setPage(1) }
  const sort = (field) => {
    setOrder((old) => ({ field, dir: old.field === field && old.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const apply = (records, searchable) => {
    const term = query.trim().toLowerCase()
    const filtered = records.filter((record) =>
      (!term || searchable(record).some((item) => String(item ?? '').toLowerCase().includes(term))) &&
      Object.entries(filters).every(([key, value]) => !value || String(record[key]) === value))
    if (order.field) filtered.sort((a, b) =>
      String(a[order.field] ?? '').localeCompare(String(b[order.field] ?? ''), 'en', { numeric: true, sensitivity: 'base' }) *
      (order.dir === 'asc' ? 1 : -1))
    return filtered
  }

  return { query, filters, order, page, setPage, search, change, clear, sort, apply, filtered: Boolean(query || Object.values(filters).some(Boolean)) }
}

export const options = (records, field) => [...new Set(records.map((record) => record[field]).filter(Boolean))].sort()
export const peopleOptions = (people) => people.filter(({ id }) => id).map(({ id, name }) => [id, name || id]).sort((a, b) => a[1].localeCompare(b[1]))
export const linkedPeople = (records, employees) => peopleOptions(options(records, 'employeeId').map((id) => byId(employees, id) || { id }))

export function Toolbar({ list, placeholder, filters = [] }) {
  return <div className="toolbar">
    {placeholder && <label className="searchbox"><Search size={17} /><input type="search" aria-label={placeholder} placeholder={placeholder} value={list.query} onChange={(event) => list.search(event.target.value)} /></label>}
    {filters.map(([field, name, values]) => <select key={field} aria-label={name} value={list.filters[field] || ''} onChange={(event) => list.change(field, event.target.value)}>
      <option value="">{`All ${name.toLowerCase()}`}</option>
      {values.map((value) => Array.isArray(value) ? <option key={value[0]} value={value[0]}>{value[1]}</option> : <option key={value} value={value}>{label(value)}</option>)}
    </select>)}
    {list.filtered && <button className="text-button" onClick={list.clear}>Clear filters</button>}
  </div>
}

export function Table({ columns, records, list, noun, emptyAction, caption }) {
  const perPage = 20
  const total = records.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(list?.page || 1, pages)
  const from = list ? (current - 1) * perPage : 0
  const visible = list ? records.slice(from, from + perPage) : records
  return <div className="panel table-panel">
    {total ? <>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={caption || noun}>
        <table>
          <caption className="sr-only">{caption || noun}</caption>
          <thead><tr>{columns.map(([key, title, , sortable]) => {
            const active = list?.order.field === key
            const SortIcon = active && list.order.dir === 'asc' ? ArrowUp : ArrowDown
            return <th key={key} scope="col" aria-sort={active ? list.order.dir === 'asc' ? 'ascending' : 'descending' : undefined}>
              {sortable && list ? <button className={`sort-button${active ? ' sorting' : ''}`} onClick={() => list.sort(key)}>{title}<SortIcon size={13} /></button> : title}
            </th>
          })}</tr></thead>
          <tbody>{visible.map((record, index) => <tr key={record.id || `${from + index}`}>
            {columns.map(([key, , render], column) => {
              const Tag = column === 0 ? 'th' : 'td'
              return <Tag key={key} scope={column === 0 ? 'row' : undefined}>{render ? render(record) : record[key] ?? '—'}</Tag>
            })}
          </tr>)}</tbody>
        </table>
      </div>
      {list && <footer className="table-footer"><span>Showing {from + 1}–{from + visible.length} of {total} {noun}</span>
        <div className="pagination">
          <button className="icon-button" aria-label="Previous page" disabled={current === 1} onClick={() => list.setPage(current - 1)}><ArrowLeft size={16} /></button>
          <span>Page {current} of {pages}</span>
          <button className="icon-button" aria-label="Next page" disabled={current === pages} onClick={() => list.setPage(current + 1)}><ArrowRight size={16} /></button>
        </div>
      </footer>}
    </> : <div className="empty">
      <Search size={24} />
      <h2>{list?.filtered ? 'No matching results' : `No ${noun} yet`}</h2>
      {list?.filtered ? <button className="button" onClick={list.clear}>Clear filters</button> : emptyAction}
    </div>}
  </div>
}

export function Dialog({ title, description, onClose, children, wide, onSubmit, submitText, error, disabled }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
      else if (!document.querySelector('dialog[open]')) document.getElementById('workspace-content')?.focus()
    }
  }, [])

  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <form noValidate onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
      <div className="modal-header"><div><h2 id="dialog-title">{title}</h2>{description && <p>{description}</p>}</div>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
      </div>
      <div className="modal-body">{children}{error && <p className="form-error" role="alert">{error}</p>}</div>
      <div className="modal-footer"><button type="button" className="button" onClick={onClose}>Cancel</button>
        <button className="button primary" disabled={disabled}>{submitText}</button></div>
    </form>
  </dialog>
}

export function Field({ name, title, value, change, error, choices, placeholder, required, area, ...props }) {
  const fieldId = useId()
  const shared = {
    name, value: value ?? '', onChange: (event) => change(name, event.target.value),
    'aria-labelledby': `${fieldId}-label`, 'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${fieldId}-error` : undefined,
    'aria-required': required || undefined, ...props,
  }
  return <label className="field"><span><span id={`${fieldId}-label`}>{title}</span>{required && <span className="required" aria-hidden="true"> *</span>}</span>
    {choices ? <select {...shared}><option value="">{placeholder || 'Select an option'}</option>
      {choices.map((choice) => Array.isArray(choice)
        ? <option key={choice[0]} value={choice[0]}>{choice[1]}</option>
        : <option key={choice} value={choice}>{label(choice)}</option>)}</select>
      : area ? <textarea {...shared} placeholder={placeholder} rows={3} /> : <input {...shared} placeholder={placeholder} />}
    {error && <small className="field-error" id={`${fieldId}-error`} role="alert">{error}</small>}
  </label>
}

export function useForm(initial, close, afterSave) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const change = (key, value) => {
    setValues((old) => ({ ...old, [key]: value }))
    setErrors((old) => ({ ...old, [key]: undefined, form: undefined }))
  }
  const finish = (result) => {
    if (result.errors) { setErrors(result.errors); return }
    close()
    if (result.id) afterSave?.(result.id)
  }
  return { values, errors, change, finish, field: (name) => ({ name, value: values[name], error: errors[name], change }) }
}

export const latest = (collection) => rows(collection).slice().sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
