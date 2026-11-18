import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  cents, code, currencyOf, dateLabel, datePart, dollars, eventRecord, fail, localToday, money, newId, normalize,
  rows, tripPath, validDate, validMoney,
} from './domain.js'
import { availableCredits } from './ECredits.jsx'
import { uniqueNumber } from './settlements.js'
import { useStore } from './store.jsx'
import { AccountLink, Back, Empty, ErrorMessage, Field, FlightCard, Heading, Success, Summary } from './ui.jsx'

function bookingOffers(state, credit) {
  return rows(state.flightOffers).filter((offer) => {
    const segment = offer.segment
    const departure = Date.parse(segment?.departureAt)
    return offer.id && offer.type === 'booking' && credit && currencyOf(offer) === currencyOf(credit)
      && validMoney(offer.fareAmount) && cents(offer.fareAmount) > 0
      && segment?.origin && segment.destination && segment.origin !== segment.destination
      && departure > Date.now() && Date.parse(segment.arrivalAt) > departure
  }).sort((a, b) => Date.parse(a.segment.departureAt) - Date.parse(b.segment.departureAt))
}

function allocation(credit, offer) {
  const balance = cents(credit.remainingAmount)
  const fare = cents(offer.fareAmount)
  const applied = Math.min(balance, fare)
  return {
    fareAmount: dollars(fare), appliedAmount: dollars(applied),
    remainingAmount: dollars(balance - applied), amountPaid: dollars(fare - applied),
    currency: currencyOf(offer),
  }
}

const reviewKey = (credit, offer) => JSON.stringify([
  credit.id, credit.accountId, credit.remainingAmount, credit.expiresOn, credit.status, credit.currency, offer,
])

function redeem(state, review) {
  const account = state.account
  if (!normalize(account?.firstName) || !normalize(account?.lastName)) return fail('Traveler details are missing from your account.')
  const credit = availableCredits(state).find(({ id }) => id === review.credit.id)
  const offer = bookingOffers(state, credit).find(({ id }) => id === review.offer.id)
  if (!credit || !offer || review.key !== reviewKey(credit, offer)) {
    return fail('This eCredit or fare changed. Go back to search and review the latest options.')
  }
  const tripId = newId('trip')
  const action = {
    ...eventRecord(account.id, 'ecredit-action'), eCreditId: credit.id, tripId, offerId: offer.id,
    type: 'redeemed', status: 'completed', ...allocation(credit, offer),
  }
  const trips = rows(state.trips)
  const trip = {
    id: tripId, accountId: account.id, confirmationCode: uniqueNumber(trips, 'confirmationCode', 'R', 5),
    status: 'confirmed',
    travelers: [{
      id: newId('traveler'), firstName: account.firstName, lastName: account.lastName,
      ticketNumber: uniqueNumber(trips.flatMap((item) => rows(item.travelers)), 'ticketNumber', '00681', 8),
    }],
    segments: [{ ...offer.segment, id: newId('seg') }],
    fareName: 'Delta Main Classic', fareAmount: action.fareAmount, currency: action.currency,
    purchasedAt: action.createdAt, linkedAt: action.createdAt,
    changeAllowed: true, changeFee: 0, cancellationAllowed: true, cancellationFee: 0, refundType: 'ecredit',
  }
  return {
    trip, action,
    state: {
      ...state,
      trips: [...trips, trip],
      eCredits: rows(state.eCredits).map((record) => record === credit ? {
        ...record, remainingAmount: action.remainingAmount,
        status: action.remainingAmount === 0 ? 'used' : 'available', updatedAt: action.createdAt,
      } : record),
      eCreditActions: [...rows(state.eCreditActions), action],
    },
  }
}

