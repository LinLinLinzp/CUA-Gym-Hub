import { cents, currencyOf, datePart, dollars, newId, rows, validDate } from './domain.js'

export function uniqueNumber(records, key, prefix, width) {
  let number
  do {
    const random = crypto.getRandomValues(new Uint32Array(1))[0]
    number = prefix + String(random % (10 ** width)).padStart(width, '0')
  } while (records.some((record) => record[key] === number))
  return number
}

export function issueCredit(state, trip, action, amount, source) {
  const owner = rows(trip.travelers)[0] || state.account
  const purchased = datePart(trip.purchasedAt)
  const issued = action.createdAt.slice(0, 10)
  const [year, month, day] = (validDate(purchased) ? purchased : issued).split('-')
  const anniversary = `${Number(year) + 1}-${month}-${day}`
  const expiresOn = validDate(anniversary) ? anniversary : `${Number(year) + 1}-02-28`
  return {
    id: newId('credit'),
    number: uniqueNumber(rows(state.eCredits), 'number', '00689', 8),
    accountId: action.actorId, holderFirstName: owner.firstName || state.account.firstName || '',
    holderLastName: owner.lastName || state.account.lastName || '', source,
    sourceTripId: trip.id, sourceTripActionId: action.id, originalAmount: amount, remainingAmount: amount,
    currency: currencyOf(trip), status: 'available', expiresOn, actorId: action.actorId, createdAt: action.createdAt,
  }
}

export function changeAmounts(trip, offer) {
  const fareDifference = cents(offer.fareAmount) - cents(trip.fareAmount)
  const fee = cents(trip.changeFee ?? 0)
  const net = fareDifference + fee
  return {
    fareDifference: dollars(fareDifference), feeAmount: dollars(fee),
    amountDue: dollars(Math.max(net, 0)), creditAmount: dollars(Math.max(-net, 0)),
  }
}
