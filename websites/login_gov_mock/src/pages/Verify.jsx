import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BackLink, ConfirmDialog, LocalLink, PageTitle, Status } from '../components/ui.jsx'
import { useAccount } from '../context/AccountContext.jsx'
import { activeAttempt, findService, formatDate, isVerified, paths } from '../data/selectors.js'
import {
  completedAttempt, documentNames, documentTypes, finishAttempt, methodNames,
  reviewReady, startAttempt, submitAttempt, updateAttempt, visitExpired,
} from '../data/verification.js'

const stages = [
  ['method', 'Method'],
  ['sample_identity', 'Review sample identity'],
  ['sample_contact', 'Confirm sample contact'],
  ['review', 'Review and submit'],
]

function resumeStep(attempt) {
  const step = stages.findIndex(([key]) => key === attempt.step)
  if (step <= 0 || !methodNames[attempt.method]) return 0
  if (step === 1 || !documentTypes(attempt.method).includes(attempt.documentType) || !attempt.sampleIdentityConfirmed) return 1
  return step === 2 || !attempt.sampleContactConfirmed ? 2 : 3
}

export function Verify() {
  const { state, commit } = useAccount()
  const [query] = useSearchParams()
  const verified = isVerified(state)
  const active = activeAttempt(state)
  const service = findService(state, query.get('service'))
    || findService(state, active?.serviceId)
    || (verified && findService(state, completedAttempt(state)?.serviceId))
  const destination = service ? paths.consent(service.id) : paths.identity
  const destinationLabel = service ? 'Return to service consent' : 'Back to identity'

  return (
    <section className="narrow">
      <BackLink to={destination}>{destinationLabel}</BackLink>
      <PageTitle>Verify identity</PageTitle>
      {service && <p className="lead">Verification for {service.name || 'this agency service'}.</p>}
      {verified ? (
        <div className="panel stack">
          <div><Status value="verified" /></div>
          <div>
            <h2>Identity verified</h2>
            <p>{service ? 'You can now review what this service is requesting.' : 'Your account has a verified identity.'}</p>
          </div>
          <div><LocalLink className="button" to={destination}>{service ? 'Continue to consent' : 'Return to identity'}</LocalLink></div>
        </div>
      ) : active ? (
        <ActiveVerification key={active.id} attempt={active} />
      ) : (
        <div className="panel section-gap">
          <h2>Start verification</h2>
          <p>Use the sample identity and contact information shown in this workspace.</p>
          <div className="actions">
            <button className="button" disabled={!state.account?.id} onClick={() => commit(world => startAttempt(world, service?.id))}>Start verification</button>
          </div>
        </div>
      )}
    </section>
  )
}

