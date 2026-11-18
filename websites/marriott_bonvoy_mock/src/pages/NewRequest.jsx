import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { actionId, availableFolios, canRequestService, creditIssue, creditWindow, findRecord, linkedFolios, positiveInteger, rowsWith, validDay } from '../model'
import { AccountLink, Field, Title, dates, label, recordPath, records, sorted, useAccountNavigation } from '../ui'

const missing = 'missing_stay_credit'
const copy = 'folio_copy'
const service = 'hotel_service'
const services = ['extra_towels', 'extra_pillows', 'housekeeping']
const configurations = {
  [service]: ['New service request', 'Choose a current or upcoming stay and tell the hotel what you need.', ['/requests', 'Back to requests']],
  [missing]: ['Request missing stay credit', creditWindow, ['/points', 'Back to points']],
  [copy]: ['Request a folio copy', 'Choose the stay and enter the email address for the copy.', ['/folios', 'Back to folios']],
}

function canSelectStay(data, row, type) {
  if (type === service) return canRequestService(row)
  if (type === missing) return !creditIssue(data, row)
  if (!row.id) return false
  const linked = linkedFolios(data, row.id)
  return linked.some(folio => folio.status === 'unavailable') || (!linked.length && row.status === 'completed')
}

function choices(data, stay, type) {
  if (type === service) return []
  if (type === missing) return availableFolios(data, stay?.id)
  return linkedFolios(data, stay?.id).filter(folio => folio.id && folio.status === 'unavailable')
}

function requestFields(data, type, draft, stay, list, selectedFolio) {
  const errors = {}
  const fields = {}
  if (!data.member?.id) errors.form = 'Member details are required to submit a request.'
  if (!stay) errors.stay = 'Choose a stay.'
  else if (type === missing) {
    const issue = creditIssue(data, stay)
    if (issue) errors.stay = issue
  }
  else if (!canSelectStay(data, stay, type)) errors.stay = 'Choose a stay that qualifies for this request.'
  const folio = findRecord(list, selectedFolio)
  if (folio) fields.folioId = folio.id
  if ((type === missing || list.length) && !folio) errors.folio = 'Choose a folio.'
  if (type === missing && draft.points !== '') {
    if (!/^\d+$/.test(draft.points) || !Number.isSafeInteger(Number(draft.points))) errors.points = 'Enter a nonnegative whole number.'
    else fields.estimatedPoints = Number(draft.points)
  }
  if (type === copy) {
    const email = draft.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
    else fields.contactEmail = email
  }
  if (type === service) {
    if (!services.includes(draft.service)) errors.service = 'Choose a hotel service.'
    else {
      fields.service = draft.service
      if (draft.service === 'housekeeping') {
        if (!validDay(draft.requestedDate) || !validDay(stay?.checkIn) || !validDay(stay?.checkOut) ||
          draft.requestedDate < stay.checkIn || draft.requestedDate > stay.checkOut) errors.requestedDate = 'Choose a date within the stay.'
        else fields.requestedDate = draft.requestedDate
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.requestedTime)) errors.requestedTime = 'Enter a time.'
        else fields.requestedTime = draft.requestedTime
      } else if (!positiveInteger(draft.quantity)) errors.quantity = 'Enter a positive whole number.'
      else fields.quantity = Number(draft.quantity)
    }
  }
  return { errors, fields }
}

export function NewRequest() {
  const [params] = useSearchParams()
  const preset = { type: params.get('type') || service, stay: params.get('stay'), folio: params.get('folio') }
  if (!Object.hasOwn(configurations, preset.type)) return <Title title="Request unavailable" back={['/requests', 'Back to requests']} />
  return <RequestForm key={JSON.stringify(preset)} preset={preset} />
}

