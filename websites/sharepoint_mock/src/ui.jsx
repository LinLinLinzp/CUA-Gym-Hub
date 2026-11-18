import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'

export function AppLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function useDetail(name) {
  const { pathname, search } = useLocation()
  const navigate = useAppNavigate()
  const params = new URLSearchParams(search)
  const id = params.get(name)
  return [id, (value) => {
    params.delete('sid')
    if (value) params.set(name, value)
    else params.delete(name)
    const query = params.toString()
    navigate(query ? pathname + '?' + query : pathname, { replace: true })
  }]
}

export function Modal({ title, children, onClose, panel = false }) {
  const ref = useRef(null)
  const name = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} className={panel ? 'panel' : ''} aria-labelledby={name}
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header className="modal-heading">
      <h2 id={name}>{title}</h2>
      <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button>
    </header>
    {children}
  </dialog>
}

export function Field({ label, children, error }) {
  const id = useId()
  const errorId = id + '-error'
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-describedby': error ? errorId : undefined })}
    {error && <span id={errorId} className="error" role="alert">{error}</span>}
  </div>
}

export function FormActions({ onClose, action = 'Save', danger = false }) {
  return <footer className="form-actions">
    <button type="button" onClick={onClose}>Cancel</button>
    <button className={danger ? 'danger' : 'primary'} type="submit">{action}</button>
  </footer>
}

export function FilterInput({ label, value, setValue }) {
  return <label className="filter-input">
    <Search size={17} aria-hidden="true" />
    <input aria-label={label} placeholder={label} value={value} onChange={(event) => setValue(event.target.value)} />
  </label>
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <div>{children}</div>}</div>
}

export function Breadcrumb({ links }) {
  return <nav className="crumbs" aria-label="Breadcrumb">
    {links.map(({ name, to }, index) => <span key={to || index}>
      {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
      {to ? <AppLink to={to}>{name}</AppLink> : <span aria-current="page">{name}</span>}
    </span>)}
  </nav>
}

export function usePaging(records, resetKey, size = 24) {
  const [paging, setPaging] = useState({ page: 1, resetKey })
  const total = Math.max(1, Math.ceil(records.length / size))
  const page = Math.min(paging.resetKey === resetKey ? paging.page : 1, total)
  return {
    rows: records.slice((page - 1) * size, page * size),
    controls: total > 1 && <nav className="paging" aria-label="Pagination">
      <button aria-label="Previous page" disabled={page <= 1} onClick={() => setPaging({ page: page - 1, resetKey })}><ChevronLeft size={16} /></button>
      <span>Page {page} of {total} · {records.length} records</span>
      <button aria-label="Next page" disabled={page >= total} onClick={() => setPaging({ page: page + 1, resetKey })}><ChevronRight size={16} /></button>
    </nav>,
  }
}

export function SortHeader({ name, field, sort, setSort }) {
  const active = sort.field === field
  const direction = active ? (sort.desc ? 'descending' : 'ascending') : undefined
  return <th scope="col" aria-sort={direction}>
    <button type="button" className="sort-button" onClick={() => setSort({ field, desc: active && !sort.desc })}>
      {name}<span aria-hidden="true">{active ? (sort.desc ? '↓' : '↑') : '↕'}</span>
    </button>
  </th>
}

export function ConfirmDelete({ title, description, onClose, onConfirm }) {
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm(); onClose() }}>
      <p>{description}</p>
      <FormActions action="Delete" onClose={onClose} danger />
    </form>
  </Modal>
}

export function RowMenu({ label, actions }) {
  const button = useRef(null)
  const menu = useRef(null)
  const menuId = useId()
  function open() {
    const bounds = button.current.getBoundingClientRect()
    const popup = menu.current
    popup.showPopover()
    popup.style.left = Math.max(4, bounds.right - popup.offsetWidth) + 'px'
    popup.style.top = (bounds.bottom + popup.offsetHeight + 4 > window.innerHeight
      ? Math.max(4, bounds.top - popup.offsetHeight - 4)
      : bounds.bottom + 4) + 'px'
    popup.querySelector('button')?.focus()
  }

  return <div className="menu-anchor">
    <button ref={button} type="button" aria-label={label} aria-controls={menuId} popoverTarget={menuId}
      onClick={(event) => {
        event.preventDefault()
        if (menu.current.matches(':popover-open')) menu.current.hidePopover()
        else open()
      }}>⋯</button>
    <div ref={menu} className="menu" id={menuId} popover="auto">{actions.map(([name, action]) =>
      <button type="button" key={name} onClick={() => {
        menu.current.hidePopover()
        button.current.focus()
        action()
      }}>{name}</button>)}</div>
  </div>
}
export function useRows(records, getValue, initialField) {
  const [sort, setSort] = useState({ field: initialField, desc: false })
  const [selected, setSelected] = useState([])
  const rows = [...records].sort((first, second) => {
    const a = getValue(first, sort.field) ?? ''
    const b = getValue(second, sort.field) ?? ''
    const order = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
    return sort.desc ? -order : order
  })
  const toggle = (ids, checked) => setSelected((current) => checked
    ? [...new Set([...current, ...ids])]
    : current.filter((id) => !ids.includes(id)))
  return { rows, sort, setSort, selected, setSelected, toggle }
}
