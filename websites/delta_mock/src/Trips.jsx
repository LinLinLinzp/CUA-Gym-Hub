import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  code, compact, currencyOf, dateLabel, eventRecord, fail, fullName, isUnlinked, money,
  normalize, orderedSegments, rows, sameName, serviceError, signedIn, statusLabel, tripGroup, tripPath, tripTitle,
} from './domain.js'
import { Lookup } from './Lookup.jsx'
import { useStore } from './store.jsx'
import { AccountLink, Back, Badge, Empty, Field, FlightCard, Heading, Icon, RouteLine, Summary, Tabs } from './ui.jsx'

const tripTabs = ['Upcoming', 'Past', 'Canceled']

function findTrip(trips, values, matchId) {
  const ref = compact(values.reference)
  if (!ref || !normalize(values.firstName) || !normalize(values.lastName)) return fail('Enter a reference and both traveler names.')
  const trip = rows(trips).find((record) => record.id && (!matchId || record.id === matchId) && rows(record.travelers).some((traveler) =>
    (compact(record.confirmationCode) === ref || compact(traveler.ticketNumber) === ref)
    && sameName(traveler.firstName, values.firstName) && sameName(traveler.lastName, values.lastName)))
  return trip ? { record: trip } : fail('No trip matches those details. Check the booking reference and traveler name.')
}

function linkTrip(state, values, tripId) {
  const { record, error } = findTrip(state.trips, values, tripId)
  if (error) return fail(error)
  if (!state.account?.id || !isUnlinked(record)) return fail('This trip is already linked or unavailable.')
  const action = {
    ...eventRecord(state.account.id, 'trip-action'), tripId, type: 'linked', status: 'completed',
  }
  return {
    state: {
      ...state,
      trips: rows(state.trips).map((trip) => trip === record
        ? { ...trip, accountId: action.actorId, linkedAt: action.createdAt } : trip),
      tripActions: [...rows(state.tripActions), action],
    },
  }
}

function FindTrip({ onClose, onAdded }) {
  const { state, commit } = useStore()
  return <Lookup title="Find a trip" referenceLabel="Confirmation or ticket number" button="Search for trip"
    onClose={onClose} findMatch={(values) => findTrip(state.trips, values)}
    renderMatch={(trip, values, setError) => <>
      <div aria-live="polite"><h3>{tripTitle(trip)}</h3><p className="muted">{code(trip)} · {dateLabel(orderedSegments(trip)[0]?.departureAt)}</p></div>
      {signedIn(trip, state.account) ? <>
        <p>This trip is already in My Trips.</p>
        <AccountLink className="button" to={tripPath(trip.id)} onClick={onClose}>View itinerary</AccountLink>
      </> : isUnlinked(trip) ? <button className="button primary" onClick={async () => {
        const result = await commit((latest) => linkTrip(latest, values, trip.id))
        if (result.error) setError(result.error)
        else onAdded(trip)
      }}>Add to My Trips</button> : <p>This trip is linked to another account.</p>}
    </>} />
}

