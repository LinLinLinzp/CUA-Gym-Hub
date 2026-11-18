const user = { id: 'usr_maya_chen', name: 'Maya Chen', email: 'maya.chen@example.com', currency: 'USD' }

const plans = [
  ['Lisbon long weekend', 'Lisbon, Portugal', '2027-05-14', 4, 'LIS', 'Keep Sunday morning open for the market.'],
  ['Vancouver waterfront', 'Vancouver, Canada', '2027-02-19', 3, 'YVR', 'Bring a rain shell for the seawall.'],
  ['Chicago design weekend', 'Chicago, Illinois', '2027-01-22', 3, 'ORD', 'Leave an afternoon for the architecture collection.'],
  ['Reykjavík and the south coast', 'Reykjavík, Iceland', '2027-03-05', 6, 'KEF', 'Check daylight hours before picking the coastal stops.'],
  ['Kyoto in spring', 'Kyoto, Japan', '2027-04-02', 9, 'KIX', 'Book a quiet dinner near the river.'],
  ['Copenhagen by bicycle', 'Copenhagen, Denmark', '2027-06-16', 4, 'CPH', 'Pick up bikes after checking in.'],
  ['Montréal food weekend', 'Montréal, Canada', '2027-07-09', 3, 'YUL', 'Ask Simone for a bakery recommendation.'],
  ['Pacific Northwest road trip', 'Portland, Oregon', '2027-08-05', 8, 'PDX', 'Allow an extra hour for the coastal drive.'],
  ['Edinburgh in September', 'Edinburgh, Scotland', '2027-09-10', 5, 'EDI', 'Pack shoes for the walk up Arthur’s Seat.'],
  ['Mexico City museums', 'Mexico City, Mexico', '2027-10-07', 5, 'MEX', 'Reserve Saturday for the anthropology museum.'],
  ['Oaxaca for Día de Muertos', 'Oaxaca, Mexico', '2027-10-29', 6, 'OAX', 'Keep a free evening for a neighborhood walk.'],
  ['Winter in Vienna', 'Vienna, Austria', '2027-12-09', 5, 'VIE', 'Look for a chamber music concert.'],
  ['An autumn week in Lisbon', 'Lisbon, Portugal', '2026-10-08', 6, 'LIS', 'The little bookshop in Chiado was a favorite.'],
  ['Maine coast escape', 'Portland, Maine', '2026-09-18', 4, 'PWM', 'Save the lighthouse route for next time.'],
  ['Seattle summer visit', 'Seattle, Washington', '2026-07-23', 4, 'SEA', 'Meet Jordan for breakfast near the market.'],
  ['Amsterdam canal weekend', 'Amsterdam, Netherlands', '2026-06-11', 4, 'AMS', 'Allow plenty of time for the train to the airport.'],
  ['Santa Fe studio tour', 'Santa Fe, New Mexico', '2026-04-10', 3, 'SAF', 'Bring a second bag for the ceramics.'],
  ['New York galleries', 'New York, New York', '2026-02-12', 4, 'JFK', 'Start Saturday in Chelsea.'],
  ['Banff in the fall', 'Banff, Canada', '2025-09-12', 7, 'YYC', 'Leave the last day open in case of weather.'],
  ['Barcelona by the sea', 'Barcelona, Spain', '2025-06-05', 5, 'BCN', 'The harbor tram was an easy way back.'],
  ['A week on São Miguel', 'Ponta Delgada, Portugal', null, 0, 'PDL', 'Compare guesthouses near the harbor.'],
  ['Friends weekend in Austin', 'Austin, Texas', null, 0, 'AUS', 'Find a weekend everyone can make.'],
  ['Hokkaido snow trip', 'Sapporo, Japan', null, 0, 'CTS', 'Check ski equipment rental options.'],
  ['A quiet weekend in Québec', 'Québec City, Canada', null, 0, 'YQB', 'Try to find a room near the old town.'],
]

const activities = [
  ['Visit Feira da Ladra', 'Campo de Santa Clara'],
  ['Walk the Stanley Park seawall', 'Coal Harbour'],
  ['Tour the Chicago Architecture Center', 'East Wacker Drive'],
  ['Soak at the neighborhood pool', 'Laugardalslaug'],
  ['Early walk along the Philosopher’s Path', 'Sakyo Ward'],
  ['Browse the food hall', 'Torvehallerne'],
  ['Shop for picnic supplies', 'Jean-Talon Market'],
  ['Walk through the rose garden', 'Washington Park'],
  ['Climb Arthur’s Seat', 'Holyrood Park'],
  ['Visit the anthropology museum', 'Chapultepec'],
  ['Tour the textile museum', 'Centro Histórico'],
  ['See the winter market', 'Rathausplatz'],
  ['Browse books in Chiado', 'Rua Garrett'],
  ['Walk to the lighthouse', 'Fort Williams Park'],
  ['Coffee at Pike Place Market', 'Pike Place'],
  ['See the canal houses', 'Herengracht'],
  ['Visit open studios', 'Canyon Road'],
  ['Gallery afternoon', 'West Chelsea'],
]

const flightOrigins = ['BOS', 'SFO', 'BOS', 'EWR', 'LAX', 'JFK', 'BOS', 'DEN', 'BOS', 'LAX', 'DFW', 'JFK', 'IAD', 'BOS', 'ORD', 'BOS', 'PHX', 'BOS']
const airlines = ['Northwake Air', 'Maple Current Airlines', 'Prairie Arc Airways', 'Glacier Ribbon Air', 'Cloudridge Air']
const lodgings = ['Courtyard Guesthouse', 'Juniper House', 'Cedar & Stone Hotel', 'Canalview Rooms',
  'Willow Court Inn', 'Copperline Guesthouse', 'Meadowbank Suites', 'Harbour Lantern Hotel']
