const catalog = [
  ['Studio Wireless Headphones', '7004101', 'audio', 'headphones', 129.99],
  ['Cedar 14-inch Notebook', '7004102', 'computing', 'laptop', 649.99],
  ['Tempo Fitness Watch', '7004103', 'wearables', 'watch', 179.99],
  ['Horizon 27-inch Monitor', '7004104', 'displays', 'monitor', 239.99],
  ['Arc USB-C Charging Kit', '7004105', 'accessories', 'charger', 34.99],
  ['Field Portable Speaker', '7004106', 'audio', 'speaker', 79.99],
  ['Slate Mechanical Keyboard', '7004107', 'accessories', 'keyboard', 89.99],
  ['Glide Wireless Mouse', '7004108', 'accessories', 'mouse', 39.99],
]

const actorId = 'acct-001'
const contact = { name: 'Jordan Ellis', email: 'jordan.ellis@example.test', phone: '617-555-0142' }
const backup = { name: 'Casey Ellis', email: 'casey.ellis@example.test', phone: '617-555-0178' }
const cents = (value) => Math.round(value * 100)
const day = (date, offset) => new Date(Date.parse(date) + offset * 86400000).toISOString()
const iso = (date) => new Date(date).toISOString()

export function createInitialData() {
  const account = { id: actorId, name: contact.name, email: contact.email, membership: 'My Best Buy' }
  const stores = [
    ['Willow Creek', '120 Juniper Way, Lakehurst, MA'],
    ['Maple Crossing', '58 Alder Street, Stonefield, MA'],
    ['Harbor Point', '321 Beacon Lane, Westhaven, MA'],
    ['Northwood', '790 Pine Avenue, Northfield, MA'],
    ['Copper Hill', '44 Lantern Road, Copper Hill, MA'],
    ['Meadow Park', '62 Birch Plaza, Fairmere, MA'],
  ].map(([name, address], i) => ({ id: 'store-00' + (i + 1), name, address }))

  const orders = Array.from({ length: 42 }, (_, i) => {
    const number = 1001 + i
    const orderNumber = 'BBY01-' + (800001 + i)
    const status = ['delivered', 'ready_for_pickup', 'picked_up', 'delivered', 'processing', 'shipped'][i]
      ?? (i >= 31 ? ['ready_for_pickup', 'processing', 'canceled', 'shipped'][i % 4] : i % 3 === 0 ? 'picked_up' : 'delivered')
    const fulfillment = ['ready_for_pickup', 'picked_up'].includes(status) ? 'pickup' : 'shipping'
    const recent = ['2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11', '2026-11-10']
    const createdAt = i < recent.length ? iso(recent[i] + 'T14:30:00Z') : day('2026-11-09T14:30:00Z', -(i - 6) * 17)
    const receivedAt = ['delivered', 'picked_up'].includes(status) ? day(createdAt, 1) : undefined
    const items = Array.from({ length: i < 5 ? 1 : (i % 4) + 1 }, (_, j) => {
      const [name, sku, category, imageKey, unitPrice] = catalog[(i + j) % catalog.length]
      const quantity = i === 3 ? 3 : i === 1 || i === 2 ? 1 : i < 5 ? 2 : 2 + ((i + j) % 3)
      const eligibility = { returnable: true, mailReturnable: i < 5 || (i + j) % 4 !== 0, priceMatchable: true }
      if (i >= 6) {
        const deadline = i % 2 ? day('2026-11-18T23:59:59Z', 30) : day(createdAt, 15)
        Object.assign(eligibility, { returnBy: deadline, priceMatchBy: deadline, addProtectionBy: deadline })
      }
      return {
        id: 'line-' + number + '-0' + (j + 1), name, sku, category, imageKey, quantity, unitPrice,
        canceledQuantity: status === 'canceled' ? quantity : (i >= 31 && j === 0 && status === 'processing') || (i === 5 && j < 2) ? 1 : 0,
        eligibility,
        protectionOffer: { name: '2-Year Geek Squad Protection', termMonths: 24, price: 29.99, coverage: ['Hardware failures', 'Power surge damage'] },
      }
    })
    const subtotalCents = items.reduce((sum, line) => sum + cents(line.unitPrice) * line.quantity, 0)
    const taxCents = Math.round(subtotalCents * 0.0625)
    const shipment = ['shipped', 'delivered'].includes(status) ? {
      carrier: 'Parcel Delivery', trackingNumber: 'SYN-' + (81001 + i),
      events: [
        { status: 'Label created', at: createdAt, location: 'Lakehurst, MA' },
        { status: status === 'delivered' ? 'Delivered' : 'In transit', at: day(createdAt, 1), location: 'Lakehurst, MA' },
      ],
    } : undefined
    return {
      id: 'ord-' + number, orderNumber, status, fulfillment, createdAt, receivedAt, items, shipment,
      ...(fulfillment === 'pickup' ? { storeId: stores[i % stores.length].id, pickupContact: { ...contact } } : {}),
      paymentLabel: 'Visa ending in 0142', subtotal: subtotalCents / 100, tax: taxCents / 100,
      shippingAmount: 0, total: (subtotalCents + taxCents) / 100,
    }
  })

  const orderEvents = []
  for (const order of orders.filter((order) => order.fulfillment === 'pickup').slice(1)) {
    const createdAt = day(order.createdAt, 1)
    orderEvents.push({
      id: 'oe-' + (1001 + orderEvents.length), orderId: order.id, actorId, createdAt, status: 'confirmed',
      type: 'pickup_contact_changed', previousContact: { ...backup }, pickupContact: { ...contact },
    })
    order.updatedAt = createdAt
  }
  for (const order of [orders[5], ...orders.slice(31)]) {
    for (const item of order.items.filter((item) => item.canceledQuantity > 0)) {
      const createdAt = day(order.createdAt, 1)
      const refundEstimate = cents(item.unitPrice) * item.canceledQuantity / 100
      orderEvents.push({
        id: 'oe-' + (1001 + orderEvents.length), orderId: order.id, actorId, createdAt, status: 'confirmed',
        type: 'items_canceled', reason: 'Ordered by mistake', refundEstimate,
        lines: [{ orderItemId: item.id, quantity: item.canceledQuantity, unitPrice: item.unitPrice, refundEstimate }],
      })
      order.updatedAt = createdAt
    }
  }

  const historical = orders.slice(6, 31).flatMap((order) => order.items.map((item) => ({ order, item })))
  const priceMatchRequests = historical.slice(0, 24).map(({ order, item }, i) => {
    const difference = 5 + i * 2
    return {
      id: 'pm-' + (1001 + i), orderId: order.id, orderItemId: item.id, actorId, createdAt: day(order.receivedAt, 2),
      status: ['submitted', 'approved', 'denied'][i % 3], offerChannel: ['online', 'app', 'store'][i % 3],
      ...(i % 3 === 0 ? { offerUrl: 'https://offers.example.test/items/' + item.sku } : {}),
      originalUnitPrice: item.unitPrice, offerUnitPrice: (cents(item.unitPrice) - difference * 20) / 100,
      quantity: 1, requestedAmount: difference / 5,
    }
  })
  const protectionPlans = historical.slice(10, 36).map(({ order, item }, i) => {
    const coverageStartAt = order.receivedAt
    const termMonths = i > 0 && i % 5 === 0 ? 3 : 24
    const { name, coverage, price } = item.protectionOffer
    const end = new Date(coverageStartAt)
    end.setUTCMonth(end.getUTCMonth() + termMonths)
    return {
      id: 'plan-' + (1001 + i), planNumber: 'GSP-' + (41001 + i), orderId: order.id, orderItemId: item.id, actorId,
      createdAt: coverageStartAt, coverageStartAt, coverageEndAt: end.toISOString(),
      status: i > 0 && i % 7 === 0 ? 'canceled' : termMonths === 3 ? 'expired' : 'active',
      name: termMonths === 3 ? '3-Month Geek Squad Protection' : name, coverage, termMonths, price, quantity: 1,
      ...(i > 0 && i % 7 === 0 ? { canceledAt: day(coverageStartAt, 25) } : {}),
    }
  })
  const protectionPlanEvents = protectionPlans.flatMap((plan) => {
    const { id: planId, orderId, orderItemId, actorId, createdAt, price, canceledAt } = plan
    const event = { planId, orderId, orderItemId, actorId, createdAt, status: 'confirmed', quantity: 1 }
    const added = { ...event, id: 'pe-added-' + planId, type: 'added', amount: price }
    return canceledAt ? [added, { ...event, id: 'pe-canceled-' + planId, type: 'canceled', amount: 0, reason: 'Coverage no longer needed', createdAt: canceledAt }] : [added]
  })
  const protectionClaims = protectionPlans.slice(0, 24).map((plan, i) => ({
    id: 'claim-' + (1001 + i), planId: plan.id, orderId: plan.orderId, orderItemId: plan.orderItemId, actorId,
    createdAt: day(plan.createdAt, 14), status: i === 0 || plan.status !== 'active' ? 'closed' : ['closed', 'submitted', 'in_service'][i % 3],
    issueType: 'Hardware failure', description: ['Device shuts off during normal use.', 'Device does not power on after charging.', 'Connection drops during normal use.'][i % 3],
    quantity: 1,
  }))
  const returns = [orders[3], ...orders.slice(6, 31)].map((order, i) => {
    const id = 'ret-' + (1001 + i)
    const status = ['completed', 'requested', 'canceled'][i % 3]
    const createdAt = day(order.receivedAt, 3)
    const lines = order.items.slice(0, i % 4 === 3 ? 2 : 1).map((item, j) => ({
      orderItemId: item.id, quantity: 1, reason: j ? 'Changed mind' : 'Ordered the wrong item',
      unitPrice: item.unitPrice, refundEstimate: item.unitPrice,
    }))
    const mail = i % 2 === 1 && lines.every((line) => order.items.find((item) => item.id === line.orderItemId).eligibility.mailReturnable)
    return {
      id, orderId: order.id, actorId, status, createdAt, lines,
      method: mail ? 'mail' : 'store', ...(mail ? { mailReference: 'RMA-' + id.toUpperCase() } : { storeId: stores[i % stores.length].id }),
      refundEstimate: lines.reduce((sum, line) => sum + cents(line.refundEstimate), 0) / 100,
      ...(status === 'canceled' ? { canceledAt: day(createdAt, 1), canceledBy: actorId } : {}),
    }
  })
  return { account, orders, stores, orderEvents, priceMatchRequests, protectionPlans, protectionPlanEvents, protectionClaims, returns }
}

