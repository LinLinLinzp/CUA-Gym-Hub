import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, CarFront, IdCard, MapPin, Search } from 'lucide-react'
import { useDraft, useStore, useTransaction } from '../context/Store'
import { routes } from '../data/routes'
import { byId, fullName, labelService, list, owned, services, showDate, showPhone, showTime } from '../data/display'
import { appointmentMoment, availableSlots, blankContact, bookAppointment, cancelAppointment, findAppointments, isFuture, officeMatches, readContact } from '../data/appointments'
import { useSiteNavigate, useWizard } from '../utils/navigation'
import { OfficeCard } from '../components/Office'
import { MissingRecord } from '../components/RouteViews'
import { ActionLink, Address, ButtonLink, ConfirmDialog, Disclosure, Empty, Field, Notice, Page, SiteLink, Status, Steps, Summary } from '../components/ui'

const section = { label: 'Appointments', to: routes.appointments }
const publicOptions = {
  CID: 'real_id_first_time', RDL: 'dl_id_office_renewal', CDL: 'commercial_drive_test',
  DT: 'automobile_drive_test', ADT: 'automobile_drive_test', MDT: 'motorcycle_drive_test',
}
const officeServices = ['real_id_first_time', 'dl_id_office_application', 'dl_id_office_renewal']
const drivingServices = ['automobile_drive_test', 'commercial_drive_test', 'motorcycle_drive_test']
const steps = ['office', 'time', 'contact', 'review']
const stepLabels = ['Office', 'Date and time', 'Contact', 'Review']

function appointmentService(params) {
  const service = params.get('service')
  return service && Object.hasOwn(services, service) ? service : publicOptions[(params.get('option') ?? '').toUpperCase()]
}

export function AppointmentTypes() {
  const [params] = useSearchParams()
  if (appointmentService(params)) return <ScheduleAppointment />
  return <Page title="Appointments">
    <div className="intro-grid">
      <div>
        <p className="lead">Schedule a field office visit or a behind-the-wheel drive test.</p>
        <Notice>Check <SiteLink to={routes.online}>Online Services</SiteLink> first. Many DMV transactions can be completed without visiting an office.</Notice>
      </div>
      <aside className="card requirements"><h2>Already have an appointment?</h2><p>Look up your appointment to see its details or cancel it.</p><div className="actions"><ButtonLink secondary to={routes.appointmentLookup}>View or Cancel Appointment</ButtonLink></div></aside>
    </div>
    <section className="content-section">
      <h2>Schedule an office visit</h2>
      <div className="cards-grid">{officeServices.map((service) => <ServiceCard key={service} service={service} icon={IdCard} />)}</div>
    </section>
    <section className="content-section">
      <h2>Schedule a drive test</h2>
      <div className="cards-grid">{drivingServices.map((service) => <ServiceCard key={service} service={service} icon={CarFront} />)}</div>
    </section>
    <div className="content-section">
      <Disclosure title="Do I need an appointment?">Book a drive test or a visit for a first-time REAL ID or another driver’s license or ID service that requires an office visit. <SiteLink to={routes.online}>Check which services you can complete online</SiteLink>.</Disclosure>
      <Disclosure title="Before you go">Bring the documents required for your service. For a drive test, bring a vehicle that meets the test requirements and your instruction permit or license. <SiteLink to={routes.locations}>Check field office hours</SiteLink> before visiting.</Disclosure>
    </div>
  </Page>
}

function ServiceCard({ service, icon: Icon }) {
  return <article className="card">
    <span className="service-icon blue"><Icon size={23} aria-hidden="true" /></span>
    <h3>{labelService(service)}</h3>
    <ActionLink to={`${routes.schedule}?service=${service}`}>Schedule {service.endsWith('drive_test') ? 'Drive Test' : 'Office Visit'}<span className="sr-only"> for {labelService(service)}</span></ActionLink>
  </article>
}

