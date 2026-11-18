import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'
import { byId, labels } from './utils/model'

const icons = {
  zaps: 'M13 2 4 14h7l-1 8 10-12h-7l1-8Z',
  history: 'M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v5l3 2',
  connections: 'm9 15 6-6m-8 4-2 2a3.5 3.5 0 0 0 5 5l3-3m-2-10 3-3a3.5 3.5 0 0 1 5 5l-2 2',
  search: 'm16 16 4 4m-2-9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  plus: 'M12 5v14M5 12h14',
  back: 'm11 6-6 6 6 6m-6-6h14',
  right: 'm9 6 6 6-6 6',
  more: 'M5 12h.01m7 0h.01m7 0h.01',
  close: 'm6 6 12 12m0-12L6 18',
  folder: 'M3 7h7l2 2h9v10H3Z',
  grid: 'M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z',
}

export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3.5 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>
}

export function SiteLink({ to, active = false, ...props }) {
  const Component = active ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function PageTitle({ title, description, children }) {
  return <header className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</header>
}

export const Badge = ({ status }) => <span className={'badge ' + (status || 'unknown')}><span aria-hidden="true" />{labels[status] || status || 'Unknown'}</span>

export function AppMark({ app }) {
  return <span className="app-mark" style={{ '--app-color': app?.color || '#5a6883' }} aria-hidden="true">{app?.initials || app?.name?.slice(0, 2).toUpperCase() || '?'}</span>
}

export function AppLine({ state, steps }) {
  const apps = steps.map((step) => step.appId).filter(Boolean).map((id) => byId(state.apps, id))
  if (!apps.length) return <span className="muted">No apps configured</span>
  return <div className="app-line">{apps.map((app, index) => <span className="app-token" key={index}><AppMark app={app} /><span>{app?.name || 'Unavailable app'}</span></span>)}</div>
}

export function Search({ label, value, onChange, placeholder }) {
  return <div className="search"><Icon name="search" /><input type="search" aria-label={label} placeholder={placeholder || label} value={value} onChange={(e) => onChange(e.target.value)} />{value && <button type="button" className="icon-button clear-search" aria-label={'Clear ' + label.toLowerCase()} onClick={() => onChange('')}><Icon name="close" size={14} /></button>}</div>
}

export function Filter({ label, value, onChange, options, first }) {
  return <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
    {first && <option value="">{first}</option>}
    {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
  </select>
}

export function Empty({ title, children }) {
  return <div className="empty"><div className="empty-icon"><Icon name="grid" size={22} /></div><h2>{title}</h2>{children && <p>{children}</p>}</div>
}

export function Missing({ type, back, to }) {
  return <><SiteLink className="back-link" to={to}><Icon name="back" />{back}</SiteLink><div className="panel"><Empty title={type + ' unavailable'}>This record may have been removed or is unavailable in this workspace.</Empty></div></>
}

export function RowMenu({ label, actions }) {
  const button = useRef(null)
  const [position, setPosition] = useState(null)
  function close(restore) {
    setPosition(null)
    if (restore) button.current.focus()
  }
  return <div className="row-menu" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && position) close(true)
  }}>
    <button ref={button} type="button" className="icon-button" aria-label={label} aria-expanded={Boolean(position)} onClick={(event) => {
      if (position) return close(false)
      const bounds = event.currentTarget.getBoundingClientRect()
      const height = actions.length * 34 + 12
      setPosition({
        top: bounds.bottom + height < window.innerHeight ? bounds.bottom + 2 : Math.max(4, bounds.top - height - 2),
        right: Math.max(4, Math.min(window.innerWidth - 168, window.innerWidth - bounds.right)),
      })
    }}><Icon name="more" /></button>
    {position && <div className="menu-card" style={position}>{actions.map(([name, action, danger]) => <button key={name} className={danger ? 'danger-text' : ''} type="button" onClick={() => {
      close(true)
      action()
    }}>{name}</button>)}</div>}
  </div>
}
export function Dialog({ title, children, onClose, action, onSubmit, danger = false, alert }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <form onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
      <div className="dialog-head"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      <div className="dialog-body">{children}{alert && <p role="alert" className="alert">{alert}</p>}</div>
      <div className="dialog-actions"><button type="button" onClick={onClose}>{action ? 'Cancel' : 'Close'}</button>{action && <button className={danger ? 'danger' : 'primary'} type="submit">{action}</button>}</div>
    </form>
  </dialog>
}

export function usePage(list, size = 10) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(page, pages)
  const start = (current - 1) * size
  return { rows: list.slice(start, start + size), current, pages, start, size, total: list.length, setPage }
}

export function Pagination({ page, label }) {
  if (!page.total) return null
  return <footer className="table-footer"><span>{page.start + 1}–{Math.min(page.start + page.size, page.total)} of {page.total} {label}</span><div className="pager">
    <button type="button" disabled={page.current <= 1} onClick={() => page.setPage(page.current - 1)} aria-label="Previous page"><Icon name="back" size={16} /></button>
    <span>Page {page.current} of {page.pages}</span>
    <button type="button" disabled={page.current >= page.pages} onClick={() => page.setPage(page.current + 1)} aria-label="Next page"><Icon name="right" size={16} /></button>
  </div></footer>
}

export const Payload = ({ value }) => <pre>{value == null ? '—' : JSON.stringify(value, null, 2)}</pre>
