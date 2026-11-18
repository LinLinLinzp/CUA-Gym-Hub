import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Check, Ellipsis, FileText, X } from 'lucide-react'

export function Wordmark() {
  return <span className="wordmark"><span aria-hidden="true" className="word-logo"><i />W</span>Word</span>
}

export function Avatar({ user, small = false }) {
  const name = user?.name || 'Guest'
  const initials = user?.initials || name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  return <span className={small ? 'avatar avatar-small' : 'avatar'} title={name} aria-label={name} style={{ '--avatar': user?.avatarColor || '#285D78' }}>{initials}</span>
}

export function DocumentIcon({ size = 20 }) {
  return <span className="document-icon" aria-hidden="true"><FileText size={size} strokeWidth={1.7} /></span>
}

export function Menu({ label, text, icon = <Ellipsis size={17} />, items, align = 'end', className = '', disabled = false }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  const id = useId()
  useLayoutEffect(() => {
    if (!open) return
    function position() {
      const anchor = trigger.current.getBoundingClientRect()
      const popup = menu.current
      popup.style.maxHeight = Math.max(80, window.innerHeight - 16) + 'px'
      const { width, height } = popup.getBoundingClientRect()
      const left = align === 'start' ? anchor.left : anchor.right - width
      const below = anchor.bottom + 4
      const top = below + height <= window.innerHeight - 8 ? below : anchor.top - height - 4
      popup.style.left = Math.max(8, Math.min(left, window.innerWidth - width - 8)) + 'px'
      popup.style.top = Math.max(8, top) + 'px'
    }
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    position()
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    menu.current?.querySelector('button:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [align, open])
  function handleKeys(event) {
    if (!open) return
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      trigger.current.focus()
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const buttons = [...menu.current.querySelectorAll('button:not(:disabled)')]
      if (!buttons.length) return
      const current = buttons.indexOf(document.activeElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  }
  return <span ref={root} className={`menu-wrap ${className}`} onKeyDown={handleKeys} onBlur={(event) => {
    if (!root.current?.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button type="button" ref={trigger} className={text ? 'button ghost' : 'icon-button'} title={label} aria-label={label}
      disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(!open)} onKeyDown={(event) => {
        if (!open && event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) }
      }}>{icon}{text && <span>{text}</span>}</button>
    {open && <span className="popup-menu anchored-menu" id={id} role="menu" aria-label={label} ref={menu}>
      {items.map((item) => <button key={item.label} type="button" role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
        aria-checked={item.checked} disabled={item.disabled} className={item.danger ? 'danger-text' : undefined}
        onClick={() => { trigger.current?.focus(); setOpen(false); item.action() }}>
        {item.icon || (item.checked ? <Check size={15} /> : null)}<span>{item.label}</span>
      </button>)}
    </span>}
  </span>
}

export function Modal({ title, onClose, children, drawer = false }) {
  const dialog = useRef(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog className={drawer ? 'modal share-drawer' : 'modal'} ref={dialog} aria-labelledby={id}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    } }}>
    <header className="modal-header"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>
    {children}
  </dialog>
}

const absoluteDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
export function displayDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return 'Today'
  now.setDate(now.getDate() - 1)
  return date.toDateString() === now.toDateString() ? 'Yesterday' : absoluteDate.format(date)
}
