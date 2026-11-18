const inventory = [
  [
    "Home & Living",
    "HM",
    "desk-lamp",
    [
      "Ceramic Desk Lamp, Sage",
      "Oak Picture Ledge",
      "Linen Table Runner, Oat",
      "Stoneware Pitcher, Cream",
      "Walnut Desk Tray",
      "Woven Cotton Throw",
      "Brass Bookends, Pair",
      "Ribbed Glass Vase"
    ]
  ],
  [
    "Electronics",
    "EL",
    "headphones",
    [
      "Studio Headphones, Walnut",
      "USB-C Travel Dock",
      "Compact Mechanical Keyboard",
      "Portable Bluetooth Speaker",
      "Digital Voice Recorder",
      "Wireless Charging Pad",
      "Braided Audio Cable",
      "Desktop Webcam Stand"
    ]
  ],
  [
    "Outdoors",
    "OD",
    "backpack",
    [
      "Canvas Daypack, Olive",
      "Insulated Trail Flask",
      "Nylon Packing Cubes",
      "Folding Camp Stool",
      "Trail Lantern, Amber",
      "Compact Picnic Blanket",
      "Weatherproof Dry Bag",
      "Stainless Camp Mug"
    ]
  ],
  [
    "Collectibles",
    "CL",
    "camera",
    [
      "Vintage 35mm Camera",
      "Botanical Print Set",
      "Enamel Trail Pins",
      "Miniature Tram Model",
      "Pressed Glass Trinket Dish",
      "Brass Compass, Pocket",
      "Retro Film Tin",
      "Hand-painted Tile"
    ]
  ],
  [
    "Apparel",
    "AP",
    "sweater",
    [
      "Fisherman Sweater, Sand",
      "Waxed Canvas Cap",
      "Cotton Overshirt, Ink",
      "Merino Beanie, Rust",
      "Striped Cotton Scarf",
      "Twill Work Jacket",
      "Naturally Dyed Bandana",
      "Wool Hiking Socks"
    ]
  ],
  [
    "Crafts",
    "CR",
    "supplies",
    [
      "Watercolor Travel Kit",
      "Embroidery Thread Bundle",
      "Maple Stamp Blocks",
      "Recycled Sketchbook",
      "Weaving Shuttle Set",
      "Ceramic Paint Palette",
      "Cotton Binding Tape",
      "Brass Dressmaking Shears"
    ]
  ]
]

export const categories = inventory.map(([category]) => category)
export const conditions = ['New', 'Like new', 'Very good', 'Good', 'Acceptable']
export const defaultThumbnail = category => {
  const entry = inventory.find(([name]) => name === category)
  return entry ? '/products/' + entry[2] + '.svg' : ''
}

const key = n => String(n).padStart(3, '0')
const fixed = (day, hour = 14) => new Date(Date.UTC(2026, 10, day, hour)).toISOString()
const usd = value => Math.round(value * 100) / 100
const buyerNames = ['Avery Finch', 'Morgan Lake', 'Jordan Moss', 'Riley Brooks', 'Sage Nolan', 'Emery Blair', 'Cameron Wren', 'Rowan Patel', 'Quinn Ames', 'Drew Vega', 'Skyler Cole', 'Reese Lin']
const cities = [['Portland', 'OR', '97201'], ['Madison', 'WI', '53703'], ['Durham', 'NC', '27701'], ['Boise', 'ID', '83702']]
const reasons = ['Arrived damaged', 'Changed mind', 'Does not match description', 'Wrong item sent', 'Does not fit']
const reasonNotes = ['One corner was damaged when I opened the parcel.', 'I no longer need the item.', 'The finish looks different from the description.', 'I received a different item in the package.', 'The size does not work for me.']
const promotionNames = ['Workshop Weekend', 'Studio Shelf Sale', 'Autumn Trail Savings', 'Winter Layers Event', 'Desk Refresh', 'Stockroom Specials', 'Craft Table Deals', 'Collectors’ Week', 'Cabin Season', 'Small Space Savings', 'Gift Wrap Weekend', 'Neighborhood Holiday', 'November Maker Sale', 'Field Notes Event', 'Camera Cabinet', 'Juniper Essentials', 'Warm Layers', 'Holiday Dispatch', 'Weekend Parcel Sale', 'Trail Finds', 'Studio Clearout', 'Maple Market', 'Ready to Gift', 'Seasonal Favorites']

