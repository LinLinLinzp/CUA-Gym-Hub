import React, { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from './utils/dataManager.js'
import { find, initials, list, useStore } from './store.jsx'

const paths = {
  incidents: 'M12 8v5m0 4h.01M10.3 4.9 3.4 17a1.9 1.9 0 0 0 1.7 2.9h13.8a1.9 1.9 0 0 0 1.7-2.9L13.7 4.9a2 2 0 0 0-3.4 0Z',
  schedules: 'M8 3v4m8-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h2m4 0h2m-8 4h2',
  policies: 'M12 8v4M6 16v-4h12v4M9 4h6v4H9zM3 16h6v4H3zm12 0h6v4h-6z',
  search: 'M21 21l-4.4-4.4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  plus: 'M12 5v14M5 12h14', arrow: 'M9 6l6 6-6 6', menu: 'M4 6h16M4 12h16M4 18h16',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 7v5l3 2',
  check: 'm5 12 4 4L19 6', x: 'm6 6 12 12M18 6 6 18',
}
export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function useScoped() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const sid = params.get('sid') || getSessionId()
  return to => {
    const [path, hash] = to.split('#')
    const [base, query] = path.split('?')
    const next = new URLSearchParams(query)
    if (sid) next.set('sid', sid)
    return base + (next.size ? '?' + next : '') + (hash ? '#' + hash : '')
  }
}
export function GoLink({ to, ...props }) { const scoped = useScoped(); return <Link to={scoped(to)} {...props} /> }
export function Redirect({ to }) { const scoped = useScoped(); return <Navigate to={scoped(to)} replace /> }
export function useGo() { const scoped = useScoped(); const navigate = useNavigate(); return to => navigate(scoped(to)) }
const areas = [
  { name: 'Incidents', to: '/incidents', icon: 'incidents' },
  { name: 'On-Call Schedules', to: '/schedules', icon: 'schedules' },
  { name: 'Escalation Policies', to: '/escalation-policies', icon: 'policies' },
]
export function Shell({ children }) {
  const { pathname } = useLocation()
  const { state, notice, clearNotice } = useStore()
  const scoped = useScoped()
  const [expanded, setExpanded] = useState(false)
  const area = areas.find(item => pathname === item.to || pathname.startsWith(item.to + '/'))
  const slug = pathname.split('/')[2]
  const collection = area && { '/incidents': state.incidents, '/schedules': state.schedules, '/escalation-policies': state.escalationPolicies }[area.to]
  const record = find(collection, decodeURIComponentSafely(slug))
  const crumb = slug === 'new' ? 'New' : slug === 'activity' ? 'Activity' : slug === 'compare' ? 'Compare' : record?.name || (record?.number != null ? '#' + record.number : slug ? 'Details' : '')
  const person = find(state.users, state.account?.currentUserId)
  useEffect(() => { setExpanded(false); window.scrollTo(0, 0) }, [pathname])
  return <div className="workspace">
    <a className="skip" href="#content">Skip to content</a>
    <aside className="sidebar">
      <div className="sidebar-top">
        <GoLink to="/incidents" className="brand"><span>PagerDuty</span><small>{state.account?.name || 'Workspace'}</small></GoLink>
        <button className="mobile-menu" type="button" aria-expanded={expanded} aria-controls="main-nav" onClick={() => setExpanded(!expanded)}><Icon name="menu" /> Menu</button>
      </div>
      <nav id="main-nav" className={expanded ? 'expanded' : ''} aria-label="Main navigation">
        {areas.map(item => <NavLink key={item.to} to={scoped(item.to)}><Icon name={item.icon} />{item.name}</NavLink>)}
      </nav>
      <div className="account"><span className="avatar">{initials(person?.name)}</span><div><strong>{person?.name || 'Current responder'}</strong><small>{person?.role || 'Responder'}</small></div></div>
    </aside>
    <div className="main">
      <header className="topbar"><nav aria-label="Breadcrumb"><span>{state.account?.name || 'Workspace'}</span>{area && <><Icon name="arrow" size={13} /><GoLink to={area.to}>{area.name}</GoLink></>}{crumb && <><Icon name="arrow" size={13} /><span className="crumb">{crumb}</span></>}{pathname.endsWith('/edit') && <><Icon name="arrow" size={13} /><span>Edit</span></>}</nav>
      <span className="zone"><Icon name="clock" size={15} />{record?.timeZone || state.account?.timeZone || 'UTC'}</span></header>
      <main className="content" id="content">{children}</main>
    </div>
    {notice && <div className="notice" role="status"><Icon name="check" />{notice}<button aria-label="Dismiss message" onClick={clearNotice}><Icon name="x" size={15} /></button></div>}
  </div>
}
function decodeURIComponentSafely(value) {
  try { return decodeURIComponent(value) } catch { return value }
}
export function Heading({ title, description, actions, children }) {
  return <header className="heading"><div><h1>{title}</h1>{description && <p>{description}</p>}{children}</div>{actions && <div className="actions">{actions}</div>}</header>
}
export function ActionLink({ to, children, primary = false, add = false }) {
  return <GoLink to={to} className={'button' + (primary ? ' primary' : '')}>{add && <Icon name="plus" size={16} />}{children}</GoLink>
}
export function Empty({ title, description, children }) {
  return <div className="empty"><strong>{title}</strong>{description && <p>{description}</p>}{children}</div>
}
export function Missing({ to = '/incidents', title = 'Page unavailable' }) {
  return <><Heading title={title} /><div className="surface"><Empty title="This page could not be found" description="Return to the list to continue."><ActionLink to={to}>Back to list</ActionLink></Empty></div></>
}
export function Search({ value, onChange, label, placeholder }) {
  return <label className="search"><Icon name="search" size={17} /><input aria-label={label} placeholder={placeholder || label} value={value} onChange={e => onChange(e.target.value)} /></label>
}
export function Field({ label, error, children }) {
  const id = React.useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id + '-error' : undefined })}
    {error && <small className="error" id={id + '-error'}>{error}</small>}
  </div>
}
export function Options({ items, placeholder = 'Select…' }) {
  return <><option value="">{placeholder}</option>{list(items).map(item => <option key={item.id} value={item.id}>{item.name || 'Unnamed'}</option>)}</>
}
export function FormError({ children }) { return children ? <p className="error callout" role="alert">{children}</p> : null }
export function Dialog({ title, onClose, children }) {
  const ref = useRef()
  const id = React.useId()
  useEffect(() => {
    const dialog = ref.current
    const last = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); if (last?.isConnected) last.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); onClose() }}>
    <header className="dialog-head"><h2 id={id}>{title}</h2><button type="button" aria-label="Close dialog" className="icon-button" onClick={onClose}><Icon name="x" /></button></header>{children}
  </dialog>
}
export function Confirm({ title, onClose, onConfirm, children, action, danger = false, disabled = false }) {
  const [error, setError] = useState('')
  return <Dialog title={title} onClose={onClose}><div className="dialog-body">{children}<FormError>{error}</FormError></div><div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button type="button" className={danger ? 'danger' : 'primary'} disabled={disabled} onClick={() => { const result = onConfirm(); if (result) setError(result); else onClose() }}>{action}</button></div></Dialog>
}
export function Badge({ value, children }) {
  return <span className={'badge ' + (value || '')}>{children || value || '—'}</span>
}
export function Move({ index, total, onMove, label }) {
  return <div className="move">
    <button type="button" disabled={index === 0} aria-label={'Move up ' + label} onClick={() => onMove(index, -1)}>↑</button>
    <button type="button" disabled={index === total - 1} aria-label={'Move down ' + label} onClick={() => onMove(index, 1)}>↓</button>
  </div>
}
export function move(items, index, offset) {
  const next = [...items]
  const other = index + offset
  if (other >= 0 && other < next.length) [next[index], next[other]] = [next[other], next[index]]
  return next
}
export function Pager({ page, setPage, total, pageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return total > 0 && <div className="pagination"><span>{page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total}</span><div><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
}
export function targetText(state, target) {
  if (!target?.id) return 'Unavailable target'
  const item = find(target.type === 'schedule' ? state.schedules : state.users, target.id)
  return item?.name || (target.type === 'schedule' ? 'Unavailable schedule' : 'Unavailable user')
}
export function Target({ target }) {
  const { state } = useStore()
  const name = targetText(state, target)
  return <span className="target-chip"><Icon name={target?.type === 'schedule' ? 'schedules' : 'policies'} size={14} />{target?.type === 'schedule' && find(state.schedules, target.id) ? <GoLink to={'/schedules/' + encodeURIComponent(target.id)}>{name}</GoLink> : name}</span>
}
export function EntityLinks({ items, base, empty = '—' }) {
  return list(items).length ? <div className="link-list">{items.map(item => <GoLink key={item.id} to={base + '/' + encodeURIComponent(item.id)}>{item.name || 'Unnamed'}</GoLink>)}</div> : empty
}

