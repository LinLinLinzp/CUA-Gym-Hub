const names = [
  ['Speckled Stoneware Mug','Cedar Glaze Vase','Everyday Dinner Plate','Ribbed Espresso Cup','Salt Cellar','Juniper Serving Bowl','Clover Planter','Porcelain Spoon Rest'],
  ['Hemstitched Linen Napkin','Woven Cotton Throw','Canvas Market Tote','Linen Cushion Cover','Striped Table Runner','Waffle Hand Towel','Herringbone Apron'],
  ['Amber Tumbler','Ripple Carafe','Bud Vase','Stemless Wine Glass','Pressed Glass Pitcher','Meadow Drinking Glass','Glass Cloche'],
  ['Cedar & Fig Candle','Palo Santo Matches','Citrus Reed Diffuser','Oakmoss Candle','Lavender Drawer Sachet','Bergamot Room Mist','Beeswax Taper Pair'],
  ['Walnut Coaster Set','Maple Cutting Board','Oak Catchall Tray','Beechwood Dish Brush','Willow Storage Basket','Hand-turned Salt Spoon','Ash Bookend'],
]
const customers = ['Avery Rivera','Morgan Patel','Riley Brooks','Jules Park','Taylor Morgan','Casey Nguyen','Jordan Bell','Devon Reed','Sam Ellis','Jamie Flores','Robin Diaz','Quinn Baker']
const actorId = 'usr_maya'
const currency = 'USD'
const pad = (number) => String(number).padStart(3, '0')
const time = (days, minutes = 0) => new Date(Date.UTC(2026, 10, 17, 15, minutes) - days * 86400000).toISOString()
const dollars = (cents) => cents / 100

