import { list, cents, eligibleCredit, future, uid } from './account.js'
import { localDay } from './dates.js'
import { snapshotSegment } from './seed.js'

export const cashFare = flight => (cents(flight.baseFare) + cents(flight.taxes)) / 100

export function matchingFlights(world, origin, destination, day, travelers, mode) {
  if (!day || day < localDay()) return []
  return list(world.flightOptions).filter(option => {
    if (!option.id || option.origin?.code !== origin || option.destination?.code !== destination ||
        !Number.isInteger(travelers) || travelers < 1 || travelers > 4 || !(cents(option.taxes) >= 0) ||
        (mode === 'miles' ? !Number.isSafeInteger(option.milesFare) || option.milesFare <= 0 : !(cents(option.baseFare) >= 0))) return false
    const flight = snapshotSegment(option, day, option.id, [])
    return flight && future(flight)
  }).sort((a, b) => a.departureLocalTime.localeCompare(b.departureLocalTime))
}

export function quoteBooking(world, draft) {
  const { search, outboundId, returnId, travelers, mode, creditId } = draft
  if (!world.account?.id) return { error: 'A complete account is required to book a flight.' }
  if (!['cash', 'miles', 'cash_and_credit'].includes(mode)) return { error: 'Choose a payment method.' }
  if (travelers.length !== search.travelers || travelers.some(p => !p.firstName.trim() || !p.lastName.trim())) {
    return { error: 'Enter a first and last name for every traveler.' }
  }
  const outbound = matchingFlights(world, search.origin, search.destination, search.departure, search.travelers, mode).find(flight => flight.id === outboundId)
  const inbound = search.returnDate ? matchingFlights(world, search.destination, search.origin, search.returnDate, search.travelers, mode)
    .find(flight => flight.id === returnId) : null
  if (!outbound || (search.returnDate && !inbound)) return { error: 'Choose an available flight for each direction.' }
  const segments = [snapshotSegment(outbound, search.departure, outbound.id, [])]
  if (inbound) {
    const segment = snapshotSegment(inbound, search.returnDate, inbound.id, [])
    if (segment.departureAt <= segments[0].arrivalAt) return { error: 'Choose a return flight that leaves after your arrival.' }
    segments.push(segment)
  }
  const flights = inbound ? [outbound, inbound] : [outbound]
  const sum = get => flights.reduce((total, flight) => total + get(flight), 0) * travelers.length
  const base = mode === 'miles' ? 0 : sum(flight => cents(flight.baseFare))
  const taxes = sum(flight => cents(flight.taxes))
  const milesUsed = mode === 'miles' ? sum(flight => flight.milesFare) : 0
  if (mode === 'miles' && (!world.mileagePlus?.memberId || !Number.isSafeInteger(world.mileagePlus.awardMiles) ||
      world.mileagePlus.awardMiles < milesUsed)) return { error: 'Your MileagePlus balance is too low for this itinerary.' }

  const total = base + taxes
  const credit = mode === 'cash_and_credit' ? list(world.travelCredits).find(item => item.id === creditId) : null
  if (mode === 'cash_and_credit' && (!(total > 0) || !eligibleCredit(world, credit, travelers))) {
    return { error: 'Choose an eligible credit. A future flight credit requires its owner to be traveling.' }
  }
  const applied = credit ? Math.min(total, cents(credit.remainingAmount)) : 0
  return {
    flights, segments, credit,
    payment: {
      method: mode, currency: 'USD', baseFare: base / 100, taxes: taxes / 100, totalAmount: total / 100,
      cashAmount: (total - applied) / 100, milesUsed, creditAmount: applied / 100,
      ...(credit ? { creditId: credit.id } : {}),
    },
  }
}

export function confirmBooking(world, draft, review, bookingId) {
  if (list(world.bookings).some(booking => booking.id === bookingId)) return { error: 'This itinerary has already been booked.' }
  const quote = quoteBooking(world, draft)
  if (quote.error) return quote
  if (JSON.stringify(quote.payment) !== JSON.stringify(review.payment) ||
      JSON.stringify(quote.segments) !== JSON.stringify(review.segments) ||
      quote.credit?.remainingAmount !== review.credit?.remainingAmount) {
    return { error: 'Your itinerary or price changed. Close the review and check the updated details.' }
  }

  const actorId = world.account.id
  const createdAt = new Date().toISOString()
  const passengers = draft.travelers.map(traveler => ({
    id: uid('pax'), firstName: traveler.firstName.trim(), lastName: traveler.lastName.trim(),
    ticketNumber: '016' + String(crypto.getRandomValues(new Uint32Array(1))[0]).padStart(10, '0'),
  }))
  let confirmationCode
  do {
    confirmationCode = uid('bkg').slice(4, 10).toUpperCase()
  } while (list(world.bookings).some(item => String(item.confirmationCode).toUpperCase() === confirmationCode))
  const segments = quote.flights.map((flight, index) =>
    snapshotSegment(flight, index ? draft.search.returnDate : draft.search.departure, uid('seg'), passengers))
  const payment = quote.payment
  const booking = { id: bookingId, accountId: actorId, confirmationCode, status: 'confirmed', passengers, segments, payment, actorId, createdAt }
  const event = {
    id: uid('evt'), bookingId, type: 'booked', status: 'confirmed', amount: payment.cashAmount, currency: 'USD',
    passengerCount: passengers.length, ...(quote.credit ? { chargeCreditId: quote.credit.id } : {}), actorId, createdAt,
  }
  const next = {
    ...world, bookings: [...(world.bookings ?? []), booking],
    bookingEvents: [...(world.bookingEvents ?? []), event],
  }
  if (payment.method === 'miles') {
    next.mileagePlus = { ...world.mileagePlus, awardMiles: world.mileagePlus.awardMiles - payment.milesUsed }
    next.mileageActivity = [...(world.mileageActivity ?? []), {
      id: uid('mp-act'), memberId: world.mileagePlus.memberId, type: 'redemption', label: 'Award travel · ' + confirmationCode,
      miles: -payment.milesUsed, pqp: 0, pqf: 0, status: 'posted', bookingId, actorId, createdAt,
    }]
  }
  if (quote.credit) {
    const credit = quote.credit
    const remainingBalance = (cents(credit.remainingAmount) - cents(payment.creditAmount)) / 100
    next.travelCredits = world.travelCredits.map(item => item === credit ?
      { ...item, remainingAmount: remainingBalance, status: remainingBalance ? 'available' : 'used' } : item)
    next.creditRedemptions = [...(world.creditRedemptions ?? []), {
      id: uid('cr-use'), creditId: credit.id, bookingId, amount: payment.creditAmount, previousBalance: credit.remainingAmount,
      remainingBalance, currency: 'USD', status: 'applied', actorId, createdAt,
    }]
  }
  return { world: next, booking }
}
