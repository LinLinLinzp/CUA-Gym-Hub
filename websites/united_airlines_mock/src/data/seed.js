import { airportInstant, moveDay } from './dates.js'

const airport = (code, city, timeZone) => ({ code, city, timeZone: 'America/' + timeZone })
const ORD = airport('ORD', 'Chicago', 'Chicago')
const SFO = airport('SFO', 'San Francisco', 'Los_Angeles')
const DEN = airport('DEN', 'Denver', 'Denver')
const EWR = airport('EWR', 'Newark', 'New_York')
const IAH = airport('IAH', 'Houston', 'Chicago')
const SEA = airport('SEA', 'Seattle', 'Los_Angeles')
const BOS = airport('BOS', 'Boston', 'New_York')
const LAX = airport('LAX', 'Los Angeles', 'Los_Angeles')
const IAD = airport('IAD', 'Washington, D.C.', 'New_York')
const MIA = airport('MIA', 'Miami', 'New_York')

const routes = [
  [ORD, SFO, '09:15', '11:56', '13:20', '19:31'],
  [DEN, EWR, '08:10', '13:56', '16:25', '18:59'],
  [IAH, SEA, '10:20', '12:58', '14:30', '20:46'],
  [ORD, BOS, '07:30', '10:49', '12:35', '14:27'],
  [SFO, LAX, '06:45', '08:15', '10:50', '12:15'],
  [IAD, MIA, '09:30', '12:16', '15:35', '18:09'],
  [DEN, SFO, '11:10', '12:47', '14:00', '17:44'],
  [EWR, ORD, '08:15', '09:57', '12:10', '15:33'],
  [IAH, LAX, '09:05', '10:47', '13:40', '19:05'],
]

const id = (prefix, index) => prefix + '-' + String(index).padStart(3, '0')
const actorId = 'acct-001'
const memberId = 'AM480271'
const ownerName = 'Avery Morgan'
const historyStart = '2026-11-09'

function seats(cabin, constrained) {
  const firstRow = cabin === 'Economy Plus' ? 7 : 18
  return Array.from({ length: 5 }, (_, i) => [...'ABCDEF'].map((letter, j) => ({
    label: (firstRow + i) + letter,
    position: j === 0 || j === 5 ? 'window' : j === 2 || j === 3 ? 'aisle' : 'middle',
    cabin: cabin === 'Economy' && i === 3 ? 'Economy Plus' : cabin,
    fee: cabin === 'Economy' && i === 3 ? 39 : 0,
    occupied: constrained ? i !== 0 || j > 1 : (i * 6 + j) % 7 === 6 && !(firstRow + i === 21 && letter === 'C'),
  }))).flat()
}

function flightOptions() {
  return routes.flatMap(([from, to, leave, arrive, back, home], route) => (
    [[from, to, leave, arrive], [to, from, back, home]].flatMap(([origin, destination, departure, arrival], direction) => (
      [0, 1].map(premium => {
        const n = route * 4 + direction * 2 + premium + 1
        const cabin = premium ? 'Economy Plus' : 'Economy'
        const hours = time => String(Number(time.slice(0, 2)) + premium * 2).padStart(2, '0') + time.slice(2)
        return {
          id: id('flt', n), flightNumber: n === 1 ? 'UA 2175' : 'UA ' + (830 + n * 31),
          origin, destination, departureLocalTime: hours(departure), arrivalLocalTime: hours(arrival),
          arrivalDayOffset: 0, cabin, fareClass: premium ? 'Economy Plus' : 'Standard Economy',
          seats: seats(cabin, n === 8), baseFare: 249 + route * 12 + premium * 76,
          taxes: 18.6, milesFare: 22000 + route * 1000 + premium * 6000,
        }
      })
    ))
  ))
}

