import { byId, dateValue, list } from '../utils/read.js'
import { shiftStoreDays } from '../utils/calendar.js'
import { actor, audit } from './cart.js'
import { validatePerson } from './checkout.js'
import { pickupStatus } from './inventory.js'
import { canRefund, refundLine } from './refund.js'

export const pickupLabels = {
  preparing: ['Preparing', 'warning'], ready: ['Ready for pickup', 'success'],
  collected: ['Picked up', 'success'], cancelled: ['Canceled', 'neutral'],
  expired: ['Pickup window ended', 'warning'],
}

export const orderLabels = {
  placed: ['Order placed', 'neutral'], complete: ['Complete', 'success'],
  partially_cancelled: ['Partially canceled', 'warning'], cancelled: ['Canceled', 'neutral'],
}

export const lineLabels = {
  placed: ['Order placed', 'neutral'], collected: ['Picked up', 'success'],
  delivered: ['Delivered', 'success'], cancelled: ['Canceled', 'neutral'],
}

export function pickupLines(order, pickup) {
  const ids = new Set(list(pickup.orderLineIds))
  return list(order.items).filter((item) => ids.has(item.id) && item.fulfillment === 'pickup' && item.storeId === pickup.storeId)
}

export function pickupActions(order, pickup, clock = new Date()) {
  const status = pickupStatus(pickup, clock)
  const lines = pickupLines(order, pickup).filter((item) => item.status === 'placed')
  const ready = status === 'ready' && Number.isFinite(dateValue(pickup.holdUntil))
  const canManage = lines.length > 0 && order.status !== 'cancelled'
  return {
    status, lines,
    barcode: canManage && status === 'ready' && Boolean(pickup.barcode),
    person: canManage && (ready || status === 'preparing'),
    extend: canManage && ready && !pickup.hasFreshOrFrozen && (pickup.extensionCount ?? 0) === 0,
    cancel: canManage && (ready || status === 'preparing'),
  }
}

function orderStatus(items) {
  if (items.every((item) => item.status === 'cancelled')) return 'cancelled'
  if (items.some((item) => item.status === 'cancelled')) return 'partially_cancelled'
  if (items.every((item) => ['delivered', 'collected'].includes(item.status))) return 'complete'
  return 'placed'
}

function updatePickup(state, pickup, order, now, action, changedPickup, details, changedOrder = {}, refund = null) {
  const nextPickup = {
    ...pickup, ...changedPickup, updatedAt: now,
    events: [...list(pickup.events), {
      ...audit(state, 'pickup-event', now), action, orderId: order.id, pickupOrderId: pickup.id,
      storeId: pickup.storeId, ...details,
    }],
  }
  return { pickup: nextPickup, state: {
    ...state, pickupOrders: list(state.pickupOrders).map((entry) => entry.id === pickup.id ? nextPickup : entry),
    orders: list(state.orders).map((entry) => entry.id === order.id ? { ...entry, ...changedOrder, updatedAt: now } : entry),
    ...(refund ? { refunds: [...list(state.refunds), refund] } : {}),
  } }
}

export function managePickup(state, { orderId, pickupId, action, person, lineIds }) {
  const order = byId(state.orders, orderId)
  const pickup = byId(state.pickupOrders, pickupId)
  if (!actor(state) || !order || !pickup || pickup.orderId !== order.id || !pickup.storeId) return { error: 'Pickup details are unavailable.' }
  const clock = new Date()
  const now = clock.toISOString()
  const allowed = pickupActions(order, pickup, clock)

  if (action === 'edit_person' && allowed.person) {
    const validated = validatePerson(person, true)
    if (validated.errors) return { error: 'Check the pickup person’s details.', errors: validated.errors }
    const previousPerson = pickup.alternatePickupPerson || null
    if (previousPerson?.fullName === validated.person.fullName && previousPerson.email === validated.person.email) return {}
    return updatePickup(state, pickup, order, now, action, { alternatePickupPerson: validated.person }, { previousPerson, nextPerson: validated.person })
  }
  if (action === 'extend' && allowed.extend) {
    const store = byId(state.stores, pickup.storeId)
    const holdUntil = shiftStoreDays(pickup.holdUntil, 3, store?.timeZone)
    return updatePickup(state, pickup, order, now, action, { holdUntil, extensionCount: 1 }, { previousHoldUntil: pickup.holdUntil, nextHoldUntil: holdUntil })
  }
  if (action === 'cancel_items' && allowed.cancel) {
    const ids = new Set(list(lineIds))
    const selected = allowed.lines.filter((item) => ids.has(item.id))
    if (!selected.length || ids.size !== selected.length) return { error: 'Choose available pickup items to cancel.' }
    if (!['captured', 'authorized'].includes(pickup.paymentStatus) || selected.some((item) => !canRefund(item))) return { error: 'Payment details for these items are unavailable.' }
    if (pickup.paymentStatus === 'captured' && !order.payment?.last4) return { error: 'The original payment method is unavailable.' }

    const lines = selected.map((item) => refundLine(item))
    const amountCents = lines.reduce((total, line) => total + line.amountCents, 0)
    const refund = pickup.paymentStatus === 'captured' ? {
      ...audit(state, 'refund', now), source: 'pickup_cancellation', orderId: order.id, pickupOrderId: pickup.id,
      status: 'pending', currency: 'USD', payment: order.payment, lines, amountCents, updatedAt: now,
    } : null
    const items = list(order.items).map((item) => ids.has(item.id) ? { ...item, status: 'cancelled' } : item)
    const allCanceled = allowed.lines.length === selected.length
    const changedPickup = allCanceled ? {
      status: 'cancelled', ...(pickup.paymentStatus === 'authorized' ? { paymentStatus: 'voided' } : {}),
    } : {}
    return updatePickup(state, pickup, order, now, action, changedPickup,
      { lines, amountCents, ...(refund ? { refundId: refund.id } : {}) }, { items, status: orderStatus(items) }, refund)
  }
  return { error: 'This action is unavailable for this pickup.' }
}
