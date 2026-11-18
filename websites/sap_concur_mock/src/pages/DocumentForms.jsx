import React, { useState } from 'react'
import { EXPENSE, activeUser, assignedReviewer, categories, documentTotal, eligibleReviewers, money, paymentTypes, receiptPath, schemas, today } from '../model.js'
import { validateHeader, validateLine } from '../commands.js'
import { Dialog, Field, PageLink } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'

export function HeaderForm({ type, initial, state, onSave, onCancel, cancelTo }) {
  const { noun } = schemas[type]
  const expense = type === EXPENSE
  const [fields, setFields] = useState(() => initial || { costCenter: activeUser(state)?.costCenter, reportDate: today() })
  const [errors, setErrors] = useState({})
  const [notSaved, setNotSaved] = useState(false)
  function field(key, label, inputType = 'text') {
    const props = { value: fields[key] ?? '', onChange: event => setFields({ ...fields, [key]: event.target.value }) }
    return <Field name={key} label={label} error={errors[key]}>{inputType === 'textarea' ? <textarea rows={2} {...props} /> : <input type={inputType} {...props} />}</Field>
  }
  function submit(event) {
    event.preventDefault()
    const problems = validateHeader(type, fields)
    setErrors(problems)
    setNotSaved(!Object.keys(problems).length && !onSave(fields))
  }
  return <form onSubmit={submit} noValidate>
    <div className="form-grid">
      {field('title', noun + ' name')}{field('costCenter', 'Cost center')}
      <div className="full">{field('businessPurpose', 'Business purpose', 'textarea')}</div>
      {expense ? field('reportDate', 'Report date', 'date') : <>
        {field('origin', 'Origin')}{field('destination', 'Destination')}
        {field('startDate', 'Start date', 'date')}{field('endDate', 'End date', 'date')}
      </>}
    </div>
    {notSaved && <p role="alert" className="field-error">The document is no longer available for this action.</p>}
    <div className="dialog-actions">
      {cancelTo ? <PageLink className="button" to={cancelTo}>Cancel</PageLink> : <button type="button" onClick={onCancel}>Cancel</button>}
      <button className="primary" type="submit">{initial ? 'Save Changes' : 'Create ' + noun}</button>
    </div>
  </form>
}

export function LineForm({ type, line, onSave, onClose }) {
  const { lineLabel } = schemas[type]
  const expense = type === EXPENSE
  const [fields, setFields] = useState(() => line || (expense ? { transactionDate: today(), paymentType: 'out_of_pocket' } : { quantity: 1 }))
  const [errors, setErrors] = useState({})
  const changeField = key => ({ value: fields[key] ?? '', onChange: event => setFields({ ...fields, [key]: event.target.value }) })
  function input(key, label, props = {}) {
    return <Field name={key} label={label} error={errors[key]}><input {...props} {...changeField(key)} /></Field>
  }
  function submit(event) {
    event.preventDefault()
    const problems = validateLine(type, fields)
    setErrors(problems)
    if (!Object.keys(problems).length && !onSave(fields)) setErrors({ form: 'The document is no longer available for this action.' })
  }
  return <Dialog title={(line ? 'Edit ' : 'Add ') + lineLabel.toLowerCase()} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field name="category" label="Category" error={errors.category}><select {...changeField('category')}>
          <option value="">Choose category</option>{categories.filter(category => expense || category !== 'Office Supplies' || category === fields.category).map(category => <option key={category}>{category}</option>)}
        </select></Field>
        {expense ? <>
          {input('transactionDate', 'Transaction date', { type: 'date' })}
          {input('merchant', 'Merchant')}{input('amount', 'Amount (USD)', { inputMode: 'decimal' })}
          <Field name="paymentType" label="Payment type" error={errors.paymentType}><select {...changeField('paymentType')}>
            {Object.entries(paymentTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></Field>
        </> : <>{input('quantity', 'Quantity', { inputMode: 'numeric' })}{input('unitAmount', 'Unit amount (USD)', { inputMode: 'decimal' })}</>}
        <div className="full"><Field name="description" label={expense ? 'Description (optional)' : 'Description'} error={errors.description}><textarea rows={2} {...changeField('description')} /></Field></div>
      </div>
      {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save {lineLabel}</button></div>
    </form>
  </Dialog>
}

export function SubmissionForm({ type, document, state, onSave, onClose }) {
  const schema = schemas[type]
  const assigned = assignedReviewer(state, document)
  const candidates = eligibleReviewers(state, document.ownerId)
  const [reviewerId, setReviewerId] = useState('')
  const [error, setError] = useState('')
  return <Dialog title={'Submit ' + schema.noun.toLowerCase()} onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault()
      if (!assigned && !reviewerId) { setError('Choose a reviewer.'); return }
      if (!onSave({ reviewerId })) setError('The document is no longer available for submission.')
    }}>
      <p className="form-intro">Send <strong>{document.title}</strong> for approval. Total <strong>{money(documentTotal(type, document))}</strong>.</p>
      {assigned ? <p>Assigned reviewer <strong>{assigned.name || assigned.id}</strong></p> :
        candidates.length ? <Field name="reviewer" label="Assigned reviewer" error={error}><select value={reviewerId} onChange={event => { setReviewerId(event.target.value); setError('') }}>
          <option value="">Choose reviewer</option>{candidates.map(user => <option key={user.id} value={user.id}>{user.name || user.id}</option>)}
        </select></Field> : <p role="alert">No eligible reviewer is available. You can continue editing this draft.</p>}
      {error && (assigned || reviewerId) && <p className="field-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button>
        <button className="primary" type="submit" disabled={!candidates.length}>Confirm Submission</button></div>
    </form>
  </Dialog>
}

export function DecisionForm({ action, approval, onSave, onClose }) {
  const sendBack = action === 'sent_back'
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  return <Dialog title={sendBack ? 'Send back submission' : 'Approve submission'} onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault()
      if (sendBack && !comment.trim()) { setError('Enter a reason for sending this back.'); return }
      if (!onSave({ approvalId: approval.id, comment })) setError('This approval is no longer available for review.')
    }}>
      <p className="form-intro">{approval.subjectTitle || approval.subjectId} · {money(approval.amount)}</p>
      <Field name="decision-note" label={sendBack ? 'Send-back reason' : 'Approval note (optional)'} error={error}><textarea rows={3} value={comment} onChange={event => { setComment(event.target.value); setError('') }} /></Field>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className={sendBack ? 'danger' : 'primary'} type="submit">{sendBack ? 'Confirm Send Back' : 'Confirm Approval'}</button></div>
    </form>
  </Dialog>
}

