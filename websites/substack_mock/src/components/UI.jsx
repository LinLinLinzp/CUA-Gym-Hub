import { useEffect, useId, useRef, useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AppLink } from './Shell.jsx'

export function Empty({ title, action, to, onAction }) {
  return <div className="empty-state">
    <h2>{title}</h2>
    {action && (to ? <AppLink className="button" to={to}>{action}</AppLink> : <button className="button" onClick={onAction}>{action}</button>)}
  </div>
}

export function Missing({ title = 'Page not found', to = '/publish', action = 'Back to Home' }) {
  return <div className="page"><Empty title={title} to={to} action={action} /></div>
}

export function Tabs({ items, value, onChange, label }) {
  return <div className="tabs" role="group" aria-label={label}>
    {items.map(([id, text, count]) => <button type="button" className="tab" key={id} aria-pressed={id === value} onClick={() => onChange(id)}>
      {text} {count != null && <span>{count}</span>}
    </button>)}
  </div>
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Modal({ title, children, footer, onClose, wide = false, side = false }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className={`modal ${side ? 'modal-side' : wide ? 'modal-wide' : ''}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal-layout">
      <header className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button close-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </div>
  </dialog>
}

export function Confirm({ title, children, label, onConfirm, onClose, danger = false }) {
  return <Modal title={title} onClose={onClose} footer={<>
    <button className="button" type="button" onClick={onClose}>Cancel</button>
    <button className={`button primary ${danger ? 'danger-button' : ''}`} type="button" onClick={onConfirm}>{label}</button>
  </>}>{children}</Modal>
}

export function ActionMenu({ children, label = 'More actions', trigger, align = 'right' }) {
  const ref = useRef(null)
  const button = useRef(null)
  const [position, setPosition] = useState(null)
  const [open, setOpen] = useState(false)
  const expanded = open && position !== null
  useEffect(() => {
    if (!open) return
    const dismiss = event => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus() }
    }
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])
  function toggle() {
    const rect = button.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(window.innerWidth - 220, align === 'right' ? rect.right - 210 : rect.left))
    setPosition(rect.bottom > window.innerHeight - 235
      ? { left, bottom: window.innerHeight - rect.top + 4 }
      : { left, top: rect.bottom + 4 })
    setOpen(!open)
  }
  function select(event) {
    if (event.target.closest('button, a')) {
      button.current?.focus({ preventScroll: true })
      setOpen(false)
    }
  }
  return <div className="action-menu" ref={ref}>
    <button type="button" ref={button} className={trigger ? 'button' : 'icon-button overflow-button'} aria-label={trigger ? undefined : label}
      aria-expanded={expanded} onClick={toggle}>{trigger || <MoreHorizontal size={19} />}</button>
    {expanded && <div className="menu-panel floating-menu" style={position} onClick={select}>{children}</div>}
  </div>
}

export function Field({ label, hint, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function ScrollOnRoute() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }))
      return () => cancelAnimationFrame(frame)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
