import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { label } from './data/model.js'

export function RecordLink({ to, children }) {
  return <Link className="record-link" to={withSid(to)}>{children}</Link>
}

export function PageHeader({ title, description, back, actions }) {
  return <div className="page-heading">
    <div>
      {back && <div className="breadcrumb"><RecordLink to={back[0]}><span aria-hidden="true">← </span>{back[1]}</RecordLink></div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="heading-actions">{actions}</div>}
  </div>
}

export function Missing({ kind, back }) {
  return <PageHeader title={kind + ' unavailable'} description="This record could not be found in your workspace." back={back} />
}

const tones = {
  active: 'success', paid: 'success', completed: 'success', recorded: 'success',
  urgent: 'urgent', overdue: 'urgent', high: 'warning', upcoming: 'warning', partial: 'warning',
  scheduled: 'warning', open: 'info', assigned: 'info', in_progress: 'info',
}

export function Pill({ value }) {
  return <span className={'pill ' + (tones[value] || 'neutral')}>{label(value)}</span>
}

export function Panel({ title, action, children }) {
  return <section className="panel">
    {title && <div className="panel-heading"><h2>{title}</h2>{action}</div>}
    {children}
  </section>
}

export function Facts({ items }) {
  return <dl className="facts">{items.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function useFilters(defaults) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, params.get(key) || value]))
  function update(key, value) {
    const next = new URLSearchParams(window.location.search)
    if (value && value !== defaults[key]) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  function clear() {
    const next = new URLSearchParams(window.location.search)
    Object.keys(defaults).forEach(key => next.delete(key))
    setParams(next, { replace: true })
  }
  return { values, update, clear, changed: Object.keys(defaults).some(key => values[key] !== defaults[key]) }
}

export function options(values) {
  return values.map(value => [value, label(value)])
}

export function Filters({ filters, placeholder, fields }) {
  const id = useId()
  const { values, update, clear, changed } = filters
  return <div className="toolbar">
    <div className="filter search">
      <label htmlFor={id}>Search</label>
      <span className="search-box"><span className="magnifier" aria-hidden="true" />
        <input type="search" id={id} value={values.q} placeholder={placeholder} onChange={event => update('q', event.target.value)} />
      </span>
    </div>
    {fields.map(([name, key, entries]) => <div className="filter" key={key}>
      <label htmlFor={id + '-' + key}>{name}</label>
      <select id={id + '-' + key} value={values[key]} onChange={event => update(key, event.target.value)}>
        {entries.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>)}
    {changed && <button className="button secondary clear-filters" onClick={clear}>Clear filters</button>}
  </div>
}

export function DataTable({ columns, rows, row, empty = 'No records to display.', filters, sort, paginate = true }) {
  const [page, setPage] = useState(0)
  const limit = 20
  const last = Math.max(0, Math.ceil(rows.length / limit) - 1)
  const current = Math.min(page, last)
  const start = current * limit
  if (!rows.length) return <div className="empty">
    <p>{filters?.changed ? 'No records match your search or filters.' : empty}</p>
  </div>
  return <>
    <div className="table-scroll" role="region" aria-label="Results table" tabIndex={0}>
      <table>
        <thead><tr>{columns.map(([name, align, sortKey]) => {
          const actual = sortKey && sort?.value.replace(/^-/, '') === sortKey
          const descending = actual && sort.value.startsWith('-')
          return <th key={name} scope="col" className={align} aria-sort={actual ? (descending ? 'descending' : 'ascending') : undefined}>
            {sortKey && sort ? <button className="sort-column" type="button" onClick={() => sort.update(actual && !descending ? '-' + sortKey : sortKey)}>{name} <span aria-hidden="true">{actual ? (descending ? '↓' : '↑') : '↕'}</span></button> : name}
          </th>
        })}</tr></thead>
        <tbody>{rows.slice(start, start + limit).map((record, index) => <tr key={record.id ?? start + index}>{row(record)}</tr>)}</tbody>
      </table>
    </div>
    {paginate && <div className="pagination">
      <span>{start + 1}–{Math.min(start + limit, rows.length)} of {rows.length}</span>
      <div className="pagination-buttons">
        <button className="button secondary" type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
        <button className="button secondary" type="button" disabled={current === last} onClick={() => setPage(current + 1)}>Next</button>
      </div>
    </div>}
  </>
}

export function Dialog({ title, initial, fields, onClose, onSubmit, submit = 'Save changes' }) {
  const ref = useRef(null)
  const heading = useId()
  const [values, setValues] = useState(initial)
  const [error, setError] = useState(null)

  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    dialog.querySelector('form input, form select, form textarea, .dialog-actions button')?.focus()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function accept(event) {
    event.preventDefault()
    try {
      onSubmit(values)
      onClose()
    } catch (failure) {
      if (!failure.field) throw failure
      setError(failure)
      const form = event.currentTarget
      form.elements.namedItem(failure.field)?.focus()
    }
  }

  return <dialog ref={ref} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id={heading}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
    <form onSubmit={accept} noValidate>
      <div className="form-fields">
        {fields(values).map(({ name, text, type = 'text', entries, required, change, wide, hint }, index) => {
          const message = error?.field === name && error.message
          const props = {
            name, id: heading + '-' + name, required, autoFocus: index === 0,
            'aria-invalid': message ? true : undefined,
            'aria-describedby': message ? heading + '-' + name + '-error' : (hint ? heading + '-' + name + '-hint' : undefined),
            onChange: event => {
              const value = type === 'checkbox' ? event.target.checked : event.target.value
              setValues(old => ({ ...old, [name]: value, ...change?.(value) }))
              setError(null)
            },
          }
          return <div className={'field' + (wide ? ' wide' : '')} key={name}>
            <div className="field-label"><label htmlFor={props.id}>{text}</label>{required && <span className="required" aria-hidden="true"> *</span>}</div>
            {entries ? <select {...props} value={values[name] ?? ''}>{entries.map(([value, caption]) => <option key={value} value={value}>{caption}</option>)}</select>
              : type === 'textarea' ? <textarea {...props} rows={3} value={values[name] ?? ''} />
              : type === 'checkbox' ? <input {...props} type="checkbox" checked={Boolean(values[name])} />
              : <input {...props} type={type} step={type === 'number' ? 'any' : undefined} value={values[name] ?? ''} />}
            {hint && <small id={props.id + '-hint'}>{hint}</small>}
            {message && <div className="field-error" id={props.id + '-error'} role="alert">{message}</div>}
          </div>
        })}
        {error && !fields(values).some(field => field.name === error.field) && <div className="field-error wide" role="alert">{error.message}</div>}
      </div>
      <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button type="submit" className="button">{submit}</button></div>
    </form>
  </dialog>
}
