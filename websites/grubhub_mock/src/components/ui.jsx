import { useId, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from '../utils/dataManager'

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Glyph({ name }) {
  return <span aria-hidden="true" className={`glyph glyph-${name}`} />
}

export function PageHeading({ title, description, action, back }) {
  return (
    <header className="page-heading">
      {back && <AccountLink className="back-link" to={back.to}><span aria-hidden="true">←</span>{back.label}</AccountLink>}
      <div className="heading-row">
        <div><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>
        {action}
      </div>
    </header>
  )
}

export function Empty({ title, children, action }) {
  return <section className="card empty"><h2>{title}</h2>{children && <p>{children}</p>}{action}</section>
}

export function Modal({ title, onClose, className, children }) {
  const titleId = useId()
  const dialog = useRef(null)
  useLayoutEffect(() => {
    const trigger = document.activeElement
    const element = dialog.current
    element.showModal()
    element.querySelector('[data-initial-focus]')?.focus()
    return () => {
      element.close()
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  function containFocus(event) {
    if (event.key !== 'Tab') return
    const controls = Array.from(dialog.current.querySelectorAll('button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]'))
      .filter(control => control.tabIndex >= 0 && control.getClientRects().length)
    const first = controls[0]
    const last = controls.at(-1)
    const active = document.activeElement
    if (event.shiftKey ? active === first : active === last) {
      event.preventDefault()
      const target = event.shiftKey ? last : first
      target?.focus()
    }
  }

  return (
    <dialog ref={dialog} className={['modal', className].filter(Boolean).join(' ')} aria-labelledby={titleId} onKeyDown={containFocus} onCancel={event => { event.preventDefault(); onClose() }}>
      <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="button modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}
    </dialog>
  )
}

export function Status({ value }) {
  const label = typeof value === 'string' && value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Unavailable'
  return <span className="status" data-status={value}><span aria-hidden="true" />{label}</span>
}

const photoPanels = {
  pizza: [0, 25], noodles: [1, 25], greens: [2, 25],
  tacos: [0, 75], sandwich: [1, 75], rice: [2, 75],
}

export function CuisineTile({ kind, banner = false }) {
  const panel = Object.hasOwn(photoPanels, kind) ? photoPanels[kind] : null
  if (banner && panel) return <span aria-hidden="true" className="cuisine-photo" style={{ '--column': panel[0], '--row': panel[1] + '%' }}>
    <img src="/images/cuisine-gallery.png" alt="" width="1536" height="1024" />
  </span>
  return <span aria-hidden="true" className={`tile tile-${panel ? kind : 'plain'}${banner ? ' tile-banner' : ''}`} />
}
