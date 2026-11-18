import { refundItems, refundTotals } from './model.js'

const account = { id: 'acct-001', name: 'Morgan Ellis', email: 'morgan.ellis@example.com' }
const names = [
  ['Beacon Coast Live', 'Juniper Static', 'The Aster District', 'Velvet Meridian', 'North of Violet', 'Lighthouse Echo', 'Paloma Arcade'],
  ['Port Alder Breakers', 'Cedar Bay Comets', 'Silver Junction Owls', 'Lakeford Ferries', 'Westhaven Ospreys', 'Northbank Pilots', 'Bramble City Rovers'],
  ['The Glass Orchard', 'Letters from the Tide', 'A Map of Small Rooms', 'Winter at Marlow House', 'The Lantern Ballet', 'Paper Moons', 'The Long Way Home'],
]
const venues = [
  ['Harborline Hall', 'Port Alder, WA', 'America/Los_Angeles'],
  ['Cedar Bay Pavilion', 'Cedar Bay, OR', 'America/Los_Angeles'],
  ['Meridian Fieldhouse', 'Silver Junction, CO', 'America/Denver'],
  ['The Wren Theatre', 'Lakeford, MN', 'America/Chicago'],
  ['Alderwick Arts Center', 'Westhaven, NY', 'America/New_York'],
  ['Northbank Arena', 'Northbank, PA', 'America/New_York'],
]
const contacts = ['Sam Rivera', 'Taylor Chen', 'Avery Brooks', 'Jordan Bell', 'Jamie Park', 'Casey Rhodes', 'Rory Shah']
const tours = ['Evening Show', 'Saturday Session', 'Spring Series']
const id = (key, index) => `${key}-${String(index).padStart(3, '0')}`
const iso = (year, month, day, hour = 2, minute = 30) => new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString()

