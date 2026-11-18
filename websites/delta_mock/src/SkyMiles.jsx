import { useState } from 'react'
import {
  compact, dateLabel, eventRecord, fail, number, rows, sameName, signedIn, statusLabel, tripPath, tripTitle,
} from './domain.js'
import { useStore } from './store.jsx'
import { AccountLink, Back, Badge, Empty, ErrorMessage, Field, Heading, Success } from './ui.jsx'

const activityTypes = ['flight', 'partner', 'redemption', 'adjustment']
const signedNumber = (value) => Number(value) > 0 ? '+' + number(value) : number(value)

function requestHistory(state) {
  return rows(state.mileageRequests).filter((request) => signedIn(request, state.account))
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

function RequestHistory({ state }) {
  const requests = requestHistory(state)
  return <section className="section-gap" aria-label="Mileage request history">
    <h2 className="section-heading">Mileage request history</h2>
    {requests.length ? <ul className="card list">
      {requests.map((item, index) => <li key={item.id || index} className="compact-row">
        <div><strong>Ticket {item.ticketNumber || 'unavailable'}</strong>
          <p className="muted">{dateLabel(item.createdAt)}{item.id && ` · Reference ${item.id}`}</p></div>
        <Badge>{statusLabel(item.status)}</Badge>
      </li>)}
    </ul> : <Empty title="No mileage requests">Submitted requests will appear here.</Empty>}
  </section>
}

export function SkyMiles() {
  const { state } = useStore()
  const [type, setType] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const invalidDates = start && end && start > end
  const { account } = state
  const history = rows(state.mileageActivity).filter((item) => signedIn(item, account)
    && (!type || item.type === type) && (!start || item.activityOn >= start) && (!end || item.activityOn <= end))
    .sort((a, b) => String(b.activityOn ?? '').localeCompare(String(a.activityOn ?? '')))
  const tripById = new Map(rows(state.trips).filter((trip) => signedIn(trip, account)).map((trip) => [trip.id, trip]))
  return <>
    <Heading title="SkyMiles" description={account?.skyMilesNumber
      ? `Member •••• ${String(account.skyMilesNumber).slice(-4)}` : 'Your membership and mileage activity.'}>
      <AccountLink to="/skymiles/request" className="button primary">Request mileage credit</AccountLink>
    </Heading>
    <dl className="card metrics">
      <div><dt>Miles balance</dt><dd>{number(account?.milesBalance)}</dd></div>
      <div><dt>Medallion Qualification Dollars</dt><dd>{number(account?.mqds)} MQDs</dd>
        {account?.nextTier && account?.nextTierMqdTarget != null && <small className="muted">{number(account.nextTierMqdTarget)} MQDs for {account.nextTier}</small>}</div>
      <div><dt>Membership tier</dt><dd>{account?.tier || '—'}</dd>{account?.memberSince && <small className="muted">Member since {account.memberSince}</small>}</div>
    </dl>
    {requestHistory(state).length > 0 && <RequestHistory state={state} />}
    <section className="section-gap" aria-label="Mileage activity">
      <h2 className="section-heading">Mileage activity</h2>
      <div className="activity-filter">
        <Field label="Activity type"><select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All activity</option>
          {activityTypes.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select></Field>
        <Field label="From date" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        <Field label="Through date" type="date" value={end} onChange={(event) => setEnd(event.target.value)}
          aria-invalid={!!invalidDates} aria-describedby={invalidDates ? 'activity-period-error' : undefined} />
      </div>
      {invalidDates ? <ErrorMessage id="activity-period-error">Choose an end date on or after the start date.</ErrorMessage>
        : history.length ? <ul className="card list">
          {history.map((item, index) => <li key={item.id || index} className="list-row">
            <div><h3>{item.description || 'Mileage activity'}</h3><p>{dateLabel(item.activityOn)}</p></div>
            <div><Badge>{statusLabel(item.type)}</Badge>
              {item.ticketNumber && <p>{item.tripId && tripById.has(item.tripId)
                ? <AccountLink to={tripPath(item.tripId)}>Ticket {item.ticketNumber}</AccountLink> : `Ticket ${item.ticketNumber}`}</p>}</div>
            <div><strong>{signedNumber(item.miles)}</strong><p>Miles</p></div>
            <div><strong>{signedNumber(item.mqds)}</strong><p>MQDs</p></div>
          </li>)}
        </ul> : <Empty title="No mileage activity">Adjust the filters to see additional activity.</Empty>}
    </section>
  </>
}

function findTicket(state, input) {
  const ticketNumber = compact(input)
  if (!/^\d{13}$/.test(ticketNumber)) return fail('Enter a 13-digit ticket number.')
  const account = state.account
  if (!account?.id) return fail('Your SkyMiles membership is unavailable.')
  const bookings = rows(state.trips).filter((trip) => trip.id && rows(trip.travelers).some((traveler) =>
    compact(traveler.ticketNumber) === ticketNumber &&
    sameName(traveler.firstName, account.firstName) && sameName(traveler.lastName, account.lastName)))
  if (!bookings.length) return fail('No ticket matches this number and your SkyMiles membership name.')
  const trip = bookings.find((record) => record.status === 'completed' && ticketNumber.startsWith('006')
    && rows(record.segments).some(({ flightNumber }) => /^DL\s*\d/i.test(flightNumber)))
  if (!trip) return fail('Mileage credit is available for completed Delta flights.')
  if (rows(state.mileageActivity).some((item) => signedIn(item, account)
      && item.type === 'flight' && compact(item.ticketNumber) === ticketNumber)) return fail('This ticket has already earned mileage credit.')
  if (requestHistory(state).some((item) => compact(item.ticketNumber) === ticketNumber)) return fail('A request for this ticket has already been submitted.')
  return { trip, ticketNumber }
}

function submitRequest(state, input, reviewedTripId) {
  const result = findTicket(state, input)
  if (result.error) return result
  if (result.trip.id !== reviewedTripId) return fail('The ticket information changed. Review it again before submitting.')
  const request = {
    ...eventRecord(state.account.id, 'mileage-request'), accountId: state.account.id,
    tripId: result.trip.id, ticketNumber: result.ticketNumber, status: 'submitted',
  }
  return { request, state: { ...state, mileageRequests: [...rows(state.mileageRequests), request] } }
}

export function MileageRequest() {
  const { state, commit } = useStore()
  const [ticket, setTicket] = useState('')
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [request, setRequest] = useState(null)
  if (request) return <Success title="Mileage request submitted" to="/skymiles" link="View request history">
    <p>Ticket <strong>{request.ticketNumber}</strong> · <Badge>Submitted</Badge></p>
    <p>Request reference <strong>{request.id}</strong></p>
  </Success>
  async function submit(event) {
    event.preventDefault()
    if (review) {
      const result = await commit((latest) => submitRequest(latest, ticket, review.trip.id))
      setError(result.error || '')
      if (result.request) setRequest(result.request)
      return
    }
    const result = findTicket(state, ticket)
    setError(result.error || '')
    if (result.trip) setReview(result)
  }
  return <>
    <Back to="/skymiles">SkyMiles</Back>
    <Heading title="Request mileage credit" description="Enter the ticket number for a completed Delta flight." />
    <form className="card form-card" onSubmit={submit} noValidate>
      <Field label="13-digit ticket number" inputMode="numeric" value={ticket}
        onChange={(event) => { setTicket(event.target.value); setReview(null); setError('') }}
        aria-invalid={!!error} aria-describedby={error ? 'mileage-error' : undefined} />
      <ErrorMessage id="mileage-error">{error}</ErrorMessage>
      {review && <div className="match" aria-live="polite"><h2>Review ticket</h2>
        <p>{tripTitle(review.trip)} · Ticket {review.ticketNumber}</p></div>}
      <button className="button primary">{review ? 'Submit mileage request' : 'Review ticket'}</button>
    </form>
    <RequestHistory state={state} />
  </>
}
