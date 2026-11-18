const member = {
  id: 'member-001',
  firstName: 'Avery',
  lastName: 'Morgan',
  email: 'avery.morgan@example.com',
  memberNumber: '900041872',
  tier: 'Gold Elite',
}

const properties = [
  ['Courtyard Harbor Quarter', 'Boston', 'US'],
  ['Residence Inn Alder Park', 'Seattle', 'US'],
  ['Westin Stone Quay', 'Vancouver', 'CA'],
  ['Marriott Linden Arcade', 'Chicago', 'US'],
  ['Sheraton Bay Laurel', 'San Diego', 'US'],
  ['Delta Hotels Birch Landing', 'Toronto', 'CA'],
  ['AC Hotel Juniper Hall', 'Denver', 'US'],
  ['Renaissance Elm Row', 'Philadelphia', 'US'],
  ['SpringHill Suites Copper Court', 'Phoenix', 'US'],
  ['Le Méridien Maple Crossing', 'Montréal', 'CA'],
  ['Westin River Lantern', 'Portland', 'US'],
  ['Marriott Cypress Wharf', 'Charleston', 'US'],
]

const rooms = ['King Room', 'Two Queen Room', 'Corner King', 'Studio Suite', 'High Floor King']
const sequence = (count, factory) => Array.from({ length: count }, (_, index) => factory(index))
const digits = (number, places = 3) => String(number).padStart(places, '0')
const id = (kind, index) => kind + '-' + digits(index + 1)
const round = value => Math.round(value * 100) / 100
const time = (date, hour = '16:00') => date + 'T' + hour + ':00.000Z'

function day(date, offset) {
  const clock = new Date(date + 'T00:00:00Z')
  clock.setUTCDate(clock.getUTCDate() + offset)
  return clock.toISOString().slice(0, 10)
}

const future = [
  ['2026-11-17', 3, 'in_progress'],
  ['2026-12-01', 3, 'upcoming'], ['2026-12-12', 2, 'upcoming'],
  ['2026-12-29', 4, 'upcoming'], ['2027-01-12', 2, 'upcoming'],
  ['2027-02-06', 3, 'upcoming'], ['2027-03-05', 4, 'upcoming'],
  ['2026-10-12', 2, 'cancelled'], ['2026-11-06', 2, 'cancelled'], ['2026-12-08', 3, 'cancelled'],
]

function seedStay(index) {
  const [propertyName, city, country] = properties[index % properties.length]
  const [checkIn, nights, status] = future[index - 30] || ['2026-09-14', 3, 'completed']
  const firstNight = index < 30 ? day(checkIn, -index * 6) : checkIn
  const duration = index > 0 && index < 30 ? 1 + (index * 3) % 5 : nights
  const stay = {
    id: id('stay', index), memberId: member.id, propertyName, city, country, confirmationNumber: String(73004518 + index * 17),
    checkIn: firstNight, checkOut: day(firstNight, duration), status, roomType: rooms[index % rooms.length], guests: index === 0 ? 2 : 1 + index % 3,
  }
  if (status === 'cancelled') stay.updatedAt = stay.cancelledAt = time(day(firstNight, -6))
  return stay
}

function seedFolio(stay, index) {
  const folio = {
    id: id('folio', index), stayId: stay.id, number: 'F-2026-' + digits(148 + index, 4),
    status: (index + 1) % 5 === 0 ? 'unavailable' : 'available', currency: stay.country === 'CA' ? 'CAD' : 'USD',
  }
  if (folio.status === 'unavailable') return folio
  const nights = (+new Date(stay.checkOut) - +new Date(stay.checkIn)) / 86_400_000
  const room = 179 + (index * 7) % 122
  const items = [
    [stay.checkIn, 'Room', nights, room],
    [stay.checkOut, 'Room tax', 1, index === 0 ? 78.66 : round(nights * room * (stay.country === 'CA' ? .13 : .12))],
  ]
  if (index % 3 === 1) items.push([stay.checkIn, 'Self parking', nights, 24])
  if (index % 3 === 2) items.push([day(stay.checkOut, -1), 'Market café', 1, 31.5 + index])
  if (index % 7 === 3) items.push([stay.checkOut, 'Lodging credit', 1, -35])
  const lineItems = items.map(([date, description, quantity, unitAmount], item) => ({
    id: folio.id + '-charge-' + (item + 1), date, description, quantity, unitAmount, amount: round(quantity * unitAmount),
  }))
  return { ...folio, issuedAt: time(stay.checkOut, '15:00'), lineItems, total: round(lineItems.reduce((sum, item) => sum + item.amount, 0)) }
}

const disputedStays = [0, 1, 2, 3, 5, 6, 7, 8]