function ActiveVerification({ attempt }) {
  const { commit } = useAccount()
  const [editing, setEditing] = useState(null)
  const [dialog, setDialog] = useState(null)
  const pending = attempt.status === 'pending_in_person'
  const expired = pending && visitExpired(attempt)
  const step = editing ?? resumeStep(attempt)
  const update = (change, notice) => commit(world => updateAttempt(world, attempt, change), notice)
  const cancel = async () => {
    if (await update((current, now) => ({ ...current, status: 'canceled', canceledAt: now.toISOString() }), 'Verification canceled.')) setDialog(null)
  }
  async function completeVisit() {
    if (await update((current, now) => current.status === 'pending_in_person' && !visitExpired(current, now)
      ? finishAttempt(current, now) : null, 'Sample visit completed. Your identity is verified.')) setDialog(null)
  }

  return (
    <div className="panel section-gap">
      {pending ? (
        <>
          <div className="status-summary"><Status value={attempt.status} /></div>
          <h2>Sample visit</h2>
          {expired
            ? <p className="alert">Your sample visit deadline has passed. Cancel this attempt to start another.</p>
            : <p>Use the reference below for this sample visit.</p>}
          <dl className="summary">
            <div><dt>Visit reference</dt><dd>{attempt.visitReference || 'Reference unavailable'}</dd></div>
            <div><dt>Visit deadline</dt><dd>{formatDate(attempt.visitDeadlineAt, true)}</dd></div>
          </dl>
          {!expired && <div className="actions"><button className="button" onClick={() => setDialog('visit')}>Complete sample visit</button></div>}
        </>
      ) : (
        <StepForm key={step} attempt={attempt} step={step} back={() => setEditing(step - 1)}
          onContinue={async change => { if (await update(change)) setEditing(null) }}
          onSubmit={() => update(submitAttempt, attempt.method === 'online' ? 'Your identity is verified.' : 'Your sample visit is ready.')} />
      )}
      <div className="actions">
        <button type="button" className="button secondary" onClick={() => setDialog('cancel')}>Cancel verification</button>
      </div>
      {dialog === 'cancel' && (
        <ConfirmDialog title="Cancel verification?" onClose={() => setDialog(null)} onConfirm={cancel} confirmLabel="Cancel verification" destructive>
          <p className="dialog-description">This ends your current verification attempt. You can start another attempt from this page.</p>
        </ConfirmDialog>
      )}
      {dialog === 'visit' && (
        <ConfirmDialog title="Complete sample visit?" onClose={() => setDialog(null)} onConfirm={completeVisit} confirmLabel="Confirm sample visit" confirmDisabled={expired}>
          <p className="dialog-description">Confirm the sample visit to mark your identity as verified.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

function StepForm({ attempt, step, back, onContinue, onSubmit }) {
  const heading = useRef(null)
  const [method, setMethod] = useState(attempt.method || '')
  const [document, setDocument] = useState(attempt.documentType || '')
  const [confirmed, setConfirmed] = useState(step === 1 ? Boolean(attempt.sampleIdentityConfirmed) : Boolean(attempt.sampleContactConfirmed))
  const [error, setError] = useState('')
  const types = documentTypes(attempt.method)
  useEffect(() => { heading.current.focus({ preventScroll: true }) }, [])

  function advance(event) {
    event.preventDefault()
    if (step === 0) {
      if (!methodNames[method]) return setError('Choose a verification method.')
      onContinue(current => {
        const next = { ...current, method, step: 'sample_identity' }
        if (current.method !== method) {
          delete next.documentType
          next.sampleIdentityConfirmed = false
          next.sampleContactConfirmed = false
        }
        return next
      })
    } else if (step === 1) {
      if (!types.includes(document) || !confirmed) return setError('Choose an accepted document type and confirm the sample identity.')
      onContinue(current => ({
        ...current, documentType: document, sampleIdentityConfirmed: true, step: 'sample_contact',
        sampleContactConfirmed: current.documentType === document && Boolean(current.sampleContactConfirmed),
      }))
    } else if (step === 2) {
      if (!confirmed) return setError('Confirm the sample contact to continue.')
      onContinue(current => ({ ...current, sampleContactConfirmed: true, step: 'review' }))
    } else {
      onSubmit()
    }
  }

  return (
    <form onSubmit={advance}>
      <p className="step">Step {step + 1} of {stages.length}</p>
      <h2 className="step-title" tabIndex={-1} ref={heading}>{stages[step][1]}</h2>
      {step === 0 && (
        <fieldset aria-describedby={error ? 'step-error' : undefined}>
          <legend>Choose how to complete the sample verification.</legend>
          <div className="choice-grid">
            {Object.entries(methodNames).map(([value, label]) => (
              <label className="choice" key={value}>
                <input name="method" value={value} type="radio" checked={method === value} onChange={() => { setMethod(value); setError('') }} />
                <span><strong>{label}</strong><small>{value === 'online' ? 'Complete the sample steps here.' : 'Get a reference for a sample visit.'}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {step === 1 && (
        <>
          <div className="field">
            <label htmlFor="sample-document">Document type</label>
            <select id="sample-document" value={types.includes(document) ? document : ''} aria-describedby={error ? 'step-error' : undefined}
              onChange={event => { setDocument(event.target.value); setConfirmed(false); setError('') }}>
              <option value="">Choose a document type</option>
              {types.map(type => <option key={type} value={type}>{documentNames[type]}</option>)}
            </select>
          </div>
          <div className="sample">
            <p><strong>Sample identity</strong></p>
            <p>Jordan Avery</p>
            <p className="meta">{types.includes(document) ? `${documentNames[document]} · •••• 0428` : 'Select a document type to view the sample.'}</p>
          </div>
          <label className="choice"><input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setError('') }}
            aria-describedby={error ? 'step-error' : undefined} /> I confirm the sample identity.</label>
        </>
      )}
      {step === 2 && (
        <>
          <div className="sample"><strong>Sample phone number</strong><p className="meta">••• ••• 0142</p></div>
          <label className="choice"><input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setError('') }}
            aria-describedby={error ? 'step-error' : undefined} /> I confirm the sample contact.</label>
        </>
      )}
      {step === 3 && (
        <dl className="summary">
          <div><dt>Verification method</dt><dd>{methodNames[attempt.method]}</dd></div>
          <div><dt>Sample identity</dt><dd>Jordan Avery · {documentNames[attempt.documentType]}</dd></div>
          <div><dt>Sample contact</dt><dd>Phone ending in 0142</dd></div>
        </dl>
      )}
      {error && <p className="error" id="step-error" role="alert">{error}</p>}
      <div className="actions">
        <button className="button" disabled={step === 3 && !reviewReady(attempt)}>{step === 3 ? 'Submit verification' : 'Continue'}</button>
        {step > 0 && <button type="button" className="button secondary" onClick={back}>Back</button>}
      </div>
    </form>
  )
}
