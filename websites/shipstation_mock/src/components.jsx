import React, { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { money } from './data/shipping.js'

const icons = {
  orders: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6m-6 4h6m-6 4h3"/></>,
  labels: <><path d="M3 5h9l9 9-7 7-9-9V5z"/><circle cx="9" cy="9" r="1"/></>,
  batches: <><path d="m12 3 8 4-8 4-8-4 8-4zm-8 9 8 4 8-4M4 17l8 4 8-4"/></>,
  returns: <><path d="m8 7-4 4 4 4m-4-4h11a4 4 0 0 1 0 8h-3M10 5h8a2 2 0 0 1 2 2v2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10" cy="10" r="5.5"/><path d="m14 14 5 5"/></>,
  right: <path d="m9 5 7 7-7 7"/>,
  left: <path d="m15 5-7 7 7 7"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
}
export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}
export function Button({ children, kind = '', icon, ...props }) {
  return <button type="button" className={['button', kind].filter(Boolean).join(' ')} {...props}>
    {icon && <Icon name={icon} size={16} />}{children}
  </button>
}
export function Badge({ value }) {
  return value ? <span className={'badge ' + value}>{String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())}</span> : '—'
}
export const date = value => {
  if (!value) return '—'
  const parsed = new Date(String(value).length === 10 ? value + 'T12:00:00Z' : value)
  return Number.isNaN(+parsed) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
}
export const addressText = address => [address?.city, address?.region].filter(Boolean).join(', ') || '—'
export function Address({ address, name }) {
  const lines = [name, address?.line1, address?.line2,
    [addressText(address) === '—' ? '' : addressText(address), address?.postalCode].filter(Boolean).join(' '), address?.country].filter(Boolean)
  return lines.length ? <address>{lines.map((line, i) => <div key={i}>{line}</div>)}</address> : <p className="muted">No address on file.</p>
}
export function Panel({ title, children }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>
}
export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}
export function Field({ label, children }) {
  const id = useId()
  return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}
export function Check({ partial, ...props }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.indeterminate = !!partial }, [partial])
  return <input ref={ref} type="checkbox" {...props} />
}

export function Modal({ title, close, children, compact = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<dialog ref={ref} className={compact ? 'compact-dialog' : ''} aria-labelledby="dialog-title"
    onCancel={event => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><Button aria-label="Close dialog" icon="close" onClick={close} /></div>
    {children}
  </dialog>, document.body)
}
export function DialogForm({ close, submit, label, children, secondary, disabled, danger }) {
  const [error, setError] = useState('')
  function run(callback, form) {
    try { setError(''); callback(form) } catch (issue) { setError(issue.message) }
  }
  return <form className="dialog-form" onSubmit={event => { event.preventDefault(); run(submit, event.currentTarget) }}>
    <div className="dialog-body">{children}{error && <p className="error-box" role="alert">{error}</p>}</div>
    <footer className="dialog-footer"><Button onClick={close}>Back</Button>
      {secondary && <Button type="submit" onClick={event => {
        const form = event.currentTarget.form
        event.preventDefault()
        if (form.reportValidity()) run(secondary.submit, form)
      }}>{secondary.label}</Button>}
      <Button type="submit" disabled={disabled} kind={danger ? 'danger' : 'primary'}>{label}</Button>
    </footer>
  </form>
}
export function Confirm({ title, close, submit, children, danger }) {
  return <Modal title={title} close={close} compact><DialogForm close={close} submit={submit} label={title} danger={danger}>{children}</DialogForm></Modal>
}

export function LabelPaper({ label, name }) {
  return <article className="label-paper">
    <header><strong>{[label.shipping?.carrier, label.shipping?.service].filter(Boolean).join(' · ') || 'Shipping label'}</strong>
      <small>Sample postage</small></header>
    <section><small>FROM</small><Address address={label.shipFrom} name={label.direction === 'return' ? name : undefined} /></section>
    <section><small>SHIP TO</small><Address address={label.shipTo} name={label.direction === 'return' ? undefined : name} /></section>
    <div className="barcode" aria-hidden="true" />
    <strong className="tracking">{label.trackingNumber || '—'}</strong>
    <footer>{label.number || label.id}<span>{money(label.cost)}</span></footer>
  </article>
}