export function snapshotSegment(flight, day, segmentId, passengers) {
  const departureAt = airportInstant(day, flight.departureLocalTime, flight.origin?.timeZone)
  const arrivalAt = airportInstant(moveDay(day, flight.arrivalDayOffset ?? 0), flight.arrivalLocalTime, flight.destination?.timeZone)
  if (!departureAt || !arrivalAt || arrivalAt <= departureAt) return null
  const seats = Array.isArray(flight.seats) ? flight.seats.filter(seat => seat?.label) : []
  const free = seats.filter(seat => seat.occupied === false && seat.cabin === flight.cabin)
  return {
    id: segmentId, flightOptionId: flight.id, flightNumber: flight.flightNumber,
    origin: flight.origin, destination: flight.destination, departureAt, arrivalAt,
    cabin: flight.cabin, fareClass: flight.fareClass, seats,
    seatAssignments: Object.fromEntries(passengers.slice(0, free.length).map((p, i) => [p.id, free[i].label])),
  }
}

export function createInitialData() {
  const account = { id: actorId, firstName: 'Avery', lastName: 'Morgan' }
  const mileagePlus = { memberId, tier: 'Premier Silver', awardMiles: 58420, pqp: 3520, pqf: 14 }
  const options = flightOptions()
  const bookings = Array.from({ length: 36 }, (_, i) => {
    const n = i + 1
    const flight = options[i]
    const passengers = [{
      id: id('pax', n), firstName: 'Avery', lastName: 'Morgan',
      ticketNumber: '016' + String(411 + n).padStart(10, '0'),
    }]
    if (n === 1) passengers.push({ id: 'pax-037', firstName: 'Jordan', lastName: 'Morgan', ticketNumber: '0160000000715' })
    const status = n <= 12 ? 'confirmed' : n <= 32 ? 'completed' : 'cancelled'
    const day = n <= 12 ? moveDay('2026-12-08', i * 9) : moveDay(status === 'cancelled' ? '2025-11-09' : historyStart, -(i - 12) * 8)
    const itinerary = n === 1 ? [flight, options[2]] : [flight]
    const segments = itinerary.map((option, j) => snapshotSegment(option, moveDay(day, j * 5), j ? 'seg-037' : id('seg', n), passengers))
    const baseFare = itinerary.reduce((sum, option) => sum + option.baseFare, 0) * passengers.length
    const taxCents = itinerary.length * 1860 * passengers.length
    const totalAmount = (baseFare * 100 + taxCents) / 100
    return {
      id: id('bkg', n), accountId: actorId,
      confirmationCode: n === 1 ? 'G7H2QK' : 'M' + (10000 + n * 197).toString(36).toUpperCase().padStart(5, '0'),
      status, passengers, segments,
      payment: { method: 'cash', currency: 'USD', baseFare, taxes: taxCents / 100, totalAmount, cashAmount: totalAmount, milesUsed: 0, creditAmount: 0 },
      actorId, createdAt: moveDay(status === 'confirmed' ? '2026-10-24' : day, -32) + 'T15:00:00.000Z',
      ...(status === 'cancelled' ? { cancelledAt: moveDay(day, -7) + 'T15:00:00.000Z' } : {}),
    }
  })

  const bookingEvents = bookings.flatMap((booking, i) => {
    const common = {
      bookingId: booking.id, amount: booking.payment.cashAmount, currency: 'USD',
      passengerCount: booking.passengers.length, actorId,
    }
    const booked = { ...common, id: id('evt', i + 1), type: 'booked', status: 'confirmed', createdAt: booking.createdAt }
    return booking.cancelledAt ? [booked, {
      ...common, id: id('evt', i + 5), type: 'cancelled', status: 'cancelled',
      issuedCreditId: id('cr', i - 27), createdAt: booking.cancelledAt,
    }] : [booked]
  })

  const travelCredits = Array.from({ length: 28 }, (_, i) => {
    const n = i + 1
    const source = i >= 4 && i < 8 ? bookings[i + 28] : null
    const status = source ? 'expired' : i % 4 === 2 ? 'used' : i % 4 === 3 ? 'expired' : 'available'
    const originalAmount = [350, 100, 125, 85][i % 4] + Math.floor(i / 4) * 15
    return {
      id: id('cr', n), code: (source || i % 2 === 0 ? 'FFC-' : 'ETC-') + (318207 + i * 283),
      type: source || i % 2 === 0 ? 'future_flight_credit' : 'electronic_travel_certificate',
      accountId: actorId, ownerName, ...(source ? { sourceBookingId: source.id } : {}),
      originalAmount: source?.payment.cashAmount ?? originalAmount,
      remainingAmount: status === 'used' ? 0 : source?.payment.cashAmount ?? originalAmount,
      currency: 'USD',
      expiresOn: source ? (Number(source.cancelledAt.slice(0, 4)) + 1) + source.cancelledAt.slice(4, 10) : status === 'expired' ? moveDay('2026-10-26', -i * 2) : moveDay('2027-09-10', i * 5),
      status, actorId, createdAt: source?.cancelledAt ?? (moveDay(historyStart, -40 - i * 3) + 'T16:30:00.000Z'),
    }
  })

  const usedCredit = travelCredits[2]
  const creditBooking = bookings[18]
  usedCredit.createdAt = moveDay(creditBooking.createdAt.slice(0, 10), -7) + 'T16:30:00.000Z'
  creditBooking.payment = {
    ...creditBooking.payment, method: 'cash_and_credit', creditAmount: usedCredit.originalAmount,
    cashAmount: (Math.round(creditBooking.payment.cashAmount * 100) - usedCredit.originalAmount * 100) / 100,
    creditId: usedCredit.id,
  }
  bookingEvents[18].amount = creditBooking.payment.cashAmount
  bookingEvents[18].chargeCreditId = usedCredit.id
  const creditRedemptions = [{
    id: 'cr-use-001', creditId: usedCredit.id, bookingId: creditBooking.id,
    amount: usedCredit.originalAmount, previousBalance: usedCredit.originalAmount,
    remainingBalance: 0, currency: 'USD', status: 'applied', actorId, createdAt: creditBooking.createdAt,
  }]

  const mileageActivity = Array.from({ length: 48 }, (_, i) => {
    const booking = i < 17 ? bookings[i + 15] : null
    const segment = booking?.segments[0]
    const type = booking ? 'flight' : ['bonus', 'partner', 'partner', 'redemption'][i % 4]
    const label = segment ? segment.origin.city + ' to ' + segment.destination.city : {
      bonus: 'MileagePlus seasonal bonus', partner: i % 2 ? 'Hotel partner stay' : 'MileagePlus Shopping',
      redemption: 'Award travel redemption',
    }[type]
    return {
      id: id('mp-act', i + 1), memberId, type, label,
      miles: type === 'redemption' ? -18000 - i * 100 : 450 + i * 55,
      pqp: booking ? 160 + i * 11 : 0, pqf: booking ? 1 : 0, status: 'posted',
      ...(booking ? { bookingId: booking.id, segmentId: segment.id } : {}),
      actorId: type === 'partner' ? 'partner-activity' : actorId,
      createdAt: segment?.arrivalAt ?? (moveDay(historyStart, -i * 3) + 'T15:00:00.000Z'),
    }
  })

  const prior = bookings[13]
  const mileageRequests = [{
    id: 'mp-req-001', memberId, bookingId: prior.id, segmentId: prior.segments[0].id,
    passengerId: prior.passengers[0].id, ticketNumber: prior.passengers[0].ticketNumber,
    status: 'submitted', actorId, createdAt: '2026-11-12T14:00:00.000Z',
  }]
  const past = bookings[16]
  const pastSegment = past.segments[0]
  const previousSeat = pastSegment.seatAssignments[past.passengers[0].id]
  const newSeat = pastSegment.seats.find(seat => seat.label !== previousSeat && !seat.occupied && seat.fee === 0).label
  pastSegment.seatAssignments[past.passengers[0].id] = newSeat
  const seatChanges = [{
    id: 'seat-001', bookingId: past.id, segmentId: pastSegment.id, passengerId: past.passengers[0].id,
    previousSeat, newSeat, cabin: pastSegment.cabin, fee: 0, currency: 'USD',
    status: 'confirmed', actorId, createdAt: '2026-09-25T13:00:00.000Z',
  }]

  return {
    account, mileagePlus, flightOptions: options, bookings, bookingEvents, seatChanges,
    mileageActivity, mileageRequests, travelCredits, creditRedemptions,
  }
}
