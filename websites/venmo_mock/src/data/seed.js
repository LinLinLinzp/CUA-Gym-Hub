const names = [
  'Jordan Lee', 'Jordan Patel', 'Noah Kim', 'Maya Chen', 'Sam Rivera', 'Samira Wells',
  'Olivia Brooks', 'Eli Bennett', 'Priya Shah', 'Nina Flores', 'Marcus Reed', 'Isabel Torres',
  'Theo Park', 'Harper James', 'Lena Ortiz', 'Miles Foster', 'Aisha Cole', 'Daniel Wu',
  'Sofia Ramos', 'Milo Grant', 'Grace Miller', 'Amara Davis', 'Owen Price', 'Riley Chen',
  'Alex Nguyen', 'Alex Romero', 'Kai Thompson', 'Eva Brooks', 'Luca Rossi', 'Leah Wilson',
  'Jules Carter', 'Drew Bell',
]

const paymentNotes = [
  'Coffee and bagels', 'Groceries for the week', 'Tacos after the show', 'Internet bill',
  'Saturday farmers market', 'Pitch fees', 'Dinner at Juniper', 'Train tickets',
  'Laundry supplies', 'Movie night', 'Housewarming gift', 'Book club snacks',
  'Museum admission', 'Pizza for the game', 'Parking downtown', 'Weekend cabin deposit',
  'Concert tickets', 'Hardware store run', 'Brunch on Sunday', 'Road trip gas',
  'Bowling night', 'Air filter and bulbs', 'Cat sitter', 'Pasta and dessert',
]

const requestNotes = [
  'Dinner on Friday', 'Household groceries', 'Board game cafe', 'Ride from the airport',
  'September internet', 'Flowers for Mei', 'Friday takeout', 'Pottery supplies',
  'Farmers market share', 'Birthday dinner', 'Parking at the arena', 'Taxi from Union Station',
  'Climbing day passes', 'Pastries for the picnic',
]

const idFor = (prefix, index) => prefix + '_' + String(index + 1).padStart(3, '0')
const utc = (month, day, hour, minute = 0) => new Date(Date.UTC(2026, month - 1, day, hour, minute)).toISOString()
const usd = (cents) => cents / 100

export function createInitialData() {
  const account = { id: 'user_avery', name: 'Avery Morgan', handle: 'avery-morgan', balance: 286.75, currency: 'USD' }
  const contacts = names.map((name, index) => {
    const handle = name.toLowerCase().replace(' ', '-')
    return {
      id: 'user_' + handle.replace('-', '_'), name, handle,
      email: handle.replace('-', '.') + '@example.test',
      phone: '+1 212 555 ' + String(147 + index).padStart(4, '0'),
    }
  })
  const fundingSources = [
    { id: 'funding_balance', kind: 'balance', label: 'Venmo balance' },
    { id: 'funding_bank', kind: 'bank', label: 'Greenfield Checking', last4: '7318' },
    { id: 'funding_debit', kind: 'debit', label: 'Debit card', last4: '2046' },
  ]
  const payments = Array.from({ length: 72 }, (_, index) => {
    const month = 6 + Math.floor(index / 12)
    const contact = contacts[(index * 7 + Math.floor(index / 12)) % contacts.length]
    const incoming = index % 3 === 0
    const createdAt = utc(month, 1 + index % 12, 12 + index % 9, (17 + index * 7) % 60)
    const status = index % 19 === 11 ? 'pending' : 'completed'
    return {
      id: idFor('payment', index), type: 'payment', status,
      actorId: incoming ? contact.id : account.id, senderId: incoming ? contact.id : account.id,
      recipientId: incoming ? account.id : contact.id, amount: usd(325 + (index * 1481) % 14500),
      currency: 'USD', note: paymentNotes[index % paymentNotes.length], createdAt,
      ...(!incoming && { fundingSourceId: fundingSources[index % fundingSources.length].id }),
      ...(status === 'completed' && { completedAt: createdAt }),
    }
  })
  const requests = requestNotes.map((note, index) => {
    const contact = contacts[(index * 3) % contacts.length]
    const incoming = index % 2 === 0
    const requesterId = incoming ? contact.id : account.id
    const payerId = incoming ? account.id : contact.id
    const status = ['pending', 'pending', 'pending', 'pending', 'paid', 'paid', 'declined', 'cancelled'][index % 8]
    const request = {
      id: idFor('request', index), status, actorId: requesterId, requesterId, payerId,
      amount: usd(1275 + index * 429), currency: 'USD', note, createdAt: utc(11, 14 - index, 14),
    }
    if (status !== 'pending') {
      request.updatedAt = utc(11, 15 - index, 15)
      request.updatedById = status === 'cancelled' ? requesterId : payerId
    }
    if (status === 'paid') {
      const payment = payments[60 + (index === 4 ? 9 : index === 5 ? 10 : 11)]
      Object.assign(payment, {
        status: 'completed', actorId: payerId, senderId: payerId, recipientId: requesterId, amount: request.amount,
        note, requestId: request.id, createdAt: request.updatedAt, completedAt: request.updatedAt,
      })
      if (incoming) payment.fundingSourceId = fundingSources[0].id
      else delete payment.fundingSourceId
      request.paymentId = payment.id
    }
    return request
  })
  const splits = Array.from({ length: 24 }, (_, index) => {
    const id = idFor('split', index)
    const count = index < 14 ? 2 : 3
    const source = index % 3 === 1 ? payments.find((payment, offset) =>
      offset >= index && payment.senderId === account.id && payment.status === 'completed') : undefined
    const total = source ? Math.round(source.amount * 100) : 2545 + index * 397
    const month = 6 + Math.floor(index / 4)
    const createdAt = utc(month, 1 + (index % 4) * 3, 19)
    const method = index % 4 === 2 ? 'custom' : 'equal'
    const note = source?.note || paymentNotes[(index + 6) % paymentNotes.length]
    const shares = Array.from({ length: count }, (_, offset) => {
      const equal = Math.floor(total / count) + (offset < total % count ? 1 : 0)
      const adjustment = method === 'custom' ? (offset === 0 ? -150 : offset === 1 ? 150 : 0) : 0
      const amount = usd(equal + adjustment)
      if (!offset) return { userId: account.id, amount }
      const contact = contacts[(index * 3 + offset + 4) % contacts.length]
      const requestId = idFor('request', requests.length)
      const cancelled = index % 5 === 2 || (count === 3 && offset === 1 && index % 5 === 3)
      requests.push({
        id: requestId, status: cancelled ? 'cancelled' : 'pending', actorId: account.id, requesterId: account.id,
        payerId: contact.id, amount, currency: 'USD', note, createdAt, splitId: id,
        ...(cancelled && { updatedAt: utc(month, 2 + (index % 4) * 3, 19), updatedById: account.id }),
      })
      return { userId: contact.id, amount, requestId }
    })
    const children = shares.slice(1).map((share) => requests.find((request) => request.id === share.requestId))
    const cancelled = children.filter((request) => request.status === 'cancelled')
    const status = cancelled.length === children.length ? 'closed' : cancelled.length ? 'partial' : 'pending'
    return {
      id, actorId: account.id, ownerId: account.id, amount: usd(total), currency: 'USD', note, method,
      ...(source && { sourcePaymentId: source.id }), status, createdAt, shares,
      ...(cancelled.length && { updatedAt: cancelled[0].updatedAt, updatedById: account.id }),
    }
  })
  return { account, contacts, fundingSources, payments, requests, splits, statementExports: [] }
}
