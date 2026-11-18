import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Circle, Clock3, Inbox, LoaderCircle, X } from 'lucide-react'
import { withSid } from '../utils/dataManager.js'
import { human } from '../utils/model.js'

export const RouteLink = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export const RouteNav = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />
export const Redirect = ({ to }) => <Navigate to={withSid(to)} replace />
export function useGo() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function useQuery() {
  const [params, setParams] = useSearchParams()
  return [params, (values, options) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, options)
  }]
}

export function Button({ variant = 'secondary', to, className = '', type = 'button', ...props }) {
  const classes = `button ${variant} ${className}`
  return to ? <RouteLink to={to} className={classes} {...props} /> : <button type={type} className={classes} {...props} />
}

export function PageHeading({ title, children, meta }) {
  return <div className="page-heading"><div><h1>{title}</h1>{meta && <div className="heading-meta">{meta}</div>}</div><div className="actions">{children}</div></div>
}

export function Empty({ title, children, icon: Icon = Inbox }) {
  return <div className="empty"><span className="empty-icon"><Icon size={24} /></span><h2>{title}</h2>{children}</div>
}

export function Avatar({ user, size = 24 }) {
  const name = user?.name || 'Unknown user'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  const background = /^#[\da-f]{6}$/i.test(user?.avatarColor || '') ? user.avatarColor : '#435d83'
  return <span className="avatar" title={name} aria-label={name} style={{ width: size, height: size, background }}>{initials}</span>
}

const statuses = {
  successful: ['success', Check], approved: ['success', Check], merged: ['success', Check], completed: ['success', Check],
  failed: ['danger', X], declined: ['danger', X], changes_requested: ['warning', AlertCircle, 'Changes requested'],
  pending: ['warning', Clock3], in_progress: ['running', LoaderCircle, 'In progress'], open: ['running', Circle],
  stopped: ['neutral', Circle], skipped: ['neutral', Circle], unreviewed: ['neutral', Circle],
}

export function Status({ value }) {
  const [kind, Icon, label] = statuses[value] || ['neutral', null]
  return <span className={`pill ${kind}`}>{Icon && <Icon size={12} />}{label || human(value)}</span>
}

export function Table({ columns, children, label }) {
  return <div className="panel table-wrap"><table aria-label={label}><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

export function usePage(records, identity = '') {
  const [selection, setSelection] = useState({ identity, page: 1 })
  const pages = Math.max(1, Math.ceil(records.length / 20))
  const page = selection.identity === identity ? Math.min(selection.page, pages) : 1
  return {
    rows: records.slice((page - 1) * 20, page * 20),
    controls: pages > 1 && <nav className="pagination" aria-label="Pagination">
      <Button disabled={page <= 1} onClick={() => setSelection({ identity, page: page - 1 })} aria-label="Previous page"><ChevronLeft size={16} /></Button>
      <span>Page {page} of {pages} · {records.length} results</span>
      <Button disabled={page >= pages} onClick={() => setSelection({ identity, page: page + 1 })} aria-label="Next page"><ChevronRight size={16} /></Button>
    </nav>,
  }
}

export function Field({ label, hint, error, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="error">{error}</small>}</label>
}

export function ErrorText({ children }) {
  return children ? <p className="error form-error" role="alert"><AlertCircle size={16} />{children}</p> : null
}

export function Modal({ title, children, onClose }) {
  const dialog = useRef(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (trigger?.isConnected && trigger instanceof HTMLElement) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="modal-heading"><h2 id={id}>{title}</h2><Button variant="quiet" aria-label="Close dialog" onClick={onClose}><X size={19} /></Button></div>
    {children}
  </dialog>
}

export function FormActions({ onClose, label, danger, disabled }) {
  return <div className="form-actions">{onClose && <Button onClick={onClose}>Cancel</Button>}<Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={disabled}>{label}</Button></div>
}

export function useShortcut(handler) {
  useEffect(() => {
    function keydown(event) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey ||
        document.querySelector('dialog[open]') || event.target instanceof HTMLElement &&
        (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return
      handler(event)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [handler])
}

export function Tabs({ items, current, onSelect, label }) {
  const tabs = useRef([])
  return <div className="tabs" role="tablist" aria-label={label} onKeyDown={event => {
    const index = items.findIndex(item => item.id === current)
    const offsets = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = (offsets[event.key] + items.length) % items.length
    onSelect(items[next].id)
    tabs.current[next]?.focus()
  }}>{items.map(({ id, label: text }, index) => <button key={id} id={`tab-${id}`} role="tab" type="button" aria-selected={id === current} tabIndex={id === current ? 0 : -1} ref={node => { tabs.current[index] = node }} onClick={() => onSelect(id)}>{text}</button>)}</div>
}