const otherActivity = [
  ['bonus', 'Autumn travel bonus', 1800], ['redemption', 'Award night redemption', -12000],
  ['bonus', 'Welcome back bonus', 1250], ['adjustment', 'Points correction', -240],
  ['bonus', 'Member offer bonus', 2200], ['adjustment', 'Eligible spend correction', 470],
]

function seedPoints(stays) {
  return sequence(48, index => {
    const base = { id: id('points', index), memberId: member.id }
    if (index < 22) {
      const stay = stays[index]
      return { ...base, stayId: stay.id, date: day(stay.checkOut, disputedStays.includes(index) ? 23 : 4), type: 'stay', description: stay.propertyName, points: 4840 + index * 111 }
    }
    const [type, description, points] = otherActivity[(index - 22) % otherActivity.length]
    return { ...base, date: day('2026-11-12', -(index - 22) * 7), type, description, points }
  })
}

function seedRequest(stays, folios, index) {
  const group = Math.floor(index / 10)
  const slot = index % 10
  const types = ['hotel_service', 'missing_stay_credit', 'folio_copy']
  const serviceStays = [30, 31, 0, 1, 2, 3, 4, 5, 6, 7]
  const creditStays = [22, 23, ...disputedStays]
  const copyStays = [4, 9, 14, 19, 24, 29, 4, 9, 14, 19]
  const stay = stays[[serviceStays, creditStays, copyStays][group][slot]]
  const type = types[group]
  const status = ['submitted', 'in_review', 'resolved', 'cancelled', 'resolved', 'resolved', 'cancelled', 'resolved', 'resolved', 'resolved'][slot]
  const preStay = group === 0 && slot < 2
  const createdAt = preStay ? time('2026-11-18', '13:10') : time(group === 0 ? stay.checkIn : day(stay.checkOut, group === 1 ? 17 : slot + 1))
  const updatedAt = status === 'submitted' ? createdAt : preStay ? time('2026-11-18', '14:30') : time(day(createdAt.slice(0, 10), 2), '10:00')
  const actorId = member.id
  const notes = [
    ['Leave items near the entry if I am out.', 'Please call before entering.', 'I will be back after lunch.'],
    ['The hotel bill is attached to this case.', 'I booked directly and used my member number.', 'Please review the room charges for credit.'],
    ['I need an itemized copy for expenses.', 'Please include the parking charge.', 'A PDF copy would be helpful.'],
  ][group][slot % 3]
  const request = { id: 'REQ-' + digits(index + 1), type, stayId: stay.id, status, actorId, createdAt, updatedAt, notes,
    history: [{ status: 'submitted', actorId, createdAt }] }
  if (status !== 'submitted') request.history.push({ status, actorId, createdAt: updatedAt })
  if (status === 'cancelled') request.cancelledAt = updatedAt
  if (group === 0) {
    request.service = ['extra_towels', 'housekeeping', 'extra_pillows'][slot % 3]
    if (request.service === 'housekeeping') {
      request.requestedDate = day(stay.checkIn, 1)
      request.requestedTime = '14:30'
    } else request.quantity = 1 + slot % 3
  } else {
    request.folioId = folios.find(folio => folio.stayId === stay.id).id
    if (group === 1 && slot % 2 === 0) request.estimatedPoints = 3600 + slot * 240
    if (group === 2) request.contactEmail = member.email
  }
  return request
}

function seedStayActions(stays) {
  return sequence(24, index => {
    const cancel = index >= 21
    const stay = stays[cancel ? index + 16 : index]
    const after = { checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests, status: cancel ? 'cancelled' : 'upcoming' }
    const before = { ...after, status: 'upcoming' }
    if (!cancel) before.checkOut = day(stay.checkOut, 1)
    return { id: id('stay-action', index), stayId: stay.id, actorId: member.id, action: cancel ? 'cancel' : 'modify',
      status: 'applied', createdAt: stay.cancelledAt || time(day(stay.checkIn, -9)), before, after }
  }).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

function seedFolioActions(folios) {
  return folios.filter(folio => folio.status === 'available').map((folio, index) => ({
    id: id('folio-action', index), folioId: folio.id, stayId: folio.stayId, actorId: member.id, action: 'download',
    status: 'initiated', createdAt: time(day(folio.issuedAt.slice(0, 10), 1)), total: folio.total, currency: folio.currency,
    filename: 'folio-' + folio.number + '.pdf',
  })).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export function createInitialData() {
  const stays = sequence(40, seedStay)
  const folios = stays.slice(0, 30).map(seedFolio)
  return {
    member: { ...member }, stays, pointsActivity: seedPoints(stays), folios,
    requests: sequence(30, index => seedRequest(stays, folios, index)),
    stayActions: seedStayActions(stays), folioActions: seedFolioActions(folios),
  }
}
