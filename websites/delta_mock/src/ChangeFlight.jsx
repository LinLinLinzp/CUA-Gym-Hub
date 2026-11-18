import { useState } from 'react'
import {
  currencyOf, dateLabel, datePart, eventRecord, fail, localToday, money, orderedSegments,
  rows, serviceError, tripPath, validDate, validMoney,
} from './domain.js'
import { changeAmounts, issueCredit } from './settlements.js'
import { TripUnavailable, useTrip } from './Trips.jsx'
import { Back, Empty, ErrorMessage, Field, FlightCard, Heading, Success, Summary } from './ui.jsx'

function matchingOffers(state, trip, segmentId) {
  const segments = orderedSegments(trip)
  const index = segments.findIndex(({ id }) => id === segmentId)
  const previous = segments[index]
  if (!previous?.origin || !previous.destination || !validMoney(trip.fareAmount) || !validMoney(trip.changeFee ?? 0)) return []
  return rows(state.flightOffers).filter((offer) => {
    const replacement = offer.segment
    if (!offer.id || offer.type !== 'change' || offer.tripId !== trip.id || offer.segmentId !== segmentId
        || replacement?.origin !== previous.origin || replacement.destination !== previous.destination
        || currencyOf(offer) !== currencyOf(trip) || !validMoney(offer.fareAmount)) return false
    const departure = Date.parse(replacement.departureAt)
    const arrival = Date.parse(replacement.arrivalAt)
    return departure > Date.now() && arrival > departure && replacement.departureAt !== previous.departureAt
      && (index === 0 || departure >= Date.parse(segments[index - 1].arrivalAt))
      && (index === segments.length - 1 || arrival <= Date.parse(segments[index + 1].departureAt))
  }).sort((a, b) => Date.parse(a.segment.departureAt) - Date.parse(b.segment.departureAt))
}

function reviewKey(trip, offer) {
  return JSON.stringify([trip.segments, trip.fareAmount, trip.changeFee, trip.purchasedAt, trip.currency, offer])
}

function confirmChange(state, tripId, review) {
  const trip = rows(state.trips).find(({ id }) => id === tripId)
  const error = serviceError(trip, state.account, 'changeAllowed')
  if (error) return fail(error)
  const offer = matchingOffers(state, trip, review.segmentId).find(({ id }) => id === review.offer.id)
  if (!offer || reviewKey(trip, offer) !== review.key) return fail('This itinerary or fare changed. Search again to review the latest options.')
  const previousSegment = rows(trip.segments).find(({ id }) => id === offer.segmentId)
  const replacementSegment = { ...offer.segment, id: previousSegment.id }
  const { feeAmount, amountDue, creditAmount } = changeAmounts(trip, offer)
  const action = {
    ...eventRecord(state.account.id, 'trip-action'), tripId, segmentId: previousSegment.id, offerId: offer.id,
    type: 'changed', status: 'completed', previousSegment, replacementSegment,
    oldFareAmount: Number(trip.fareAmount), newFareAmount: Number(offer.fareAmount),
    feeAmount, amountDue, creditAmount, currency: currencyOf(trip),
  }
  const credit = creditAmount > 0 ? issueCredit(state, trip, action, creditAmount, 'change') : null
  if (credit) action.eCreditId = credit.id
  return {
    action, credit,
    state: {
      ...state,
      trips: rows(state.trips).map((record) => record === trip ? {
        ...record,
        segments: rows(record.segments).map((segment) => segment === previousSegment ? replacementSegment : segment),
        fareAmount: action.newFareAmount, updatedAt: action.createdAt,
      } : record),
      tripActions: [...rows(state.tripActions), action],
      ...(credit ? { eCredits: [...rows(state.eCredits), credit] } : {}),
    },
  }
}

export function ChangeFlight() {
  const { trip } = useTrip()
  return trip ? <ChangeForm key={trip.id} /> : <TripUnavailable />
}