export function Trips() {
  const { state } = useStore()
  const [tab, setTab] = useState('Upcoming')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('')
  const [lookup, setLookup] = useState(false)
  const [added, setAdded] = useState(null)
  const trips = rows(state.trips).filter((trip) => signedIn(trip, state.account))
    .map((trip) => ({ trip, segments: orderedSegments(trip), group: tripGroup(trip) }))
  const next = trips.filter(({ group }) => group === 'Upcoming')
    .flatMap(({ trip, segments }) => segments.map((segment) => ({ trip, segment, time: Date.parse(segment.departureAt) })))
    .filter(({ time }) => time > Date.now()).sort((a, b) => a.time - b.time)[0]
  const sorted = trips.filter(({ trip, segments, group }) => group === tab && normalize([
    tripTitle(trip), trip.confirmationCode,
    ...segments.flatMap((segment) => [segment.origin, segment.originCity, segment.destination, segment.destinationCity]),
  ].join(' ')).includes(normalize(query))).sort((a, b) => {
    const left = Date.parse(a.segments[0]?.departureAt)
    const right = Date.parse(b.segments[0]?.departureAt)
    if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1
    if (Number.isNaN(right)) return -1
    return (order || (tab === 'Upcoming' ? 'soonest' : 'latest')) === 'soonest' ? left - right : right - left
  })

  return <>
    <Heading title="My Trips" description="View itineraries and manage your reservations.">
      <button className="button primary" onClick={() => setLookup(true)}><Icon name="search" size={17} />Find a trip</button>
    </Heading>
    {added && <p role="status" className="notice">{tripTitle(added)} was added to My Trips. <AccountLink to={tripPath(added.id)}>View itinerary</AccountLink></p>}
    {next && <section className="hero" aria-label="Next departure">
      <div>
        <p className="hero-label">Next departure</p>
        <h2>{next.segment.destinationCity || next.segment.destination || 'Upcoming flight'}</h2>
        <p>{dateLabel(next.segment.departureAt, true)}{next.segment.flightNumber && ` · ${next.segment.flightNumber}`}</p>
        {next.trip.id && <AccountLink to={tripPath(next.trip.id)}>View itinerary<Icon name="arrow" size={17} /></AccountLink>}
      </div>
      <RouteLine segment={next.segment} />
    </section>}
    <div className="toolbar">
      <Tabs label="Trip status" choices={tripTabs} selected={tab} onSelect={(value) => { setTab(value); setOrder('') }} />
      <div className="trip-filters">
        <label className="search"><span className="sr-only">Search trips</span><Icon name="search" size={18} />
          <input type="search" placeholder="Destination or code" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <Field label="Departure order">
          <select value={order || (tab === 'Upcoming' ? 'soonest' : 'latest')} onChange={(event) => setOrder(event.target.value)}>
            <option value="soonest">Soonest first</option><option value="latest">Latest first</option>
          </select>
        </Field>
      </div>
    </div>
    {sorted.length ? <ul className="card list" aria-label={`${tab} trips`}>
      {sorted.map(({ trip, segments }) => <li className="list-row" key={trip.id || code(trip)}>
        <div><h3>{tripTitle(trip)}</h3><p>{dateLabel(segments[0]?.departureAt)}</p></div>
        <div><strong>{segments[0] ? `${segments[0].origin || '—'} → ${segments[0].destination || '—'}` : 'Route unavailable'}</strong>
          <p>{segments.length === 1 ? 'One way' : segments.length > 1 ? `${segments.length} flights` : 'No flights'}</p></div>
        <div><strong>{code(trip)}</strong><p>Confirmation</p></div>
        <div className="row-end"><Badge>{statusLabel(trip.status)}</Badge>
          {trip.id && <AccountLink to={tripPath(trip.id)} aria-label={`View trip to ${tripTitle(trip)}, ${code(trip)}`}>View trip</AccountLink>}</div>
      </li>)}
    </ul> : <Empty title={query.trim() ? 'No matching trips' : `No ${tab.toLowerCase()} trips`}>
      {query.trim() ? 'Try a different destination, airport code or confirmation.' : 'Use Find a trip to look up a reservation.'}
    </Empty>}
    {lookup && <FindTrip onClose={() => setLookup(false)} onAdded={(trip) => {
      setLookup(false)
      setAdded(trip)
      setTab(tripGroup(trip))
      setQuery('')
      setOrder('')
    }} />}
  </>
}

export function useTrip() {
  const { tripId } = useParams()
  const { state, commit } = useStore()
  const trip = rows(state.trips).find((record) => record.id === tripId && signedIn(record, state.account))
  return { trip, state, commit }
}

export function TripUnavailable() {
  return <Empty title="Trip unavailable"><AccountLink to="/my-trips">Return to My Trips</AccountLink></Empty>
}

export function TripDetails() {
  const { trip, state } = useTrip()
  if (!trip) return <TripUnavailable />
  const segments = orderedSegments(trip)
  const travelers = rows(trip.travelers)
  const canChange = !serviceError(trip, state.account, 'changeAllowed')
  const canCancel = !serviceError(trip, state.account, 'cancellationAllowed')
  return <>
    <Back to="/my-trips">My Trips</Back>
    <Heading title={tripTitle(trip)} description={`Confirmation ${code(trip)}`}><Badge>{statusLabel(trip.status)}</Badge></Heading>
    <div className="two-columns">
      <div className="stack">
        <h2>Flight itinerary</h2>
        {segments.length ? segments.map((segment, index) => <FlightCard key={segment.id || index} segment={segment} />)
          : <Empty title="No flight details available" />}
        <h2 className="section-gap-small">Travelers</h2>
        {travelers.length ? <ul className="card list">
          {travelers.map((traveler, index) => <li key={traveler.id || index} className="compact-row">
            <div><strong>{fullName(traveler) || 'Traveler'}</strong><p className="muted">Ticket {traveler.ticketNumber || 'unavailable'}</p></div>
            {traveler.seat && <span>Seat {traveler.seat}</span>}
          </li>)}
        </ul> : <Empty title="No traveler details available" />}
      </div>
      <div className="stack">
        <Summary title="Reservation" lines={[
          ['Fare', trip.fareName || 'Fare unavailable'], ['Purchased', dateLabel(trip.purchasedAt)],
          ['Ticket value', money(trip.fareAmount, currencyOf(trip))],
        ]} />
        {(canChange || canCancel) && <section className="card form-card">
          <h2>Manage trip</h2>
          {canChange && <AccountLink to={tripPath(trip.id) + '/change'} className="button primary">Change flight</AccountLink>}
          {canCancel && <AccountLink to={tripPath(trip.id) + '/cancel'} className="button">Cancel trip</AccountLink>}
        </section>}
      </div>
    </div>
  </>
}
