import { makeOffers, makeProducts, makeStores } from './catalog.js'

import { shiftStoreDays } from '../utils/calendar.js'

const DAY = 86400000
const guestId = 'guest-maya'
const audit = (id, createdAt) => ({ id, actorId: guestId, createdAt })
const portion = (cents, quantity, index) => Math.floor(cents / quantity) + (index <= cents % quantity ? 1 : 0)

function makeCart(date, products) {
  const rows = [
    ['brightroom-bin', 2, 'pickup', 'store-roseville'],
    ['up-paper-towels', 1, 'pickup', 'store-roseville'],
    ['heyday-cable', 1, 'shipping', null],
    ['threshold-pillow', 1, 'shipping', null],
    ['gg-coffee', 1, 'pickup', 'store-minneapolis-ne'],
  ]
  const lines = rows.map(([slug, quantity, fulfillment, storeId], index) => {
    const product = products.find((item) => item.id === `prod-${slug}`)
    const variant = product.variants[0]
    return {
      ...audit(`cart-line-${index + 1}`, date(-1)),
      productId: product.id, variantId: variant.id, title: product.title, variantLabel: variant.label,
      unitPriceCents: variant.priceCents, quantity, fulfillment, storeId, updatedAt: date(-1),
    }
  })
  const cart = { items: lines.slice(0, 3), savedItems: lines.slice(3), updatedAt: date(-1) }
  const cartEvents = lines.map((line, index) => ({
    ...audit(`cart-event-seed-${index + 1}`, date(-1)), action: index < 3 ? 'add' : 'save_for_later',
    source: index < 3 ? 'product' : 'cart', before: index < 3 ? [] : [eventLine(line)],
    after: [eventLine(line)], fromList: index < 3 ? null : 'items', toList: index < 3 ? 'items' : 'savedItems',
  }))
  return { cart, cartEvents }
}

function eventLine(line) {
  const { id, productId, variantId, fulfillment, storeId, quantity, unitPriceCents } = line
  return { lineId: id, productId, variantId, fulfillment, storeId, quantity, unitPriceCents, amountCents: quantity * unitPriceCents }
}

function makeOrders(date, products, stores, guest) {
  const { id, firstName, lastName, email } = guest
  const orders = []
  const pickupOrders = []
  for (let index = 1; index <= 36; index++) {
    const number = 1000 + index
    const orderId = `order-${number}`
    const pickupId = `pickup-${number}`
    const createdAt = date(index < 8 ? -1 : -7 - index)
    const pickupStatus = index <= 3 ? 'ready' : index <= 6 ? 'preparing' : index <= 8 ? 'ready' :
      index <= 10 ? 'cancelled' : 'collected'
    const hasPickup = index <= 24 || index === 30 || index === 33
    const mixed = [4, 19, 30, 33].includes(index)
    const store = stores[index === 18 || index === 1 || index === 2 ? 0 : index % 5]
    const lineProducts = index === 18 ? [products[0], products[2]] :
      index === 1 ? [products[0], products[11]] :
        index === 2 ? [products[18], products[20]] : [products[index % products.length], products[(index + 21) % products.length]]
    const items = lineProducts.map((product, position) => {
      const variant = product.variants[0]
      const pickup = hasPickup && (!mixed || position === 0)
      const quantity = position === 0 ? (index === 18 ? 2 : 3) : 2
      const status = !pickup ? (index === 4 || index === 35 ? 'placed' : 'delivered') :
        ({ collected: 'collected', cancelled: 'cancelled' }[pickupStatus] || 'placed')
      const fulfilledAt = ['collected', 'delivered'].includes(status) ? date(-4 - index) : undefined
      const merchandiseCents = variant.priceCents * quantity
      const discountCents = index === 18 && position === 0 ? 260 : 0
      const taxCents = Math.round((merchandiseCents - discountCents) * (pickup ? store.taxBasisPoints : guest.shippingTaxBasisPoints) / 10000)
      return {
        ...audit(`order-line-${number}-${position + 1}`, createdAt), productId: product.id, variantId: variant.id,
        title: product.title, variantLabel: variant.label, quantity, unitPriceCents: variant.priceCents,
        merchandiseCents, discountCents, taxCents, paidCents: merchandiseCents - discountCents + taxCents,
        offerDiscounts: discountCents ? [{ offerId: 'deal-home-10', amountCents: discountCents }] : [],
        fulfillment: pickup ? 'pickup' : 'shipping', storeId: pickup ? store.id : null, status, fulfilledAt,
        returnUntil: fulfilledAt ? date(index === 36 ? -1 : 30) : undefined,
        returnMethods: product.returnMethods,
      }
    })

    const sum = (key) => items.reduce((total, item) => total + item[key], 0)
    orders.push({
      ...audit(orderId, createdAt), orderNumber: `91000000${number}`,
      status: pickupStatus === 'cancelled' && hasPickup ? 'cancelled' :
        items.every((item) => ['collected', 'delivered'].includes(item.status)) ? 'complete' : 'placed',
      updatedAt: date(index < 8 ? 0 : -3),
      currency: 'USD', guestSnapshot: { id, firstName, lastName, email }, payment: guest.payment, shippingAddress: items.some((item) => item.fulfillment === 'shipping') ? guest.shippingAddress : null,
      items, subtotalCents: sum('merchandiseCents'), discountCents: sum('discountCents'), shippingCents: 0,
      taxCents: sum('taxCents'), totalCents: sum('paidCents'), offerIds: index === 18 ? ['deal-home-10'] : [],
    })

    if (hasPickup) {
      const pickupLines = items.filter((item) => item.fulfillment === 'pickup')
      const hasFreshOrFrozen = lineProducts.some((product, idx) => product.freshOrFrozen && pickupLines.includes(items[idx]))
      const captured = ['ready', 'collected'].includes(pickupStatus)
      const readyAt = captured ? (pickupStatus === 'collected' ? date(-5 - index) : index >= 7 ? date(-6) : date(-0.25)) : undefined
      pickupOrders.push({
        ...audit(pickupId, createdAt), orderId, storeId: store.id, storeName: store.name,
        storeAddress: store.address, pickupInstructions: store.pickupInstructions, orderLineIds: pickupLines.map((item) => item.id),
        status: pickupStatus, alternatePickupPerson: index === 3 ? { fullName: 'Robin Chen', email: 'robin.chen@example.com' } : null,
        updatedAt: date(0), estimatedReadyAt: pickupStatus === 'preparing' ? date(0.08) : undefined, readyAt,
        holdUntil: captured ? (pickupStatus === 'collected' ? date(-2 - index) :
          index >= 7 ? date(-3) : shiftStoreDays(readyAt, hasFreshOrFrozen ? 1 : 3, store.timeZone, hasFreshOrFrozen ? store.closingHourLocal : undefined)) : undefined,
        collectedAt: pickupStatus === 'collected' ? date(-4 - index) : undefined,
        hasFreshOrFrozen,
        extensionCount: 0, paymentStatus: captured ? 'captured' : pickupStatus === 'cancelled' ? 'voided' : 'authorized',
        barcode: captured ? `99000011${number}` : undefined,
        events: [{ ...audit(`pickup-event-${number}`, createdAt), action: 'placed', orderId, pickupOrderId: pickupId, storeId: store.id }],
      })
    }
  }
  return { orders, pickupOrders }
}

