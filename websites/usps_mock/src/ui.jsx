import { cloneElement, useId, useLayoutEffect, useRef, useState } from 'react'
import { SiteLink } from './navigation.jsx'
import { addressKeys, label } from './model.js'

export function Status({ value }) {
  if (!value) return <span className="status neutral">Status unavailable</span>
  const tone = ['active', 'approved', 'completed', 'paid'].includes(value) ? 'success'
    : ['scheduled', 'submitted', 'under_review', 'reserved'].includes(value) ? 'pending'
    : value === 'denied' ? 'error' : 'neutral'
  return <span className={'status ' + tone}>{label(value)}</span>
}

export function Summary({ rows }) {
  return <dl className="summary">{rows.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value ?? 'Not provided'}</dd></div>)}</dl>
}

export function Field({ title, hint, children }) {
  const id = useId()
  const hintId = id + '-hint'
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {cloneElement(children, { id, 'aria-describedby': hint ? hintId : undefined })}
    {hint && <small id={hintId}>{hint}</small>}
  </div>
}

const addressLabels = ['Street address', 'Apartment, suite, or unit (optional)', 'City', 'State', 'ZIP Code']
export function AddressFields({ title, value, onChange }) {
  return <fieldset className="field-group">
    <legend>{title}</legend>
    <div className="field-grid">
      {addressKeys.map((key, index) => <div key={key} className={index < 2 ? 'full' : ''}><Field title={addressLabels[index]}>
        <input value={value?.[key] ?? ''} onChange={event => onChange({ ...value, [key]: event.target.value })}
          maxLength={key === 'state' ? 2 : key === 'zip' ? 10 : 120}
          placeholder={key === 'state' ? 'OR' : undefined} />
      </Field></div>)}
    </div>
  </fieldset>
}

export function SelectField({ title, value, onChange, options, placeholder, disabled }) {
  return <Field title={title}><select value={value ?? ''} onChange={event => onChange(event.target.value)} disabled={disabled}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
  </select></Field>
}

function Problem({ message }) {
  const element = useRef(null)
  useLayoutEffect(() => {
    if (message) element.current?.focus()
  }, [message])
  return message && <p className="problem" role="alert" tabIndex={-1} ref={element}>{message}</p>
}

export function Wizard({ title, backTo, steps, renderStep, validate, onConfirm, confirmLabel, extra }) {
  const [step, setStep] = useState(0)
  const [message, setMessage] = useState('')
  const [finished, setFinished] = useState(false)
  const busy = useRef(false)
  const heading = useRef(null)
  const final = step === steps.length - 1
  useLayoutEffect(() => {
    heading.current?.focus()
  }, [step])

  function goTo(next) {
    setMessage('')
    setStep(next)
  }

  async function finish(action) {
    if (busy.current) return
    busy.current = true
    setMessage('')
    try {
      await action()
      setFinished(true)
    } catch (error) {
      setMessage(error.message)
      busy.current = false
    }
  }

  function advance(event) {
    event.preventDefault()
    if (busy.current) return
    const error = validate(step)
    if (error) {
      setMessage(error)
      return
    }
    if (!final) {
      goTo(step + 1)
      return
    }
    return finish(onConfirm)
  }

  return <section className="form-wrap">
    <SiteLink className="back-link" to={backTo}>← Back to {title}</SiteLink>
    <ol className="steps" aria-label="Progress">{steps.map((name, index) =>
      <li key={name} aria-current={index === step ? 'step' : undefined}><span>{index + 1}</span>{name}</li>)}</ol>
    <form className="card wizard" noValidate onSubmit={advance}>
      <h1 tabIndex={-1} ref={heading}>{steps[step]}</h1>
      {renderStep(step)}
      <Problem message={message} />
      <div className="form-actions">
        {step > 0 && <button type="button" className="button" onClick={() => goTo(step - 1)}>Back</button>}
        {extra && extra({ setMessage, busy: finished, finish })}
        <button className="button primary" disabled={finished} type="submit">{final ? confirmLabel : 'Continue'}</button>
      </div>
    </form>
  </section>
}

export function CancelDialog({ action, description, onConfirm }) {
  const dialog = useRef(null)
  const target = useRef(null)
  const busy = useRef(false)
  const [message, setMessage] = useState('')
  const titleId = useId()

  async function confirm() {
    if (busy.current) return
    try {
      busy.current = true
      await onConfirm()
      dialog.current?.close()
    } catch (error) {
      setMessage(error.message)
      busy.current = false
    }
  }

  return <>
    <button className="button danger" type="button" ref={target} onClick={() => dialog.current.showModal()}>{action}</button>
    <dialog ref={dialog} aria-labelledby={titleId} onClose={() => target.current?.focus()}>
      <h2 id={titleId}>{action}?</h2>
      <p>{description}</p>
      <Problem message={message} />
      <div className="actions">
        <button type="button" className="button" autoFocus onClick={() => dialog.current.close()}>Keep request</button>
        <button type="button" className="button danger" onClick={confirm}>Confirm cancellation</button>
      </div>
    </dialog>
  </>
}
