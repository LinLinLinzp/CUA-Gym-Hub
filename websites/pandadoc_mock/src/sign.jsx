import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { currencyOf, documentById, finishSigning, priceIsLocked, signingStatus } from './model.js'
import { documentValue, items, calculateTable } from './pricing.js'
import { PricingDisplay } from './pricing-ui.jsx'
import { Empty, Notice, money, nameOf, titleOf } from './ui.jsx'

const fieldAnchor = field => 'signature-' + field.id
const inputName = (field, index) => (field.label || 'Signature') + ' ' + (index + 1)

function Drawing({ onChange, label }) {
  const canvas = useRef(null)
  const pointer = useRef(null)
  function point(event) {
    const element = canvas.current
    const rect = element.getBoundingClientRect()
    return [(event.clientX - rect.left) * element.width / rect.width, (event.clientY - rect.top) * element.height / rect.height]
  }
  function start(event) {
    if (pointer.current !== null || event.button !== 0) return
    const element = canvas.current
    element.setPointerCapture(event.pointerId)
    pointer.current = event.pointerId
    const [x, y] = point(event)
    const context = element.getContext('2d')
    context.strokeStyle = '#192a37'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + 0.05, y + 0.05)
    context.stroke()
  }
  function move(event) {
    if (pointer.current !== event.pointerId) return
    const context = canvas.current.getContext('2d')
    context.lineTo(...point(event))
    context.stroke()
  }
  function end(event) {
    if (pointer.current !== event.pointerId) return
    pointer.current = null
    onChange(canvas.current.toDataURL('image/png'))
  }
  return <div className="stacked">
    <canvas ref={canvas} width="480" height="135" aria-label={label + ' drawing area'}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
    <button type="button" className="self-start" onClick={() => {
      const element = canvas.current
      element.getContext('2d').clearRect(0, 0, element.width, element.height)
      onChange('')
    }}>Clear drawing</button>
  </div>
}

function SignatureField({ field, index, entry, saved, editable, onChange }) {
  const label = inputName(field, index)
  const method = entry?.method || 'typed'
  return <section className="sign-field stacked" id={fieldAnchor(field)} aria-label={label}>
    <div><h3>{field.label || 'Signature'}</h3><small>{field.required ? 'Required' : 'Optional'}</small></div>
    {saved && (saved.method === 'drawn' ? <img className="drawn-preview" src={saved.value?.startsWith('data:image/png;base64,') ? saved.value : undefined}
      alt="Drawn signature" /> : <div className="typed-preview">{saved.value}</div>)}
    {editable && <>
      <label>Signature method<select value={method} onChange={event => onChange({ method: event.target.value, value: '' })}>
        <option value="typed">Type signature</option><option value="drawn">Draw signature</option>
      </select></label>
      {method === 'typed' ? <>
        <label>Type your signature<input aria-label={'Type your signature for ' + label} placeholder="Enter your name" value={entry?.value || ''}
          onChange={event => onChange({ method, value: event.target.value })} /></label>
        {entry?.value?.trim() && <div className="typed-preview" aria-label="Signature preview">{entry.value}</div>}
      </> : <Drawing label={label} onChange={value => onChange({ method, value })} />}
    </>}
  </section>
}

export function Sign() {
  const { documentId, recipientId } = useParams()
  const { state } = useWorkspace()
  const document = documentById(state, documentId)
  const recipient = items(document?.recipients).find(person => person.id === recipientId)
  if (!document || !recipient || document.status === 'draft') return <main className="page narrow">
    <Empty title="This recipient link is unavailable">Ask the sender for the link to your proposal.</Empty>
  </main>
  return <SigningView key={documentId + '/' + recipientId} document={document} recipient={recipient} />
}

