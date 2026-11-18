import { useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { initials, number } from './model.js'

export function AccountLink({ to, ...props }) {
  const { search } = useLocation()
  return <Link to={to + search} {...props} />
}

export function PageHead({ title, children, action }) {
  return <div className="page-head">
    <div><h1>{title}</h1>{children && <p className="lead">{children}</p>}</div>
    {action}
  </div>
}

export function Progress({ value, target, unit }) {
  const current = number(value)
  const total = number(target)
  const fill = total > 0 ? Math.max(0, Math.min(100, current / total * 100)) : 0
  return <div className="progress">
    <div className="progress-label"><strong>{current.toLocaleString()}</strong> / {total.toLocaleString()} {unit}</div>
    <div className="progress-track" aria-hidden="true"><span style={{ width: fill + '%' }} /></div>
  </div>
}

export function Badge({ tone = '', children }) {
  return <span className={'badge ' + tone}>{children}</span>
}

export function Avatar({ name, tone = '' }) {
  return <span className={'avatar ' + tone} aria-hidden="true">{initials(name)}</span>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Modal({ title, onClose, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => {
    event.preventDefault()
    onClose()
  }}>
    <h2 id={titleId}>{title}</h2>
    {children}
  </dialog>
}
