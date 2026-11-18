import { list, restaurantFor } from './format.js'
import { cents, receiptItems, totalsFor } from './money.js'
import { emptyCart } from './seed.js'
import { findSlot, orderFor, schedulePermissions } from './scheduling.js'
import { reasons, refundBalance, refundSelection } from './refundRules.js'

const invalid = error => ({ error })

export function newId(prefix) {
  const key = Array.from(crypto.getRandomValues(new Uint32Array(3)), value => value.toString(16).padStart(8, '0')).join('')
  return `${prefix}-${key}`
}

export const isQuantity = value => Number.isSafeInteger(value) && value > 0
export const menuAvailable = (item, restaurantId) => !!item && item.restaurantId === restaurantId && item.available === true && !!item.id && cents(item.unitPrice) !== null

function cartLine(menu, quantity) {
  return { menuItemId: menu.id, name: menu.name || 'Menu item', quantity, unitPrice: cents(menu.unitPrice) / 100 }
}

function stampCart(cart, actorId, updatedAt, properties = emptyCart()) {
  return { ...cart, ...properties, updatedAt, updatedBy: actorId }
}

export function addItem(state, restaurantId, menuItemId, allowReplacement = false) {
  const actor = state.account?.id
  const restaurant = restaurantFor(state, restaurantId)
  const menu = list(state.menuItems).find(item => item.id === menuItemId)
  if (!actor || !restaurant || !menuAvailable(menu, restaurantId)) return invalid('This item is unavailable.')
  const items = list(state.cart?.items)
  const sameBag = items.length > 0 && state.cart.restaurantId === restaurantId
  if (items.length && !sameBag && !allowReplacement) return { confirm: true }
  const existing = sameBag && items.find(item => item.menuItemId === menuItemId)
  const quantity = (existing?.quantity ?? 0) + 1
  if (!isQuantity(quantity)) return invalid('This quantity cannot be added.')
  const updated = existing ? items.map(item => item === existing ? { ...item, quantity } : item)
    : [...(sameBag ? items : []), cartLine(menu, 1)]
  const cart = stampCart(state.cart, actor, new Date().toISOString(), {
    restaurantId, sourceOrderId: sameBag ? state.cart.sourceOrderId ?? null : null, items: updated,
  })
  return { state: { ...state, cart } }
}

export function changeQuantity(state, menuItemId, delta, remove = false) {
  const items = list(state.cart?.items)
  const target = items.find(item => item.menuItemId === menuItemId)
  const actor = state.account?.id
  if (!actor || !target || ![-1, 1].includes(delta)) return invalid('This bag item is unavailable.')
  const quantity = remove ? 0 : target.quantity + delta
  if (quantity !== 0 && !isQuantity(quantity)) return invalid('Choose a valid quantity.')
  const updated = quantity ? items.map(item => item === target ? { ...item, quantity } : item) : items.filter(item => item !== target)
  const cart = stampCart(state.cart, actor, new Date().toISOString(), updated.length
    ? { items: updated }
    : emptyCart())
  return { state: { ...state, cart } }
}

export function reorder(state, orderId, confirm = false) {
  const order = list(state.orders).find(candidate => candidate.id === orderId)
  const actor = state.account?.id
  const restaurant = restaurantFor(state, order?.restaurantId)
  if (order?.status !== 'delivered' || !restaurant || !actor) return invalid('This order cannot be reordered.')
  const available = new Map()
  const unavailable = []
  const menu = new Map(list(state.menuItems).filter(item => menuAvailable(item, restaurant.id)).map(item => [item.id, item]))
  for (const old of list(order.items)) {
    const item = menu.get(old.menuItemId)
    const quantity = (available.get(old.menuItemId)?.quantity ?? 0) + old.quantity
    if (item && isQuantity(old.quantity) && isQuantity(quantity)) available.set(item.id, cartLine(item, quantity))
    else unavailable.push(old.name || 'Menu item')
  }
  if (!available.size) return invalid('The items from this order are unavailable for reorder.')
  const replacing = list(state.cart?.items).length > 0 && state.cart.restaurantId !== restaurant.id
  if (!confirm && (replacing || unavailable.length)) return { confirm: true, unavailable, replacing }
  const cart = stampCart(state.cart, actor, new Date().toISOString(), {
    restaurantId: restaurant.id, sourceOrderId: order.id, items: [...available.values()],
  })
  return { state: { ...state, cart } }
}

export function checkoutDetails(state) {
  const restaurant = restaurantFor(state, state.cart?.restaurantId)
  const items = list(state.cart?.items)
  const currentMenu = new Map(list(state.menuItems).map(item => [item.id, item]))
  const validItems = items.every(item => menuAvailable(currentMenu.get(item.menuItemId), restaurant?.id)
    && isQuantity(item.quantity) && item.name && cents(item.unitPrice) !== null)
  const totals = restaurant ? totalsFor(items.filter(item => isQuantity(item.quantity)), restaurant) : null
  const valid = !!(restaurant && items.length && validItems && state.account?.id && totals && cents(totals.total) !== null)
  return { restaurant, items, totals, valid }
}