function ContactFields({ contact, errors, setContact }) {
  const fields = [
    { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
    { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
    { name: 'phone', label: 'Phone number', autoComplete: 'tel', type: 'tel', hint: 'Include the area code.' },
    { name: 'email', label: 'Email address (optional)', autoComplete: 'email', type: 'email' },
  ]
  return <div className="form-grid">
    {fields.map(({ name, ...field }) => <Field key={name} name={name} value={contact[name] ?? ''} error={errors[name]} required={name !== 'email'} maxLength={name === 'email' ? 254 : 80} onChange={(event) => setContact({ ...contact, [name]: event.target.value })} {...field} />)}
  </div>
}

function AppointmentDetails({ appointment, office, showStatus = false }) {
  return <Summary rows={[
    ['Service', labelService(appointment.serviceType)],
    ['Office', office?.name || 'Office unavailable'],
    ['Office address', <Address value={office?.address} />],
    ['Date and time', `${showDate(appointment.date)} at ${showTime(appointment.time)} Pacific time`],
    ['Name', fullName(appointment.contact) || 'Unavailable'],
    ['Phone number', showPhone(appointment.contact?.phone)],
    ['Email address', appointment.contact?.email || 'Not provided'],
    ...(showStatus ? [['Status', <Status value={appointment.status} />]] : []),
  ]} />
}

export function ScheduleAppointment() {
  const { state } = useStore()
  const [submitBooking, booking] = useTransaction('appointments', bookAppointment)
  const [params] = useSearchParams()
  const service = appointmentService(params)
  const [saved, setSaved] = useDraft('appointment', null)
  const selectedOffice = byId(state.offices, params.get('office'))
  const preselected = list(selectedOffice?.serviceTypes).includes(service) ? selectedOffice : null
  const draft = saved && saved.service === service && saved.entryOfficeId === preselected?.id
    ? saved : { service, entryOfficeId: preselected?.id, officeId: preselected?.id, contact: { ...blankContact } }
  const [requestedStep, go] = useWizard('office')
  const [search, setSearch] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const navigate = useSiteNavigate()
  const office = byId(state.offices, draft.officeId)
  const slots = availableSlots(state, office, service)
  const slot = byId(slots, draft.slotId)
  const chosenDate = draft.date || ''
  const step = !steps.includes(requestedStep) || !office ? 'office'
    : !slot && ['contact', 'review'].includes(requestedStep) ? 'time'
      : requestedStep === 'review' && Object.keys(readContact(draft.contact).errors).length ? 'contact' : requestedStep
  const dates = Array.from(new Set(slots.map((item) => item.date)))
  const offices = list(state.offices).filter((item) => item?.id && list(item.serviceTypes).includes(service) && officeMatches(item, search))
  const daySlots = slots.filter((item) => item.date === chosenDate)

  function update(patch) {
    setSaved({ ...draft, ...patch })
    setError('')
  }

  function contactSubmit(event) {
    event.preventDefault()
    const { errors: nextErrors } = readContact(draft.contact)
    setErrors(nextErrors)
    const first = Object.keys(nextErrors)[0]
    if (first) {
      event.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    go('review')
  }

  async function confirm() {
    setError('')
    try {
      const record = await submitBooking(draft)
      if (!record) return
      setSaved(null)
      navigate(routes.appointmentConfirmation + encodeURIComponent(record.id), { replace: true })
    } catch (failure) {
      setError(failure.message)
    }
  }

  if (!service) return <MissingRecord title="Schedule an Appointment" message="Choose an appointment type to get started" to={routes.appointments} action="Choose Appointment Type" />

  return <Page title="Schedule an Appointment" section={section}>
    <p className="lead">{labelService(service)}</p>
    <Steps labels={stepLabels} step={steps.indexOf(step)} />
    <div className="appointment-grid">
      <div>
        {step === 'office' && <>
          <div className="card office-search">
            <h2>Which office would you like to visit?</h2>
            <label htmlFor="appointment-office">City or ZIP Code</label>
            <div className="search-control"><Search size={20} aria-hidden="true" /><input id="appointment-office" placeholder="Enter a city, office name or ZIP code" type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>
          <div className="office-list">
            {offices.length ? offices.map((item) => <OfficeCard key={item.id} office={item} selected={draft.officeId === item.id}>
              <button type="button" className="button button-secondary" onClick={() => {
                update(draft.officeId === item.id ? {} : { officeId: item.id, slotId: undefined, date: undefined })
                go('time')
              }}>
                Select Location<span className="sr-only"> {item.name}</span>
              </button>
            </OfficeCard>) : <Empty title="No matching offices">Try a nearby city or a shorter ZIP prefix.</Empty>}
          </div>
          <div className="actions"><SiteLink to={routes.appointments}>Change appointment type</SiteLink></div>
        </>}
        {step === 'time' && <section className="card">
          <h2>Choose a date and time</h2>
          <p>Available appointments at {office?.name || 'the selected office'}. All times are Pacific time.</p>
          {dates.length ? <>
            <fieldset className="choice-field"><legend>Available dates</legend>
              <div className="option-list">{dates.map((value) => <label className="choice-pill" key={value}><input type="radio" name="date" checked={chosenDate === value} onChange={() => update({ date: value, slotId: undefined })} /><span>{showDate(value)}</span></label>)}</div>
            </fieldset>
            {chosenDate && <fieldset className="choice-field"><legend>Available times</legend>
              {!daySlots.length && <p>No times are available on this date. Choose another date.</p>}
              {['Morning', 'Afternoon'].map((period) => {
                const group = daySlots.filter((item) => period === 'Morning' ? item.time < '12:00' : item.time >= '12:00')
                return group.length > 0 && <div className="time-group" key={period}><h3>{period}</h3><div className="option-list">{group.map((item) => <label className="choice-pill" key={item.id}><input type="radio" name="time" checked={draft.slotId === item.id} onChange={() => update({ slotId: item.id })} /><span>{showTime(item.time)}</span></label>)}</div></div>
              })}
            </fieldset>}
          </> : <Empty title="No upcoming times available">Select another office to see its appointment times.</Empty>}
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions"><button className="button" type="button" disabled={!slot} onClick={() => go('contact')}>Continue</button><button className="button button-secondary" type="button" onClick={() => go('office', true)}>Back</button></div>
        </section>}
        {step === 'contact' && <form className="card" noValidate onSubmit={contactSubmit}>
          <h2>Enter your contact information</h2>
          <ContactFields contact={draft.contact} errors={errors} setContact={(contact) => update({ contact })} />
          <div className="actions"><button className="button" type="submit">Continue</button><button className="button button-secondary" type="button" onClick={() => go('time', true)}>Back</button></div>
        </form>}
        {step === 'review' && <section className="card">
          <h2>Review your appointment</h2>
          <AppointmentDetails office={office} appointment={{ ...slot, serviceType: service, contact: readContact(draft.contact).contact }} />
          {error && <Notice kind="error">{error}</Notice>}
          <div className="actions"><button className="button" type="button" disabled={booking} onClick={confirm}>{booking ? 'Confirming…' : 'Confirm Appointment'}</button><button className="button button-secondary" type="button" disabled={booking} onClick={() => go('contact', true)}>Back</button></div>
        </section>}
      </div>
      <aside className="card appointment-sidebar">
        <h3>Appointment details</h3>
        <div className="icon-detail"><CalendarDays size={18} aria-hidden="true" /><span>{labelService(service)}</span></div>
        <div className="icon-detail"><MapPin size={18} aria-hidden="true" /><span>{office?.name || 'No office selected'}</span></div>
        {slot && <p>{showDate(slot.date)} at {showTime(slot.time)}</p>}
      </aside>
    </div>
  </Page>
}

export function AppointmentConfirmation() {
  const { id } = useParams()
  const { state } = useStore()
  const appointment = byId(owned(state, 'appointments'), id)
  if (!appointment) return <MissingRecord title="Appointment Confirmation" message="Appointment unavailable" to={routes.appointmentLookup} action="View Appointment" />
  return <Page title="Appointment Confirmation" section={section} compact>
    <section className="card">
      <Notice kind={appointment.status === 'scheduled' ? 'success' : 'info'}><strong>Confirmation code</strong><div className="reference-code">{appointment.confirmationCode || 'Unavailable'}</div></Notice>
      <AppointmentDetails appointment={appointment} office={byId(state.offices, appointment.officeId)} showStatus />
      <div className="actions"><ButtonLink to={routes.appointmentLookup}>View Appointment</ButtonLink><ButtonLink secondary to={routes.home}>Return to Home</ButtonLink></div>
    </section>
  </Page>
}

export function AppointmentLookup() {
  const { state } = useStore()
  const [submitCancellation, cancelling] = useTransaction('appointments', cancelAppointment, 'cancellationOperationId')
  const [contact, setContact] = useState({ ...blankContact })
  const [lookup, setLookup] = useState(null)
  const [errors, setErrors] = useState({})
  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const now = new Date()
  const results = lookup ? findAppointments(state, lookup) : []
  const upcoming = results.filter((record) => record.status === 'scheduled' && isFuture(record, now))
    .sort((a, b) => appointmentMoment(a).localeCompare(appointmentMoment(b)))
  const history = results.filter((record) => !upcoming.includes(record))
    .sort((a, b) => appointmentMoment(b).localeCompare(appointmentMoment(a)))
  const pending = byId(upcoming, pendingId)

  function submit(event) {
    event.preventDefault()
    const result = readContact(contact)
    setErrors(result.errors)
    const first = Object.keys(result.errors)[0]
    if (first) {
      event.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    setFeedback(null)
    setLookup(result.contact)
  }

  async function cancel() {
    try {
      const record = await submitCancellation(pendingId)
      if (!record) return
      setFeedback({ text: `Appointment ${record.confirmationCode || ''} cancelled.` })
    } catch (failure) {
      setFeedback({ error: true, text: failure.message })
    }
    setPendingId(null)
  }

  function resultList(title, records, canCancel = false) {
    return <section className="content-section">
      <h2>{title}</h2>
      <div className="history-list">
        {records.map((record) => <article className="card" key={record.id}>
          <div className="section-heading"><h3>{record.confirmationCode || 'Appointment details'}</h3><Status value={record.status} /></div>
          <AppointmentDetails appointment={record} office={byId(state.offices, record.officeId)} />
          <div className="actions">
            {record.id && <SiteLink to={routes.appointmentConfirmation + encodeURIComponent(record.id)}>View appointment details</SiteLink>}
            {canCancel && record.id && <button type="button" className="button button-secondary" onClick={() => { setFeedback(null); setPendingId(record.id) }}>Cancel Appointment</button>}
          </div>
        </article>)}
      </div>
    </section>
  }

  return <Page title="View or Cancel an Appointment" section={section} compact>
    <form className="card" noValidate onSubmit={submit}>
      <h2>Enter your appointment information</h2>
      <p className="form-intro">Use the contact information provided when the appointment was scheduled.</p>
      <ContactFields contact={contact} errors={errors} setContact={setContact} />
      <div className="actions">
        <button className="button" type="submit">Find Appointment</button>
        <button className="button button-secondary" type="button" onClick={() => { setContact({ ...blankContact }); setLookup(null); setErrors({}); setFeedback(null) }}>Clear</button>
      </div>
    </form>
    {feedback && <Notice kind={feedback.error ? 'error' : 'success'}><span role={feedback.error ? undefined : 'status'}>{feedback.text}</span></Notice>}
    {lookup && !results.length && <div className="content-section" role="status"><Empty title="No matching appointments">Check the name and phone number used when booking. You can leave email blank.</Empty></div>}
    {upcoming.length > 0 && resultList('Upcoming appointments', upcoming, true)}
    {history.length > 0 && resultList('Appointment history', history)}
    {pending && <ConfirmDialog title="Cancel this appointment?" onClose={() => setPendingId(null)} onConfirm={cancel} confirmLabel={cancelling ? 'Cancelling…' : 'Cancel Appointment'} busy={cancelling}>
      {labelService(pending.serviceType)} on {showDate(pending.date)} at {showTime(pending.time)} will be cancelled. Confirmation code {pending.confirmationCode || 'unavailable'}.
    </ConfirmDialog>}
  </Page>
}
