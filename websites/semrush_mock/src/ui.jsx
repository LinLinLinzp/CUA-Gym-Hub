import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { useWorkspace } from './store.jsx'
import { numberLabel, textSort } from './model.js'

export function AppLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  function go(path, query = {}, options) {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value != null && value !== '') next.set(key, value)
    navigate(withSid(path + (next.size ? '?' + next : '')), options)
  }
  return { params, go }
}

export function Layout({ children }) {
  const { account } = useWorkspace()
  const { pathname } = useLocation()
  const active = pathname.split('/').includes('site-audit') ? 'site-audit'
    : pathname.split('/').includes('position-tracking') ? 'position-tracking' : 'projects'
  const initials = account.name?.split(/\s+/).slice(0, 2).map(name => name[0]).join('') || 'MC'
  return <>
    <a className="skip" href="#content">Skip to content</a>
    <header className="masthead">
      <div className="mast-inner">
        <AppLink className="brand" aria-label="Semrush Projects" to="/projects"><i aria-hidden="true" />Semrush</AppLink>
        <nav aria-label="Workspace">
          {[['projects', 'Projects'], ['position-tracking', 'Position Tracking'], ['site-audit', 'Site Audit']].map(([path, label]) =>
            <AppLink key={path} to={'/' + path} aria-current={active === path ? 'page' : undefined}>{label}</AppLink>)}
        </nav>
        <div className="account"><span className="avatar" aria-hidden="true">{initials}</span><span>{account.name}</span></div>
      </div>
    </header>
    <main id="content" className="main">{children}</main>
  </>
}

export function Intro({ title, subtitle, children }) {
  return <div className="intro">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children && <div className="actions">{children}</div>}
  </div>
}

export function Breadcrumb({ items }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb">
    {items.map(([label, path], i) => <span key={i}>
      {i > 0 && <span className="crumb-sep" aria-hidden="true">/</span>}
      {path ? <AppLink to={path}>{label}</AppLink> : <span aria-current="page">{label}</span>}
    </span>)}
  </nav>
}

export function Empty({ title, children, action }) {
  return <div className="empty"><span className="empty-mark" aria-hidden="true" /><h2>{title}</h2>{children && <p>{children}</p>}{action}</div>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className="dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header>
    {children}
  </dialog>
}

export function FormActions({ onClose, submit, danger = false, secondary, children }) {
  return <footer className="form-actions">
    {children}
    <button type="button" className="button" onClick={onClose}>{secondary || 'Cancel'}</button>
    <button className={'button ' + (danger ? 'danger' : 'primary')} type="submit">{submit}</button>
  </footer>
}

export function ErrorText({ message, id }) {
  return message ? <p className="error-text" role="alert" id={id}>{message}</p> : null
}

export function Tags({ items }) {
  return items.length ? <div className="tags">{items.map((item, i) => <span className="tag" key={i}>{item}</span>)}</div> : <span className="muted">—</span>
}

export function Metric({ label, value, suffix, children }) {
  return <div className="metric"><div className="metric-label">{label}</div>
    <strong aria-label={value == null ? 'Unavailable' : undefined}>{numberLabel(value, suffix)}</strong>{children}
  </div>
}

export function Table({ children, label }) {
  return <div className="table-scroll"><table aria-label={label}>{children}</table></div>
}

export function usePager(items, size = 15) {
  const [requested, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const page = Math.min(requested, pages)
  const offset = (page - 1) * size
  return { rows: items.slice(offset, offset + size), page, pages, offset, total: items.length, size, setPage }
}

export function Pager({ pager, noun = 'results' }) {
  const { offset, total, size, page, pages, setPage } = pager
  return <div className="pager">
    <span>{total ? (offset + 1) + '–' + Math.min(total, offset + size) + ' of ' + total : '0'} {noun}</span>
    {pages > 1 && <div className="actions" aria-label="Pagination">
      <button type="button" className="button small" aria-label="Previous page" onClick={() => setPage(page - 1)} disabled={page === 1}>‹</button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="button small" aria-label="Next page" onClick={() => setPage(page + 1)} disabled={page === pages}>›</button>
    </div>}
  </div>
}

export function useSort(key, direction = 'asc') {
  const [sort, setSort] = useState({ key, direction })
  function change(next) {
    setSort(previous => ({ key: next, direction: previous.key === next && previous.direction === 'asc' ? 'desc' : 'asc' }))
  }
  function compare(a, b) {
    if (a == null || b == null) return Number(a == null) - Number(b == null)
    return (typeof a === 'number' && typeof b === 'number' ? a - b : textSort(a, b)) * (sort.direction === 'asc' ? 1 : -1)
  }
  return { ...sort, change, compare }
}

export function SortHead({ sort, field, children, onChange }) {
  const active = sort.key === field
  return <th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="sort" onClick={() => { sort.change(field); onChange?.() }}>{children}<span aria-hidden="true">{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
  </th>
}