function SigningView({ document, recipient }) {
  const { state, commit } = useWorkspace()
  const [entries, setEntries] = useState({})
  const [choices, setChoices] = useState({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const status = signingStatus(state, document, recipient)
  const currency = currencyOf(document, state.workspace)
  const fields = items(document.fields).filter(field => field.recipientId === recipient.id && field.type === 'signature')
  const canSign = status === 'ready' && fields.length > 0
  const locked = priceIsLocked(state, document.id)
  const canChoose = canSign && !locked
  const required = fields.filter(field => field.required)
  const saved = items(state.signatures).filter(signature => signature.documentId === document.id && signature.recipientId === recipient.id)
  const remaining = required.filter(field => !entries[field.id]?.value?.trim() && !saved.some(signature => signature.fieldId === field.id)).length
  const tables = items(document.pricingTables)
  const previewValue = canChoose && Object.keys(choices).length ? documentValue(tables.map(table => calculateTable({
    ...table, lineItems: items(table.lineItems).map(row => ({ ...row, ...choices[row.id] })),
  }))) : document.value

  async function finish() {
    if (pending || !canSign) return
    if (remaining) { setError('Complete every required signature before finishing.'); return }
    setError('')
    setPending(true)
    try {
      await commit(current => finishSigning(current, document, recipient.id, entries, choices))
      setChoices({})
      setMessage('Your signature was submitted.')
    } catch (failure) {
      if (failure.code === 'price_changed') setChoices({})
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  function renderField(field) {
    return <SignatureField key={field.id} field={field} index={fields.indexOf(field)} entry={entries[field.id]}
      saved={saved.find(signature => signature.fieldId === field.id)} editable={canSign} onChange={entry => {
        setError(''); setEntries(current => ({ ...current, [field.id]: entry }))
      }} />
  }
  const guidance = {
    completed: 'You have finished signing.',
    waiting: 'Waiting for the previous signer to finish.',
    'read-only': recipient.role === 'cc' ? 'You received a copy of this proposal.' : 'This proposal is available for review only.',
    ready: fields.length ? null : 'There are no signature fields assigned to you.',
  }

  return <main className="page signing-page">
    <div className="sign-grid">
      <article className="paper sign-paper">
        <header className="paper-title">
          <span>{state.workspace?.name || 'Workspace'}</span>
          <h1>{titleOf(document)}</h1>{document.company && <p>{document.company}</p>}
        </header>
        {items(document.sections).map(section => <section className="paper-section" key={section.id}>
          <h2>{section.heading || 'Untitled section'}</h2><p className="prose">{section.body || 'No section text.'}</p>
          {fields.filter(field => field.sectionId === section.id).map(renderField)}
        </section>)}
        {fields.filter(field => !items(document.sections).some(section => section.id === field.sectionId)).map(renderField)}
        {!!tables.length && <section className="paper-section"><h2>Pricing</h2>
          {locked && <p className="muted">Accepted pricing is locked.</p>}
          {tables.map(table => <section className="quoted-table" key={table.id}>
            <h3>{nameOf(table, 'Pricing table')}</h3>
            <PricingDisplay table={table} currency={table.currency || currency} canChoose={canChoose} choices={choices}
              onChoice={(key, change) => setChoices(current => ({ ...current, [key]: { ...current[key], ...change } }))} />
          </section>)}
        </section>}
      </article>
      <aside className="surface sign-panel" aria-label="Signing progress">
        <p className="meta">Reviewing as</p><h2>{nameOf(recipient, 'Recipient')}</h2>
        {recipient.email && <p className="muted">{recipient.email}</p>}
        <Notice error={error} message={message || guidance[status]} />
        {fields.length > 0 && <>
          <h3>Signature fields</h3>
          {canSign && <p className="muted">{remaining} of {required.length} required remaining</p>}
          <ul className="field-links">{fields.map((field, index) => <li key={field.id}>
            <a href={'#' + fieldAnchor(field)}>{inputName(field, index)}</a>
            <span aria-hidden="true">{entries[field.id]?.value?.trim() || saved.some(signature => signature.fieldId === field.id) ? '✓' : ''}</span>
          </li>)}</ul>
        </>}
        <div className="sign-total"><span>Proposal total</span><strong>{money(previewValue, currency)}</strong></div>
        {canSign && <button className="primary desktop-finish" onClick={finish} disabled={pending}>{pending ? 'Submitting…' : 'Finish'}</button>}
      </aside>
      {canSign && <div className="mobile-finish">
        <Notice error={error} />
        <button className="primary" onClick={finish} disabled={pending}>{pending ? 'Submitting…' : 'Finish'}</button>
      </div>}
    </div>
  </main>
}
