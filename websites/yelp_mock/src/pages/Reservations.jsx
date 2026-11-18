import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { actor, append, availableSlots, businessName, displayDate, displayTime, find, futureSlot, localClock, newId, own, policyFor, randomToken, records, stamp, update, validDate } from '../model.js'
import { useWorld } from '../store.jsx'
import { BusinessLink, Confirm, Dialog, Empty, Field, Heading, Row, SiteLink, Status, Tabs, subPath, useGo } from '../ui.jsx'

const back = { to: '/account/reservations', label: 'Reservations' }
const discover = '/discover?available=bookable'
const slotKey = item => `${item.date || ''}T${item.time || ''}`
const upcoming = (item, business) => item.status === 'confirmed' && futureSlot(item, business)

function partyText(partySize) {
  return Number.isInteger(partySize) && partySize > 0 ? `${partySize} ${partySize === 1 ? 'guest' : 'guests'}` : 'Party size unavailable'
}

function ReservationStatus({ item, business }) {
  return <Status value={item.status === 'confirmed' && !upcoming(item, business) && validDate(item.date) ? 'Past' : item.status} />
}

function reservationCode(world) {
  const used = new Set(records(world, 'reservations').map(item => item.confirmationCode))
  let code
  do { code = `YLP-${randomToken().slice(0, 6).toUpperCase()}` } while (used.has(code))
  return code
}

