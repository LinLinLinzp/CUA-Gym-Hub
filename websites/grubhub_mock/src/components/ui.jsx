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

export function Modal({ title, onClose, children }) {
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

  return (
    <dialog ref={dialog} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
      <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="button modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}
    </dialog>
  )
}

export function Status({ value }) {
  const label = typeof value === 'string' && value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Unavailable'
  return <span className="status" data-status={value}><span aria-hidden="true" />{label}</span>
}

const tiles = ['rice', 'pizza', 'noodles', 'greens', 'tacos', 'sandwich']

export function CuisineTile({ kind, banner = false }) {
  return <span aria-hidden="true" className={`tile tile-${tiles.includes(kind) ? kind : 'plain'}${banner ? ' tile-banner' : ''}`} />
}