const bundledUrl = '/receipts/juniper-house-receipt.svg'

export function ReceiptForm({ onSave, onClose }) {
  const [file, setFile] = useState(null)
  const [source, setSource] = useState('file')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (source === 'file' && !file) { setError('Choose a receipt file.'); return }
    setBusy(true)
    setError('')
    try {
      let receipt
      if (source === 'bundled') {
        const response = await fetch(bundledUrl)
        if (!response.ok) throw new Error('Bundled receipt unavailable')
        receipt = { fileName: 'juniper-house-receipt.svg', url: bundledUrl, contentType: 'image/svg+xml', size: (await response.blob()).size }
      } else {
        const data = new FormData()
        data.append('file', file)
        const response = await fetch(withSid('/upload'), { method: 'POST', body: data })
        if (!response.ok) throw new Error('Upload failed')
        const result = await response.json()
        const uploaded = result.files?.[0]
        if (!uploaded?.url?.startsWith('/files/')) throw new Error('Upload failed')
        receipt = { fileName: uploaded.original_name, url: uploaded.url, contentType: uploaded.content_type, size: uploaded.size }
      }
      if (!onSave({ receipt })) setError('The expense is no longer available for this action.')
    } catch {
      setError('The receipt could not be attached. Try uploading it again.')
    } finally {
      setBusy(false)
    }
  }
  return <Dialog title="Attach receipt" onClose={onClose} busy={busy}>
    <form onSubmit={submit}>
      <div className="stack">
        <Field name="receipt-source" label="Receipt source"><select disabled={busy} value={source} onChange={event => { setSource(event.target.value); setFile(null); setError('') }}>
          <option value="file">Upload a file</option><option value="bundled">Juniper House Hotel sample receipt</option>
        </select></Field>
        {source === 'file' && <Field name="receipt-file" label="Receipt file"><input disabled={busy} type="file" onChange={event => setFile(event.target.files[0] ?? null)} /></Field>}
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
      <div className="dialog-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Attaching…' : 'Save Receipt'}</button></div>
    </form>
  </Dialog>
}

export function localReceiptUrl(receipt) {
  const path = receiptPath(receipt)
  return path && withSid(path)
}

export function ReceiptPreview({ receipt, onClose }) {
  const [failed, setFailed] = useState(false)
  const url = localReceiptUrl(receipt)
  return <Dialog title="Receipt preview" onClose={onClose}>
    {!failed && url && <img className="receipt-preview" alt={receipt.fileName || 'Expense receipt'} src={url} onError={() => setFailed(true)} />}
    {failed && <p className="muted">An image preview is unavailable for this file.</p>}
    <div className="dialog-actions">{url && <a className="button" href={url} target="_blank" rel="noreferrer">Open Receipt File</a>}<button onClick={onClose}>Close</button></div>
  </Dialog>
}
