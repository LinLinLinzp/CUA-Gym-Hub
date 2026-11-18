const airports = {
  ATL: ['Atlanta', 'America/New_York'],
  SEA: ['Seattle', 'America/Los_Angeles'],
  BOS: ['Boston', 'America/New_York'],
  DEN: ['Denver', 'America/Denver'],
  LAX: ['Los Angeles', 'America/Los_Angeles'],
  JFK: ['New York', 'America/New_York'],
  MIA: ['Miami', 'America/New_York'],
  MSP: ['Minneapolis', 'America/Chicago'],
  SLC: ['Salt Lake City', 'America/Denver'],
  DCA: ['Washington', 'America/New_York'],
  SFO: ['San Francisco', 'America/Los_Angeles'],
  AUS: ['Austin', 'America/Chicago'],
  DTW: ['Detroit', 'America/New_York'],
}

const destinations = Object.keys(airports).slice(1)
const accountId = 'acct-avery'
const padded = (number, length = 3) => String(number).padStart(length, '0')
const calendar = (date, days) => {
  const value = new Date(date + 'T12:00:00Z')
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function localTimestamp(date, hour, minute, airport) {
  const timeZone = airports[airport][1]
  const format = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
  const offset = format.formatToParts(new Date(date + 'T18:00:00Z'))
    .find(({ type }) => type === 'timeZoneName').value.slice(3)
  return `${date}T${padded(hour, 2)}:${padded(minute, 2)}:00${offset}`
}

function segment(id, flight, origin, destination, date, hour = 9) {
  const departureAt = localTimestamp(date, hour, 10, origin)
  const westCoast = ['SEA', 'LAX', 'SFO']
  const durationMinutes = westCoast.includes(origin) || westCoast.includes(destination) ? 320 : 155
  const arrival = new Date(Date.parse(departureAt) + durationMinutes * 60_000)
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: airports[destination][1], year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  const parts = Object.fromEntries(local.formatToParts(arrival).map(({ type, value }) => [type, value]))
  return {
    id, flightNumber: `DL ${flight}`, origin, originCity: airports[origin][0],
    destination, destinationCity: airports[destination][0], departureAt,
    arrivalAt: localTimestamp(`${parts.year}-${parts.month}-${parts.day}`, parts.hour, parts.minute, destination),
    durationMinutes,
  }
}

function trip(index) {
  const destination = destinations[index % destinations.length]
  const slug = destination.toLowerCase()
  const upcoming = index < 12
  const lookup = index >= 27
  const id = index === 0 ? 'trip-seattle' : `trip-${upcoming ? slug : padded(index + 1)}`
  const date = upcoming
    ? ['2026-12-04', '2026-12-12', '2026-12-19', '2027-01-08', '2027-01-21', '2027-02-04',
        '2027-03-11', '2027-04-23', '2027-06-17', '2027-09-10', '2027-12-03', '2028-02-18'][index]
    : lookup ? calendar('2027-01-14', (index - 27) * 9) : calendar('2026-10-27', (12 - index) * 8)
  const purchasedAt = calendar(date, -90) + 'T16:20:00.000Z'
  const canceled = index >= 24 && index < 27
  const outboundId = index === 0 ? 'seg-seattle-out' : `seg-${id.slice(5)}-out`
  const segments = [segment(outboundId, 442 + index * 13, 'ATL', destination, date)]
  if (index % 3 === 0) {
    segments.push(segment(`seg-${id.slice(5)}-back`, 443 + index * 13, destination, 'ATL', calendar(date, 5), 13))
  }
  return {
    id, accountId: lookup ? null : accountId,
    confirmationCode: index === 0 ? 'H7K2LM' : `K${padded(31 + index)}${destination.slice(0, 2)}`,
    status: canceled ? 'canceled' : upcoming || lookup ? 'confirmed' : 'completed',
    travelers: [{
      id: 'traveler-avery', firstName: 'Avery', lastName: 'Morgan',
      ticketNumber: `006800000${padded(101 + index, 4)}`, seat: `${14 + index % 11}A`,
    }],
    segments, fareName: index === 4 ? 'Delta Main Basic' : 'Delta Main Classic',
    fareAmount: [412.50, 395, 326.75, 95, 204][index] ?? 248 + index * 11.25,
    currency: 'USD', purchasedAt, changeAllowed: index !== 4, changeFee: index === 1 ? 25 : 0,
    cancellationAllowed: index !== 4, cancellationFee: index === 3 ? 95 : index === 0 ? 50 : 0,
    refundType: index === 2 ? 'original_payment' : 'ecredit',
    ...(canceled ? { canceledAt: calendar(date, -2) + 'T14:30:00.000Z' } : {}),
  }
}

function offers(trips) {
  const changes = trips.slice(0, 12).flatMap((booking, index) => {
    const [out, back] = booking.segments
    return [1, 2].map((sequence) => {
      const current = sequence === 2 && back ? back : out
      const date = calendar(current.departureAt.slice(0, 10), sequence)
      const hour = sequence === 1 ? 11 : 14
      const fareAmount = index === 0 && sequence === 1 ? 380
        : index === 1 ? 460 : booking.fareAmount + 45 * sequence
      return {
        id: `offer-${booking.id.slice(5)}-change-0${sequence}`, type: 'change',
        tripId: booking.id, segmentId: current.id, currency: 'USD', fareAmount,
        segment: segment(`inventory-${current.id}-${sequence}`, 1200 + index * 20 + sequence,
          current.origin, current.destination, date, hour),
      }
    })
  })
  const bookings = Array.from({ length: 24 }, (_, index) => {
    const id = `offer-booking-${padded(index + 1)}`
    const destination = destinations[Math.floor(index / 2)]
    const date = index < 12 ? calendar('2026-12-10', index * 2) : calendar('2027-08-06', (index - 12) * 17)
    return {
      id, type: 'booking', currency: 'USD', fareAmount: [140, 100][index] ?? 165 + index * 6.25,
      segment: segment(`inventory-${id}`, 961 + index * 7, 'ATL', destination, date, index % 2 ? 14 : 8),
    }
  })
  return [...changes, ...bookings]
}

export function createInitialData() {
  const trips = Array.from({ length: 30 }, (_, index) => trip(index))
  return {
    account: {
      id: accountId, firstName: 'Avery', lastName: 'Morgan', skyMilesNumber: '9000000184',
      memberSince: 2018, tier: 'Silver Medallion', milesBalance: 48620, mqds: 6420,
      nextTier: 'Gold Medallion', nextTierMqdTarget: 10000,
    },
    trips,
    flightOffers: offers(trips),
    eCredits: Array.from({ length: 24 }, (_, index) => {
      const used = index >= 13 && index < 18
      const expired = index >= 9 && index < 13
      const originalAmount = [180, 58.25, 215.70][index] ?? 105 + index * 3.5
      const cancellation = index === 2
      return {
        id: `credit-${padded(index + 1)}`, number: `006890000${padded(index + 11, 4)}`,
        accountId: index < 18 ? accountId : null, holderFirstName: 'Avery', holderLastName: 'Morgan',
        source: cancellation ? 'cancellation' : 'travel_credit',
        ...(cancellation ? { sourceTripId: trips[24].id } : {}),
        originalAmount, remainingAmount: used ? 0 : originalAmount, currency: 'USD',
        status: used ? 'used' : expired ? 'expired' : 'available',
        expiresOn: expired ? '2026-08-15' : calendar('2027-08-15', index * 12),
        createdAt: (expired ? '2025-08-15' : calendar('2026-05-17', index * 2)) + 'T15:10:00.000Z',
        actorId: accountId,
      }
    }),
    mileageActivity: Array.from({ length: 36 }, (_, index) => {
      const booking = index < 11 ? trips[12 + index] : null
      const route = booking?.segments[0]
      const type = booking ? 'flight' : ['partner', 'adjustment', 'redemption'][index % 3]
      return {
        id: `miles-${padded(index + 1)}`, accountId, type,
        description: route ? `${route.originCity} to ${route.destinationCity}`
          : { partner: 'Hotel partner stay', adjustment: 'Mileage adjustment', redemption: 'Award travel redemption' }[type],
        activityOn: route?.departureAt.slice(0, 10) ?? calendar('2026-11-12', (11 - index) * 7),
        miles: type === 'redemption' ? -5200 - index * 190 : 840 + index * 90,
        mqds: booking ? 164 + index * 14 : 0,
        ...(booking ? { tripId: booking.id, ticketNumber: booking.travelers[0].ticketNumber } : {}),
      }
    }),
    mileageRequests: [], tripActions: [], eCreditActions: [], refunds: [],
  }
}
