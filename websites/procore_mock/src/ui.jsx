import { useEffect, useId, useRef, useState } from 'react'
import { dateLabel, nameOf } from './domain'
import { RouteLink } from './navigation'
import { useWorkspace } from './state'

const icons = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  project: 'M3 21h18 M5 21V8l8-4v17 M13 10h6v11 M8 10h2m-2 4h2m-2 4h2m6-4h1m-1 4h1',
  question: 'M4 4h16v13H9l-5 4z M9 9a3 2 0 1 1 5 1c-2 1-2 1-2 2m0 2h.01',
  layers: 'm12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  calendar: 'M4 6h16v15H4z M8 3v6m8-6v6M4 11h16m-12 4h2m4 0h2m-8 3h2',
  contract: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 11h6m-6 4h6m-6 3h4',
}

export function Icon({ name }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"><path d={icons[name]} /></svg>
}

export function PageHeader({ title, kicker, children, status, actions }) {
  return <header className="page-header">
    <div>
      {kicker && <div className="kicker">{kicker}</div>}
      <div className="title-line"><h1>{title}</h1>{status && <Status value={status} />}</div>
      {children && <div className="page-subtitle">{children}</div>}
    </div>
    {actions && <div className="actions">{actions}</div>}
  </header>
}

export function Status({ value }) {
  const tone = ['Closed', 'Approved', 'Approved as Noted', 'Complete'].includes(value) ? 'success'
    : ['Open', 'In Review', 'Pending Approval', 'Revise and Resubmit'].includes(value) ? 'pending'
    : value === 'Rejected' ? 'error' : 'neutral'
  return <span className={'status ' + tone}>{value || 'Unspecified'}</span>
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <div>{children}</div>}</div>
}

export function Button({ primary, className = '', type = 'button', ...props }) {
  return <button type={type} className={'button ' + (primary ? 'primary ' : '') + className} {...props} />
}

export function Field({ label, name, value, onChange, options, area, type = 'text', required, validate, ...props }) {
  const id = useId()
  const control = {
    id, name, value: type === 'file' ? undefined : value ?? '', onChange, required, ...props,
    ref: validate ? (element) => element?.setCustomValidity(element.value === '' ? '' : validate(element.value)) : undefined,
  }
  return <div className="field">
    <div className="field-label"><label htmlFor={id}>{label}</label>{required && <span className="required" aria-hidden="true"> *</span>}</div>
    {options ? <select {...control}>
      <option value="">{required ? 'Select…' : 'None'}</option>
      {options.map((option) => {
        const { id, name: text } = typeof option === 'string' ? { id: option, name: option } : option
        return <option key={id} value={id}>{text || id}</option>
      })}
    </select> : area ? <textarea rows={4} {...control} /> : <input type={type} {...control} />}
  </div>
}

export function useFields(initial) {
  const [values, setValues] = useState(initial)
  return {
    values,
    bind: (name) => ({
      name, value: values[name],
      onChange: (event) => {
        const value = event.target.value
        setValues((previous) => ({ ...previous, [name]: value }))
      },
    }),
  }
}

