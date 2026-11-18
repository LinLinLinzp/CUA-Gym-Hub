import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { cancelAppointment, saveAppointment } from './actions.js'
import { address, find, identified, instantLabel, isUpcoming, list, offers, patientName, storeName, vaccineSlots } from './domain.js'
import { usePharmacy } from './state.jsx'
import { AppointmentTime, Details, Dialog, Empty, ErrorMessage, Icon, Missing, PageHeader, Receipt, RecordLink, RouteLink, SelectField, Status } from './ui.jsx'

const visitPath = (id) => '/vaccines/' + encodeURIComponent(id)
const vaccineName = (state, id) => find(state.vaccines, id)?.name || 'Vaccine unavailable'
const vaccineNames = (state, ids) => list(ids).map((id) => vaccineName(state, id)).join(', ') || 'Vaccine details unavailable'
const visitStatus = (visit, now) => visit.status === 'scheduled' && !isUpcoming(visit, now) ? 'past' : visit.status

export function Vaccines() {
  const { state } = usePharmacy()
  const now = new Date()
  const visits = identified(state.vaccineAppointments)
  const compare = (a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor)
  const groups = [
    ['Upcoming appointments', visits.filter((visit) => isUpcoming(visit, now)).sort(compare)],
    ['Past and cancelled appointments', visits.filter((visit) => !isUpcoming(visit, now)).sort((a, b) => compare(b, a))],
  ]
  return <div className="stack">
    <PageHeader title="Vaccines" description="Schedule a pharmacy visit or manage appointments for your household.">
      <RouteLink className="button primary" to="/vaccines/schedule">Schedule appointment<Icon name="arrow" size={17}/></RouteLink>
    </PageHeader>
    {groups.map(([title, rows]) => <section className="panel" key={title}>
      <h2>{title}</h2>
      {rows.length ? rows.map((visit) => {
        const store = find(state.stores, visit.storeId)
        return <RecordLink key={visit.id} to={visitPath(visit.id)} icon="vaccines"
          title={patientName(state, visit.patientId) + ' · ' + vaccineNames(state, visit.vaccineIds)}
          meta={[instantLabel(visit.scheduledFor, store), storeName(store), visit.confirmationCode].filter(Boolean).join(' · ')}
          end={<Status status={visitStatus(visit, now)}/>}/>
      }) : <Empty>No appointments in this group.</Empty>}
    </section>)}
  </div>
}

export function VaccineDetail() {
  const { id } = useParams()
  return <VaccineRecord key={id} id={id}/>
}

function VaccineRecord({ id }) {
  const { state, commit } = usePharmacy()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const visit = find(state.vaccineAppointments, id)
  if (!visit) return <Missing record="Appointment" back="/vaccines" label="Back to vaccine appointments"/>
  const now = new Date()
  const store = find(state.stores, visit.storeId)
  const patient = patientName(state, visit.patientId)
  const upcoming = isUpcoming(visit, now)

  async function cancel() {
    const { error } = await commit((current) => cancelAppointment(current, id))
    setError(error || '')
    if (!error) {
      setConfirm(false)
      setMessage('Your appointment has been cancelled.')
    }
  }

  return <div className="stack">
    <PageHeader title="Vaccine appointment" description={'Confirmation ' + (visit.confirmationCode || id)}
      back="/vaccines" backLabel="Back to vaccine appointments"><Status status={visitStatus(visit, now)}/></PageHeader>
    {message && <p className="notice" role="status">{message}</p>}
    <section className="panel">
      <h2>Visit details</h2>
      <Details entries={[
        ['Patient', patient], ['Vaccines', vaccineNames(state, visit.vaccineIds)], ['Appointment time', instantLabel(visit.scheduledFor, store)],
        ['Pharmacy', storeName(store)], ['Address', address(store)], ['Confirmation code', visit.confirmationCode],
      ]}/>
    </section>
    {upcoming && <section className="panel">
      <h2>Manage appointment</h2>
      <div className="actions">
        <RouteLink className="button primary" to={visitPath(id) + '/reschedule'}>Reschedule appointment</RouteLink>
        <button className="button danger" onClick={() => { setError(''); setConfirm(true) }}>Cancel appointment</button>
      </div>
    </section>}
    {confirm && <Dialog title="Cancel this appointment?" close={() => setConfirm(false)}>
      <p>{patient} · {visit.confirmationCode || id}</p>
      <p>{instantLabel(visit.scheduledFor, store)} · {storeName(store)}</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="button" autoFocus onClick={() => setConfirm(false)}>Keep appointment</button>
        <button className="button primary" onClick={cancel}>Confirm cancellation</button></div>
    </Dialog>}
  </div>
}

export function VaccineForm({ editing = false }) {
  const { id } = useParams()
  const { state } = usePharmacy()
  if (editing && !find(state.vaccineAppointments, id)) {
    return <Missing record="Appointment" back="/vaccines" label="Back to vaccine appointments"/>
  }
  return <VisitFlow key={editing ? id : 'new-visit'} id={editing ? id : undefined}/>
}

