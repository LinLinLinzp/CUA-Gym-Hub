import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const iconPaths = {
  programs: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18M10 12v3h4v-3',
  lists: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  campaigns: 'M13 2 4 14h7l-1 8 10-12h-7z',
  search: 'M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  plus: 'M12 5v14M5 12h14',
  left: 'm15 6-6 6 6 6',
  right: 'm9 6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  sort: 'm8 9 4-4 4 4m-8 6 4 4 4-4',
  up: 'm7 14 5-5 5 5',
  down: 'm7 10 5 5 5-5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'm5 12 4 4L19 6',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-1-12a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  folder: 'M3 6h6l2 2h10v12H3z',
}

export function Icon({ name, size = 17 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={iconPaths[name]} />
  </svg>
}

export function Button({ children, variant = 'secondary', icon, className = '', ...props }) {
  return <button type="button" className={'button ' + variant + ' ' + className} {...props}>
    {icon && <Icon name={icon} />}{children}
  </button>
}

export function Field({ label, error, children }) {
  return <label className="field">
    <span>{label}</span>{children}
    {error && <span className="field-error" role="alert">{error}</span>}
  </label>
}

export function SearchBox({ label, value, onChange }) {
  return <label className="search-box"><Icon name="search" />
    <input type="search" aria-label={label} placeholder={label + '…'} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
}

export function Pill({ value }) {
  const label = titleCase(value)
  return <span className={'pill ' + String(value || '').toLowerCase()}>{label || '—'}</span>
}

export const titleCase = (value) => value ? String(value).replace(/^./, letter => letter.toUpperCase()) : ''
export const nameOf = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.email || 'Unnamed person'

const dateDisplay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeDisplay = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function displayDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : (withTime ? dateTimeDisplay : dateDisplay).format(date)
}

export function Modal({ title, onClose, children, drawer = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const launcher = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (launcher instanceof HTMLElement && launcher.isConnected) launcher.focus()
    }
  }, [])

  return <dialog ref={ref} className={drawer ? 'drawer' : 'modal'} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }}>
    <header className="dialog-header"><h2>{title}</h2><Button icon="close" className="icon-button" aria-label="Close dialog" onClick={onClose} /></header>
    {children}
  </dialog>
}

export function Confirm({ title, message, label, onConfirm, onClose, destructive = false }) {
  return <Modal title={title} onClose={onClose}>
    <p className="confirmation">{message}</p>
    <div className="dialog-actions"><Button onClick={onClose}>Cancel</Button>
      <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>{label}</Button></div>
  </Modal>
}

export function Table({ columns, rows, empty = 'No records match your filters.', sort, onSort }) {
  return <div className="table-scroll"><table>
    <thead><tr>{columns.map(column => <th key={column.key} scope="col" className={column.className}
      aria-sort={sort?.key === column.key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}>
      {column.sort ? <button className="sort-heading" onClick={() => onSort(column.key)}>
        {column.label}<Icon name={sort?.key !== column.key ? 'sort' : sort.direction === 1 ? 'up' : 'down'} size={14} />
      </button> : column.label}
    </th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(row => <tr key={row.id}>
      {columns.map(column => <td key={column.key} className={column.className}>{column.cell ? column.cell(row) : row[column.key] || '—'}</td>)}
    </tr>) : <tr><td className="empty-row" colSpan={columns.length}>{empty}</td></tr>}</tbody>
  </table></div>
}

const collator = new Intl.Collator('en-US', { sensitivity: 'base', numeric: true })
const valueFor = (column, row) => column.value ? column.value(row) : row[column.key]

export function PagedTable({ columns, rows, empty, toolbar, defaultSort, pageSize = 15, resetKey }) {
  const [requestedPage, setPage] = useState(0)
  const [previousKey, setPreviousKey] = useState(resetKey)
  if (previousKey !== resetKey) {
    setPreviousKey(resetKey)
    setPage(0)
  }
  const [sort, setSort] = useState(defaultSort)
  const sorting = columns.find(column => column.key === sort?.key)
  const ordered = sorting ? [...rows].sort((a, b) =>
    collator.compare(valueFor(sorting, a) ?? '', valueFor(sorting, b) ?? '') * sort.direction) : rows
  const last = Math.max(0, Math.ceil(ordered.length / pageSize) - 1)
  const page = Math.min(requestedPage, last)
  const first = page * pageSize
  const end = Math.min(ordered.length, first + pageSize)

  function changeSort(key) {
    setSort({ key, direction: key === sort?.key ? -sort.direction : 1 })
    setPage(0)
  }

  return <section className="card">
    {toolbar && <div className="toolbar">{toolbar}</div>}
    <Table columns={columns} rows={ordered.slice(first, end)} empty={empty} sort={sort} onSort={changeSort} />
    <footer className="table-footer">
      <span aria-live="polite">{ordered.length ? (first + 1) + '–' + end + ' of ' + ordered.length + ' results' : '0 results'}</span>
      <div className="pagination">
        <Button icon="left" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button disabled={page === last} onClick={() => setPage(page + 1)}>Next <Icon name="right" /></Button>
      </div>
    </footer>
  </section>
}

export function DetailHeader({ back, section, title, meta, actions, tabs, tab, tabPath }) {
  return <>
    <div className="breadcrumbs"><Link to={back}>{section}</Link><Icon name="right" size={13} /><span aria-current="page">{title}</span></div>
    <div className="page-heading detail-heading"><div><h1>{title}</h1><div className="heading-meta">{meta}</div></div>{actions}</div>
    <nav className="tabs" aria-label={section + ' detail sections'}>
      {tabs.map(([key, label]) => <Link key={key} to={tabPath(key)} aria-current={tab === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
  </>
}

export function Definition({ entries }) {
  return <dl className="definition">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
}