const stays = ['Harborleaf Travel', 'Keyline Stays', 'Cedar House Reservations', 'Meadow Desk Travel']
const rentals = ['Waypost Rentals', 'Alder Road Hire', 'Pinewheel Car Rental']

const id = (prefix, index) => `${prefix}_${String(index + 1).padStart(3, '0')}`
const city = (place) => place.split(',')[0]
const metadata = (index) => ({
  createdAt: '2025-02-04T15:15:00.000Z',
  updatedAt: `2026-11-${String((index % 18) + 1).padStart(2, '0')}T14:00:00.000Z`,
  createdBy: user.id,
  updatedBy: user.id,
})

function addDays(value, days) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function seedTrips() {
  return plans.map(([title, destination, startDate, duration, , notes], index) => ({
    id: id('trip', index), title, destination, startDate, endDate: addDays(startDate, duration),
    notes, status: 'active', ...metadata(index),
  }))
}

function seedItems(trips) {
  const kinds = [['activity', 18], ['flight', 10], ['stay', 8], ['car', 6], ['note', 6]]
  return kinds.flatMap(([type, count], group) => Array.from({ length: count }, (_, index) => {
    const tripIndex = (index + group * 2) % 18
    const trip = trips[tripIndex]
    const airport = plans[tripIndex][4]
    const details = {
      activity: [...activities[index], index % 4 === 1 ? null : (index % 2 === 0 ? '10:00' : '14:00'), 1],
      flight: [`Flight to ${airport}`, `${flightOrigins[tripIndex]} → ${airport}`, '08:35', 0],
      stay: [`Check in at ${lodgings[index]}`, trip.destination, '15:00', 0],
      car: ['Pick up rental car', `${airport} rental center`, '12:30', 0],
      note: [['Download offline directions', 'Check the weather', 'Arrange station pickup',
        'Confirm breakfast time', 'Make a dinner shortlist', 'Save walking route'][index], '', null, 1],
    }
    const [title, location, startTime, day] = details[type]
    const notes = index === 0 && group === 0 ? 'Meet near the north entrance.' : ''
    const offset = kinds.slice(0, group).reduce((total, [, size]) => total + size, 0)
    return {
      id: id('item', offset + index), tripId: trip.id, type, title, startDate: addDays(trip.startDate, day),
      startTime, endDate: type === 'stay' ? trip.endDate : null, location, notes,
      status: 'active', ...metadata(index),
    }
  }))
}

function seedAlerts(trips) {
  return Array.from({ length: 30 }, (_, index) => {
    const tripIndex = index < 20 ? index : [2, 5, 6, 12, 14, 17, 1, 3, 7, 13][index - 20]
    const trip = trips[tripIndex]
    const type = index < 18 ? 'flight' : index < 26 ? 'stay' : 'car'
    const flexible = type === 'flight' && [2, 4, 6, 8, 10, 12].includes(index)
    return {
      id: id('alert', index),
      type,
      origin: type === 'flight' ? flightOrigins[tripIndex] : null,
      destination: type === 'flight' ? plans[tripIndex][4] : trip.destination,
      dateMode: flexible ? 'flexible' : 'fixed',
      startDate: flexible ? null : trip.startDate,
      endDate: flexible ? null : trip.endDate,
      cadence: index % 3 === 1 ? 'significant_change' : 'daily',
      status: index % 5 === 3 ? 'paused' : 'active',
      currency: index % 6 === 5 ? 'CAD' : 'USD',
      latestPrice: index === 0 ? 642 : index % 7 === 6 ? null
        : type === 'flight' ? 248 + index * 23.5 : type === 'stay' ? 96 + index * 4 : 30 + index * 1.75,
      ...metadata(index),
    }
  })
}

function seedBookings(trips) {
  return Array.from({ length: 36 }, (_, index) => {
    const tripIndex = index < 18 ? [0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16][index]
      : (index * 3 + 1) % 20
    const trip = trips[tripIndex]
    const airport = plans[tripIndex][4]
    const type = index > 0 && index <= 16 ? 'flight' : index < 30 ? 'stay' : 'car'
    const title = type === 'flight' ? `${flightOrigins[tripIndex]} to ${airport} round trip`
      : type === 'stay' ? `${city(trip.destination)} ${lodgings[index % lodgings.length]}`
        : `Compact rental at ${airport}`
    const providers = type === 'flight' ? airlines : type === 'stay' ? stays : rentals
    return {
      id: id('booking', index),
      type,
      title: index === 0 ? 'Alfama Courtyard Guesthouse' : title,
      provider: providers[index % providers.length],
      confirmationCode: index === 0 ? 'HL-LIS-4816' : `${airport}-${5721 + index * 37}`,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelerName: index % 9 === 6 ? 'Jordan Chen' : index % 9 === 8 ? 'Simone Patel' : user.name,
      totalAmount: index === 0 ? 524.4 : index % 8 === 7 ? null : 113.25 + index * 18.75,
      currency: ['EUR', 'USD', 'CAD', 'USD', 'USD'][index % 5],
      notes: index === 0 ? 'Ask about storing luggage on arrival.' : '',
      source: index < 22 ? 'account_receipt' : 'manual',
      status: index % 11 === 9 ? 'cancelled' : index % 7 === 4 ? 'pending' : 'confirmed',
      tripId: index < 18 ? trip.id : null,
      ...metadata(index),
    }
  })
}

export function createInitialData() {
  const trips = seedTrips()
  return { user: { ...user }, trips, itineraryItems: seedItems(trips), priceAlerts: seedAlerts(trips), bookings: seedBookings(trips) }
}