function ChangeForm() {
  const { trip, state, commit } = useTrip()
  const [selection, setSelection] = useState('')
  const [date, setDate] = useState('')
  const [searched, setSearched] = useState('')
  const [review, setReview] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const path = tripPath(trip.id)
  if (confirmation) return <Success title="Flight changed" to={path} link="View updated itinerary">
    <p>Change reference <strong>{confirmation.action.id}</strong></p>
    {confirmation.credit && <p>eCredit <strong>{confirmation.credit.number}</strong> was added to your wallet.</p>}
  </Success>
  const unavailable = serviceError(trip, state.account, 'changeAllowed')
  if (unavailable) return <><Back to={path}>Trip details</Back><Empty title="Change unavailable">{unavailable}</Empty></>

  const segments = orderedSegments(trip).filter(({ id }) => id)
  const segmentId = selection || segments[0]?.id || ''
  const offers = matchingOffers(state, trip, segmentId)
  const availableDates = [...new Set(offers.map(({ segment }) => datePart(segment.departureAt)))]
  const results = offers.filter(({ segment }) => datePart(segment.departureAt) === searched)
  const convert = (value) => money(value, currencyOf(trip))

  function search(event) {
    event.preventDefault()
    if (!validDate(date) || date < localToday() || !segmentId) {
      setError('Choose a flight and enter a departure date from today onward.')
      return
    }
    setSearched(date)
    setError('')
  }

  function resetResults() {
    setSearched('')
    setError('')
  }

  if (review) {
    const amounts = review.amounts
    const difference = convert(Math.abs(amounts.fareDifference))
    return <>
      <Back to={path}>Trip details</Back>
      <Heading title="Review flight change" description="Check the new flight and price before confirming." />
      <div className="two-columns">
        <div className="stack">
          <h2>Current flight</h2><FlightCard segment={review.previous} />
          <h2>New flight</h2><FlightCard segment={review.offer.segment} />
          <ErrorMessage>{error}</ErrorMessage>
          <div className="form-controls">
            <button className="button primary" onClick={async () => {
              const result = await commit((latest) => confirmChange(latest, trip.id, review))
              if (result.error) setError(result.error)
              else setConfirmation(result)
            }}>Confirm flight change</button>
            <button className="button" onClick={() => { setReview(null); setError('') }}>Back to flight options</button>
          </div>
        </div>
        <Summary title="Price breakdown" lines={[
          ['Current fare', convert(review.oldFare)], ['New fare', convert(review.offer.fareAmount)],
          ['Fare difference', amounts.fareDifference < 0 ? '−' + difference : difference],
          ['Change fee', convert(amounts.feeAmount)],
          amounts.creditAmount > 0 ? ['eCredit', convert(amounts.creditAmount)] : ['Amount due', convert(amounts.amountDue)],
        ]} />
      </div>
    </>
  }

  return <>
    <Back to={path}>Trip details</Back>
    <Heading title="Change flight" description="Choose which flight to change and search for a new departure date." />
    <form className="card form-card" onSubmit={search} noValidate>
      <div className="form-grid">
        <Field label="Flight to change"><select value={segmentId} onChange={(event) => { setSelection(event.target.value); setDate(''); resetResults() }}>
          {!segments.length && <option value="">No flights available</option>}
          {segments.map((segment) => <option key={segment.id} value={segment.id}>
            {segment.flightNumber || 'Flight'} · {segment.origin || '—'} → {segment.destination || '—'} · {dateLabel(segment.departureAt)}
          </option>)}
        </select></Field>
        <Field label="New departure date" type="date" min={localToday()} value={date}
          aria-invalid={!!error} aria-describedby={error ? 'change-error' : undefined}
          onChange={(event) => { setDate(event.target.value); resetResults() }} />
      </div>
      {availableDates.length > 0 && <div className="form-controls date-suggestions">
        <span className="muted">Available dates</span>
        {availableDates.map((value) => <button type="button" className="button" key={value}
          onClick={() => { setDate(value); resetResults() }}>{dateLabel(value)}</button>)}
      </div>}
      <ErrorMessage id="change-error">{error}</ErrorMessage>
      <button className="button primary">Search flights</button>
    </form>
    {searched && <section className="stack section-gap" aria-label="Change search results">
      <h2>Flight options</h2>
      {results.length ? results.map((offer) => {
        const amounts = changeAmounts(trip, offer)
        return <div key={offer.id} className="stack offer">
          <FlightCard segment={offer.segment} />
          <div className="offer-footer">
            <strong>{amounts.creditAmount > 0 ? `${convert(amounts.creditAmount)} eCredit` : `${convert(amounts.amountDue)} due`}</strong>
            <button className="button" onClick={() => setReview({
              offer, amounts, segmentId, key: reviewKey(trip, offer),
              previous: segments.find(({ id }) => id === segmentId), oldFare: trip.fareAmount,
            })}>Review {offer.segment.flightNumber || 'flight'}</button>
          </div>
        </div>
      }) : <Empty title="No flights found">Try an available date or choose another flight in your itinerary.</Empty>}
    </section>}
  </>
}
