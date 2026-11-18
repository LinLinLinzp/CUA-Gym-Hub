const accountId = 'member-avery'
const reference = Date.parse('2026-11-18T15:00:00.000Z')
const day = 86_400_000
const onDay = (offset) => new Date(reference + offset * day).toISOString()
const pad = (value, size = 4) => String(value).padStart(size, '0')
const dollars = (cents) => cents / 100

const products = [
  ['Aster & Vale', 'Barrier Softening Cream', '50 mL', 'skincare', 3200],
  ['Maison Liora', 'Fig Milk Eau de Parfum', '30 mL', 'fragrance', 6800],
  ['Petal Edit', 'Satin Veil Lip Tint', 'Rosewood', 'makeup', 2400],
  ['Cloudwell', 'Gentle Oat Cleanser', '150 mL', 'skincare', 2800],
  ['Form & Fern', 'Glossing Hair Oil', '45 mL', 'hair', 3400],
  ['Petal Edit', 'Soft Focus Blush', 'Mulberry', 'makeup', 2900],
  ['Maison Liora', 'Rain on Cedar Travel Spray', '10 mL', 'fragrance', 3000],
  ['Aster & Vale', 'Daily Mineral SPF 40', '40 mL', 'skincare', 3800],
  ['Form & Fern', 'Air Dry Styling Cream', '120 mL', 'hair', 2600],
  ['Cloudwell', 'Overnight Recovery Mask', '60 mL', 'skincare', 4200],
  ['Petal Edit', 'Precision Brow Pencil', 'Soft Brown', 'makeup', 2100],
  ['Cloudwell', 'Silk Body Wash', '250 mL', 'body', 2500],
  ['Petal Edit', 'Glow Balm Highlighter', 'Pearl', 'makeup', 3100],
  ['Form & Fern', 'Volume and Lift Mousse', '180 mL', 'hair', 2800],
]

function makeShipment(number, index, items, offset, status) {
  const carrier = index === 1 ? 'UPS' : 'FedEx'
  const events = [
    { status: 'label_created', at: onDay(offset + 1), location: 'Reno, NV' },
    { status: 'in_transit', at: onDay(offset + 2), location: 'Sacramento, CA' },
  ]
  if (status === 'delivered') {
    events.push({ status: 'delivered', at: onDay(offset + 4), location: 'Portland, OR' })
  }

  return {
    id: `ship-${pad(number)}-${pad(index, 2)}`, carrier,
    trackingNumber: carrier === 'UPS' ? `1Z000000008124${pad(number)}` : `00000081${pad(number)}`,
    status, estimatedDeliveryAt: onDay(offset + (index === 1 ? 4 : 7)),
    lineIds: items.map((item) => item.id), events,
  }
}