export function createInitialData() {
  const seller = { id: 'seller-001', name: 'Juniper Relay', username: 'juniper_relay', currency: 'USD' }
  const listings = inventory.flatMap(([category, family, product, names], group) => names.map((title, index) => {
    const n = group * names.length + index + 1
    const status = n <= 33 ? 'active' : n <= 41 ? 'draft' : 'ended'
    const createdAt = fixed(2 + n % 10)
    return {
      id: 'lst-' + key(n), title, category, sku: family + '-' + (104 + 3 * index),
      condition: conditions[(index + group * 2) % conditions.length],
      description: [
        'Packed with protective paper for shipping. Includes the item shown.',
        'Checked before packing and stored in a clean, dry stockroom.',
        'See the condition grade for wear. Ships securely packed in a fitted carton.',
      ][n % 3],
      thumbnail: '/products/' + product + '.svg', status, createdAt, actorId: seller.id,
      price: n === 1 ? 64.5 : 14.5 + (n * 19) % 102 + (index % 3) * 0.25,
      quantity: n === 41 ? 0 : (n * 7) % 23 + 1,
      updatedAt: status === 'ended' ? fixed(15) : createdAt,
      ...(status !== 'draft' && { publishedAt: createdAt }),
      ...(status === 'ended' && { endedAt: fixed(15) }),
    }
  }))

  const refunds = []
  const orders = Array.from({ length: 42 }, (_, index) => {
    const n = index + 1
    const id = 'ord-' + key(n)
    const name = buyerNames[index % buyerNames.length]
    const buyer = { id: 'buyer-' + key(index % buyerNames.length + 1), name, username: name.toLowerCase().replace(' ', '_') + (index % buyerNames.length + 11) }
    const [city, region, postalCode] = cities[index % cities.length]
    const status = n <= 14 ? 'awaiting_shipment' : n <= 38 ? 'shipped' : 'canceled'
    const createdAt = fixed(n <= 14 ? 12 + (n % 6) : 3 + (n % 7), 9 + n % 9)
    const lines = Array.from({ length: n === 15 || n === 16 || n % 4 === 0 ? 2 : 1 }, (_, lineIndex) => {
      const listing = listings[(index * 5 + lineIndex * 9) % 33]
      const quantity = n % 5 === 0 ? 2 : 1
      return { id: 'ol-' + key(n) + '-' + (lineIndex + 1), listingId: listing.id, title: listing.title, sku: listing.sku, quantity, unitPrice: listing.price, lineTotal: usd(listing.price * quantity) }
    })
    const subtotal = usd(lines.reduce((sum, line) => sum + line.lineTotal, 0))
    const shipping = n % 4 === 0 ? 0 : 5.5
    const tax = n % 3 === 0 ? usd(subtotal * 0.06) : 0
    const total = usd(subtotal + shipping + tax)
    const shippedAt = fixed(10 + n % 2)
    const canceledAt = fixed(12)
    if (status === 'canceled') refunds.push({
      id: 'ref-cancel-' + key(n), orderId: id, kind: 'cancellation', status: 'issued', actorId: seller.id,
      createdAt: canceledAt, lines: lines.map(line => ({ orderLineId: line.id, listingId: line.listingId, quantity: line.quantity, amount: line.lineTotal })),
      shippingAmount: shipping, taxAmount: tax, totalAmount: total,
    })
    return {
      id, orderNumber: '18-20461-' + (10000 + n), buyer, actorId: buyer.id, createdAt, paidAt: createdAt,
      updatedAt: status === 'shipped' ? shippedAt : status === 'canceled' ? canceledAt : createdAt,
      status, paymentStatus: status === 'canceled' ? 'refunded' : 'paid', lines, subtotal, shipping, tax, total,
      shipTo: { name, line1: (18 + index) + ' Sample Lane', city, region, postalCode, country: 'US' },
      ...(status === 'shipped' && { shippedAt, ...(n % 5 !== 0 && { tracking: { carrier: ['USPS', 'UPS', 'FedEx'][n % 3], number: '940011120099000000' + key(n), updatedAt: shippedAt } }) }),
      ...(status === 'canceled' && { canceledAt, cancellationReason: 'Buyer requested cancellation' }),
    }
  })

  const returns = Array.from({ length: 26 }, (_, index) => {
    const n = index + 1
    const order = orders[14 + index % 24]
    const line = order.lines[index < 24 ? 0 : 1]
    const status = n <= 9 ? 'requested' : n <= 15 ? 'accepted' : n <= 20 ? 'received' : n <= 22 ? 'offer_sent' : 'refunded'
    const id = 'ret-' + key(n)
    const createdAt = fixed(12 + n % 3)
    const refundId = 'ref-return-' + key(n)
    const related = [{ listingId: line.listingId, orderLineId: line.id, quantity: line.quantity, amount: line.lineTotal }]
    const additional = {}
    if (['accepted', 'received', 'refunded'].includes(status)) Object.assign(additional, { acceptedAt: fixed(15), returnShippingPayer: n % 2 ? 'seller' : 'buyer', authorizationNumber: 'RMA-' + (300 + n) })
    if (['received', 'refunded'].includes(status)) additional.receivedAt = fixed(16)
    if (status === 'refunded' || status === 'offer_sent') {
      const isFull = status === 'refunded'
      const totalAmount = isFull ? line.lineTotal : usd(line.lineTotal * 0.25)
      Object.assign(additional, isFull ? { refundId, resolvedAt: fixed(17) } : { partialOfferId: refundId, offeredAt: fixed(17) })
      refunds.push({
        id: refundId, orderId: order.id, returnId: id, actorId: seller.id, createdAt: fixed(17),
        kind: isFull ? 'return_full' : 'return_partial', status: isFull ? 'issued' : 'offered',
        lines: [{ ...related[0], amount: totalAmount }], shippingAmount: 0, taxAmount: 0, totalAmount,
      })
      if (isFull && totalAmount === order.total) {
        order.paymentStatus = 'refunded'
        order.updatedAt = fixed(17)
      }
    }
    return {
      id, orderId: order.id, reason: reasons[index % reasons.length], buyerNote: reasonNotes[index % reasons.length],
      lines: related, requestedAmount: line.lineTotal, status, actorId: order.buyer.id, createdAt,
      updatedAt: additional.resolvedAt || additional.offeredAt || additional.receivedAt || additional.acceptedAt || createdAt,
      ...additional,
    }
  })

  const promotions = promotionNames.map((name, index) => {
    const n = index + 1
    const status = n <= 8 ? 'draft' : n <= 13 ? 'scheduled' : n <= 19 ? 'active' : 'ended'
    const type = ['sale_event', 'order_discount', 'coupon'][index % 3]
    const createdAt = fixed(1 + index % 8)
    return {
      id: 'promo-' + key(n), name, type, status, createdAt, updatedAt: status === 'ended' ? fixed(14) : createdAt, actorId: seller.id,
      discount: { kind: type === 'order_discount' && n % 2 === 0 ? 'fixed' : 'percent', value: 5 + 5 * (n % 5) },
      listingIds: [n, n + 3, n + 6].map(number => 'lst-' + key(number)),
      ...(type === 'coupon' && { code: 'JUNIPER' + (40 + n) }),
      ...(type === 'order_discount' && { minimumOrderTotal: 40 + n }),
      ...(status !== 'draft' && { startsAt: fixed(status === 'scheduled' ? 22 + n % 4 : status === 'active' ? 14 + n % 3 : 9),
        endsAt: fixed(status === 'scheduled' ? 36 + n % 4 : status === 'active' ? 29 + n % 4 : 15), publishedAt: createdAt }),
      ...(status === 'ended' && { endedAt: fixed(14) }),
    }
  })

  const sampleEvents = [
    ...listings.slice(0, 2).map(item => ['listing_published', 'listing', item, item.publishedAt]),
    ['listing_ended', 'listing', listings[43], listings[43].endedAt],
    ...orders.slice(14, 16).map(item => ['order_shipped', 'order', item, item.shippedAt]),
    ['order_canceled', 'order', orders[38], orders[38].canceledAt],
    ['return_accepted', 'return', returns[9], returns[9].acceptedAt],
    ['return_received', 'return', returns[15], returns[15].receivedAt],
    ['return_partial_offered', 'return', returns[20], returns[20].offeredAt],
    ['return_refunded', 'return', returns[22], returns[22].resolvedAt],
    ['promotion_scheduled', 'promotion', promotions[8], promotions[8].publishedAt],
    ['promotion_ended', 'promotion', promotions[19], promotions[19].endedAt],
  ]
  const activity = sampleEvents.map(([type, entityType, item, createdAt], index) => ({
    id: 'evt-' + key(index + 1), type, entityType, entityId: item.id, actorId: seller.id, createdAt,
  }))
  return { seller, listings, orders, returns, refunds, promotions, activity }
}
