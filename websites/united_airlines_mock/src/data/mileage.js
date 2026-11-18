import { arrived, bookingFor, list, ownsBooking, trips, uid } from './account.js'

export function completedFlights(world) {
  return trips(world).flatMap(booking => ownsBooking(world, booking) && booking.status === 'completed' && booking.id
    ? list(booking.segments).filter(segment => segment.id && arrived(segment)).map(segment => ({ booking, segment })) : [])
    .sort((a, b) => Date.parse(b.segment.departureAt) - Date.parse(a.segment.departureAt))
}

export function requestMileage(world, { bookingId, segmentId, ticketNumber }) {
  const memberId = world.mileagePlus?.memberId
  const booking = bookingFor(world, bookingId)
  const segment = list(booking?.segments).find(item => item.id === segmentId)
  if (!memberId || !ownsBooking(world, booking) || booking.status !== 'completed' || !arrived(segment)) {
    return { error: 'Choose a completed flight on your account.' }
  }
  const ticket = ticketNumber.trim().replace(/[ -]/g, '')
  const passenger = list(booking.passengers).find(item => item.id && String(item.ticketNumber ?? '') === ticket)
  if (!/^\d{13}$/.test(ticket) || !passenger) return { error: 'Enter the 13-digit ticket number from this trip.' }
  const matches = item => item.memberId === memberId && item.bookingId === bookingId && item.segmentId === segmentId
  if (list(world.mileageActivity).some(item => matches(item) && item.type === 'flight' && item.status === 'posted')) {
    return { error: 'Miles for this flight have already posted.' }
  }
  if (list(world.mileageRequests).some(matches)) return { error: 'A missing-miles request already exists for this flight.' }

  const record = {
    id: uid('mp-req'), memberId, bookingId, segmentId, passengerId: passenger.id, ticketNumber: ticket,
    status: 'submitted', actorId: world.account.id, createdAt: new Date().toISOString(),
  }
  return { world: { ...world, mileageRequests: [...(world.mileageRequests ?? []), record] }, record }
}
