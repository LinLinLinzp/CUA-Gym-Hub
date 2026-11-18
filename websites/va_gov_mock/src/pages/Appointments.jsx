import { useState } from 'react'
import { actor, newId, useAccount } from '../state'
import { appointmentSection, dateLabel, facilityName, label, matches, newest, recordPath, useRecordId, zonedClock } from '../records'
import {
  AccountLink, Badge, Details, Dialog, Field, FormActions, Notice, Page, Panel,
  RecordLink, RecordList, Search, Tabs, useFilters,
} from '../components/ui'
import Missing from '../components/Missing'

const base = '/appointments'
const sections = ['Upcoming', 'Requests', 'Past']
const formats = [['in_person', 'In person'], ['video', 'Video'], ['phone', 'Phone']]
const formatName = value => formats.find(([key]) => key === value)?.[1] || label(value)
const canCancel = visit => visit?.status === 'requested' || (visit?.canCancel === true && appointmentSection(visit) === 'Upcoming')

function visitTime(visit, facility) {
  if (visit.startsAt) {
    const baseOptions = { timeStyle: 'short' }
    return dateLabel(visit.startsAt, { ...baseOptions, timeZone: zonedClock(facility?.timeZone).timeZone })
  }
  if (visit.preferredDate) return `${dateLabel(visit.preferredDate)}${visit.preferredTime ? ' · ' + visit.preferredTime : ''}`
  return '—'
}

export function Appointments() {
  const { state } = useAccount()
  const filters = useFilters('Upcoming')
  const facilities = new Map(state.facilities.map(facility => [facility.id, facility]))
  const records = state.appointments.filter(visit =>
    appointmentSection(visit) === filters.filter &&
    matches(filters.query, visit.clinic, facilityName(facilities.get(visit.facilityId)), formatName(visit.visitType), visit.id)
  ).sort(filters.filter === 'Upcoming'
    ? (a, b) => new Date(a.startsAt) - new Date(b.startsAt) || a.id.localeCompare(b.id)
    : (a, b) => newest('date')({ ...a, date: a.startsAt || a.createdAt }, { ...b, date: b.startsAt || b.createdAt }))
  return <Page title="Appointments" description="Manage your VA health care visits."
    action={<AccountLink className="button" to={base + '/new'}>Request an appointment</AccountLink>}>
    <Tabs title="Appointment views" options={sections} filters={filters} />
    <div className="filters"><Search title="Search appointments" filters={filters} /></div>
    <RecordList title={filters.filter + ' appointments'} records={records} filters={filters} empty="No appointments match this view."
      columns={['Appointment', 'Facility', 'Date and time', 'Status']} cells={visit => [
        <RecordLink to={recordPath(base, visit.id)} title={visit.clinic || visit.id} detail={formatName(visit.visitType)} />,
        facilityName(facilities.get(visit.facilityId)), visitTime(visit, facilities.get(visit.facilityId)),
        <Badge value={visit.status} />,
      ]} />
  </Page>
}

export function AppointmentDetail() {
  const id = useRecordId()
  const { state, apply } = useAccount()
  const [dialog, setDialog] = useState(false)
  const [reason, setReason] = useState('')
  const [result, setResult] = useState(null)
  const visit = state.appointments.find(item => item.id === id)
  if (!visit) return <Missing title="Appointment unavailable" to={base} back="Appointments" />
  const facility = state.facilities.find(item => item.id === visit.facilityId)
  const request = visit.status === 'requested'
  function cancel(event) {
    event.preventDefault()
    const saved = apply(current => {
      const record = current.appointments.find(item => item.id === id)
      if (!canCancel(record)) return
      const canceledAt = new Date().toISOString()
      return { ...current, appointments: current.appointments.map(item => item.id === id ? {
        ...item, status: 'canceled', canceledAt, canceledBy: actor(current), cancelReason: reason.trim(), updatedAt: canceledAt,
      } : item) }
    })
    setDialog(false)
    setResult(saved ? { message: request ? 'Appointment request canceled.' : 'Appointment canceled.' } : { error: true, message: 'This appointment can no longer be canceled.' })
  }
  return <Page title={visit.clinic || 'Appointment details'} back="Appointments" to={base} description={id}>
    {result && <Notice error={result.error}>{result.message} {!result.error && 'You can find it under Past appointments.'}</Notice>}
    <Panel title="Visit details"><Details rows={[
      ['Status', <Badge value={visit.status} />], ['Facility', facilityName(facility)], ['Visit format', formatName(visit.visitType)],
      [visit.preferredDate && !visit.startsAt ? 'Preferred date and time' : 'Date and time', visitTime(visit, facility)],
      ['Reason', visit.reason], ...(visit.status === 'canceled' ? [['Canceled on', dateLabel(visit.canceledAt)], ['Cancellation reason', visit.cancelReason || '—']] : []),
    ]} />
      {canCancel(visit) && <button type="button" className="button secondary" onClick={() => { setReason(''); setDialog(true) }}>
        {request ? 'Cancel request' : 'Cancel appointment'}
      </button>}
    </Panel>
    {dialog && <Dialog title={request ? 'Cancel this appointment request?' : 'Cancel this appointment?'} onDismiss={() => setDialog(false)}>
      <p>{visit.clinic || 'Appointment'} · {facilityName(facility)}</p>
      <form className="form-stack" onSubmit={cancel}>
        <Field title="Reason for cancellation (optional)"><textarea rows={2} maxLength={400} value={reason} onChange={event => setReason(event.target.value)} /></Field>
        <div className="button-row">
          <button type="button" className="button secondary" onClick={() => setDialog(false)}>{request ? 'Keep request' : 'Keep appointment'}</button>
          <button className="button" type="submit">Confirm cancellation</button>
        </div>
      </form>
    </Dialog>}
  </Page>
}

