import { useState } from 'react'
import {
  cents, code, currencyOf, dollars, eventRecord, fail, money, newId, orderedSegments, rows,
  serviceError, tripPath, validMoney,
} from './domain.js'
import { issueCredit } from './settlements.js'
import { TripUnavailable, useTrip } from './Trips.jsx'
import { AccountLink, Back, Empty, ErrorMessage, FlightCard, Heading, Success, Summary } from './ui.jsx'

function quote(trip, account) {
  const error = serviceError(trip, account, 'cancellationAllowed')
  if (error) return fail(error)
  const fee = trip.cancellationFee ?? 0
  if (!validMoney(trip.fareAmount) || !validMoney(fee) || !['ecredit', 'original_payment'].includes(trip.refundType)) {
    return fail('The settlement details for this reservation are unavailable.')
  }
  const value = Math.max(0, cents(trip.fareAmount) - cents(fee))
  return {
    key: JSON.stringify([trip.segments, trip.fareAmount, fee, trip.currency, trip.refundType, trip.purchasedAt, trip.travelers]),
    feeAmount: Number(fee),
    refundAmount: trip.refundType === 'original_payment' ? dollars(value) : 0,
    creditAmount: trip.refundType === 'ecredit' ? dollars(value) : 0,
  }
}

function confirmCancel(state, tripId, reviewedKey) {
  const trip = rows(state.trips).find(({ id }) => id === tripId)
  const amounts = quote(trip, state.account)
  if (amounts.error) return amounts
  if (amounts.key !== reviewedKey) return fail('The itinerary or settlement changed. Reopen this review from your itinerary.')
  const { feeAmount, refundAmount, creditAmount } = amounts
  const action = {
    ...eventRecord(state.account.id, 'trip-action'), tripId, type: 'canceled', status: 'completed',
    oldFareAmount: Number(trip.fareAmount), feeAmount, refundAmount, creditAmount, currency: currencyOf(trip),
  }
  const credit = creditAmount > 0 ? issueCredit(state, trip, action, creditAmount, 'cancellation') : null
  const refund = refundAmount > 0 ? {
    id: newId('refund'), actorId: action.actorId, createdAt: action.createdAt,
    tripId, tripActionId: action.id, status: 'issued', method: 'original_payment',
    amount: refundAmount, currency: action.currency,
    lineItems: [{ tripId, description: 'Unused booking value', quantity: 1, amount: refundAmount }],
  } : null
  if (credit) action.eCreditId = credit.id
  if (refund) action.refundId = refund.id
  return {
    action, credit, refund,
    state: {
      ...state,
      trips: rows(state.trips).map((record) => record === trip ? {
        ...record, status: 'canceled', canceledAt: action.createdAt, updatedAt: action.createdAt,
      } : record),
      tripActions: [...rows(state.tripActions), action],
      ...(credit ? { eCredits: [...rows(state.eCredits), credit] } : {}),
      ...(refund ? { refunds: [...rows(state.refunds), refund] } : {}),
    },
  }
}

export function CancelTrip() {
  const { trip } = useTrip()
  return trip ? <CancellationReview key={trip.id} /> : <TripUnavailable />
}

function CancellationReview() {
  const { trip, state, commit } = useTrip()
  const [{ reviewedTrip, amounts }] = useState(() => ({ reviewedTrip: trip, amounts: quote(trip, state.account) }))
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const path = tripPath(trip.id)
  const convert = (value) => money(value, currencyOf(reviewedTrip))
  if (confirmation) return <Success title="Trip canceled" to={path} link="View canceled itinerary">
    <p>Cancellation reference <strong>{confirmation.action.id}</strong></p>
    {confirmation.credit && <p>eCredit <strong>{confirmation.credit.number}</strong> is in <AccountLink to="/ecredits">your wallet</AccountLink>.</p>}
    {confirmation.refund && <p>Refund <strong>{confirmation.refund.id}</strong> · {convert(confirmation.refund.amount)} to the original payment method.</p>}
    {!confirmation.credit && !confirmation.refund && <p>The reservation had no remaining value after the cancellation fee.</p>}
  </Success>
  if (amounts.error) return <><Back to={path}>Trip details</Back><Empty title="Cancellation unavailable">{amounts.error}</Empty></>
  const isRefund = reviewedTrip.refundType === 'original_payment'
  return <>
    <Back to={path}>Trip details</Back>
    <Heading title="Review cancellation" description={`All flights on confirmation ${code(reviewedTrip)} will be canceled.`} />
    <div className="two-columns">
      <div className="stack">
        <h2>Flights to cancel</h2>
        {orderedSegments(reviewedTrip).map((segment, index) => <FlightCard key={segment.id || index} segment={segment} />)}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="form-controls">
          <button className="button primary" onClick={async () => {
            const result = await commit((latest) => confirmCancel(latest, trip.id, amounts.key))
            if (result.error) setError(result.error)
            else setConfirmation(result)
          }}>Confirm cancellation</button>
          <AccountLink className="button" to={path}>Keep this trip</AccountLink>
        </div>
      </div>
      <Summary title="Cancellation value" lines={[
        ['Ticket value', convert(reviewedTrip.fareAmount)], ['Cancellation fee', convert(amounts.feeAmount)],
        [isRefund ? 'Expected refund' : 'Expected eCredit', convert(isRefund ? amounts.refundAmount : amounts.creditAmount)],
      ]} />
    </div>
  </>
}
