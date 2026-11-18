import { createContext, forwardRef, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom'
import { Check, ChevronDown, Mail, X } from 'lucide-react'
import { withSid } from '../utils/dataManager.js'
import { useStore } from '../store.jsx'

export const inbox = '/n/inbox/primary'
export const messagePath = value => '/n/message/' + encodeURIComponent(value)
export const folderPath = value => '/n/folders/' + encodeURIComponent(value)
export const draftPath = value => value ? '/n/compose/' + encodeURIComponent(value) : '/n/compose'
export const contactPath = value => value ? '/n/contacts/' + encodeURIComponent(value) : '/n/contacts'

function sessionPath(to) {
  return new URL(to, window.location.origin).searchParams.has('sid') ? to : withSid(to)
}

export function useMailNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  function go(to, options) { navigate(sessionPath(to), options) }
  return { location, go, back: location.state?.back || inbox }
}

export function MailLink({ to, ...props }) {
  return <Link to={sessionPath(to)} {...props} />
}

export function Redirect({ to }) {
  return <Navigate to={sessionPath(to)} replace />
}

const Interface = createContext(null)

export function InterfaceProvider({ children }) {
  const { state, pending, interrupted, saveNotice, retry, removePending, dismissSaveNotice } = useStore()
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const timeout = useRef()
  function notify(text, undo) {
    clearTimeout(timeout.current)
    setToast({ text, undo })
    timeout.current = setTimeout(() => setToast(null), undo ? 9500 : 4500)
  }
  const close = () => { if (!confirming) setDialog(null) }
  async function confirmAction() {
    setConfirming(true)
    try {
      await dialog.onConfirm()
    } finally {
      setConfirming(false)
      setDialog(current => current === dialog ? null : current)
    }
  }
  const recoverable = interrupted.filter(entry => entry.change)
  const otherChanges = interrupted.filter(entry => !entry.change)
  return <Interface.Provider value={{ notify, confirm: setDialog }}>
    <div className="app-theme" data-theme={state.settings?.appearance?.theme || 'light'}>
      {children}
      {pending ? <div className="toast" role="status">Saving mailbox changes…</div> : interrupted.length ? <div className="toast save-retry">
        {recoverable.map(entry => <div className="save-retry-row" key={entry.id}>
          <span role="alert">{entry.label} is still pending.</span>
          <button onClick={() => retry(entry)} aria-label={'Retry ' + entry.label}>Retry</button>
          <IconButton icon={X} label={'Dismiss ' + entry.label} onClick={() => removePending([entry.id])} />
        </div>)}
        {otherChanges.length > 0 && <div className="save-retry-row">
          <span role="alert">A mailbox change was interrupted. Try the action again.</span>
          <IconButton icon={X} label="Dismiss interrupted change" onClick={() => removePending(otherChanges.map(entry => entry.id))} />
        </div>}
      </div> : saveNotice ? <div className="toast" role="status">{saveNotice}<IconButton icon={X} label="Dismiss save notice" onClick={dismissSaveNotice} /></div>
        : toast && <div className="toast" role="status"><Check size={17} />{toast.text}{toast.undo && <button onClick={() => { setToast(null); toast.undo() }}>Undo</button>}<IconButton icon={X} label="Dismiss notification" onClick={() => setToast(null)} /></div>}
      {dialog && <Modal title={dialog.title} close={close} busy={confirming}>
        <p>{dialog.text}</p>
        {confirming && <p role="status" className="muted">Saving your change…</p>}
        <footer className="dialog-actions"><button className="secondary" onClick={close} disabled={confirming}>Cancel</button><button className={dialog.danger ? 'danger' : 'primary'} onClick={confirmAction} disabled={confirming}>{dialog.action}</button></footer>
      </Modal>}
    </div>
  </Interface.Provider>
}

export const useInterface = () => useContext(Interface)

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, className = '', children, ...props }, ref) {
  return <button ref={ref} type="button" className={'icon-button ' + className} aria-label={label} title={label} {...props}><Icon size={18} aria-hidden="true" />{children}</button>
})

export function Modal({ title, close, children, className = '', busy = false }) {
  const panel = useRef(null)
  const onClose = useRef(close)
  onClose.current = close
  useEffect(() => {
    const previous = document.activeElement
    const element = panel.current
    const focusable = () => [...element.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(item => item.getClientRects().length)
    ;(focusable()[0] || element).focus()
    function keydown(event) {
      if (event.key === 'Escape') { event.stopPropagation(); onClose.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) { event.preventDefault(); return }
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    element.addEventListener('keydown', keydown)
    return () => { element.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="scrim" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-label={title} aria-busy={busy} tabIndex={-1} className={'modal ' + className}>
      <header className="dialog-header"><h2>{title}</h2><IconButton icon={X} label="Close" onClick={close} disabled={busy} /></header>{children}
    </section>
  </div>
}

export function Menu({ label, icon: Icon = ChevronDown, children, text, align = 'right', open: controlled, onOpenChange }) {
  const [internal, setInternal] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const panel = useRef(null)
  const open = controlled ?? internal
  const setOpen = onOpenChange || setInternal
  useEffect(() => {
    if (!open) return
    function dismiss(event) { if (!root.current?.contains(event.target)) setOpen(false) }
    function escape(event) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open, setOpen])
  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return
    const popup = panel.current
    const anchor = trigger.current
    function position(event) {
      if (event?.target instanceof Node && popup.contains(event.target)) return
      const rect = anchor.getBoundingClientRect()
      const width = popup.offsetWidth
      const height = popup.offsetHeight
      const preferredLeft = align === 'left' ? rect.left : rect.right - width
      const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8))
      const below = window.innerHeight - rect.bottom - 8
      const top = below >= height + 5 || below > rect.top ? rect.bottom + 5 : rect.top - height - 5
      popup.style.left = left + 'px'
      popup.style.top = Math.max(8, Math.min(top, window.innerHeight - height - 8)) + 'px'
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [align, open])
  return <div className="menu-root" ref={root}>
    <button ref={trigger} type="button" className={text ? 'tool-button' : 'icon-button'} title={label} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>{text}<Icon size={17} /></button>
    {open && <div ref={panel} className="menu anchored-menu">{children(() => { setOpen(false); trigger.current?.focus() })}</div>}
  </div>
}

export function MenuItem({ children, icon: Icon, onClick, disabled }) {
  return <button type="button" className="menu-item" disabled={disabled} onClick={onClick}>{Icon && <Icon size={16} />}{children}</button>
}

const colors = ['#7B843B', '#A07A40', '#5B8DB8', '#C2185B', '#00897B', '#6D4C41', '#7E57C2', '#EF6C00', '#546E7A', '#2E7D32']
export function Avatar({ name, email, color, size = 28 }) {
  const identifier = email || name || '?'
  const hash = [...identifier].reduce((sum, letter) => sum + letter.codePointAt(0), 0)
  const initials = (name?.trim() || identifier).split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <span className="avatar" aria-hidden="true" style={{ '--avatar-color': color || colors[hash % colors.length], '--avatar-size': size + 'px' }}>{initials}</span>
}

export function Empty({ title, children, icon: Icon = Mail }) {
  return <section className="empty"><span className="empty-icon"><Icon size={28} /></span><h2>{title}</h2>{children}</section>
}

export function NotFound({ title = 'This page is unavailable' }) {
  return <Empty title={title}><MailLink className="secondary" to={inbox}>Back to Inbox</MailLink></Empty>
}