export function createInitialData() {
  const events = []
  const orders = []
  const tickets = []
  const orderSaves = []
  const transfers = []
  const listings = []
  const refunds = []
  const paymentMethods = [{ id: 'pay-001', label: 'Visa', last4: '1842' }, { id: 'pay-002', label: 'Mastercard', last4: '6028' }]
  const payoutMethods = [{ id: 'out-001', label: 'Debit card', last4: '7319' }, { id: 'out-002', label: 'Bank account', last4: '4206' }]

  for (let n = 1; n <= 84; n++) {
    const orderId = id('ord', n)
    const eventId = id('evt', n)
    const transferIndex = n >= 6 && n <= 29 ? n - 5 : 0
    const listingIndex = n >= 30 && n <= 53 ? n - 29 : 0
    const refundIndex = n >= 54 && n <= 77 ? n - 53 : 0
    const incoming = transferIndex > 0 && transferIndex <= 3
    const pending = transferIndex > 0 && transferIndex <= 6
    const active = listingIndex > 0 && listingIndex <= 5
    const automatic = n === 4 || (refundIndex > 0 && refundIndex % 4 === 0)
    const refundRequested = refundIndex > 0 && refundIndex <= 8
    const future = n < 10 || pending || active || (!transferIndex && !listingIndex && !refundIndex && n % 2 === 0)
    const categoryIndex = (n - 1) % 3
    const category = ['music', 'sports', 'arts'][categoryIndex]
    const [venue, city, timeZone] = venues[(n - 1) % venues.length]
    const artist = names[categoryIndex][Math.floor((n - 1) / 3) % 7]
    const title = n <= 5 ? [names[0][0], 'Port Alder Breakers vs. Cedar Bay Comets', 'The Glass Orchard', 'Juniper Static', 'Silver Junction Owls vs. Northbank Pilots'][n - 1] :
      `${artist} · ${tours[Math.floor((n - 1) / 21) % 3]}${n > 63 ? ' II' : ''}`
    const startsAt = n < 6 ? iso(2027, 1, 16 + n * 3) :
      future ? iso(2027, 3 + n % 7, 3 + n % 24) : iso(2026, 1 + n % 10, 3 + n % 24)
    const status = automatic ? 'canceled' : n === 3 || refundRequested ? 'postponed' : n % 11 === 0 ? 'rescheduled' : 'scheduled'
    const notice = {
      postponed: 'The organizer is working to confirm a new date. Keep your tickets for the rescheduled event.',
      canceled: 'This event was canceled by the organizer.',
      rescheduled: 'The organizer has changed the event date. Your tickets are valid for the updated date.',
    }[status]
    events.push({ id: eventId, name: title, category, venue, city, timeZone, startsAt, status, artKey: `${category}-${n % 5}`, ...(notice && { notice }) })

    const quantity = n === 1 ? 3 : n % 4 + 1
    const createdAt = future ? iso(2026, 10, 1 + n % 26, 15) : iso(2025, 11, 1 + n % 26, 15)
    const orderSeats = Array.from({ length: quantity }, (_, index) => ({
      id: id('tkt', (n - 1) * 4 + index + 1), orderId, section: String(101 + (n % 9)), row: 'DEFGH'[n % 5], seat: String(12 + index),
      faceValueCents: incoming ? 0 : 5500 + n % 16 * 500,
      feeCents: incoming ? 0 : 750 + n % 6 * 100,
      taxCents: incoming ? 0 : 350 + n % 4 * 50,
      status: 'available',
    }))
    const paymentMethodId = paymentMethods[(n - 1) % paymentMethods.length].id
    const totals = refundTotals(refundItems(orderSeats))
    const order = {
      id: orderId, orderNumber: n === 1 ? '24-31752/HBR' : `${24 + n % 3}-${31752 + n * 107}/${['HBR', 'CBY', 'MRD'][n % 3]}`,
      eventId, actorId: account.id, createdAt,
      status: automatic && !refundIndex ? 'canceled' : refundIndex ? (refundRequested ? 'refund_requested' : 'refunded') : 'confirmed',
      source: incoming ? 'transfer' : 'purchase', currency: 'USD', ...totals, quantity,
      ...(!incoming && { paymentMethodId }),
      transferEligible: !automatic && n !== 3 && n !== 5, resaleEligible: !incoming && !automatic && n !== 3,
      refundPolicy: automatic ? 'automatic' : n === 3 || n === 5 || refundIndex ? 'requestable' : 'unavailable',
      ...(n === 3 && { refundDeadline: iso(2027, 12, 1) }),
      ...(n === 5 && { refundDeadline: iso(2026, 11, 10) }),
    }
    orders.push(order)

    if (transferIndex) {
      const recordId = id('xfer', transferIndex)
      const contact = contacts[transferIndex % contacts.length]
      const transferStatus = pending ? 'pending' : transferIndex % 3 ? 'accepted' : 'canceled'
      const seats = incoming ? orderSeats : orderSeats.slice(0, 1)
      const contactEmail = `${contact.toLowerCase().replace(' ', '.')}@example.com`
      transfers.push({
        id: recordId, orderId, ticketIds: seats.map((seat) => seat.id), quantity: seats.length,
        actorId: incoming ? id('sender', transferIndex) : account.id,
        direction: incoming ? 'incoming' : 'outgoing', recipientName: incoming ? account.name : contact,
        recipientEmail: incoming ? account.email : contactEmail, ...(incoming && { senderName: contact }),
        status: transferStatus, createdAt: iso(2026, future ? 11 : 1, 2 + transferIndex, 16),
      })
      if (pending) for (const seat of seats) Object.assign(seat, { status: 'transfer_pending', holdId: recordId })
      if (transferStatus === 'accepted') seats[0].status = 'transferred'
    }

    if (listingIndex) {
      const recordId = id('lst', listingIndex)
      const pricePerTicketCents = 8750 + listingIndex * 175
      const listingStatus = active ? 'active' : listingIndex % 3 ? 'sold' : 'removed'
      const seat = orderSeats[0]
      listings.push({
        id: recordId, orderId, ticketIds: [seat.id], quantity: 1, actorId: account.id,
        payoutMethodId: payoutMethods[listingIndex % 2].id, pricePerTicketCents, totalCents: pricePerTicketCents, currency: 'USD',
        status: listingStatus, createdAt: iso(2026, future ? 11 : 1, 2 + listingIndex, 16),
      })
      if (active) Object.assign(seat, { status: 'listed', holdId: recordId })
      if (listingStatus === 'sold') seat.status = 'sold'
    }

    if (refundIndex || n === 4) {
      const recordId = id('ref', refundIndex || 25)
      const refundStatus = refundRequested ? (refundIndex % 2 ? 'requested' : 'processing') : n === 4 ? 'processing' : 'completed'
      refunds.push({
        id: recordId, orderId, ticketIds: orderSeats.map((seat) => seat.id), quantity, actorId: automatic ? 'system' : account.id,
        reason: automatic ? 'event_canceled' : 'event_changed', paymentMethodId, currency: 'USD',
        lineItems: refundItems(orderSeats), ...totals, status: refundStatus, createdAt: iso(2026, n === 4 ? 11 : 2, 2 + refundIndex, 16),
      })
      for (const seat of orderSeats) Object.assign(seat, { status: refundStatus === 'completed' ? 'refunded' : 'refund_requested', ...(refundStatus !== 'completed' && { holdId: recordId }) })
    }

    if ([2, 5, 8, 13, 16, 36, 59, 70].includes(n)) {
      orderSaves.push({ id: id('save', n), orderId, actorId: account.id, status: n % 2 ? 'removed' : 'saved', quantity, createdAt: iso(2026, 11, 6, 16) })
    }
    tickets.push(...orderSeats)
  }

  return { account: { ...account }, events, orders, tickets, orderSaves, transfers, listings, refunds, paymentMethods, payoutMethods }
}