export function Dialog({ title, onClose, onSave, submitLabel = 'Save', children, confirm = false, wide = false }) {
  const dialog = useRef(null)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const titleId = 'editor-title'

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const invalid = Array.from(form.elements).find((element) =>
      element.willValidate && (!element.validity.valid || (element.required && !element.value.trim())))
    form.querySelector('[aria-invalid="true"]')?.removeAttribute('aria-invalid')
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true')
      setError(invalid.validity.valid ? 'Enter a value for the selected field.' : invalid.validationMessage)
      invalid.focus()
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await onSave()
      if (typeof result === 'string') setError(result)
      else onClose()
    } catch {
      setError('The action could not be saved. Try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <dialog ref={dialog} aria-labelledby={titleId} className={confirm ? 'confirm-dialog' : 'drawer' + (wide ? ' wide' : '')}
    onCancel={(event) => { event.preventDefault(); if (!pending.current) onClose() }}>
    <form onSubmit={submit} noValidate>
      <header className="dialog-header"><h2 id={titleId}>{title}</h2><button disabled={busy} className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button></header>
      <div className="dialog-body">{children}{error && <div role="alert" className="form-error">{error}</div>}</div>
      <footer className="dialog-footer">
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button primary type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
      </footer>
    </form>
  </dialog>
}

export function Details({ rows, title = 'Details' }) {
  return <section className="panel detail-panel"><h2>{title}</h2><dl className="details">
    {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}
  </dl></section>
}

export function Activity({ events, limit, target }) {
  const { state } = useWorkspace()
  const sorted = [...events].reverse().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  if (!sorted.length) return <p className="quiet">No activity recorded yet.</p>
  const actions = {
    create: 'Created record', edit: 'Edited record', open: 'Opened RFI', reply: 'Added reply',
    set_official_response: 'Set official response', close: 'Closed RFI', reopen: 'Reopened record',
    submit: 'Submitted for review', review: 'Recorded review', resubmit: 'Resubmitted for review',
    add_entry: 'Added log entry', edit_entry: 'Edited log entry', delete_entry: 'Removed log entry',
    complete: 'Completed day', approve: 'Approved change order', reject: 'Rejected change order',
  }
  return <ul className="activity-list">{sorted.slice(0, limit).map((event) => {
    const label = actions[event.action] || event.action || 'Updated record'
    const link = target?.(event)
    return <li key={event.id}>
      <span className="activity-dot" aria-hidden="true" />
      <div>{link ? <RouteLink to={link}>{label}</RouteLink> : <strong>{label}</strong>}
        <div className="muted">{nameOf(state.people, event.createdById, 'Workspace user')}{event.newStatus ? ' · ' + event.newStatus : ''}</div>
      </div>
      <time dateTime={event.createdAt}>{dateLabel(event.createdAt)}</time>
    </li>
  })}</ul>
}

export function History({ type, record }) {
  const { state } = useWorkspace()
  const events = Array.isArray(state.activity)
    ? state.activity.filter((event) => event?.entityType === type && event.entityId === record.id && event.projectId === record.projectId)
    : []
  return <section className="panel detail-panel"><h2>History</h2><Activity events={events} /></section>
}

export function RecordList({ title, records, columns, filters, searchText, searchLabel, onCreate, singular, defaultSort = 'number' }) {
  const filterId = useId()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState({})
  const [sort, setSort] = useState({ key: defaultSort, direction: 1 })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const currentColumn = columns.find((column) => column.key === sort.key)
  const filtered = records.filter((record) => searchText(record).toLowerCase().includes(query.trim().toLowerCase())
    && filters.every((filter) => !selected[filter.key] || filter.match(record, selected[filter.key])))
  if (currentColumn?.value) filtered.sort((a, b) => {
    const left = currentColumn.value(a)
    const right = currentColumn.value(b)
    if (left == null || left === '') return right == null || right === '' ? 0 : 1
    if (right == null || right === '') return -1
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left).localeCompare(String(right), 'en', { numeric: true })
    return comparison * sort.direction
  })
  const last = Math.max(0, Math.ceil(filtered.length / pageSize) - 1)
  const current = Math.min(page, last)

  return <>
    <PageHeader title={title} kicker="Project tools" actions={<Button primary onClick={onCreate}>+ Create {singular}</Button>} />
    <section className="panel list-panel" aria-label={title + ' register'}>
      <div className="toolbar">
        <label className="field search"><span>{searchLabel}</span><input type="search" placeholder="Search records" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} /></label>
        {filters.map(({ key, label, options }) => <div className="field" key={key}><label htmlFor={filterId + key}>{label}</label>
          <select id={filterId + key} value={selected[key] || ''} onChange={(event) => { setSelected({ ...selected, [key]: event.target.value }); setPage(0) }}>
            <option value="">All {label === 'Status' ? 'statuses' : label.toLowerCase() + 's'}</option>
            {options.map((option) => {
              const { id, name } = typeof option === 'string' ? { id: option, name: option } : option
              return <option key={id} value={id}>{name || id}</option>
            })}
          </select>
        </div>)}
        <span className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
      </div>
      {filtered.length ? <div className="table-scroll"><table>
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.align} aria-sort={column.value && sort.key === column.key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}>
          {column.value ? <button type="button" className="sort-button" onClick={() => { setSort({ key: column.key, direction: sort.key === column.key ? -sort.direction : 1 }); setPage(0) }}>
            {column.label}<span aria-hidden="true">{sort.key === column.key ? (sort.direction === 1 ? ' ↑' : ' ↓') : ' ↕'}</span>
          </button> : column.label}
        </th>)}</tr></thead>
        <tbody>{filtered.slice(current * pageSize, (current + 1) * pageSize).map((record) =>
          <tr key={record.id}>{columns.map((column) => <td key={column.key} className={column.align}>{column.render(record)}</td>)}</tr>)}</tbody>
      </table></div> : <Empty title="No matching records">{records.length ? 'Try another search or change the filters.' : 'Create a record to get started.'}</Empty>}
      <div className="pagination">
        <div><label htmlFor={filterId + '-page-size'}>Rows per page</label> <select id={filterId + '-page-size'} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}>
          {[25, 50, 100].map((size) => <option key={size}>{size}</option>)}
        </select></div>
        <span>{filtered.length ? (current * pageSize + 1) + '–' + Math.min((current + 1) * pageSize, filtered.length) + ' of ' + filtered.length : '0 records'}</span>
        <div className="actions"><Button disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button><Button disabled={current === last} onClick={() => setPage(current + 1)}>Next</Button></div>
      </div>
    </section>
  </>
}

export function Back({ to, children }) {
  return <RouteLink className="back-link" to={to}><span aria-hidden="true">←</span> {children}</RouteLink>
}

export function MissingRecord({ to, tool }) {
  return <><Back to={to}>{tool}</Back><Empty title="Record unavailable">This record could not be found in the selected project.</Empty></>
}