export function placeOrder(state, { addressId, paymentId, timing, windowStartAt }) {
  const { restaurant, items, totals, valid } = checkoutDetails(state)
  if (!valid) return invalid('Review your bag before placing the order. Some items may be unavailable.')
  const address = list(state.account.addresses).find(item => item.id === addressId && item.street)
  const payment = list(state.account.paymentMethods).find(item => item.id === paymentId && item.last4)
  if (!address || !payment) return invalid('Choose a delivery address and a saved payment method.')
  const now = new Date()
  const scheduled = timing === 'scheduled'
  const slot = scheduled && findSlot(restaurant, windowStartAt, now)
  if (scheduled && !slot) return invalid('Choose an available day and delivery window.')
  const createdAt = now.toISOString()
  const actorId = state.account.id
  const id = newId('order')
  const scheduledDeliveryId = scheduled ? newId('schedule') : null
  const order = {
    id, restaurantId: restaurant.id, restaurantName: restaurant.name, actorId, createdAt,
    currency: 'USD', fulfillment: 'delivery', status: scheduled ? 'scheduled' : 'placed', timing: scheduled ? 'scheduled' : 'asap',
    ...(scheduled && { scheduledDeliveryId }),
    items: receiptItems(id, items.map(({ menuItemId, name, quantity, unitPrice }) => ({ menuItemId, name, quantity, unitPrice })), totals),
    totals, address: { ...address }, payment: { id: payment.id, brand: payment.brand, last4: String(payment.last4).slice(-4) },
    ...(state.cart.sourceOrderId && { sourceOrderId: state.cart.sourceOrderId }),
  }
  const next = { ...state, orders: [...(Array.isArray(state.orders) ? state.orders : []), order], cart: stampCart(state.cart, actorId, createdAt) }
  if (scheduled) {
    const delivery = {
      id: scheduledDeliveryId, orderId: id, status: 'scheduled', ...slot, timeZone: restaurant.timeZone,
      actorId, createdAt, events: [{ id: newId('schedule-event'), actorId, createdAt, type: 'created', to: slot }],
    }
    next.scheduledDeliveries = [...(Array.isArray(state.scheduledDeliveries) ? state.scheduledDeliveries : []), delivery]
  }
  return { state: next, id }
}

export function changeSchedule(state, deliveryId, action, windowStartAt) {
  const delivery = deliveryId && list(state.scheduledDeliveries).find(candidate => candidate.id === deliveryId)
  const order = delivery && orderFor(state, delivery)
  const actorId = state.account?.id
  const now = new Date()
  const permissions = schedulePermissions(delivery, order, now)
  if (!actorId || !['reschedule', 'cancel'].includes(action) || !permissions[action]) return invalid('This delivery can no longer be changed.')
  const reschedule = action === 'reschedule'
  const restaurant = reschedule && restaurantFor(state, order.restaurantId)
  const slot = reschedule && restaurant?.timeZone === delivery.timeZone && findSlot(restaurant, windowStartAt, now, delivery.windowStartAt)
  if (reschedule && !slot) return invalid('Choose a different available day and delivery window.')
  const createdAt = now.toISOString()
  const from = { windowStartAt: delivery.windowStartAt, windowEndAt: delivery.windowEndAt }
  const event = reschedule
    ? { id: newId('schedule-event'), type: 'rescheduled', actorId, createdAt, from, to: slot }
    : { id: newId('schedule-event'), type: 'cancelled', actorId, createdAt, from }
  const updated = {
    ...delivery,
    ...(reschedule ? slot : { status: 'cancelled', cancelledAt: createdAt }),
    updatedAt: createdAt, updatedBy: actorId,
    events: [...(Array.isArray(delivery.events) ? delivery.events : []), event],
  }
  const next = { ...state, scheduledDeliveries: state.scheduledDeliveries.map(candidate => candidate === delivery ? updated : candidate) }
  if (!reschedule) next.orders = state.orders.map(candidate => candidate === order ? { ...order, status: 'cancelled', cancelledAt: createdAt } : candidate)
  return { state: next }
}

export function requestRefund(state, { orderId, scope, reason, notes, quantities }) {
  const order = orderId && list(state.orders).find(candidate => candidate.id === orderId)
  const actorId = state.account?.id
  if (!actorId || !Object.hasOwn(reasons, reason)) return invalid('Choose a reason for the refund request.')
  if (notes.length > 500) return invalid('Keep your details to 500 characters or fewer.')
  const selection = refundSelection(refundBalance(order, state.refunds), scope, quantities)
  if (!selection) return invalid('Select refundable quantities within the remaining amount.')
  const id = newId('refund')
  const createdAt = new Date().toISOString()
  const { payment } = order
  const request = {
    id, orderId, actorId, createdAt, status: 'requested', scope, reason, currency: order.currency || 'USD',
    ...selection,
    ...(notes.trim() && { notes: notes.trim() }),
    ...(payment?.last4 && { payment: { id: payment.id, brand: payment.brand, last4: String(payment.last4).slice(-4) } }),
  }
  return { state: { ...state, refunds: [...(Array.isArray(state.refunds) ? state.refunds : []), request] }, id }
}