export function ReservationForm({ business, reservation, close }) {
  const { world, mutate } = useWorld()
  const go = useGo()
  const user = actor(world)
  const policy = policyFor(business)
  const [query, setQuery] = useState({
    date: reservation?.date || '', time: reservation?.time || policy?.slotTimes[0] || '',
    partySize: reservation?.partySize || Math.min(2, policy?.maxPartySize || 1),
  })
  const [guest, setGuest] = useState({ guestName: user?.displayName || '', email: user?.email || '', phone: '', notes: '' })
  const [slots, setSlots] = useState(null)
  const [selectedSlot, selectSlot] = useState('')
  const [onGuestStep, setGuestStep] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const committed = useRef(false)
  if (!policy) return null
  const today = localClock(policy.timeZone).date

  function changeQuery(key, value) {
    setQuery({ ...query, [key]: value })
    setSlots(null)
    selectSlot('')
    setNotice('')
    setErrors({})
  }

  function search(event) {
    event.preventDefault()
    const issues = {}
    if (!validDate(query.date) || query.date < today) issues.date = 'Choose today or a future date.'
    if (!query.time) issues.time = 'Choose an approximate time.'
    if (!Number.isInteger(query.partySize) || query.partySize < 1 || query.partySize > policy.maxPartySize) {
      issues.partySize = `Enter a party size between 1 and ${policy.maxPartySize}.`
    }
    setErrors(issues)
    if (Object.keys(issues).length) return
    const matches = availableSlots(world, business, query, reservation?.id)
    setSlots(matches)
    selectSlot('')
    setNotice('')
  }

  function confirm(event) {
    event.preventDefault()
    if (committed.current || !selectedSlot) return
    const issues = {}
    if (!reservation) {
      if (!guest.guestName.trim()) issues.guestName = 'Enter the guest name.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())) issues.email = 'Enter a valid email address.'
      setErrors(issues)
      if (Object.keys(issues).length) return
    }

    let created
    let freshSlots
    const nextSlot = { date: query.date, time: selectedSlot, partySize: query.partySize }
    const success = mutate(current => {
      const currentBusiness = find(current, 'businesses', business.id)
      if (!actor(current) || !currentBusiness) return
      const previous = reservation && own(current, 'reservations').find(item =>
        item.id === reservation.id && item.businessId === business.id && upcoming(item, currentBusiness))
      if (reservation && !previous) return
      freshSlots = availableSlots(current, currentBusiness, query, reservation?.id)
      if (!freshSlots.includes(selectedSlot)) return
      const time = stamp()
      if (previous) {
        if (previous.date === nextSlot.date && previous.time === nextSlot.time && previous.partySize === nextSlot.partySize) return
        return update(current, 'reservations', previous.id, { ...nextSlot, updatedAt: time })
      }
      created = {
        id: newId('rsv'), userId: current.currentUserId, businessId: business.id, ...nextSlot,
        guestName: guest.guestName.trim(), email: guest.email.trim(), phone: guest.phone.trim() || null,
        notes: guest.notes.trim() || null, confirmationCode: reservationCode(current), status: 'confirmed', createdAt: time,
      }
      return append(current, 'reservations', created)
    }, reservation ? 'Reservation updated.' : 'Reservation confirmed.')
    if (!success) {
      if (freshSlots?.includes(selectedSlot)) {
        setNotice('Choose a different date, time, or party size to change this reservation.')
      } else {
        setNotice('That time is no longer available. Choose another time.')
        setGuestStep(false)
        setSlots(freshSlots || [])
        selectSlot('')
      }
      return
    }
    committed.current = true
    close()
    if (created) go(subPath('reservations', created.id))
  }

  return <Dialog title={reservation ? 'Modify reservation' : onGuestStep ? 'Confirm guest details' : 'Find a table'} close={close}>
    <p>{businessName(business)}</p>
    {notice && <p className="inline-error" role="alert">{notice}</p>}
    {onGuestStep ? <form className="stack" onSubmit={confirm} noValidate>
      <p className="metadata">{displayDate(query.date)} · {displayTime(selectedSlot)} · {partyText(query.partySize)}</p>
      <Field label="Guest name" name="guest-name" error={errors.guestName}><input autoComplete="name" value={guest.guestName}
        onChange={event => setGuest({ ...guest, guestName: event.target.value })} /></Field>
      <Field label="Email" name="guest-email" error={errors.email}><input type="email" autoComplete="email" value={guest.email}
        onChange={event => setGuest({ ...guest, email: event.target.value })} /></Field>
      <Field label="Phone (optional)" name="guest-phone"><input type="tel" autoComplete="tel" value={guest.phone}
        onChange={event => setGuest({ ...guest, phone: event.target.value })} /></Field>
      <Field label="Notes (optional)" name="guest-notes"><textarea value={guest.notes}
        onChange={event => setGuest({ ...guest, notes: event.target.value })} /></Field>
      <div className="form-actions"><button type="button" onClick={() => setGuestStep(false)}>Back to times</button>
        <button type="submit" className="primary">Confirm reservation</button></div>
    </form> : <div className="stack">
      <form className="stack" onSubmit={search} noValidate>
        <div className="booking-fields">
          <Field label="Date" name="booking-date" error={errors.date}><input type="date" min={today} value={query.date}
            onChange={event => changeQuery('date', event.target.value)} /></Field>
          <Field label="Approximate time" name="booking-time" error={errors.time}><input type="time" value={query.time}
            onChange={event => changeQuery('time', event.target.value)} /></Field>
          <Field label="Party size" name="booking-party" error={errors.partySize}><input type="number" min="1" max={policy.maxPartySize} value={query.partySize || ''}
            onChange={event => changeQuery('partySize', Number(event.target.value))} /></Field>
        </div>
        <div><button type="submit" className={slots ? undefined : 'primary'}>Find times</button></div>
      </form>
      {slots && (slots.length ? <form className="stack" onSubmit={reservation ? confirm : event => {
        event.preventDefault()
        if (selectedSlot) { setNotice(''); setGuestStep(true) }
      }}>
        <fieldset><legend>Available times</legend><div className="choices">
          {slots.map(time => <label className="choice" key={time}>
            <input name="slot-time" type="radio" value={time} checked={time === selectedSlot} onChange={() => { selectSlot(time); setNotice('') }} />
            <span>{displayTime(time)}</span>
          </label>)}
        </div></fieldset>
        <div className="form-actions"><button type="button" onClick={close}>Cancel</button>
          <button type="submit" className="primary" disabled={!selectedSlot}>{reservation ? 'Confirm changes' : 'Continue'}</button></div>
      </form> : <p className="inline-error" role="status">No tables are available. Try another date or party size.</p>)}
    </div>}
  </Dialog>
}

