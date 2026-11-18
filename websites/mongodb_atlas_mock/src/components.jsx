import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, PageHeading } from './workspace.jsx'

const PAGE_SIZE = 12
export const labelStatus = value => value ? value[0].toUpperCase() + value.slice(1) : 'Unknown'
export const searchText = (...parts) => parts.filter(Boolean).join(' ').toLowerCase()
export const expiryStatus = row => {
  if (row.expiresAt && new Date(row.expiresAt) <= new Date()) return 'expired'
  return row.status || 'active'
}
export const durationOptions = [
  ['permanent', 'Permanent'], ['6h', '6 hours'], ['1d', '1 day'], ['1w', '1 week'],
]
export function expiryOptions(original) {
  return original ? [['keep', 'Keep current expiry'], ...durationOptions] : durationOptions
}
export function resolveExpiry(choice, original, now) {
  if (choice === 'keep') return original ?? null
  const hours = { '6h': 6, '1d': 24, '1w': 168 }[choice]
  return hours ? new Date(new Date(now).getTime() + hours * 3600000).toISOString() : null
}
export function displayDate(value, fallback = '—') {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC'
}

export function Badge({ status }) {
  return <span className={'badge ' + status}>{labelStatus(status)}</span>
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children}</div>
}

export function Inventory({ title, description, addLabel, onAdd, records, columns, filters, search, searchLabel, name, render, children }) {
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState({})
  const [sort, setSort] = useState('default')
  const [currentPage, setPage] = useState(1)
  const matching = records.filter(row => search(row).includes(term.trim().toLowerCase()) &&
    filters.every(filter => !selected[filter.label] || filter.match(row, selected[filter.label])))
  if (sort !== 'default') matching.sort((a, b) => name(a).localeCompare(name(b)) * (sort === 'asc' ? 1 : -1))
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(currentPage, pageCount)
  const offset = (page - 1) * PAGE_SIZE
  const filtered = !!term || Object.values(selected).some(Boolean)

  function clear() {
    setTerm('')
    setSelected({})
    setPage(1)
  }

  return <>
    <PageHeading title={title} description={description}>
      {onAdd && <button className="button primary" onClick={onAdd}><span aria-hidden="true">＋</span>{addLabel}</button>}
    </PageHeading>
    <div className="toolbar">
      <label className="search-control"><Icon name="search" /><input type="search" aria-label={searchLabel} placeholder={searchLabel} value={term} onChange={event => { setTerm(event.target.value); setPage(1) }} /></label>
      {filters.map(filter => <Select key={filter.label} aria-label={filter.label} value={selected[filter.label] || ''} options={[[ '', filter.placeholder ], ...filter.options]} onChange={event => { setSelected({ ...selected, [filter.label]: event.target.value }); setPage(1) }} />)}
      <Select className="sort" aria-label="Sort order" value={sort} options={[[ 'default', 'Default order' ], ['asc', 'A to Z'], ['desc', 'Z to A']]} onChange={event => { setSort(event.target.value); setPage(1) }} />
    </div>
    <section className="table-panel" aria-label={title + ' inventory'}>
      {matching.length ? <>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={title + ' table'}>
          <table>
            <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{matching.slice(offset, offset + PAGE_SIZE).map(row => <tr key={row.id}>{render(row)}</tr>)}</tbody>
          </table>
        </div>
        <footer className="pagination">
          <span aria-live="polite">{offset + 1}–{Math.min(offset + PAGE_SIZE, matching.length)} of {matching.length}</span>
          <div>
            <button type="button" className="button" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" className="button" onClick={() => setPage(page + 1)} disabled={page === pageCount}>Next</button>
          </div>
        </footer>
      </> : <Empty title={filtered ? 'No matching records' : 'No records yet'}>
        {filtered ? <button className="button" onClick={clear}>Clear search and filters</button> : onAdd && <button className="button" onClick={onAdd}>{addLabel}</button>}
      </Empty>}
    </section>
    {children}
  </>
}

