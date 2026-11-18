const catalog = [
  ['The Cartographer of Rain', 'Inez Vale', 'Rosa Bell', 'Mystery', 562, 'A mapmaker in a flood-prone city finds a street that only appears during storms. The woman who sends her looking for it disappeared thirty years earlier.'],
  ['A Field Guide to Dusk', 'Mara Ellison', 'Nadia Shaw', 'Nature', 388, 'From the last bird calls to the first bat flights, a field naturalist follows the narrow hour when two worlds overlap.'],
  ['The Orchard at Mile Nine', 'Noah Reyes', 'Caleb Finn', 'Fiction', 475, 'Three siblings inherit an orchard and a ledger that records every favor their family ever owed.'],
  ['Signals from Ember Island', 'Leena Mori', 'Tessa March', 'Science Fiction', 611, 'A radio engineer on a remote island hears tomorrow’s weather report and a warning addressed to her by name.'],
  ['The Quiet Geometry', 'Dahlia Price', 'Jonah Wells', 'Nonfiction', 344, 'An architect traces the practical mathematics behind the rooms, stairways, and public squares we remember.'],
  ['A Door in the Salt', 'Sofia Ames', 'Rosa Bell', 'Fantasy', 684, 'Low tide reveals a doorway built from blocks of white salt and the first clue to a vanished coastal kingdom.'],
  ['Letters from Copper Hill', 'Priya Desai', 'Mina Ross', 'Fiction', 538, 'A bundle of undelivered letters sends a postmaster on a winter journey across a former mining district.'],
  ['The Ferry at Midnight', 'Elias Hart', 'Caleb Finn', 'Mystery', 503, 'A night ferryman counts eleven tickets and twelve passengers, then discovers the fare was paid a decade ago.'],
  ['Where the River Bends Twice', 'Nora Beck', 'Nadia Shaw', 'Fiction', 457],
  ['An Atlas of Small Repairs', 'Ada Wynn', 'Tessa March', 'Nonfiction', 396],
  ['Orbits of the Paper Moon', 'Ren Ito', 'Mina Ross', 'Science Fiction', 577],
  ['The Last Lantern Maker', 'Hugo Rivera', 'Jonah Wells', 'Historical Fiction', 661],
  ['Moths at the Station', 'Lucia Bell', 'Rosa Bell', 'Mystery', 512],
  ['The Hidden Weather', 'Basil Shah', 'Caleb Finn', 'Nature', 442],
  ['Winter Came by Train', 'Amelie Sloan', 'Nadia Shaw', 'Historical Fiction', 605],
  ['All the Glass Gardens', 'Lydia Voss', 'Tessa March', 'Fantasy', 715],
  ['The Longest Table', 'Zara King', 'Mina Ross', 'Fiction', 491],
  ['Cabinet of Night Skies', 'Owen Tariq', 'Jonah Wells', 'Nonfiction', 368],
  ['Marshlight at Dawn', 'Jonah Flores', 'Caleb Finn', 'Nature', 407],
  ['Twelve Rooms Above the Sea', 'Aya Torres', 'Rosa Bell', 'Mystery', 562],
  ['The Amber Dispatch', 'Nico Lim', 'Jonah Wells', 'Historical Fiction', 631],
  ['After the Clockwork Tide', 'Emery Lane', 'Tessa March', 'Fantasy', 725],
  ['A Museum of Temperatures', 'Maylin Fox', 'Mina Ross', 'Science Fiction', 532],
  ['The Unwritten Recipe', 'Anika Cole', 'Nadia Shaw', 'Fiction', 460],
  ['Index of Vanishing Bridges', 'Felix Hart', 'Caleb Finn', 'Mystery', 548],
  ['The Thread Between Ports', 'Hana Sato', 'Rosa Bell', 'Historical Fiction', 597],
  ['Seed Packet for a Long Winter', 'Celeste Rao', 'Mina Ross', 'Nature', 314],
  ['An Evening Among Mapmakers', 'Rowan Liu', 'Jonah Wells', 'Nonfiction', 432],
  ['Under the Juniper Clock', 'June Salazar', 'Nadia Shaw', 'Fantasy', 658],
  ['A Balcony Full of Stars', 'Tess Monroe', 'Tessa March', 'Science Fiction', 593],
  ['Instructions for a Quiet Coast', 'Ansel Vance', 'Caleb Finn', 'Nature', 380],
  ['The Dressmaker of North Quay', 'Camille Wu', 'Rosa Bell', 'Historical Fiction', 601],
  ['The Monsoon Archive', 'Miriam Sen', 'Mina Ross', 'Mystery', 589, 'An archivist pieces together a missing week from rain-stained records and interviews with the residents of a street due for demolition.'],
  ['A Practical Guide to Constellations', 'Oren Flint', 'Jonah Wells', 'Nonfiction', 402, 'Find your bearings with the naked eye and learn the stories people used to remember the patterns above them.'],
  ['The Violin in the Attic', 'Elisa Nguyen', 'Nadia Shaw', 'Fiction', 463],
  ['Postcards from Low Orbit', 'Micah Dunn', 'Caleb Finn', 'Science Fiction', 573],
  ['The Honeybee Ledger', 'Mina Chase', 'Tessa March', 'Nature', 358],
  ['Bookshop Beneath the Lake', 'Lena Park', 'Rosa Bell', 'Fantasy', 657],
  ['The Silver Thimble Society', 'Nadia Álvarez', 'Mina Ross', 'Historical Fiction', 597],
  ['The House on Briar Lane', 'Leo Finch', 'Jonah Wells', 'Mystery', 570],
  ['Footnotes to a Forest', 'Daniel Ho', 'Caleb Finn', 'Nature', 385],
  ['A Choir of Empty Streets', 'Samira Habib', 'Nadia Shaw', 'Fiction', 527],
  ['A Telescope for the Harbour', 'Elian Cobb', 'Tessa March', 'Nonfiction', 390],
  ['The Meridian Passenger', 'Mae Ko', 'Rosa Bell', 'Science Fiction', 647],
  ['The Tides of Ash and Silk', 'Vera Wilde', 'Mina Ross', 'Fantasy', 705],
  ['A Map of Lost Instruments', 'Mateo Hale', 'Jonah Wells', 'Historical Fiction', 534],
  ['Footsteps in the Plum Grove', 'Cora Lam', 'Nadia Shaw', 'Mystery', 516],
  ['The Vellum Birds', 'Willa Knight', 'Rosa Bell', 'Fantasy', 704],
  ['Forty Days of Wild Mint', 'Sana Birch', 'Tessa March', 'Nature', 308],
  ['How to Read a Shoreline', 'Harris Orr', 'Caleb Finn', 'Nonfiction', 434],
  ['The Noon Bell Returns', 'Grace Laurent', 'Mina Ross', 'Fiction', 508],
  ['Another Spring for Lyra', 'Kai Walsh', 'Jonah Wells', 'Science Fiction', 602],
  ['The Bicycle on Chapel Road', 'Pia Walsh', 'Nadia Shaw', 'Historical Fiction', 535],
  ['The Drowned Almanac', 'Cyril Maddox', 'Caleb Finn', 'Mystery', 576],
  ['Mirrors for the Mountain', 'Kira Santos', 'Rosa Bell', 'Fantasy', 745],
  ['An Inventory of Clouds', 'Mika Lang', 'Tessa March', 'Nature', 397],
  ['Tea for the Night Shift', 'Imani West', 'Mina Ross', 'Fiction', 441],
  ['Notes on Public Benches', 'Reed Owens', 'Jonah Wells', 'Nonfiction', 308],
  ['Glass Signal at Perigee', 'Uma Hughes', 'Caleb Finn', 'Science Fiction', 586],
  ['A Dress of Summer Rain', 'Serena Po', 'Nadia Shaw', 'Historical Fiction', 550],
  ['The House with Two Courtyards', 'Harper Lin', 'Rosa Bell', 'Mystery', 507],
  ['The Lanterns of Tamber Vale', 'Faye Banerjee', 'Tessa March', 'Fantasy', 660],
  ['Birdsong at Platform Four', 'Milo Xu', 'Jonah Wells', 'Nature', 323],
  ['A Good Place for Rain', 'Dina Moss', 'Mina Ross', 'Fiction', 513],
  ['Tracing the Night Bus', 'Eleanor Park', 'Caleb Finn', 'Nonfiction', 427],
  ['A Greenhouse in Transit', 'Ari Campos', 'Nadia Shaw', 'Science Fiction', 608],
  ['What We Carried to Winter', 'Nessa Rowe', 'Rosa Bell', 'Historical Fiction', 590],
  ['The Lost Harbours of July', 'Iona Gale', 'Tessa March', 'Mystery', 568],
  ['An Almanac of Borrowed Hours', 'Lea Browne', 'Mina Ross', 'Fantasy', 707],
  ['One More Light in the Valley', 'Isaac Teal', 'Jonah Wells', 'Fiction', 455],
  ['The Heron’s Winter Crossing', 'Cara Leung', 'Nadia Shaw', 'Nature', 368],
  ['The Weight of a Sundial', 'Simon Rook', 'Caleb Finn', 'Nonfiction', 419],
]

