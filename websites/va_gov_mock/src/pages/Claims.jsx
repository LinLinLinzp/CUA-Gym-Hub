import { useState } from 'react'
import { actor, newId, useAccount } from '../state'
import { dateLabel, label, matches, newest, recordPath, useRecordId } from '../records'
import {
  AccountLink, Badge, Details, Field, Filter, FormActions, Notice, Page, Panel,
  RecordLink, RecordList, Search, useFilters,
} from '../components/ui'
import Missing from '../components/Missing'

const base = '/claims'
const statusFilters = [['all', 'All claims'], ['active', 'Active'], ['decided', 'Decided']]
const claimReasons = [['new_condition', 'New condition'], ['increase', 'Increase for a service-connected condition']]
const reasons = Object.fromEntries(claimReasons)
const types = [['medical_record', 'Medical record'], ['service_record', 'Service record'], ['supporting_statement', 'Supporting statement'], ['other', 'Other']]
const fileTypes = { pdf: 'application/pdf', gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp', txt: 'text/plain' }
const canSubmitEvidence = claim => claim?.type === 'disability_compensation' && claim.status && claim.status !== 'decided'

export function Claims() {
  const { state } = useAccount()
  const filters = useFilters()
  const records = state.claims.filter(claim =>
    (filters.filter === 'all' || (filters.filter === 'active' ? claim.status !== 'decided' : claim.status === 'decided')) &&
    matches(filters.query, claim.id, label(claim.type), ...(claim.conditions || []))
  ).sort(newest('updatedAt'))
  return <Page title="Claims" description="Track claims and manage supporting evidence."
    action={<AccountLink className="button" to={base + '/new'}>File a disability claim</AccountLink>}>
    <div className="filters"><Search title="Search claims" filters={filters} /><Filter title="Claim status" options={statusFilters} filters={filters} /></div>
    <RecordList title="Claims" records={records} filters={filters} empty="No claims match these filters."
      columns={['Claim', 'Status', 'Filed', 'Last updated']} cells={claim => [
        <RecordLink to={recordPath(base, claim.id)} title={claim.conditions?.join(', ') || label(claim.type)} detail={`${label(claim.type)} · ${claim.id}`} />,
        <Badge value={claim.status} />, dateLabel(claim.createdAt), dateLabel(claim.updatedAt),
      ]} />
  </Page>
}

function downloadLetter(letter) {
  const url = URL.createObjectURL(new Blob([letter.text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = letter.fileName || 'claim-decision.txt'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function EvidenceForm({ claimId, onComplete }) {
  const { apply } = useAccount()
  const [type, setType] = useState('')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    const extension = /\.(pdf|gif|jpe?g|bmp|txt)$/i.exec(file?.name)?.[1].toLowerCase()
    const mimeType = fileTypes[extension]
    if (!types.some(([value]) => value === type)) nextErrors.type = 'Choose a document type.'
    if (!file) nextErrors.file = 'Choose a file to submit.'
    else if (!mimeType) nextErrors.file = 'Choose a PDF, GIF, JPEG, BMP, or TXT file.'
    else if (file.size > 25 * 1024 * 1024) nextErrors.file = 'Choose a file that is 25 MB or smaller.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const saved = apply(state => {
      if (!canSubmitEvidence(state.claims.find(claim => claim.id === claimId))) return
      const createdAt = new Date().toISOString()
      const record = {
        id: newId('evidence', state.claimEvidence), claimId, fileName: file.name, mimeType,
        sizeBytes: file.size, documentType: type, status: 'submitted', actorId: actor(state), createdAt,
      }
      return {
        ...state, claimEvidence: [...state.claimEvidence, record],
        claims: state.claims.map(claim => claim.id === claimId ? { ...claim, updatedAt: createdAt } : claim),
      }
    })
    if (saved) {
      setType('')
      setFile(null)
      event.target.reset()
      onComplete(file.name)
    } else setErrors({ form: 'This claim is no longer eligible for evidence submissions.' })
  }
  return <Panel title="Add evidence">
    <p>Choose a PDF, GIF, JPEG, BMP, or TXT file up to 25 MB.</p>
    <form className="form-stack" onSubmit={submit} noValidate>
      {Object.keys(errors).length > 0 && <Notice error>{errors.form || 'Check the highlighted evidence fields.'}</Notice>}
      <Field title="Document type" error={errors.type}><select value={type} onChange={event => setType(event.target.value)} aria-invalid={!!errors.type}>
        <option value="">Select a document type</option>
        {types.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
      </select></Field>
      <Field title="Evidence file" error={errors.file}><input type="file" accept=".pdf,.gif,.jpg,.jpeg,.bmp,.txt" onChange={event => setFile(event.target.files[0] || null)} aria-invalid={!!errors.file} /></Field>
      {file && <p className="callout">Selected file: <strong>{file.name}</strong></p>}
      <FormActions submit="Submit evidence" />
    </form>
  </Panel>
}

export function ClaimDetail() {
  const id = useRecordId()
  const { state } = useAccount()
  const [submitted, setSubmitted] = useState('')
  const claim = state.claims.find(item => item.id === id)
  if (!claim) return <Missing title="Claim unavailable" to={base} back="Claims" />
  const evidence = state.claimEvidence.filter(item => item.claimId === id).sort(newest('createdAt'))
  const history = [...(claim.history || [])].sort(newest('createdAt', 'status'))
  return <Page title={label(claim.type)} back="Claims" to={base} description={claim.id}>
    {submitted && <Notice>Evidence submitted. {submitted} is listed under Submitted evidence.</Notice>}
    <Panel title="Claim details"><Details rows={[
      ['Status', <Badge value={claim.status} />], ['Filed', dateLabel(claim.createdAt)], ['Last updated', dateLabel(claim.updatedAt)],
      ['Conditions', claim.conditions?.join(', ') || '—'], ['Claim reason', reasons[claim.reason] || label(claim.reason)],
    ]} /></Panel>
    <Panel title="Status history">
      {history.length ? <ol className="subrows">{history.map((entry, index) => <li key={index}><strong>{label(entry.status)}</strong><small>{dateLabel(entry.createdAt)}</small></li>)}</ol> : <p>No status history available.</p>}
    </Panel>
    {claim.decisionLetter?.text && <Panel title="Decision letter">
      <p>Issued {dateLabel(claim.decisionLetter.issuedAt)}</p>
      <button type="button" className="button secondary" onClick={() => downloadLetter(claim.decisionLetter)}>Download decision letter</button>
    </Panel>}
    <Panel title="Evidence requests">
      {claim.evidenceRequests?.length ? <ul className="subrows">{claim.evidenceRequests.map(request => <li key={request.id}>
        <strong>{request.title || request.id}</strong> <Badge value={request.status} />
        {request.dueDate && <small>Due {dateLabel(request.dueDate)}</small>}
      </li>)}</ul> : <p>No evidence requests.</p>}
    </Panel>
    <Panel title="Submitted evidence">
      {evidence.length ? <ul className="subrows">{evidence.map(item => <li key={item.id}>
        <strong>{item.fileName || item.id}</strong> <Badge value={item.status} />
        <small>{label(item.documentType)} · {dateLabel(item.createdAt)}</small>
      </li>)}</ul> : <p>No evidence submitted.</p>}
    </Panel>
    {canSubmitEvidence(claim) && <EvidenceForm claimId={id} onComplete={setSubmitted} />}
  </Page>
}

export function NewClaim() {
  const { apply } = useAccount()
  const [reason, setReason] = useState('')
  const [conditions, setConditions] = useState([''])
  const [review, setReview] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [errors, setErrors] = useState({})
  const [savedId, setSavedId] = useState('')
  function submit(event) {
    event.preventDefault()
    if (savedId) return
    if (!review) {
      const nextErrors = {}
      if (!reasons[reason]) nextErrors.reason = 'Choose a claim reason.'
      conditions.forEach((condition, index) => {
        if (!condition.trim()) nextErrors[index] = 'Enter a condition name.'
      })
      setErrors(nextErrors)
      if (!Object.keys(nextErrors).length) setReview(true)
      return
    }
    if (!acknowledged) {
      setErrors({ acknowledgment: 'Acknowledge the application details before submitting.' })
      return
    }
    let id
    apply(state => {
      id = newId('claim', state.claims)
      const createdAt = new Date().toISOString()
      const actorId = actor(state)
      return { ...state, claims: [...state.claims, {
        id, type: 'disability_compensation', reason, conditions: conditions.map(condition => condition.trim()),
        status: 'received', acknowledged: true, createdAt, updatedAt: createdAt, actorId,
        history: [{ status: 'received', createdAt, actorId }],
      }] }
    })
    setSavedId(id)
  }
  return <Page title="File for disability compensation" back="Claims" to={base}>
    {savedId ? <Notice><strong>Claim submitted.</strong> Reference ID {savedId}. <AccountLink to={recordPath(base, savedId)}>View your new claim</AccountLink>.</Notice> :
      <Panel title={review ? 'Review your application' : 'Claim information'}>
        <form className="form-stack" onSubmit={submit} noValidate>
          {!!Object.keys(errors).length && <Notice error>{errors.acknowledgment || 'Check the highlighted claim fields.'}</Notice>}
          {review ? <>
            <Details rows={[[ 'Claim reason', reasons[reason]], ['Conditions', conditions.map(condition => condition.trim()).join(', ')]]} />
            <label className="check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
              <span>I acknowledge that the information in this application is correct.</span>
            </label>
            <FormActions submit="Submit claim" onBack={() => { setReview(false); setErrors({}) }} />
          </> : <>
            <Field title="Claim reason" error={errors.reason}><select value={reason} onChange={event => setReason(event.target.value)} aria-invalid={!!errors.reason}>
              <option value="">Select a reason</option>
              {claimReasons.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
            </select></Field>
            <fieldset><legend>Conditions</legend><div className="condition-list">
              {conditions.map((condition, index) => <div className="condition-input" key={index}>
                <Field title={`Condition ${index + 1}`} error={errors[index]}><input maxLength={150} value={condition} aria-invalid={!!errors[index]}
                  onChange={event => setConditions(conditions.map((value, i) => i === index ? event.target.value : value))} /></Field>
                {conditions.length > 1 && <button className="button secondary" type="button" aria-label={`Remove condition ${index + 1}`}
                  onClick={() => { setConditions(conditions.filter((_, i) => i !== index)); setErrors({}) }}>Remove</button>}
              </div>)}
              <div><button className="button secondary" type="button" onClick={() => setConditions([...conditions, ''])}>Add another condition</button></div>
            </div></fieldset>
            <FormActions submit="Review application" back={base} />
          </>}
        </form>
      </Panel>}
  </Page>
}
