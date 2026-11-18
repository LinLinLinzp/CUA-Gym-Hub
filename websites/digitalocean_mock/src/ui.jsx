import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function Shell({ account, notice, children }) {
  const displayName = account?.name || 'Account'
  return <>
    <header className="account-bar">
      <div className="frame account-inner">
        <SiteLink to="/" className="wordmark">DigitalOcean</SiteLink>
        <div className="identity">
          <span className="team">{account?.teamName || 'Workspace'}</span>
          <span className="avatar" aria-hidden="true">{displayName.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
          <span>{displayName}</span>
        </div>
      </div>
    </header>
    <nav className="navigation" aria-label="Workspace">
      <div className="frame nav-inner">
        {[['/', 'Overview'], ['/droplets', 'Droplets'], ['/networking/domains', 'Domains'], ['/snapshots', 'Snapshots']].map(([to, label]) =>
          <NavLink key={to} end={to === '/'} to={withSid(to)}>{label}</NavLink>
        )}
      </div>
    </nav>
    <main className="frame content">{children}</main>
    <div className="notice-region" role="status" aria-live="polite">
      {notice && <div key={notice.id} className="toast">{notice.message}</div>}
    </div>
  </>
}

export function Heading({ title, subtitle, action, back }) {
  return <>
    {back && <SiteLink className="back" to={back[0]}>← {back[1]}</SiteLink>}
    <div className="page-heading">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  </>
}

export function Missing({ title, to = '/', label = 'Back to overview' }) {
  return <Heading title={title} subtitle="This address does not point to an available resource." action={<SiteLink className="button" to={to}>{label}</SiteLink>} />
}

export const resourcePath = (base, id) => `${base}/${encodeURIComponent(id)}`
export const shown = (value) => value ?? '—'
export const labelOf = (items, id) => items.find(item => item.id === id)?.name || id || '—'
export const includes = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
export function dateLabel(value, withTime = false) {
  const date = new Date(value)
  return value && Number.isFinite(date.valueOf()) ? (withTime ? dateTimeFormatter : dateFormatter).format(date) : '—'
}

export function Status({ value }) {
  return value ? <span className={`status ${['active', 'available'].includes(value) ? 'positive' : ''}`}>{value}</span> : '—'
}

export function Table({ label, columns, rows, renderRow, empty }) {
  if (!rows.length) return <div className="panel empty">{empty}</div>
  return <div className="table-wrap">
    <table aria-label={label}>
      <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>{renderRow(row)}</tr>)}</tbody>
    </table>
  </div>
}

export function Field({ label, children, hint }) {
  const id = useId()
  const control = useRef(null)
  const [error, setError] = useState('')
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const value = children.props.value
  useEffect(() => {
    control.current?.setCustomValidity('')
    setError('')
  }, [value])
  function clearError(event) {
    event.target.setCustomValidity('')
    setError('')
  }
  return <div className="field" onInvalid={event => setError(event.target.validationMessage)}
    onInput={clearError} onChange={clearError}>
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, {
      id, ref: control, 'aria-invalid': error ? true : undefined,
      'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    })}
    {hint && <small id={hintId}>{hint}</small>}
    {error && <small id={errorId} className="form-error">{error}</small>}
  </div>
}

export function Select({ options, placeholder, ...props }) {
  return <select {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>
}

export function Search({ label, ...props }) {
  return <input className="search" type="search" aria-label={label} placeholder={label} {...props} />
}

export function Modal({ title, close, children, drawer = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={drawer ? 'drawer' : ''} aria-label={title}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="dialog-inner">
      <div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close" onClick={close}>×</button></div>
      {children}
    </div>
  </dialog>
}

export function FormActions({ close, label, danger = false, disabled = false }) {
  return <div className="form-actions">
    {close && <button type="button" onClick={close}>Cancel</button>}
    <button type="submit" className={danger ? 'danger' : 'primary'} disabled={disabled}>{label}</button>
  </div>
}

export function Confirm({ title, name, close, onConfirm, children, danger = true }) {
  return <Modal title={title} close={close}>
    <form className="form" onSubmit={event => {
      event.preventDefault()
      const field = event.currentTarget.elements.confirmation
      if (field.value !== name) {
        field.setCustomValidity('Enter the resource name exactly as shown.')
        field.reportValidity()
        return
      }
      onConfirm()
    }}>
      {children}
      <Field label={`Type ${name} to confirm`}><input name="confirmation" required autoComplete="off" /></Field>
      <FormActions close={close} label={title} danger={danger} />
    </form>
  </Modal>
}

export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([key, value]) =>
    <div key={key}><dt>{key}</dt><dd>{shown(value)}</dd></div>
  )}</dl>
}

export function formValues(event) {
  event.preventDefault()
  return Object.fromEntries(new FormData(event.currentTarget))
}

export function invalid(form, name, message) {
  const field = form.elements.namedItem(name)
  field.setCustomValidity(message)
  field.reportValidity()
}
