import React, { useEffect, useId, useRef } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { withSid } from '../utils/dataManager.js'

export function AppLink({ to, ...props }) { return <Link to={withSid(to)} {...props} /> }
export function AppTab({ to, ...props }) { return <NavLink to={withSid(to)} {...props} /> }
export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }) {
  return <button type={type} {...props} className={'button ' + variant + ' ' + className} />
}

export function IconButton({ label, children, ...props }) {
  return <Button variant="icon" title={label} aria-label={label} {...props}>{children}</Button>
}

export function Menu({ label, title, children, floating, className = '' }) {
  const ref = useRef(null)
  const [open, setOpen] = React.useState(false)
  useEffect(() => {
    if (!open) return
    function dismiss(event) {
      if (!ref.current?.open) return
      if (event.type === 'keydown' && event.key === 'Escape') {
        ref.current.open = false
        ref.current.querySelector('summary').focus()
      }
      if (event.type === 'pointerdown' && !ref.current.contains(event.target)) ref.current.open = false
    }
    function closeOnScroll(event) {
      if (floating && ref.current?.open && !ref.current.contains(event.target)) ref.current.open = false
    }
    document.addEventListener('scroll', closeOnScroll, true)
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => {
      document.removeEventListener('scroll', closeOnScroll, true)
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [floating, open])
  function positionPopover(event) {
    setOpen(event.currentTarget.open)
    if (!floating || !event.currentTarget.open) return
    const trigger = event.currentTarget.querySelector('summary').getBoundingClientRect()
    const popup = event.currentTarget.querySelector('.menu-popover')
    popup.style.left = Math.max(6, Math.min(trigger.left, window.innerWidth - popup.offsetWidth - 8)) + 'px'
    popup.style.top = (trigger.bottom + popup.offsetHeight + 6 > window.innerHeight ? Math.max(6, trigger.top - popup.offsetHeight - 4) : trigger.bottom + 4) + 'px'
  }
  return <details onToggle={positionPopover} className={'menu ' + (floating ? 'floating-menu ' : '') + className} ref={ref}>
    <summary aria-label={title} title={title}>{label}</summary>
    <div className="menu-popover" onClick={event => {
      if (event.target.closest('button, a')) {
        ref.current.open = false
        ref.current.querySelector('summary').focus()
      }
    }}>{children}</div>
  </details>
}

export function MenuLabel({ children }) {
  return <>{children}<ChevronDown size={14} /></>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-title"><h2 id={titleId}>{title}</h2><IconButton label="Close" onClick={onClose}><X size={18} /></IconButton></div>
    <div className="dialog-body">{children}</div>
  </dialog>
}

export function Empty({ title, children, icon: Icon }) {
  return <div className="empty">{Icon && <span className="empty-icon"><Icon size={24} /></span>}<h3>{title}</h3>{children}</div>
}

export function Status({ value }) {
  return <span className={'status status-' + (value || 'unknown').toLowerCase().replaceAll(' ', '-')}>{value ? value[0].toUpperCase() + value.slice(1) : 'Unknown'}</span>
}

export function Problem({ message, id }) {
  return message ? <p className="problem" id={id} role="alert">{message}</p> : null
}

export function formatUpdate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '—'
  const date = new Date(value)
  if (date.toDateString() === new Date().toDateString()) return 'Today'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}