function RequestForm({ preset }) {
  const { data, commit } = useAccount()
  const { go } = useAccountNavigation()
  const type = preset.type
  const [title, description, back] = configurations[type]
  const [draft, setDraft] = useState({
    stayId: preset.stay || '', folioId: preset.folio, notes: '', points: '', email: data.member?.email || '',
    service: '', quantity: '', requestedDate: '', requestedTime: '',
  })
  const [errors, setErrors] = useState({})
  const submitted = useRef(false)
  const candidates = sorted(records(data.stays).filter(row => row.id && (canSelectStay(data, row, type) || String(row.id) === preset.stay)), row => row.checkOut)
  const stay = findRecord(candidates, draft.stayId)
  const folios = choices(data, stay, type)
  const selectedFolio = draft.folioId ?? (folios.length === 1 ? String(folios[0].id) : '')
  const issue = type === missing && stay && creditIssue(data, stay)

  function change(key, value) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const { errors: nextErrors } = requestFields(data, type, draft, stay, folios, selectedFolio)
    if (event.currentTarget.elements.estimatedPoints?.validity.badInput) nextErrors.points = 'Enter a nonnegative whole number.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const id = actionId('REQ')
    const saved = commit(current => {
      const linkedStay = findRecord(current.stays, draft.stayId)
      const { errors: validation, fields } = requestFields(current, type, draft, linkedStay, choices(current, linkedStay, type), selectedFolio)
      if (Object.keys(validation).length) return null
      const now = new Date().toISOString()
      const actorId = current.member.id
      const record = { id, type, stayId: linkedStay.id, ...fields, status: 'submitted', actorId, createdAt: now, updatedAt: now,
        notes: draft.notes.trim(), history: [{ status: 'submitted', actorId, createdAt: now }] }
      return { ...current, requests: rowsWith(current.requests, record) }
    })
    if (saved) {
      submitted.current = true
      go(recordPath('requests', id), {}, { state: { submitted: true } })
    } else setErrors({ form: 'This case could not be submitted. Review the request details and try again.' })
  }

  return <>
    <Title title={title} description={description} back={back} />
    {!data.member?.id ? <div className="panel empty">Member details are required to submit a request.</div> :
      <form className="panel form" onSubmit={submit} noValidate>
        <Field label="Stay" error={errors.stay}>
          <select required value={stay ? String(stay.id) : ''} aria-invalid={!!errors.stay} onChange={event => {
            setDraft(current => ({ ...current, stayId: event.target.value, folioId: null }))
            setErrors({})
          }}>
            <option value="">Choose a stay</option>
            {candidates.map(row => <option key={row.id} value={row.id}>{row.propertyName || 'Hotel stay'} · {dates(row)}{row.confirmationNumber ? ' · ' + row.confirmationNumber : ''}</option>)}
          </select>
        </Field>
        {!candidates.length && <p>No stays currently qualify for this request.</p>}
        {issue && <p>{issue}</p>}
        {stay && !issue && folios.length > 0 && <Field label="Folio" error={errors.folio}>
          <select value={selectedFolio} onChange={event => change('folioId', event.target.value)} required aria-invalid={!!errors.folio}>
            <option value="">Choose a folio</option>
            {folios.map(row => <option key={row.id} value={row.id}>{row.number || 'Hotel folio'}</option>)}
          </select>
        </Field>}
        {type === missing && stay && !issue && !folios.length && <p>An available folio is required. <AccountLink to="/requests/new" query={{ type: copy, stay: stay.id }}>Request a copy</AccountLink></p>}
        {type === missing && <Field label="Estimated points (optional)" error={errors.points}><input name="estimatedPoints" type="number" step="1" min="0" value={draft.points} aria-invalid={!!errors.points} onChange={event => change('points', event.target.value)} /></Field>}
        {type === copy && <Field label="Contact email" error={errors.email}><input type="email" autoComplete="email" value={draft.email} required aria-invalid={!!errors.email} onChange={event => change('email', event.target.value)} /></Field>}
        {type === service && <>
          <Field label="Service" error={errors.service}><select required value={draft.service} aria-invalid={!!errors.service} onChange={event => change('service', event.target.value)}>
            <option value="">Choose a service</option>
            {services.map(item => <option key={item} value={item}>{label(item)}</option>)}
          </select></Field>
          {draft.service === 'housekeeping' ? <div className="form-grid">
            <Field label="Requested date" error={errors.requestedDate}><input required type="date" value={draft.requestedDate} min={stay?.checkIn} max={stay?.checkOut}
              aria-invalid={!!errors.requestedDate} onChange={event => change('requestedDate', event.target.value)} /></Field>
            <Field label="Requested time (hotel local time)" error={errors.requestedTime}><input required type="time" value={draft.requestedTime}
              aria-invalid={!!errors.requestedTime} onChange={event => change('requestedTime', event.target.value)} /></Field>
          </div> : draft.service && <Field label="Quantity" error={errors.quantity}><input required type="number" step="1" min="1" value={draft.quantity}
            aria-invalid={!!errors.quantity} onChange={event => change('quantity', event.target.value)} /></Field>}
        </>}
        <Field label="Notes (optional)"><textarea value={draft.notes} onChange={event => change('notes', event.target.value)} /></Field>
        {errors.form && <span className="field-error" role="alert">{errors.form}</span>}
        <div className="actions"><button type="submit" className="primary" disabled={type === missing && stay && !issue && !folios.length}>Submit request</button></div>
      </form>}
  </>
}
