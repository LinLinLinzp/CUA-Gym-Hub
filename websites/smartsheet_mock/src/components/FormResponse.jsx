import React, { useId, useRef, useState } from 'react'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { byId, columnsOf } from '../data/sheets.js'
import { validateResponse } from '../data/forms.js'
import { useStore } from '../store.jsx'
import CellInput from './CellInput.jsx'
import { Button, Problem } from './ui.jsx'

export default function FormResponse({ sheet, form, onSubmit, preview = false }) {
  const { state } = useStore()
  const prefix = useId()
  const node = useRef(null)
  const submitting = useRef(false)
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const fields = form.fields ?? []
  const { visible } = validateResponse(state, sheet, form, answers)
  function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    const result = validateResponse(state, sheet, form, answers)
    for (const field of fields) {
      const control = document.getElementById(prefix + field.id)
      if (control?.validity?.badInput) result.errors[field.id] = 'Enter a valid date.'
    }
    if (Object.keys(result.errors).length) {
      setErrors(result.errors)
      const first = fields.find(field => result.errors[field.id] && !field.hidden)
      if (first) document.getElementById(prefix + first.id)?.focus()
      else setError('The form has an invalid hidden default.')
      return
    }
    submitting.current = true
    setSaving(true)
    try {
      onSubmit?.(answers)
      setSubmitted(true)
      requestAnimationFrame(() => node.current?.focus())
    } catch (failure) {
      setError(failure.message)
      submitting.current = false
      setSaving(false)
    }
  }
  return <section className="response-card panel">
    <header className="response-header">
      <span className="empty-icon"><ClipboardList size={23} /></span>
      <h1>{form.title || 'Untitled form'}</h1>
      {form.description && <p>{form.description}</p>}
    </header>
    {submitted ? <div className="response-success" ref={node} tabIndex={-1} role="status">
      <CheckCircle2 size={23} /><span>{form.confirmationMessage || 'Your response has been submitted.'}</span>
      {preview && <Button onClick={() => { submitting.current = false; setSaving(false); setSubmitted(false); setErrors({}); setError(''); setAnswers({}) }}>Reset preview</Button>}
    </div> : <form className="stack" noValidate onSubmit={submit}>
      {fields.filter(field => visible.has(field.id)).map(field => {
        const column = byId(columnsOf(sheet), field.columnId)
        if (!column) return null
        const id = prefix + field.id
        const helpId = id + '-help'
        const errorId = id + '-error'
        const value = Object.hasOwn(answers, field.id) ? answers[field.id] : field.defaultValue
        return <div key={field.id} className="response-field field">
          <label htmlFor={id}>{field.label || column.title}{field.required && <span className="required-mark" aria-hidden="true"> *</span>}</label>
          {field.helpText && <small id={helpId}>{field.helpText}</small>}
          <CellInput id={id} column={column} users={state.users} booleanSelect={column.type === 'checkbox' && field.required}
            value={value} aria-required={Boolean(field.required)} aria-invalid={Boolean(errors[field.id])}
            aria-describedby={[field.helpText && helpId, errors[field.id] && errorId].filter(Boolean).join(' ') || undefined}
            onChange={next => { setAnswers({ ...answers, [field.id]: next }); setErrors({ ...errors, [field.id]: '' }); setError('') }} />
          <Problem message={errors[field.id]} id={errorId} />
        </div>
      })}
      <Problem message={error} />
      <div><Button type="submit" variant="primary" disabled={saving}>Submit</Button></div>
    </form>}
    <div className="response-footer">Powered by <strong>Smartsheet</strong></div>
  </section>
}