function VisitFlow({ id }) {
  const { state, commit } = usePharmacy()
  const visit = find(state.vaccineAppointments, id)
  const patients = identified(state.patients)
  const options = identified(state.vaccines)
  const [patient, setPatient] = useState(visit?.patientId || '')
  const [vaccineIds, setVaccines] = useState(list(visit?.vaccineIds))
  const [storeId, setStoreId] = useState(visit?.storeId || '')
  const [day, setDay] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [review, setReview] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (result) return <Receipt title={id ? 'Appointment rescheduled' : 'Appointment scheduled'} to={visitPath(result.id)} label="View appointment details">
    <p>Confirmation code <strong>{result.confirmationCode || result.id}</strong></p>
    <p>{patientName(state, result.patientId)} · {instantLabel(result.scheduledFor, find(state.stores, result.storeId))}</p>
  </Receipt>

  const now = new Date()
  if (visit && !isUpcoming(visit, now)) return <>
    <PageHeader title="Reschedule appointment" back={visitPath(id)} backLabel="Back to appointment"/>
    <Empty>Only upcoming appointments can be rescheduled.</Empty>
  </>
  const stores = identified(state.stores).filter((store) => offers(store, vaccineIds))
  const store = find(stores, storeId)
  const slots = vaccineSlots(state, store, patient, now, visit)

  function clearTime() {
    setDay('')
    setScheduledFor('')
  }

  function chooseVaccine(vaccineId, checked) {
    if (checked && vaccineIds.length >= 3) return
    const next = checked ? [...vaccineIds, vaccineId] : vaccineIds.filter((id) => id !== vaccineId)
    setVaccines(next)
    if (!offers(store, next)) setStoreId('')
    clearTime()
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!review) {
      if (find(state.patients, patient) && vaccineIds.length >= 1 && vaccineIds.length <= 3 &&
          vaccineIds.every((id) => find(state.vaccines, id)) && store && slots.some((slot) => slot.instant === scheduledFor)) setReview(true)
      else setError('Choose an available patient, one to three vaccines, a pharmacy, and a time.')
      return
    }
    const outcome = await commit((current) => saveAppointment(current, { id, patientId: patient, vaccineIds, storeId, scheduledFor }))
    if (outcome.error) setError(outcome.error)
    else setResult(outcome.appointment)
  }

  const entries = [
    ['Patient', patient ? patientName(state, patient) : 'Choose a patient'], ['Vaccines', vaccineIds.length ? vaccineNames(state, vaccineIds) : 'Choose vaccines'],
    ['Pharmacy', store ? storeName(store) : 'Choose a pharmacy'], ['Address', store ? address(store) : '—'],
    ['Appointment time', scheduledFor ? instantLabel(scheduledFor, store) : 'Choose a time'],
  ]
  const title = review ? (id ? 'Review appointment changes' : 'Review appointment') : (id ? 'Reschedule appointment' : 'Schedule appointment')
  return <>
    <PageHeader title={title} back={id ? visitPath(id) : '/vaccines'} backLabel={id ? 'Back to appointment' : 'Back to vaccine appointments'}/>
    <div className="flow-grid">
      <form className="panel flow-form" onSubmit={submit}>
        {review ? <><h2>{id ? 'New visit details' : 'Visit details'}</h2><Details entries={entries}/></> : <>
          {visit ? <Details entries={entries.slice(0, 2)}/> : <>
            <SelectField label="Patient" required value={patient} onChange={(event) => { setPatient(event.target.value); clearTime() }}>
              <option value="">Choose a patient</option>
              {patients.map((entry) => <option key={entry.id} value={entry.id}>{patientName(state, entry.id)}</option>)}
            </SelectField>
            <fieldset><legend>Vaccines</legend><p className="muted">Choose up to three vaccines for this visit.</p>
              {options.length ? options.map((vaccine) => <label className="choice" key={vaccine.id}>
                <input type="checkbox" checked={vaccineIds.includes(vaccine.id)} disabled={vaccineIds.length >= 3 && !vaccineIds.includes(vaccine.id)}
                  onChange={(event) => chooseVaccine(vaccine.id, event.target.checked)}/>
                <span><strong>{vaccineName(state, vaccine.id)}</strong>{vaccine.description && <small>{vaccine.description}</small>}</span>
              </label>) : <Empty>No vaccine options are available.</Empty>}
            </fieldset>
          </>}
          <SelectField label="Pharmacy" required disabled={!stores.length} value={store?.id || ''} onChange={(event) => {
            setStoreId(event.target.value); clearTime()
          }}>
            <option value="">Choose a pharmacy</option>
            {stores.map((entry) => <option key={entry.id} value={entry.id}>{storeName(entry)}</option>)}
          </SelectField>
          {vaccineIds.length > 0 && !stores.length && <Empty>No pharmacy offers all selected vaccines.</Empty>}
          {store && <small>{address(store)}</small>}
          {store && patient && <AppointmentTime slots={slots} store={store} day={day} setDay={setDay} value={scheduledFor} setValue={setScheduledFor}/>}
        </>}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="actions">
          {review && <button type="button" className="button" onClick={() => { setReview(false); setError('') }}>Edit appointment</button>}
          <button type="submit" className="button primary">{review ? (id ? 'Confirm reschedule' : 'Confirm appointment') : (id ? 'Review changes' : 'Review appointment')}</button>
        </div>
      </form>
      <aside className="panel summary"><h2>Appointment summary</h2><Details entries={entries}/></aside>
    </div>
  </>
}