function makeReturns(date, orders) {
  const example = orders.find((order) => order.id === 'order-1018')
  const eligible = orders.flatMap((order) => order.items
    .filter((item) => ['collected', 'delivered'].includes(item.status) && item.returnMethods.length && order.id !== example.id && !['order-1025', 'order-1026', 'order-1036'].includes(order.id))
    .map((item) => [order, item]))
  const entries = [[example, example.items[0]], ...eligible.slice(0, 23)]
  const refunds = []
  const returns = entries.map(([order, item], index) => {
    const id = 1001 + index
    const returnId = `return-${id}`
    const refundId = `refund-${id}`
    const createdAt = date(-2)
    const method = index % 4 === 1 && item.returnMethods.includes('mail') ? 'mail' : 'store'
    const status = index % 4 === 0 ? 'completed' : method === 'mail' ? 'in_transit' : 'submitted'
    const merchandiseCents = portion(item.merchandiseCents - item.discountCents, item.quantity, 1)
    const taxCents = portion(item.taxCents, item.quantity, 1)
    const amountCents = merchandiseCents + taxCents
    const refundLine = { orderLineId: item.id, productId: item.productId, quantity: 1, merchandiseCents, taxCents, amountCents }
    refunds.push({
      ...audit(refundId, createdAt), source: 'return', orderId: order.id, returnId,
      status: status === 'completed' ? 'issued' : 'pending', currency: 'USD', payment: order.payment,
      lines: [refundLine], amountCents, updatedAt: date(-1), issuedAt: status === 'completed' ? date(-1) : undefined,
    })
    return {
      ...audit(returnId, createdAt), orderId: order.id, returnNumber: `RET-${id}`, method, status, updatedAt: date(-1), refundId,
      lines: [{ ...refundLine, unitIndexes: [1], reason: index % 2 ? 'changed_mind' : 'did_not_fit' }],
      estimatedRefundCents: amountCents,
      instructions: method === 'store' ? { barcode: String(990000000001 + index) } : { labelNumber: `RMA9100${id}`, carrier: 'UPS' },
    }
  })
  return { returns, refunds }
}

export function createInitialData() {
  const anchor = new Date().getTime()
  const date = (offset) => new Date(anchor + offset * DAY).toISOString()
  const guest = {
    id: guestId, firstName: 'Maya', lastName: 'Chen', email: 'maya.chen@example.com', circleMember: true,
    preferredStoreId: 'store-roseville', updatedAt: date(-5), shippingTaxBasisPoints: 903,
    shippingAddress: { line1: '2810 Aldrich Ave S', city: 'Minneapolis', region: 'MN', postalCode: '55408' },
    payment: { id: 'payment-visa-4242', brand: 'Visa', last4: '4242' },
  }
  const stores = makeStores()
  const products = makeProducts(stores)
  const offers = makeOffers(products, date)
  const { orders, pickupOrders } = makeOrders(date, products, stores, guest)
  return {
    guest, stores, products, offers, ...makeCart(date, products),
    circleOfferStates: [
      { ...audit('circle-state-seed-1', date(-3)), offerId: 'coupon-pantry-300', status: 'saved', savedAt: date(-3), updatedAt: date(-3) },
      { ...audit('circle-state-seed-2', date(-3)), offerId: 'coupon-towel-150', status: 'active', activatedAt: date(-3), updatedAt: date(-3) },
    ],
    circleRedemptions: [{
      ...audit('redemption-seed-1', orders[17].createdAt), offerId: 'deal-home-10', orderId: 'order-1018',
      orderLineIds: ['order-line-1018-1'], kind: 'discount', status: 'applied', discountCents: 260, rewardCents: 0,
    }],
    orders, pickupOrders, ...makeReturns(date, orders),
  }
}
