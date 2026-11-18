import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppLink } from './navigation.jsx'

export function Breadcrumbs({ items }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    {items.map(({ label, to }, index) => <span key={index}>
      {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
      {to ? <AppLink to={to}>{label}</AppLink> : <span aria-current="page">{label}</span>}
    </span>)}
  </nav>
}

export function PageHeading({ title, icon: Icon, action }) {
  return <div className="page-heading">
    <h1>{Icon && <Icon aria-hidden="true" />} {title}</h1>
    {action && <div className="actions">{action}</div>}
  </div>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Unavailable({ title = 'This page is unavailable', to = '/', label = 'Back to Home' }) {
  return <section className="card unavailable"><h1>{title}</h1><AppLink to={to}>{label}</AppLink></section>
}

export function ActionMenu({ label, children }) {
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    container.current?.querySelector('.menu-panel button, .menu-panel a')?.focus()
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return <div className="menu" ref={container} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
  }}>
    <button ref={trigger} type="button" className="icon-button" aria-label={label} aria-expanded={open}
      onClick={() => setOpen(!open)}><MoreHorizontal size={20} /></button>
    {open && <div className="menu-panel" onClick={(event) => {
      if (event.target.closest('button, a')) {
        trigger.current?.focus()
        setOpen(false)
      }
    }}>{children}</div>}
  </div>
}

export function Dialog({ title, children, onClose }) {
  const ref = useRef(null)
  const heading = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    heading.current?.focus()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }}>
    <h2 ref={heading} tabIndex={-1}>{title}</h2>
    {children}
  </dialog>
}

export function TrashDialog({ title, description = 'You can restore it from the project trash.', onClose, onConfirm }) {
  return <Dialog title={`Put “${title}” in the trash?`} onClose={onClose}>
    <p>{description}</p>
    <div className="actions">
      <button type="button" className="button danger" onClick={onConfirm}>Put in the trash</button>
      <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
    </div>
  </Dialog>
}

export const FieldError = ({ children }) => children ? <span className="field-error" role="alert">{children}</span> : null