function airports(offers, side) {
  const codes = new Map()
  for (const { segment } of offers) codes.set(segment[side], segment[side + 'City'] || '')
  return [...codes.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function RedeemCredit() {
  const [params] = useSearchParams()
  const preselected = params.get('credit') || ''
  return <RedemptionFlow key={preselected} preselected={preselected} />
}

function RedemptionFlow({ preselected }) {
  const { state, commit } = useStore()
  const [creditId, setCreditId] = useState(preselected)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [searched, setSearched] = useState(false)
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  if (confirmation) return <Success title="Trip confirmed" to={tripPath(confirmation.trip.id)} link="View new itinerary">
    <p>Confirmation <strong>{code(confirmation.trip)}</strong></p>
    <p>{money(confirmation.action.appliedAmount, confirmation.action.currency)} in eCredit was applied.</p>
    <p>Remaining eCredit balance <strong>{money(confirmation.action.remainingAmount, confirmation.action.currency)}</strong></p>
  </Success>
  const credits = availableCredits(state)
  const credit = credits.find(({ id }) => id === creditId)
  const offers = bookingOffers(state, credit)
  const origins = airports(offers, 'origin')
  const actualOrigin = origin || (origins.length === 1 ? origins[0][0] : '')
  const destinations = airports(offers.filter(({ segment }) => !actualOrigin || segment.origin === actualOrigin), 'destination')
  const routeOffers = offers.filter(({ segment }) => segment.origin === actualOrigin && segment.destination === destination)
  const dates = [...new Set(routeOffers.map(({ segment }) => datePart(segment.departureAt)))]
  const results = routeOffers.filter(({ segment }) => datePart(segment.departureAt) === date)

  function resetSearch() {
    setError('')
    setSearched(false)
  }

  function search(event) {
    event.preventDefault()
    if (!credit || !actualOrigin || !destination || !validDate(date) || date < localToday()) {
      setError('Choose an available eCredit, both airports and a departure date from today onward.')
      return
    }
    setSearched(true)
    setError('')
  }

  if (review) {
    const amounts = review.amounts
    const convert = (value) => money(value, amounts.currency)
    return <>
      <Back to="/ecredits">eCredits</Back>
      <Heading title="Review eCredit booking" description={`Use eCredit ${review.credit.number || review.credit.id} toward this flight.`} />
      <div className="two-columns">
        <div className="stack">
          <FlightCard segment={review.offer.segment} />
          <ErrorMessage>{error}</ErrorMessage>
          <div className="form-controls">
            <button className="button primary" onClick={async () => {
              const result = await commit((latest) => redeem(latest, review))
              if (result.error) setError(result.error)
              else setConfirmation(result)
            }}>Confirm booking</button>
            <button className="button" onClick={() => { setReview(null); setError('') }}>Back to flight options</button>
          </div>
        </div>
        <Summary title="Payment breakdown" lines={[
          ['Flight fare', convert(amounts.fareAmount)], ['eCredit applied', convert(amounts.appliedAmount)],
          ['Remaining eCredit', convert(amounts.remainingAmount)], ['Amount due', convert(amounts.amountPaid)],
        ]} />
      </div>
    </>
  }

  return <>
    <Back to="/ecredits">eCredits</Back>
    <Heading title="Redeem an eCredit" description="Choose a travel credit and search for a one-way flight." />
    {!credits.length ? <Empty title="No available eCredits"><AccountLink to="/ecredits">Return to your wallet</AccountLink></Empty>
      : <form className="card form-card" noValidate onSubmit={search} aria-describedby={error ? 'redeem-error' : undefined}>
        <Field label="eCredit"><select value={credit?.id || ''} onChange={(event) => {
          setCreditId(event.target.value); setOrigin(''); setDestination(''); setDate(''); resetSearch()
        }}>
          <option value="">Select an eCredit</option>
          {credits.map((item) => <option key={item.id} value={item.id}>
            {item.number || item.id} · {money(item.remainingAmount, currencyOf(item))} · Expires {dateLabel(item.expiresOn)}
          </option>)}
        </select></Field>
        {creditId && !credit && <p className="muted">The selected credit is unavailable. Choose an available credit to continue.</p>}
        <div className="form-grid">
          <Field label="From"><select value={actualOrigin} disabled={!credit} onChange={(event) => {
            setOrigin(event.target.value); setDestination(''); setDate(''); resetSearch()
          }}><option value="">Select departure airport</option>
            {origins.map(([airport, city]) => <option key={airport} value={airport}>{airport}{city && ` · ${city}`}</option>)}
          </select></Field>
          <Field label="To"><select value={destination} disabled={!actualOrigin || !credit} onChange={(event) => {
            setDestination(event.target.value); setDate(''); resetSearch()
          }}><option value="">Select arrival airport</option>
            {destinations.map(([airport, city]) => <option key={airport} value={airport}>{airport}{city && ` · ${city}`}</option>)}
          </select></Field>
        </div>
        <Field label="Departure date" type="date" min={localToday()} value={date} disabled={!credit}
          onChange={(event) => { setDate(event.target.value); resetSearch() }} />
        {dates.length > 0 && <div className="form-controls date-suggestions">
          <span className="muted">Available dates</span>
          {dates.map((value) => <button key={value} type="button" className="button"
            onClick={() => { setDate(value); resetSearch() }}>{dateLabel(value)}</button>)}
        </div>}
        {credit && !offers.length && <p className="muted">No flight inventory is available for this credit. Try another eCredit.</p>}
        <ErrorMessage id="redeem-error">{error}</ErrorMessage>
        <button className="button primary">Search flights</button>
      </form>}
    {searched && <section className="stack section-gap" aria-label="Booking search results">
      <h2>Flight options</h2>
      {results.length ? results.map((offer) => <div key={offer.id} className="stack offer">
        <FlightCard segment={offer.segment} />
        <div className="offer-footer">
          <strong>{money(offer.fareAmount, currencyOf(offer))} fare</strong>
          <button className="button" onClick={() => setReview({
            credit, offer, amounts: allocation(credit, offer), key: reviewKey(credit, offer),
          })}>Review {offer.segment.flightNumber || 'flight'}</button>
        </div>
      </div>) : <Empty title="No flights found">Try an available date or choose another destination.</Empty>}
    </section>}
  </>
}