function makeOrder(number) {
  const recentOffsets = { 27: -88, 28: -61, 29: -39, 30: -21, 31: -16, 32: -12, 33: -8, 34: -4, 35: -3, 36: 0 }
  const offset = recentOffsets[number] ?? (-356 + (number - 1) * 10)
  const status = ({
    1: 'cancelled', 27: 'returned', 28: 'cancelled', 29: 'delivered',
    34: 'shipped', 35: 'partially_shipped', 36: 'placed',
  })[number] ?? 'delivered'
  const itemCount = number === 35 ? 3 : (number - 1) % 5 + 1
  const items = Array.from({ length: itemCount }, (_, index) => {
    const productIndex = number === 33 && index === 0 ? 0 : (number * 3 + index * 5) % products.length
    const [brand, name, variant, category, unit] = products[productIndex]
    const quantity = index === 0 && (number % 4 === 0 || number === 33) ? 2 : 1
    return {
      id: `line-${pad(number)}-${pad(index + 1, 2)}`, sku: `SK-${41001 + productIndex}`,
      brand, name, variant, category, quantity, unitPrice: dollars(unit),
      returnable: status === 'delivered' && index !== 4,
      ...(number === 33 ? { returnEligibleUntil: onDay(offset + 30) } : {}),
    }
  })
  const subtotal = items.reduce((sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity, 0)
  const discounts = items.map((line) => number % 3 === 0 ? 200 * line.quantity : 0)
  const taxes = items.map((line, index) => {
    const netUnit = Math.round(line.unitPrice * 100) - discounts[index] / line.quantity
    const unitTax = Math.round(netUnit * 0.075)
    line.refundableUnitAmount = dollars(netUnit + unitTax)
    return unitTax * line.quantity
  })
  const discount = discounts.reduce((sum, value) => sum + value, 0)
  const tax = taxes.reduce((sum, value) => sum + value, 0)
  const shipping = subtotal - discount < 5000 ? 695 : 0
  const fulfilled = ['delivered', 'returned', 'partially_shipped', 'shipped'].includes(status)
  const delivered = ['delivered', 'returned'].includes(status)
  const shipments = fulfilled
    ? [makeShipment(number, 1, number === 35 ? items.slice(0, 1) : items, offset, delivered ? 'delivered' : 'in_transit')]
    : []
  if (number === 35) {
    shipments.push({
      id: 'ship-0035-02', status: 'preparing', estimatedDeliveryAt: onDay(5),
      lineIds: items.slice(1).map((item) => item.id), events: [],
    })
  }

  return {
    id: `ord-${pad(number)}`, orderNumber: `SF-${81240000 + number * 10}`, accountId,
    placedAt: number === 36 ? '2026-11-18T14:50:00.000Z' : onDay(offset), status,
    fulfillmentMethod: 'standard_shipping', currency: 'USD',
    subtotal: dollars(subtotal), discount: dollars(discount), tax: dollars(tax), shipping: dollars(shipping),
    total: dollars(subtotal - discount + shipping + tax),
    payment: number % 6 === 0 ? { type: 'card', brand: 'Mastercard', last4: '6108' } : { type: 'card', brand: 'Visa', last4: '0426' },
    items, shipments,
    ...(delivered ? { deliveredAt: onDay(offset + 4) } : {}),
    ...(status === 'cancelled' ? { cancelledAt: onDay(offset) } : {}),
    ...(number === 36 ? { cancelUntil: '2026-11-18T15:45:00.000Z' } : {}),
  }
}

const offers = [
  ['travel-ritual', 'Travel Ritual Set', 'Three everyday essentials in carry-on sizes.', 1000, 4, false, ['VIB', 'Rouge']],
  ['rose-lip', 'Rose Lip Duo', 'A tinted balm and soft rose lip color.', 500, 6, false],
  ['night-repair', 'Night Repair Minis', 'A two-step hydrating evening routine.', 750, 0, false],
  ['fragrance-library', 'Fragrance Library', 'Six discovery sprays for layering and sampling.', 2500, 3, false],
  ['cloud-cleanse', 'Cloud Cleanse Mini', 'A soft oat cleanser in a travel tube.', 100, 12, true],
  ['silk-hair', 'Silk Hair Pair', 'Travel-size glossing oil and styling cream.', 250, 8, true],
  ['rouge-edit', 'Rouge Beauty Edit', 'A trio of favorites reserved for Rouge members.', 750, 5, false, ['Rouge']],
  ['mist-veil', 'Hydrating Mist', 'A refreshing face mist for your bag.', 350, 7, false],
]

export const reasonCodes = {
  shade_mismatch: 'Shade mismatch',
  did_not_meet_expectations: 'Did not meet expectations',
  damaged: 'Arrived damaged',
  wrong_item: 'Wrong item received',
  changed_mind: 'Changed my mind',
  other: 'Other',
}

function makeReturn(order, index) {
  const number = index + 1
  const status = ['submitted', 'in_transit', 'completed', 'cancelled'][index % 4]
  const createdAt = number === 24
    ? onDay(-2)
    : new Date(Date.parse(order.deliveredAt) + 3 * day).toISOString()
  const later = (offset) => new Date(Date.parse(createdAt) + offset * day).toISOString()
  const items = order.items.slice(0, number % 3 === 0 && number !== 24 ? 2 : 1).map((item, lineIndex) => ({
    orderLineId: item.id, quantity: 1,
    reasonCode: Object.keys(reasonCodes)[(index + lineIndex) % Object.keys(reasonCodes).length],
    estimatedRefund: item.refundableUnitAmount,
    ...(status === 'completed' ? { refundedAmount: item.refundableUnitAmount } : {}),
  }))
  const total = dollars(items.reduce((sum, item) => sum + Math.round(item.estimatedRefund * 100), 0))
  const timeline = [{ status: 'submitted', at: createdAt }]
  if (status === 'in_transit' || status === 'completed') timeline.push({ status: 'in_transit', at: later(1) })
  if (status === 'completed' || status === 'cancelled') timeline.push({ status, at: later(2) })
  return {
    id: `ret-${pad(number)}`, returnNumber: `RT-${820000 + number}`, orderId: order.id,
    accountId, status, method: 'mail', refundMethod: 'original_payment',
    items, estimatedRefund: total, currency: order.currency, createdAt, actorId: accountId, timeline,
    ...(status === 'completed' ? { refundedAmount: total, completedAt: later(2) } : {}),
  }
}

function makeLoyalty(orders, returns, rewards) {
  const credited = [...orders.slice(1, 21), orders[23], ...orders.slice(29, 33)]
  const transactions = credited.map((order) => ({
    type: 'earn', pointsDelta: Math.round(order.subtotal - order.discount),
    description: 'Points earned on purchase', createdAt: order.deliveredAt, actorId: 'system', orderId: order.id,
  }))
  for (const request of returns.filter((entry) => entry.status === 'completed')) {
    transactions.push({
      type: 'return_adjustment', pointsDelta: -Math.round(request.refundedAmount / 1.075),
      description: 'Points adjusted after return', createdAt: request.completedAt, actorId: 'system',
      orderId: request.orderId, returnId: request.id,
    })
  }
  const redemptions = [4, 1, 5, 7, 1, 0, 4, 7].map((offerIndex, index) => {
    const reward = rewards[offerIndex]
    const id = `red-${pad(index + 1)}`
    const createdAt = onDay(-303 + 41 * index)
    transactions.push({
      type: 'redeem', pointsDelta: -reward.pointsCost, description: reward.name,
      createdAt, actorId: accountId, redemptionId: id,
    })
    return {
      id, accountId, rewardId: reward.id, rewardName: reward.name, pointsSpent: reward.pointsCost,
      quantity: 1, status: 'redeemed', actorId: accountId, createdAt,
    }
  })
  const pointsBalance = 1840
  const opening = pointsBalance - transactions.reduce((sum, entry) => sum + entry.pointsDelta, 0)
  transactions.push({
    type: 'opening_balance', pointsDelta: opening, description: 'Opening Beauty Bank balance',
    createdAt: onDay(-370), actorId: 'system',
  })
  let balanceAfter = 0
  const pointsTransactions = transactions.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((entry, index) => {
    const id = `pt-${pad(index + 1)}`
    balanceAfter += entry.pointsDelta
    if (entry.returnId) returns.find((request) => request.id === entry.returnId).pointsTransactionId = id
    if (entry.redemptionId) redemptions.find((redemption) => redemption.id === entry.redemptionId).pointsTransactionId = id
    return { id, accountId, ...entry, balanceAfter }
  })
  return { pointsBalance, pointsTransactions, redemptions }
}

export function createInitialData() {
  const orders = Array.from({ length: 36 }, (_, index) => makeOrder(index + 1))
  const returnOrders = [...orders.slice(1, 24), orders[32]]
  const returns = returnOrders.map(makeReturn)
  const partial = returns.at(-1)
  partial.status = 'submitted'
  partial.timeline = partial.timeline.slice(0, 1)

  const rewards = offers.map(([slug, name, description, pointsCost, stock, requiresPurchase, eligibleTiers]) => ({
    id: `reward-${slug}`, name, description, pointsCost, stock, requiresPurchase,
    ...(eligibleTiers ? { eligibleTiers: [...eligibleTiers] } : {}),
  }))
  const { pointsBalance, pointsTransactions, redemptions } = makeLoyalty(orders, returns, rewards)
  return {
    account: { id: accountId, firstName: 'Avery', lastName: 'Morgan', email: 'avery.morgan@example.com' },
    orders, orderEvents: [],
    beautyInsider: { accountId, tier: 'VIB', pointsBalance, memberSince: '2021-04-09T12:00:00.000Z' },
    pointsTransactions, rewards, redemptions, returns,
  }
}
