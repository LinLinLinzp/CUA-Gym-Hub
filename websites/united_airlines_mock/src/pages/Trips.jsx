import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'
import { bookingFor, canCancel, cancelTrip, depart, list, normalize, person, seatSegments, tripGroup, trips } from '../data/account.js'
import { AppLink, Dialog, Empty, ErrorMessage, Field, Heading, Status, Tabs, dateOnly, dateTime, money, names, routeTitle, segmentDay, time, tripPath, tripTitle } from '../ui.jsx'
import { PaymentDetails } from './Booking.jsx'

const tripTabs = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']]

export function TripsPage() {
  const { world } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('soonest')
  const [code, setCode] = useState('')
  const [lastName, setLastName] = useState('')
  const [lookupError, setLookupError] = useState('')
  const visible = trips(world).filter(booking => {
    const text = [booking.confirmationCode, ...list(booking.segments).flatMap(segment => [
      segment.flightNumber, segment.origin?.city, segment.origin?.code, segment.destination?.city, segment.destination?.code,
    ])].join(' ')
    return tripGroup(booking) === tab && normalize(text).includes(normalize(search))
  }).sort((a, b) => {
    const first = depart(a)
    const second = depart(b)
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0
    if (!Number.isFinite(second)) return -1
    return sort === 'soonest' ? first - second : second - first
  })

  function lookup(event) {
    event.preventDefault()
    const found = trips(world).find(booking => booking.id && normalize(code) &&
      normalize(booking.confirmationCode) === normalize(code) &&
      normalize(lastName) && list(booking.passengers).some(passenger => normalize(passenger.lastName) === normalize(lastName)))
    if (found) navigate(withSid(tripPath(found)))
    else setLookupError('No trip matches that confirmation code and last name.')
  }

  return <>
    <Heading title="My trips" actions={<AppLink className="button primary" to="/book">Book a flight</AppLink>}>
      Find your reservations, view itineraries and manage seats.
    </Heading>
    <div className="content-split">
      <section className="panel">
        <h2>Reservations</h2>
        <Tabs label="Trip status" options={tripTabs} selected={tab} onChange={setTab} />
        <div className="filters">
          <Field label="Search trips"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="City, flight or confirmation" /></Field>
          <Field label="Departure date"><select value={sort} onChange={event => setSort(event.target.value)}><option value="soonest">Earliest first</option><option value="latest">Latest first</option></select></Field>
        </div>
        {visible.length ? <ul className="record-list" aria-label="Matching trips">{visible.map((booking, index) => {
          const segment = list(booking.segments)[0]
          return <li key={booking.id || index}>
            <div className="record-main"><strong>{tripTitle(booking)}</strong>
              <span>{segmentDay(segment)}{segment?.flightNumber ? ' · ' + segment.flightNumber : ''}</span>
              <span>{booking.confirmationCode ? 'Confirmation ' + booking.confirmationCode : 'Confirmation unavailable'}{list(booking.segments).length > 1 ? ' · Round trip' : ''}</span>
            </div>
            <div className="record-actions"><Status value={booking.status} />{booking.id && <AppLink to={tripPath(booking)} aria-label={'View trip ' + (booking.confirmationCode || booking.id)}>View trip <span aria-hidden="true">→</span></AppLink>}</div>
          </li>
        })}</ul> : <Empty title="No matching trips">{search ? 'Try a different search.' : <AppLink to="/book">Search for a flight</AppLink>}</Empty>}
      </section>
      <section className="panel sidebar-panel">
        <h2>Find a trip</h2>
        <form onSubmit={lookup}>
          <Field label="Confirmation code"><input required value={code} onChange={event => { setCode(event.target.value); setLookupError('') }} autoCapitalize="characters" /></Field>
          <Field label="Traveler last name"><input required value={lastName} onChange={event => { setLastName(event.target.value); setLookupError('') }} /></Field>
          <ErrorMessage>{lookupError}</ErrorMessage>
          <button className="secondary">Find trip</button>
        </form>
      </section>
    </div>
  </>
}

export function TripPage() {
  const { bookingId } = useParams()
  return <TripDetail key={bookingId} bookingId={bookingId} />
}

