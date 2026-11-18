import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAccount } from '../context/AccountContext.jsx'
import { paths, statuses } from '../data/selectors.js'
import { withSid } from '../utils/dataManager.js'

export function LocalLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useLocalNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function Shell({ children }) {
  const { state, notice, clearNotice } = useAccount()
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="masthead">
        <div className="wrap masthead-inner">
          <LocalLink to={paths.account} className="brand">Login.gov</LocalLink>
          <span className="workspace">Practice workspace</span>
          <span className="account-name">{state.account?.displayName || 'Your account'}</span>
        </div>
      </header>
      <div className="nav-surface">
        <nav className="wrap nav" aria-label="Account navigation">
          <NavLink to={withSid(paths.account)} end>Account</NavLink>
          <NavLink to={withSid(paths.identity)}>Identity</NavLink>
          <NavLink to={withSid(paths.connections)}>Connected services</NavLink>
        </nav>
      </div>
      <main id="main" className="wrap main" tabIndex={-1}>{children}</main>
      <div className="toast-region" aria-live="polite">
        {notice && (
          <div className="toast">
            <span>{notice.message}</span>
            <button className="icon-button" onClick={clearNotice} aria-label="Dismiss notification">×</button>
          </div>
        )}
      </div>
    </>
  )
}

export function PageTitle({ children }) {
  const heading = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current.focus({ preventScroll: true })
  }, [pathname])
  return <h1 ref={heading} tabIndex={-1}>{children}</h1>
}

export function BackLink({ to, children }) {
  return <LocalLink className="back-link" to={to}><span aria-hidden="true">←</span> {children}</LocalLink>
}

export function Status({ value }) {
  return <span className={`status status-${value || 'unknown'}`}>{statuses[value] || 'Status unavailable'}</span>
}

export function Missing({ title, to, label }) {
  return <section className="narrow"><PageTitle>{title}</PageTitle><LocalLink to={to}>{label}</LocalLink></section>
}

export function ConfirmDialog({ title, children, onClose, onConfirm, confirmLabel, destructive, confirmDisabled }) {
  const dialog = useRef(null)
  const safeButton = useRef(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const element = dialog.current
    element.showModal()
    safeButton.current.focus()
    return () => {
      element.close()
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus()
    }
  }, [])

  return (
    <dialog ref={dialog} aria-labelledby="confirm-title" onCancel={event => { event.preventDefault(); onClose() }}>
      <form onSubmit={event => { event.preventDefault(); onConfirm() }}>
        <h2 id="confirm-title">{title}</h2>
        {children}
        <div className="actions">
          <button ref={safeButton} type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className={`button ${destructive ? 'danger' : ''}`} disabled={confirmDisabled}>{confirmLabel}</button>
        </div>
      </form>
    </dialog>
  )
}

export function EmailOptions({ options, value, onChange }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>Shared email address</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Select an email address</option>
        {options.map(email => <option key={email.id} value={email.id}>{email.address}</option>)}
      </select>
    </div>
  )
}

export function useFilters(defaults) {
  const [filters, setFilters] = useState(defaults)
  const set = (key, value) => setFilters(previous => ({ ...previous, [key]: value }))
  return [filters, set, () => setFilters(defaults)]
}
