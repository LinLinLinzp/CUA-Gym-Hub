import { cloneElement, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { money } from './data/domain'
import { useRoute } from './store'

export const recordPath = (base, id) => id ? `${base}/${encodeURIComponent(id)}` : base

export function RouteLink({ to, children, ...props }) {
  const { target } = useRoute()
  return <Link to={target(to)} {...props}>{children}</Link>
}

export function Heading({ title, children, back, id }) {
  return <header className="page-heading">
    {back && <RouteLink to={back.to} className="back"><span aria-hidden="true">←</span> {back.label}</RouteLink>}
    <h1 id={id} tabIndex={id ? -1 : undefined}>{title}</h1>
    {children && <p>{children}</p>}
  </header>
}

export function Pill({ value }) {
  return <span className={`pill ${String(value || '').toLowerCase().replaceAll(' ', '-')}`}>{value || 'Status unavailable'}</span>
}

export function Field({ label, children, hint }) {
  const id = useId()
  const hintId = id + '-hint'
  return <div className="field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id, 'aria-describedby': hint ? hintId : undefined })}{hint && <small id={hintId}>{hint}</small>}</div>
}

export function OptionField({ label, value, onChange, options }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => {
      const [key, name] = typeof option === 'string' ? [option, option] : option
      return <option key={key} value={key}>{name}</option>
    })}
  </select></Field>
}

export function SearchField({ label, value, onChange, placeholder }) {
  return <Field label={label}><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>
}

export function Segments({ label, options, value, onChange }) {
  return <div className="segments" role="group" aria-label={label}>
    {options.map((option) => <button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)}>{option}</button>)}
  </div>
}

export function Facts({ items, className = '' }) {
  return <dl className={`facts ${className}`}>{items.map(([label, value]) => <div key={label}>
    <dt>{label}</dt><dd>{value ?? 'Unavailable'}</dd>
  </div>)}</dl>
}

export function Empty({ title, children, to, action }) {
  return <div className="panel empty"><h2>{title}</h2>{children && <p>{children}</p>}
    {to && <RouteLink className="button secondary" to={to}>{action}</RouteLink>}
  </div>
}

export function Missing({ title, to = '/account', action = 'Back to overview' }) {
  return <><Heading title={title}>Check the link or return to the list to find a current record.</Heading>
    <RouteLink to={to} className="button secondary">{action}</RouteLink></>
}

export function ErrorText({ error }) {
  return error && <p role="alert" className="error">{error}</p>
}

export function Rules({ items }) {
  const rules = Array.isArray(items) ? items.filter((item) => typeof item === 'string') : []
  return rules.length > 0 && <div className="rules"><h3>Rules and terms</h3><ul>{rules.map((rule, index) => <li key={index}>{rule}</li>)}</ul></div>
}

export function Terms({ checked, onChange, children }) {
  return <label className="terms"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{children}</span></label>
}

export function Charges({ quote, camp }) {
  return <Facts items={[
    [camp ? 'Nightly rate' : 'Rate per person', money(quote.unitAmount, quote.currency)],
    [camp ? 'Campsite charges' : 'Permit charges', money(quote.useAmount, quote.currency)],
    ['Service fee', money(quote.serviceFee, quote.currency)],
    ['Total', money(quote.totalAmount, quote.currency)],
  ]} className="costs" />
}

export function Modal({ title, onDismiss, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const invoker = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      invoker?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onDismiss() }}>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>
}