function TripDetail({ bookingId }) {
  const { world, commit } = useStore()
  const booking = bookingFor(world, bookingId)
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  if (!booking) return <><Heading title="Trip unavailable" /><Empty title="We could not find this reservation."><AppLink to="/trips">Back to My trips</AppLink></Empty></>
  const passengers = list(booking.passengers)
  const issued = list(world.travelCredits).find(credit => credit.sourceBookingId === booking.id)
  const canChange = seatSegments(world, booking).length > 0

  function cancel() {
    const result = commit(current => cancelTrip(current, booking.id, review.amount))
    if (result.error) return setError(result.error)
    setReview(null)
  }

  return <>
    <AppLink className="back" to="/trips">← My trips</AppLink>
    <Heading title={tripTitle(booking)} actions={<Status value={booking.status} />}>
      Confirmation <strong>{booking.confirmationCode || 'unavailable'}</strong>{names(booking) ? ' · ' + names(booking) : ''}
    </Heading>
    {booking.status === 'cancelled' && <div className="notice" role="status"><strong>Trip cancelled</strong>
      {booking.cancelledAt && ' · ' + dateTime(booking.cancelledAt)}
      {issued && <p>{money(issued.originalAmount)} issued as a future flight credit. {issued.id && <AppLink to={'/credits/' + encodeURIComponent(issued.id)}>View travel credit</AppLink>}</p>}
    </div>}
    <div className="content-split">
      <section className="panel">
        <div className="section-title"><h2>Itinerary</h2>{canChange && <AppLink className="button primary" to={tripPath(booking) + '/seats'}>Change seats</AppLink>}</div>
        {list(booking.segments).length ? list(booking.segments).map((segment, i) => <article className="segment" key={segment.id || i}>
          <h3>{routeTitle(segment)}</h3>
          <p className="meta">{segment.flightNumber || 'Flight details unavailable'}{segment.fareClass || segment.cabin ? ' · ' + (segment.fareClass || segment.cabin) : ''}</p>
          <div className="segment-times">
            <div><span className="meta">Departure</span><strong>{segment.origin?.code || '—'} · {time(segment.departureAt, segment.origin)}</strong><span>{segmentDay(segment)}</span></div>
            <span aria-hidden="true">→</span>
            <div><span className="meta">Arrival</span><strong>{segment.destination?.code || '—'} · {time(segment.arrivalAt, segment.destination)}</strong><span>{dateTime(segment.arrivalAt, segment.destination?.timeZone)}</span></div>
          </div>
          {passengers.length > 0 && <ul className="assignments" aria-label="Seat assignments">{passengers.map((passenger, j) =>
            <li key={passenger.id || j}><span>{person(passenger) || 'Traveler ' + (j + 1)}</span><strong>{segment.seatAssignments?.[passenger.id] || 'Seat unassigned'}</strong></li>)}</ul>}
        </article>) : <Empty title="Itinerary unavailable">This reservation has no flight segments.</Empty>}
      </section>
      <div>
        <section className="panel">
          <h2>Payment</h2>
          {booking.payment ? <PaymentDetails payment={booking.payment} /> : <p>Payment details unavailable.</p>}
          {booking.payment?.creditId && <AppLink to={'/credits/' + encodeURIComponent(booking.payment.creditId)}>View applied credit</AppLink>}
          {canCancel(world, booking) && <div className="border-top"><button className="secondary danger" onClick={() => {
            setError('')
            setReview({ amount: booking.payment.cashAmount })
          }}>Cancel trip</button></div>}
          {issued?.expiresOn && <p className="meta">Credit expiry {dateOnly(issued.expiresOn)}</p>}
        </section>
        {passengers.length > 0 && <section className="panel section-gap">
          <h2>Travelers</h2>
          <ul className="record-list" aria-label="Traveler tickets">{passengers.map((passenger, index) =>
            <li key={passenger.id || index}>
              <div className="record-main">
                <strong>{person(passenger) || 'Traveler ' + (index + 1)}</strong>
                <span>{passenger.ticketNumber ? 'Ticket ' + passenger.ticketNumber : 'Ticket number unavailable'}</span>
              </div>
            </li>)}</ul>
        </section>}
      </div>
    </div>
    {review && <Dialog title="Cancel this trip?" onClose={() => setReview(null)}>
      <p>All travelers on this reservation will be cancelled. You will receive a future flight credit of <strong>{money(review.amount)}</strong>.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="dialog-actions"><button className="secondary" onClick={() => setReview(null)}>Keep trip</button><button className="primary" onClick={cancel}>Confirm cancellation</button></div>
    </Dialog>}
  </>
}
