import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { rows, text } from './workspace.jsx'

export function PageHead({ title, subtitle, actions, children }) {
  return <div className="page-head">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}{actions && <div className="actions">{actions}</div>}</div>
    {children}
  </div>
}

export function Empty({ title, detail, action }) {
  return <div className="empty surface"><h2>{title}</h2>{detail && <p>{detail}</p>}{action}</div>
}

export function Field({ label, error, hint, children }) {
  const id = React.useId()
  const description = error ? id + '-error' : hint ? id + '-hint' : undefined
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': description })}
    {hint && <small id={id + '-hint'}>{hint}</small>}
    {error && <small className="field-error" id={id + '-error'} role="alert">{error}</small>}
  </div>
}

export function Section({ title, children }) {
  return <section className="surface section"><h2>{title}</h2>{children}</section>
}

export function Dialog({ title, children, close }) {
  const ref = useRef(null)
  const heading = React.useId()
  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={heading} onCancel={(event) => { event.preventDefault(); close() }}>
    <h2 id={heading}>{title}</h2>
    {children}
  </dialog>
}

export function Confirm({ title, children, close, confirm, label }) {
  return <Dialog title={title} close={close}>
    {children}
    <div className="actions end">
      <button type="button" onClick={close} autoFocus>Cancel</button>
      <button type="button" className="danger" onClick={confirm}>{label}</button>
    </div>
  </Dialog>
}

export function SaveBar({ cancel, label = 'Save' }) {
  return <div className="actions save-bar">{cancel}<button className="primary" type="submit">{label}</button></div>
}

export function SelectOptions({ items, label = 'title' }) {
  return rows(items).map((item) => <option key={item.id} value={item.id}>{item[label] || item.id}</option>)
}

const statusLabels = {
  normal: 'Normal', pending: 'Pending', alerting: 'Alerting', no_data: 'No data',
  error: 'Error', ok: 'OK', paused: 'Paused', simulated_success: 'Simulated success',
}

export function Status({ value }) {
  return <span className={'status status-' + text(value)}>{statusLabels[value] || 'Unknown'}</span>
}

export function DateLabel({ value }) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return <span>—</span>
  const days = Math.round((date.getTime() - new Date().getTime()) / 86400000)
  const relative = Math.abs(days) <= 30
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days, 'day')
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
  return <time dateTime={date.toISOString()} title={date.toISOString()}>{relative}</time>
}

export function Menu({ label, children }) {
  const ref = useRef(null)
  const [open, setOpen] = React.useState(false)
  useEffect(() => {
    if (!open) return
    function dismiss(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  return <div className="menu" ref={ref} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      ref.current.querySelector('button').focus()
    }
  }}>
    <button type="button" className="icon-button" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
    {open && <div className="menu-items" onClick={(event) => {
      if (event.target.closest('button, a')) {
        ref.current.querySelector('button').focus()
        setOpen(false)
      }
    }}>{children}</div>}
  </div>
}