export function Actions({ name, options }) {
  const [position, setPosition] = useState(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  const id = useId()

  const expanded = Boolean(position)
  const height = options.length * 40 + 12

  function anchorPosition() {
    const rect = trigger.current.getBoundingClientRect()
    return {
      top: rect.bottom + height + 8 < window.innerHeight ? rect.bottom + 5 : Math.max(8, rect.top - height),
      left: Math.min(window.innerWidth - 192, Math.max(8, rect.right - 184)),
    }
  }

  useEffect(() => {
    if (!expanded) return
    menu.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
    function outside(event) {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setPosition(null)
    }
    function reposition() {
      const next = anchorPosition()
      setPosition(current => current && (current.top !== next.top || current.left !== next.left) ? next : current)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [expanded, height])

  function toggle() {
    setPosition(expanded ? null : anchorPosition())
  }

  return <>
    <button type="button" className="button action-trigger" ref={trigger} onClick={toggle}
      aria-label={'Actions for ' + name} aria-expanded={Boolean(position)} aria-controls={position ? id : undefined}>•••</button>
    {position && createPortal(<div className="action-menu" id={id} ref={menu} style={position}
      onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) setPosition(null) }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setPosition(null)
          trigger.current.focus({ preventScroll: true })
        }
      }}>
      {options.map(({ label, run, disabled, danger }) => <button type="button" key={label} disabled={disabled} className={danger ? 'danger-text' : ''}
        onClick={() => { trigger.current.focus({ preventScroll: true }); setPosition(null); run() }}>{label}</button>)}
    </div>, document.body)}
  </>
}

export function Select({ options, ...props }) {
  return <select {...props}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
}

export function Field({ label, error, children, hint }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? id + '-description' : undefined })}
    {(error || hint) && <small id={id + '-description'} className={error ? 'field-error' : 'muted'} role={error ? 'alert' : undefined}>{error || hint}</small>}
  </div>
}

export function Modal({ title, onClose, onSubmit, submitLabel, sheet = false, dangerous = false, footer, children }) {
  const ref = useRef(null)
  const heading = useId()

  useLayoutEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    const target = dialog.querySelector('.modal-body input:not([type=checkbox]), .modal-body select') || dialog.querySelector('.modal-footer button')
    target?.focus()
    return () => {
      dialog.close()
      if (previous && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true })
      else document.getElementById('content')?.focus()
    }
  }, [])

  function containFocus(event) {
    if (event.key !== 'Tab') return
    const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
    const edge = event.shiftKey ? controls[0] : controls.at(-1)
    if (document.activeElement !== edge) return
    event.preventDefault()
    if (event.shiftKey) controls.at(-1)?.focus()
    else controls[0]?.focus()
  }

  return <dialog onKeyDown={containFocus} ref={ref} className={sheet ? 'sheet' : 'confirmation'} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose() }}>
    <form noValidate onSubmit={event => { event.preventDefault(); onSubmit() }}>
      <header className="modal-header"><h2 id={heading}>{title}</h2><button type="button" aria-label="Close" className="button close" onClick={onClose}>×</button></header>
      <div className="modal-body">{children}</div>
      <footer className="modal-footer">
        <button type="button" className="button" onClick={onClose}>Cancel</button>
        {footer}
        <button type="submit" className={'button ' + (dangerous ? 'danger' : 'primary')}>{submitLabel}</button>
      </footer>
    </form>
  </dialog>
}

export function Confirm({ title, label, text, onClose, onConfirm, exact, dangerous }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  return <Modal title={title} onClose={onClose} submitLabel={label} dangerous={dangerous} onSubmit={() => {
    if (exact && name !== exact) setError('Enter the exact cluster name to continue.')
    else onConfirm()
  }}>
    <p>{text}</p>
    {exact && <Field label="Cluster name" error={error}>{props => <input {...props} autoFocus value={name} onChange={event => { setName(event.target.value); setError('') }} />}</Field>}
  </Modal>
}

export function Feedback({ message }) {
  return <div className="feedback" role="status">{message && <span>{message}</span>}</div>
}