const actorId = 'member-001'
const day = 86_400_000
const reference = Date.parse('2026-11-18T12:00:00.000Z')
const date = (offset) => new Date(reference + offset * day).toISOString()
const fixedId = (kind, number) => `${kind}-${String(number).padStart(3, '0')}`
const titleId = (index) => fixedId('title', index)

export function createInitialData() {
  const account = {
    id: actorId, displayName: 'Maya Chen', plan: 'Audible Premium Plus',
    membershipStatus: 'active', canReturn: true,
  }
  const titles = catalog.map(([title, author, narrator, genre, durationMinutes, description], index) => ({
    id: titleId(index + 1), title, author, narrator, genre, durationMinutes,
    ...(description && { description }),
    coverPath: `/covers/${titleId(index + 1)}.webp`,
    included: index >= 26 && (index < 32 || index % 4 === 1),
    creditEligible: index < 70 && (index < 26 || index % 4 !== 1),
  }))

  const purchases = Array.from({ length: 26 }, (_, index) => {
    const number = index + 1
    const cash = number % 5 === 0
    const returned = number === 12 || number === 19
    const createdAt = date(number === 4 ? -410 : -2 - index * 7)
    return {
      id: fixedId('order', number), titleId: titleId(number), actorId,
      status: returned ? 'returned' : 'completed', paymentMethod: cash ? 'cash' : 'credit',
      quantity: 1, amountCredits: cash ? 0 : 1, amountUsd: cash ? 9.99 + (number % 4) * 2 : 0,
      createdAt, ...(!cash && { creditId: fixedId('credit', number) }),
      ...(number === 2 && { selfServiceBlocked: true }),
      ...(returned && { returnId: fixedId('return', number), returnedAt: date(-index * 6) }),
    }
  })
  const library = titles.slice(0, 32).map((title, index) => {
    const order = purchases[index]
    const progressPercent = [42, 0, 100, 17, 100, 64, 0, 8][index % 8]
    const createdAt = order?.createdAt || date(-13 - (index - 26) * 9)
    return {
      id: fixedId('lib', index + 1), titleId: title.id, actorId,
      source: order ? 'purchased' : 'included',
      ...(order && { purchaseId: order.id }),
      status: order?.status === 'returned' ? 'returned' : index === 31 ? 'removed' : 'active',
      listeningStatus: progressPercent === 100 ? 'finished' : progressPercent ? 'in_progress' : 'not_started',
      progressPercent, createdAt, updatedAt: order?.returnedAt || (index === 31 ? date(-4) : createdAt),
    }
  })
  const libraryActivity = library.flatMap((entry, index) => {
    const { id: libraryId, titleId, purchaseId, listeningStatus, progressPercent } = entry
    const common = { libraryId, titleId, actorId, quantity: 1, ...(purchaseId && { purchaseId }) }
    const event = (sequence, action, status, listeningStatus, progressPercent, createdAt) => ({
      ...common, id: fixedId('lib-event', index * 3 + sequence),
      action, status, listeningStatus, progressPercent, createdAt,
    })
    const acquired = event(1, purchaseId ? 'acquired' : 'added_included', 'active',
      listeningStatus === 'finished' ? 'not_started' : listeningStatus,
      listeningStatus === 'finished' ? 0 : progressPercent, entry.createdAt)
    const events = [acquired]
    if (listeningStatus === 'finished') {
      events.push(event(2, 'marked_finished', 'active', listeningStatus, progressPercent, entry.createdAt))
    }
    if (entry.status === 'removed') {
      events.push(event(3, 'removed_included', entry.status, listeningStatus, progressPercent, entry.updatedAt))
    }
    if (entry.status === 'returned') {
      events.push({
        ...event(3, 'returned', entry.status, listeningStatus, progressPercent, entry.updatedAt),
        returnId: purchases[index].returnId,
      })
    }
    return events
  })
  const wishlist = Array.from({ length: 26 }, (_, index) => {
    const purchase = index >= 24 ? purchases[index - 24] : null
    const createdAt = purchase ? new Date(Date.parse(purchase.createdAt) - 3 * day).toISOString() : date(-1 - 3 * index)
    return {
      id: fixedId('wish', index + 1), titleId: purchase?.titleId || titleId(index + 33), actorId,
      status: purchase ? 'purchased' : index >= 21 ? 'removed' : 'saved', createdAt,
      updatedAt: purchase?.createdAt || (index >= 21 ? date(-3 - index) : createdAt),
      ...(purchase && { purchaseId: purchase.id }),
    }
  })

  const returns = purchases.filter((order) => order.returnId).map((order, index) => ({
    id: order.returnId, purchaseId: order.id, actorId, status: 'completed',
    refundCreditId: fixedId('credit', 31 + index), amountCredits: 1, amountUsd: 0,
    quantity: 1, createdAt: order.returnedAt,
    items: [{ titleId: order.titleId, purchaseId: order.id, quantity: 1, amountCredits: 1, amountUsd: 0 }],
  }))
  const credits = [
    ...purchases.filter((order) => order.creditId).map((order) => ({
      id: order.creditId, actorId, source: 'membership', quantity: 1, status: 'spent',
      createdAt: new Date(Date.parse(order.createdAt) - 20 * day).toISOString(),
      expiresAt: new Date(Date.parse(order.createdAt) + 345 * day).toISOString(),
      spentAt: order.createdAt, purchaseId: order.id,
    })),
    ...[[-4, 361], [-35, 330], [-66, 299], [-430, -65]].map(([issued, expiration], index) => ({
      id: fixedId('credit', 27 + index), actorId, source: 'membership', quantity: 1,
      status: 'available', createdAt: date(issued), expiresAt: date(expiration),
    })),
    ...returns.map((refund) => {
      const expires = new Date(refund.createdAt)
      expires.setUTCFullYear(expires.getUTCFullYear() + 1)
      return {
        id: refund.refundCreditId, actorId, source: 'return', status: 'available', quantity: 1,
        createdAt: refund.createdAt, expiresAt: expires.toISOString(), returnId: refund.id,
      }
    }),
  ]
  const creditTransactions = credits.flatMap((credit, index) => {
    const refund = returns.find((entry) => entry.id === credit.returnId)
    const order = purchases.find((entry) => entry.id === (credit.purchaseId || refund?.purchaseId))
    const base = { creditId: credit.id, actorId, status: 'completed', quantity: 1 }
    const issued = {
      ...base, id: fixedId('credit-txn', index * 2 + 1),
      type: refund ? 'refund' : 'issued', amount: 1, createdAt: credit.createdAt,
      ...(refund && { returnId: refund.id, purchaseId: order.id, titleId: order.titleId }),
    }
    if (credit.status !== 'spent') return [issued]
    return [issued, {
      ...base, id: fixedId('credit-txn', index * 2 + 2),
      type: 'redeemed', amount: -1, createdAt: credit.spentAt, purchaseId: order.id, titleId: order.titleId,
    }]
  })
  return { account, titles, library, libraryActivity, wishlist, credits, creditTransactions, purchases, returns }
}