export function createInitialData() {
  const account = { merchantId: 'm_alder_finch', merchantName: 'Alder & Finch Home', actorId, actorName: 'Maya Chen', currency, timeZone: 'America/New_York' }
  const locations = [{ id: 'loc_riverfront', name: 'Riverfront Shop' }, { id: 'loc_maple', name: 'Maple Studio' }]
  const categories = ['Ceramics', 'Textiles', 'Glassware', 'Fragrance', 'Housewares'].map((name) => ({ id: 'cat_' + name.toLowerCase(), name }))
  const destinations = [
    { id: 'dst_riverfront', locationId: locations[0].id, name: 'Harbor Community Bank', last4: '0418', type: 'bank_account' },
    { id: 'dst_maple', locationId: locations[1].id, name: 'Maple Business Debit', last4: '6824', type: 'debit_card' },
  ]
  const balances = locations.map(({ id }, index) => ({ locationId: id, availableAmount: index ? 960.4 : 1842.65, currency, actorId, updatedAt: time(1) }))
  const items = []
  names.forEach((group, category) => group.forEach((name, entry) => {
    const n = items.length + 1
    const key = pad(n)
    const variants = n % 3 === 1 ? ['Oat', 'Clay'] : ['Regular']
    items.push({
      id: 'itm_' + key, name, description: ['Small-batch glazed ceramic.', 'Woven for everyday use.', 'Hand-finished glass.', 'Blended in small batches.', 'An everyday home essential.'][category],
      categoryId: categories[category].id, status: n % 8 === 0 ? 'archived' : 'active',
      variations: variants.map((variant, v) => ({
        id: 'var_' + key + '_' + variant.toLowerCase(),
        name: variant, sku: n === 1 ? 'MUG-SPK-' + variant.toUpperCase() : categories[category].name.slice(0, 3).toUpperCase() + '-' + key + '-' + (v + 1),
        price: 18 + category * 7 + entry * 2.5 + v * 4, stock: n === 4 && v === 1 ? 0 : 12 + (n * 7 + v * 9) % 40,
      })),
      actorId, createdAt: time(44 + n % 8), updatedAt: time(n % 16),
    })
  }))
  const orders = Array.from({ length: 72 }, (_, index) => {
    const n = index + 1
    const key = pad(n)
    const status = ['new', 'in_progress', 'new', 'completed', 'completed', 'completed'][index]
      ?? ['completed', 'completed', 'completed', 'ready', 'in_progress', 'new', 'canceled'][index % 7]
    const createdAt = time(Math.floor(index / 3), -index % 3 * 75)
    const updatedAt = time(Math.floor(index / 3), -index % 3 * 75 + 5)
    const lineItems = Array.from({ length: n % 4 === 0 ? 2 : 1 }, (_, lineIndex) => {
      const item = items[(index + lineIndex * 7) % items.length]
      const variation = item.variations[0]
      const quantity = 2 + (index % 2)
      return { id: 'line_' + key + '_' + pad(lineIndex + 1), itemId: item.id, variationId: variation.id, name: item.name, variationName: variation.name, quantity, unitPrice: variation.price, totalAmount: variation.price * quantity }
    })
    const activity = [{ id: 'evt_' + key + '_01', type: 'created', fromStatus: null, toStatus: 'new', actorId, createdAt }]
    const statuses = ['in_progress', 'ready', 'completed']
    const history = status === 'canceled' ? ['canceled'] : statuses.slice(0, statuses.indexOf(status) + 1)
    history.forEach((toStatus, step) => activity.push({
      id: 'evt_' + key + '_' + pad(step + 2), type: 'status_changed', fromStatus: activity.at(-1).toStatus, toStatus, actorId, createdAt: updatedAt,
    }))
    return { id: 'ord_' + key, orderNumber: 'AF-' + (1000 + n), customerName: customers[index % customers.length], locationId: locations[index % 3 === 1 ? 1 : 0].id, source: index % 4 === 1 ? 'point_of_sale' : 'online', fulfillmentType: index % 4 === 1 ? 'shipping' : 'pickup', status, totalAmount: lineItems.reduce((sum, line) => sum + line.totalAmount, 0), currency, lineItems, activity, actorId, createdAt, updatedAt }
  })
  const payments = orders.slice(0, 68).map((order, index) => ({
    id: 'pay_' + pad(index + 1), orderId: order.id, locationId: order.locationId, receiptNumber: 'R-' + (1001 + index),
    method: index % 9 === 8 ? 'cash' : 'card', ...(index % 9 === 8 ? {} : { cardLast4: String(7318 + index * 23) }),
    status: index < 62 ? 'paid' : index % 2 ? 'pending' : 'failed', amount: order.totalAmount, currency, refundedAmount: 0, refundStatus: 'none',
    actorId, createdAt: order.createdAt, updatedAt: order.updatedAt,
  }))
  const refunds = payments.slice(6, 32).map((payment, index) => {
    const order = orders[index + 6]
    const line = order.lineItems[0]
    const mode = ['itemized', 'full', 'custom'][index % 3]
    const status = index === 24 ? 'pending' : index === 25 ? 'failed' : 'completed'
    const amount = mode === 'full' ? payment.amount : mode === 'custom' ? 8 : line.unitPrice
    const selected = mode === 'full' ? order.lineItems : mode === 'itemized' ? [line] : []
    const lineItems = selected.map(({ id, itemId, variationId, name, quantity, totalAmount, unitPrice }) => ({
      orderLineId: id, itemId, variationId, name, quantity: mode === 'full' ? quantity : 1, amount: mode === 'full' ? totalAmount : unitPrice,
    }))
    const createdAt = time(Math.floor((index + 6) / 3) - 1)
    if (status === 'completed') Object.assign(payment, { refundedAmount: amount, refundStatus: amount === payment.amount ? 'full' : 'partial', updatedAt: createdAt })
    return { id: 'ref_' + pad(index + 1), orderId: order.id, paymentId: payment.id, locationId: payment.locationId, mode, status, amount, currency, reason: ['Customer return', 'Order adjustment', 'Damaged in transit'][index % 3], lineItems, actorId, createdAt }
  })
  const payoutEntries = []
  const paymentPools = locations.map((location) => payments.filter((payment) => payment.locationId === location.id && payment.status === 'paid'))
  const payouts = Array.from({ length: 30 }, (_, index) => {
    const id = 'po_' + pad(index + 1)
    const locationIndex = index % 2
    const locationId = locations[locationIndex].id
    const method = index % 4 === 1 ? 'instant' : 'standard'
    const status = index === 1 ? 'pending' : index === 5 ? 'failed' : 'completed'
    const createdAt = time(index + 1)
    let grossCents = (130 + index * 17) * 100
    if (status === 'completed') {
      const pool = paymentPools[locationIndex]
      const settledRefund = (payment) => refunds.find((entry) => entry.paymentId === payment.id
        && entry.status === 'completed' && entry.createdAt <= createdAt && entry.amount < payment.amount)
      const refundedIndex = index % 3 === 0 ? pool.findIndex((payment) => payment.createdAt <= createdAt && settledRefund(payment)) : -1
      const paymentIndex = refundedIndex >= 0 ? refundedIndex : pool.findIndex((payment) => payment.createdAt <= createdAt)
      const linked = paymentIndex >= 0 ? pool.splice(paymentIndex, 1) : []
      const entries = linked.flatMap((payment) => {
        const refund = settledRefund(payment)
        const paymentFee = dollars(Math.round(payment.amount * 2.6 + 10))
        return [
          { type: 'payment', paymentId: payment.id, grossAmount: payment.amount, feeAmount: paymentFee, netAmount: dollars(Math.round(payment.amount * 100) - Math.round(paymentFee * 100)) },
          ...(refund ? [{ type: 'refund', paymentId: payment.id, refundId: refund.id, grossAmount: -refund.amount, feeAmount: 0, netAmount: -refund.amount }] : []),
        ]
      })
      grossCents = entries.reduce((sum, entry, entryIndex) => {
        payoutEntries.push({ id: 'pe_' + pad(index + 1) + '_' + pad(entryIndex + 1), payoutId: id, ...entry, currency, createdAt })
        return sum + Math.round(entry.netAmount * 100)
      }, 0) || grossCents
    }
    const feeCents = method === 'instant' ? Math.round(grossCents * 195 / 10000) : 0
    return { id, locationId, destinationId: destinations[locationIndex].id, method, status, amount: dollars(grossCents), feeAmount: dollars(feeCents), netAmount: dollars(grossCents - feeCents), currency, actorId, createdAt, updatedAt: createdAt, ...(status === 'pending' ? { estimatedArrivalAt: time(index + 1, 10) } : {}) }
  })
  return { account, locations, categories, items, orders, payments, refunds, destinations, balances, payouts, payoutEntries }
}

