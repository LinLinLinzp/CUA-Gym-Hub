import { useEffect, useRef, useState } from 'react'
import { useAccount } from './store.jsx'
import { prepare, itemName, find, money } from './model.js'
import { Dialog, Field, Select, useSiteNavigate } from './ui.jsx'

export function Workflow({ title, reviewTitle, initial, children, review, onClose, confirm, danger = false, inline = false }) {
  const { state, commit } = useAccount()
  const go = useSiteNavigate()
  const [draft, setDraft] = useState(initial)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const submitted = useRef(false)
  const region = useRef(null)
  const form = useRef(null)

  useEffect(() => {
    if (inline) region.current.focus()
    else if (summary) form.current.querySelector('button[type="submit"]')?.focus()
  }, [summary, inline])

  function update(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }))
    setError(null)
  }

  function showError(nextError) {
    const field = form.current.elements.namedItem(nextError.field)
    setError({ ...nextError, inline: Boolean(field) })
    field?.focus?.()
  }

  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    if (!summary) {
      const prepared = prepare(state, draft)
      if (prepared.error) showError(prepared.error)
      else {
        setError(null)
        setSummary(prepared.summary)
      }
      return
    }
    submitted.current = true
    const result = commit(draft)
    if (result.error) {
      submitted.current = false
      setSummary(null)
      setError(result.error)
      return
    }
    onClose(result)
    if (result.path) go(result.path)
  }

  const currentTitle = summary ? reviewTitle : title
  const content = <form className="form-body" ref={form} noValidate onSubmit={submit}>
    {error && !error.inline && <p role="alert" className="field-error">{error.message}</p>}
    {summary ? review(summary, draft) : children(draft, update, (field) => error?.inline && error.field === field ? error.message : undefined)}
    <div className="form-actions">
      <button type="button" className="secondary" onClick={summary ? () => { setSummary(null); setError(null) } : () => onClose()}>{summary ? 'Back' : 'Discard'}</button>
      <button type="submit" className={summary && danger ? 'danger' : ''}>{summary ? confirm : 'Review'}</button>
    </div>
  </form>

  if (!inline) return <Dialog title={currentTitle} onClose={() => onClose()}>{content}</Dialog>
  return <section className="card form-card" ref={region} tabIndex={-1} aria-labelledby="workflow-heading">
    <h2 id="workflow-heading">{currentTitle}</h2>{content}
  </section>
}

export function InputField({ name, field, value, update, error, type = 'text', ...props }) {
  return <Field label={name} id={field} error={error}>{(access) =>
    <input {...access} {...props} name={field} type={type} value={value ?? ''} onChange={(event) => update(field, event.target.value)} />
  }</Field>
}

export function SelectField({ name, field, value, update, error, options, placeholder, ...props }) {
  return <Field label={name} id={field} error={error}>{(access) =>
    <Select {...access} {...props} name={field} value={value ?? ''} options={options} placeholder={placeholder} onChange={(event) => update(field, event.target.value)} />
  }</Field>
}

export function LineSelection({ lines, capacity, selection, onChange, reasons, error }) {
  function change(id, entry) {
    const next = { ...selection }
    if (entry) next[id] = entry
    else delete next[id]
    onChange(next)
  }
  return lines.map((line) => {
    const available = capacity(line)
    const entry = Object.hasOwn(selection, line.id) ? selection[line.id] : null
    return <div className="line-picker" key={line.id}>
      <label><input type="checkbox" checked={Boolean(entry)} onChange={(event) =>
        change(line.id, event.target.checked ? { quantity: '1', reason: '' } : null)} />
        {itemName(line)}</label>
      <span className="muted">{available} available · {money(line.unitPrice)} each</span>
      {entry && <div className="line-fields">
        <InputField name="Quantity" field={'quantity-' + line.id} type="number" min="1" max={available} value={entry.quantity}
          update={(_, quantity) => change(line.id, { ...entry, quantity })} error={error('quantity-' + line.id)} />
        {reasons && <SelectField name="Reason" field={'reason-' + line.id} value={entry.reason}
          update={(_, reason) => change(line.id, { ...entry, reason })} error={error('reason-' + line.id)} options={reasons} placeholder="Choose a reason" />}
      </div>}
    </div>
  })
}

export function ReviewLines({ order, lines }) {
  return <ul className="review-lines">{lines.map((line) => <li key={line.orderItemId}>
    <strong>{itemName(find(order?.items, line.orderItemId) ?? { id: line.orderItemId })}</strong>
    <div>{line.quantity ?? '—'} × {money(line.unitPrice)} · {money(line.refundEstimate)}{line.reason ? ' · ' + line.reason : ''}</div>
  </li>)}</ul>
}