const initial = { facilityId: '', clinic: '', visitType: '', preferredDate: '', preferredTime: '', reason: '' }

function validate(values, facility) {
  const result = {}
  const now = zonedClock(facility?.timeZone)
  if (!facility) result.facilityId = 'Choose a facility.'
  if (!facility?.clinics?.includes(values.clinic)) result.clinic = 'Choose a clinic.'
  if (!formats.some(([format]) => format === values.visitType)) result.visitType = 'Choose a visit format.'
  if (!values.preferredDate || values.preferredDate < now.date) result.preferredDate = 'Choose a current or future date.'
  if (!values.preferredTime || (values.preferredDate === now.date && values.preferredTime <= now.time)) result.preferredTime = 'Choose a future time.'
  if (!values.reason.trim()) result.reason = 'Enter a reason for the visit.'
  return result
}

export function NewAppointment() {
  const { state, apply } = useAccount()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState(false)
  const [savedId, setSavedId] = useState('')
  const facility = state.facilities.find(item => item.id === values.facilityId)
  const now = zonedClock(facility?.timeZone)
  function setField(name, value) {
    setValues(previous => ({ ...previous, [name]: value, ...(name === 'facilityId' ? { clinic: '' } : {}) }))
  }
  function submit(event) {
    event.preventDefault()
    if (savedId) return
    const nextErrors = validate(values, facility)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setReview(false)
      return
    }
    if (!review) {
      setReview(true)
      return
    }
    let id
    const saved = apply(current => {
      const currentFacility = current.facilities.find(item => item.id === values.facilityId)
      if (Object.keys(validate(values, currentFacility)).length) return
      id = newId('appt', current.appointments)
      const createdAt = new Date().toISOString()
      return { ...current, appointments: [...current.appointments, {
        ...values, reason: values.reason.trim(), id, status: 'requested', actorId: actor(current), createdAt, updatedAt: createdAt,
      }] }
    })
    if (saved) setSavedId(id)
    else { setReview(false); setErrors({ form: 'Check your appointment details and try again.' }) }
  }
  return <Page title="Request an appointment" back="Appointments" to={base}>
    {savedId ? <Notice><strong>Appointment requested.</strong> Reference ID {savedId}. <AccountLink to={recordPath(base, savedId)}>View appointment request</AccountLink>.</Notice> :
      <Panel title={review ? 'Review your appointment request' : 'Visit preferences'}>
        {state.facilities.length ? <form className="form-stack" onSubmit={submit} noValidate>
          {!!Object.keys(errors).length && <Notice error>{errors.form || 'Check the highlighted appointment fields.'}</Notice>}
          {review ? <>
            <Details rows={[
              ['Facility', facilityName(facility)], ['Clinic', values.clinic], ['Visit format', formatName(values.visitType)],
              ['Preferred date and time', visitTime(values, facility)], ['Reason', values.reason.trim()],
            ]} />
            <FormActions submit="Submit request" onBack={() => setReview(false)} />
          </> : <>
            <Field title="Facility" error={errors.facilityId}><select value={values.facilityId} aria-invalid={!!errors.facilityId} onChange={event => setField('facilityId', event.target.value)}>
              <option value="">Select a facility</option>
              {state.facilities.map(item => <option key={item.id} value={item.id}>{facilityName(item)}</option>)}
            </select></Field>
            <Field title="Clinic" error={errors.clinic}><select value={values.clinic} disabled={!facility?.clinics?.length} aria-invalid={!!errors.clinic} onChange={event => setField('clinic', event.target.value)}>
              <option value="">{facility && !facility.clinics?.length ? 'No clinics available' : 'Select a clinic'}</option>
              {facility?.clinics?.map(clinic => <option key={clinic}>{clinic}</option>)}
            </select></Field>
            <Field title="Visit format" error={errors.visitType}><select value={values.visitType} aria-invalid={!!errors.visitType} onChange={event => setField('visitType', event.target.value)}>
              <option value="">Select a format</option>
              {formats.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select></Field>
            <Field title="Preferred date" error={errors.preferredDate}><input type="date" min={now.date} value={values.preferredDate} aria-invalid={!!errors.preferredDate} onChange={event => setField('preferredDate', event.target.value)} /></Field>
            <Field title="Preferred time" error={errors.preferredTime}><input type="time" value={values.preferredTime} aria-invalid={!!errors.preferredTime} onChange={event => setField('preferredTime', event.target.value)} /></Field>
            {facility?.timeZone && <small>Enter your preferred time in the facility time zone ({facility.timeZone}).</small>}
            <Field title="Reason for visit" error={errors.reason}><textarea rows={3} maxLength={400} value={values.reason} aria-invalid={!!errors.reason} onChange={event => setField('reason', event.target.value)} /></Field>
            <FormActions submit="Review request" back={base} />
          </>}
        </form> : <p>There are no facilities available for appointment requests.</p>}
      </Panel>}
  </Page>
}
