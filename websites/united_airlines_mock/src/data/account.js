import { isDay, localDay, nextYear } from './dates.js'

export const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const person = value => [value?.firstName, value?.lastName].filter(Boolean).join(' ').trim()
export const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
export const cents = value => Number.isFinite(value) ? Math.round(value * 100) : NaN
export const uid = prefix => prefix + '-' + globalThis.crypto.randomUUID()
export const bookingFor = (world, id) => list(world.bookings).find(booking =>
  id && booking.id === id && (!booking.accountId || booking.accountId === world.account?.id))
export const ownsBooking = (world, booking) => Boolean(world.account?.id && booking?.accountId === world.account.id)
export const trips = world => list(world.bookings).filter(booking => !booking.accountId || booking.accountId === world.account?.id)

export const future = (segment, now = new Date()) => Date.parse(segment?.departureAt) > +now
export const arrived = (segment, now = new Date()) => Date.parse(segment?.arrivalAt) <= +now
export const depart = booking => Math.min(...list(booking?.segments).map(segment => Date.parse(segment.departureAt)).filter(Number.isFinite))
export const tripGroup = booking => booking.status === 'cancelled' ? 'cancelled' :
  booking.status === 'confirmed' && list(booking.segments).some(segment => future(segment)) ? 'upcoming' : 'past'

export const creditStatus = (credit, today = localDay()) => {
  if (credit.status === 'used' || credit.status === 'expired') return credit.status
  if (credit.remainingAmount === 0) return 'used'
  if (isDay(credit.expiresOn) && credit.expiresOn < today) return 'expired'
  return 'available'
}
export const credits = world => list(world.travelCredits).filter(credit => !credit.accountId || credit.accountId === world.account?.id)
export const eligibleCredit = (world, credit, travelers) => Boolean(world.account?.id &&
  credit?.id && credit.accountId === world.account.id && credit.currency === 'USD' &&
  ['future_flight_credit', 'electronic_travel_certificate'].includes(credit.type) &&
  isDay(credit.expiresOn) && creditStatus(credit) === 'available' &&
  cents(credit.remainingAmount) > 0 &&
  (credit.type !== 'future_flight_credit' || (normalize(credit.ownerName) &&
    (!travelers || travelers.some(traveler => normalize(person(traveler)) === normalize(credit.ownerName))))))

export const canCancel = (world, booking, now = new Date()) => Boolean(
  ownsBooking(world, booking) && booking.status === 'confirmed' && list(booking.segments).length &&
  list(booking.segments).every(segment => future(segment, now)) &&
  booking.payment?.method === 'cash' && booking.payment.currency === 'USD' &&
  !booking.payment.creditId && !booking.payment.creditAmount && cents(booking.payment.cashAmount) > 0 &&
  person(world.account) && !list(world.travelCredits).some(credit => credit.sourceBookingId === booking.id),
)

export function cancelTrip(world, bookingId, expectedAmount) {
  const now = new Date()
  const booking = bookingFor(world, bookingId)
  if (!canCancel(world, booking, now) || booking?.payment.cashAmount !== expectedAmount) {
    return { error: 'This trip is no longer eligible for the cancellation shown. Reopen the review for current details.' }
  }
  const actorId = world.account.id
  const createdAt = now.toISOString()
  const credit = {
    id: uid('cr'), code: 'FFC-' + uid('').slice(1, 13).replaceAll('-', '').toUpperCase(),
    type: 'future_flight_credit', accountId: actorId, ownerName: person(world.account),
    sourceBookingId: booking.id, originalAmount: expectedAmount, remainingAmount: expectedAmount,
    currency: 'USD', expiresOn: nextYear(localDay(now)), status: 'available', actorId, createdAt,
  }
  const event = {
    id: uid('evt'), bookingId, type: 'cancelled', status: 'cancelled', amount: expectedAmount,
    currency: 'USD', passengerCount: list(booking.passengers).length, issuedCreditId: credit.id, actorId, createdAt,
  }
  return {
    world: {
      ...world,
      bookings: world.bookings.map(item => item === booking ? { ...item, status: 'cancelled', cancelledAt: createdAt } : item),
      bookingEvents: [...(world.bookingEvents ?? []), event],
      travelCredits: [...(world.travelCredits ?? []), credit],
    },
    credit,
  }
}

export function seatSegments(world, booking) {
  return ownsBooking(world, booking) && booking.status === 'confirmed' && list(booking.passengers).some(p => p.id)
    ? list(booking.segments).filter(segment => segment.id && future(segment) && list(segment.seats).some(seat => seat.label)) : []
}

export function seatState(segment, passengerId, seat) {
  const assignments = segment.seatAssignments ?? {}
  if (assignments[passengerId] === seat.label) return 'current'
  if (Object.entries(assignments).some(([id, label]) => id !== passengerId && label === seat.label)) return 'assigned'
  if (seat.occupied || !Number.isFinite(seat.fee) || seat.fee < 0 || !seat.cabin) return 'occupied'
  return 'available'
}

export function changeSeat(world, { bookingId, segmentId, passengerId, seatLabel, previousSeat, fee, cabin }) {
  const booking = bookingFor(world, bookingId)
  const segment = seatSegments(world, booking).find(item => item.id === segmentId)
  const seat = list(segment?.seats).find(item => item.label === seatLabel)
  if (!segment || !list(booking?.passengers).some(item => item.id === passengerId) || !seat ||
      seatState(segment, passengerId, seat) !== 'available' ||
      (segment.seatAssignments?.[passengerId] ?? null) !== previousSeat || seat.fee !== fee || seat.cabin !== cabin) {
    return { error: 'That seat selection is no longer available. Choose an available seat and review it again.' }
  }
  const record = {
    id: uid('seat'), bookingId, segmentId, passengerId, previousSeat, newSeat: seat.label,
    cabin, fee, currency: 'USD', status: 'confirmed', actorId: world.account.id, createdAt: new Date().toISOString(),
  }
  const updatedSegment = { ...segment, seatAssignments: { ...segment.seatAssignments, [passengerId]: seat.label } }
  const updatedBooking = { ...booking, segments: booking.segments.map(item => item === segment ? updatedSegment : item) }
  return { world: {
    ...world,
    bookings: world.bookings.map(item => item === booking ? updatedBooking : item),
    seatChanges: [...(world.seatChanges ?? []), record],
  }, record }
}
