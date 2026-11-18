import { useEffect, useId, useRef } from 'react'
import { Link, NavLink, parsePath, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'

function workspaceDestination(to, search) {
  return search ? { ...parsePath(to), search } : withSid(to)
}

export function WorkspaceLink({ to, tab, ...props }) {
  const { search } = useLocation()
  const Component = tab ? NavLink : Link
  return <Component to={workspaceDestination(to, search)} {...props} />
}

export function useWorkspaceNavigate() {
  const { search } = useLocation()
  const navigate = useNavigate()
  return (to) => navigate(workspaceDestination(to, search))
}

export function Icon({ name, size = 18 }) {
  const paths = {
    grid: 'M3.5 3.5h6v6h-6z M14.5 3.5h6v6h-6z M3.5 14.5h6v6h-6z M14.5 14.5h6v6h-6z',
    search: 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Zm-1.8 4.7L21 21',
    plus: 'M12 5v14M5 12h14',
    chevron: 'm9 5 7 7-7 7',
    close: 'm6 6 12 12M18 6 6 18',
    box: 'm3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4M12 11v10',
    check: 'm5 12 4 4L19 6',
    layers: 'm3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5',
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>
}

export const titleCase = (value) => value
  ? String(value).replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase()) : '—'

export function Badge({ status }) {
  const tone = {
    active: 'success', running: 'success', provisioned: 'success', succeeded: 'success',
    maintenance: 'warning', pending: 'warning', failed: 'danger',
  }[status] ?? 'neutral'
  return <span className={'badge ' + tone}><span aria-hidden="true" />{titleCase(status)}</span>
}

export function DateLabel({ value }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return <time dateTime={value} title={date.toISOString()}>
    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)}
  </time>
}

export const money = (amount) => Number.isFinite(amount)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'

export function Panel({ title, caption, action, children }) {
  return <section className="panel">
    {title && <div className="panel-heading">
      <div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{action}
    </div>}
    {children}
  </section>
}

export function Table({ label, columns, children }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label + ' table'}>
    <table aria-label={label}>
      <thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
}

export function Empty({ title, children }) {
  return <div className="empty">
    <span className="empty-icon"><Icon name="box" /></span>
    <h3>{title}</h3>{children && <p>{children}</p>}
  </div>
}

export function Modal({ title, description, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  const descId = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    dialog.querySelector('input, select, textarea')?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={titleId}
    aria-describedby={description ? descId : undefined}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
        event.preventDefault()
        onClose()
      }
    }}
    onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="modal-header">
      <h2 id={titleId}>{title}</h2>
      <button className="button icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
    </div>
    {description && <p className="modal-description" id={descId}>{description}</p>}
    {children}
  </dialog>
}

export function FormError({ error, id }) {
  return error ? <p className="form-error" role="alert" id={id}>{error}</p> : null
}

export function DialogActions({ onClose, submit, danger, disabled }) {
  return <div className="dialog-actions">
    <button type="button" className="button" onClick={onClose}>Cancel</button>
    <button className={'button ' + (danger ? 'danger-fill' : 'primary')} type="submit" disabled={disabled}>{submit}</button>
  </div>
}
