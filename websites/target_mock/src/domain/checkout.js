import { addressText, byId, list } from '../utils/read.js'
import { actor, audit, cartEvent } from './cart.js'
import { redeemManualOffers } from './circle.js'
import { priceCart } from './pricing.js'

export function validatePerson(person, required = false) {
  const fullName = person?.fullName?.trim() || ''
  const email = person?.email?.trim() || ''
  if (!required && !fullName && !email) return { person: null }
  const errors = {}
  if (!/^\S+(?:\s+\S+)+$/.test(fullName) || fullName.length > 100) errors.fullName = 'Enter a first and last name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Enter a valid email address.'
  return Object.keys(errors).length ? { errors } : { person: { fullName, email } }
}

export function checkoutIssue(state, price) {
  if (!actor(state)) return 'Guest information is unavailable.'
  if (!price.lines.length) return 'Your cart is empty.'
  if (price.lines.some((entry) => entry.issue)) return 'Resolve the availability issues in your cart before placing your order.'
  if (!(state.guest.payment?.id && /^\d{4}$/.test(state.guest.payment.last4))) return 'Your payment method is unavailable.'
  if (price.lines.some(({ line }) => line.fulfillment === 'shipping') && !addressText(state.guest.shippingAddress)) return 'Your shipping address is unavailable.'
  if (price.lines.some(({ line }) => line.fulfillment === 'pickup' && !addressText(byId(state.stores, line.storeId)?.address))) return 'A pickup store address is unavailable.'
  return ''
}

function nextOrderNumber(orders) {
  const highest = list(orders).reduce((max, order) => {
    const number = /^\d+$/.test(order.orderNumber) ? BigInt(order.orderNumber) : 0n
    return number > max ? number : max
  }, 910000001000n)
  return String(highest + 1n)
}

function makePickups(state, order, entries, pickupPerson, now) {
  const groups = new Map()
  for (const [index, item] of order.items.entries()) {
    if (item.fulfillment !== 'pickup') continue
    const existing = groups.get(item.storeId) || []
    existing.push({ item, freshOrFrozen: Boolean(entries[index].product.freshOrFrozen) })
    groups.set(item.storeId, existing)
  }
  return [...groups.entries()].map(([storeId, rows]) => {
    const store = byId(state.stores, storeId)
    const record = audit(state, 'pickup', now)
    return {
      ...record, orderId: order.id, storeId, storeName: store.name, storeAddress: store.address,
      pickupInstructions: store.pickupInstructions, orderLineIds: rows.map(({ item }) => item.id),
      status: 'preparing', alternatePickupPerson: pickupPerson, updatedAt: now,
      estimatedReadyAt: new Date(new Date(now).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      hasFreshOrFrozen: rows.some((row) => row.freshOrFrozen), extensionCount: 0, paymentStatus: 'authorized',
      events: [{ ...audit(state, 'pickup-event', now), action: 'placed', orderId: order.id, pickupOrderId: record.id, storeId }],
    }
  })
}

function makeRedemptions(state, order, { reward, lines: cartLines }, now) {
  const grouped = new Map()
  for (const item of order.items) {
    for (const { offerId, amountCents } of item.offerDiscounts) {
      const entry = grouped.get(offerId) || { discountCents: 0, orderLineIds: [] }
      entry.discountCents += amountCents
      entry.orderLineIds.push(item.id)
      grouped.set(offerId, entry)
    }
  }
  const records = [...grouped.entries()].map(([offerId, entry]) => ({
    ...audit(state, 'circle-redemption', now), offerId, orderId: order.id,
    ...entry, kind: 'discount', status: 'applied', rewardCents: 0,
  }))
  if (reward) {
    const qualifying = new Set(reward.entries.map((entry) => entry.line.id))
    records.push({
      ...audit(state, 'circle-redemption', now), offerId: reward.offer.id, orderId: order.id,
      orderLineIds: order.items.filter((_, index) => qualifying.has(cartLines[index].line.id)).map((item) => item.id),
      kind: 'reward', status: 'earned', discountCents: 0, rewardCents: reward.amount,
    })
  }
  return records
}

export function placeOrder(state, pickupPersonInput) {
  const clock = new Date()
  const now = clock.toISOString()
  const price = priceCart(state, clock)
  const error = checkoutIssue(state, price)
  if (error) return { error }
  const hasPickup = price.lines.some(({ line }) => line.fulfillment === 'pickup')
  const person = validatePerson(hasPickup ? pickupPersonInput : null)
  if (person.errors) return { error: 'Check the alternate pickup person’s details.', errors: person.errors }

  const items = price.lines.map(({ line, product, variant, quantity, unitPriceCents, merchandiseCents, discountCents, taxCents, paidCents, offerDiscounts }) => ({
    ...audit(state, 'order-line', now), productId: product.id, variantId: variant.id, title: product.title || line.title || 'Product',
    variantLabel: variant.label || line.variantLabel || 'Standard', quantity, unitPriceCents,
    merchandiseCents, discountCents, taxCents, paidCents, offerDiscounts,
    fulfillment: line.fulfillment, storeId: line.fulfillment === 'pickup' ? line.storeId : null,
    status: 'placed', returnMethods: list(product.returnMethods).filter((method) => ['store', 'mail'].includes(method)),
  }))
  const { id, firstName, lastName, email } = state.guest
  const order = {
    ...audit(state, 'order', now), orderNumber: nextOrderNumber(state.orders), status: 'placed', updatedAt: now, currency: 'USD',
    guestSnapshot: { id, firstName, lastName, email }, payment: state.guest.payment, shippingAddress: items.some((item) => item.fulfillment === 'shipping') ? state.guest.shippingAddress : null,
    items, subtotalCents: price.subtotalCents, discountCents: price.discountCents,
    shippingCents: price.shippingCents, taxCents: price.taxCents, totalCents: price.totalCents,
  }
  const redemptions = makeRedemptions(state, order, price, now)
  order.offerIds = redemptions.map((record) => record.offerId)
  const pickups = makePickups(state, order, price.lines, person.person, now)
  return { order, state: {
    ...state, orders: [...list(state.orders), order], pickupOrders: [...list(state.pickupOrders), ...pickups],
    circleRedemptions: [...list(state.circleRedemptions), ...redemptions],
    circleOfferStates: redeemManualOffers(state, order.offerIds, now),
    cart: { ...state.cart, items: [], updatedAt: now },
    cartEvents: [...list(state.cartEvents), cartEvent(state, {
      action: 'checkout', source: 'checkout', before: price.lines.map((entry) => entry.line), fromList: 'items', orderId: order.id,
    }, now)],
  } }
}