export function Reservations() {
  const { world } = useWorld()
  const [tab, setTab] = useState('Upcoming')
  const [ordering, setOrdering] = useState({})
  const sort = ordering[tab] || (tab === 'Upcoming' ? 'earliest' : 'latest')
  const results = own(world, 'reservations').map(item => ({ item, business: find(world, 'businesses', item.businessId) }))
    .filter(({ item, business }) => (tab === 'Upcoming') === upcoming(item, business))
    .sort((a, b) => (sort === 'earliest' ? 1 : -1) * slotKey(a.item).localeCompare(slotKey(b.item)) || a.item.id.localeCompare(b.item.id))

  return <>
    <Heading title="Reservations" actions={<SiteLink className="button primary" to={discover}>Find a table</SiteLink>}>
      Check your upcoming tables and revisit your booking history.
    </Heading>
    <Tabs label="Reservation status" values={['Upcoming', 'History']} selected={tab} onSelect={setTab} />
    {results.length > 0 && <div className="list-toolbar"><Field label="Sort reservations" name="reservation-sort">
      <select value={sort} onChange={event => setOrdering({ ...ordering, [tab]: event.target.value })}>
        <option value="earliest">Earliest date</option><option value="latest">Latest date</option>
      </select>
    </Field></div>}
    {results.length ? <div className="record-list">{results.map(({ item, business }) => {
      const to = subPath('reservations', item.id)
      return <Row key={item.id} business={business} title={<SiteLink to={to}>{businessName(business)}</SiteLink>}
        actions={<SiteLink to={to} className="button">View reservation</SiteLink>}>
        <p className="metadata">{displayDate(item.date)} · {displayTime(item.time)} · {partyText(item.partySize)}</p>
        <div><ReservationStatus item={item} business={business} /></div>
      </Row>
    })}</div> : <Empty title={tab === 'Upcoming' ? 'No upcoming reservations' : 'No reservation history'} to={discover} label="Find a table">
      {tab === 'Upcoming' ? 'Choose a restaurant to book a table.' : 'Past and cancelled reservations will appear here.'}
    </Empty>}
  </>
}

function BookingDetail({ item }) {
  const { world, mutate } = useWorld()
  const [dialog, setDialog] = useState('')
  const business = find(world, 'businesses', item.businessId)
  const canManage = actor(world) && upcoming(item, business)
  const close = () => setDialog('')

  function cancel() {
    if (mutate(current => {
      if (!actor(current) || !own(current, 'reservations').some(record => record.id === item.id &&
          upcoming(record, find(current, 'businesses', record.businessId)))) return
      const time = stamp()
      return update(current, 'reservations', item.id, { status: 'cancelled', cancelledAt: time, updatedAt: time })
    }, 'Reservation cancelled.')) close()
  }

  return <div className="detail">
    <Heading title={businessName(business)} back={back}>Reservation details</Heading>
    <section className="panel stack">
      <div className="tags"><ReservationStatus item={item} business={business} /></div>
      <dl className="details">
        <div><dt>Confirmation code</dt><dd><strong>{item.confirmationCode || 'Code unavailable'}</strong></dd></div>
        <div><dt>Restaurant</dt><dd><BusinessLink business={business} /></dd></div>
        <div><dt>Date and time</dt><dd>{displayDate(item.date)} · {displayTime(item.time)}</dd></div>
        <div><dt>Party size</dt><dd>{partyText(item.partySize)}</dd></div>
        <div><dt>Guest name</dt><dd>{item.guestName || 'Guest unavailable'}</dd></div>
        {item.email && <div><dt>Email</dt><dd>{item.email}</dd></div>}
        {item.phone && <div><dt>Phone</dt><dd>{item.phone}</dd></div>}
        {item.notes && <div><dt>Notes</dt><dd>{item.notes}</dd></div>}
      </dl>
      {canManage && <div className="tags">
        {policyFor(business) && <button type="button" onClick={() => setDialog('change')}>Modify reservation</button>}
        <button type="button" className="danger" onClick={() => setDialog('cancel')}>Cancel reservation</button>
      </div>}
    </section>
    {dialog === 'change' && <ReservationForm business={business} reservation={item} close={close} />}
    {dialog === 'cancel' && <Confirm title="Cancel reservation?" label="Confirm cancellation" onConfirm={cancel} close={close}>
      Your table at {businessName(business)} on {displayDate(item.date)} will be released.
    </Confirm>}
  </div>
}

export function ReservationDetail() {
  const { world } = useWorld()
  const { reservationId } = useParams()
  const item = own(world, 'reservations').find(record => record.id === reservationId)
  return item ? <BookingDetail key={reservationId} item={item} /> :
    <Empty title="Reservation unavailable" to={back.to} label={back.label}>This reservation could not be found.</Empty>
}
