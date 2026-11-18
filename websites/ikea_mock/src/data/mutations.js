import { lineAmount, roundMoney, sumMoney } from './seed.js'
import { byId, future, hasServiceAddress, list, localDate, moneyValue, serviceSlots, units } from '../utils/account.js'

export const deliveryFee = 49
export const returnReasons = {
  changed_mind: 'Changed my mind', wrong_item: 'Wrong item', damaged_on_arrival: 'Damaged on arrival', size_or_fit: 'Size or fit',
}
export const returnConditions = { unopened: 'Unopened', opened: 'Opened' }
export const returnMethods = { in_store: 'In store', parcel: 'By parcel' }
const fulfilled = (order) => ['delivered', 'collected'].includes(order?.status)
const actorFor = (state) => state.profile?.id || 'account'
const fail = (error) => ({ error })

function uid(prefix, items = []) {
  let id
  do {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8))
    id = prefix + '-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  } while (byId(items, id))
  return id
}

function reference(items, prefix, start) {
  const existing = new Set(list(items).map((item) => String(item.reference)))
  let number = start
  while (existing.has(prefix + number)) number++
  return prefix + number
}

function baseEvent(state, cart, now, type) {
  return { id: uid('cart-event', state.cartEvents), cartId: cart.id || 'cart-' + actorFor(state),
    actor: actorFor(state), createdAt: now, type, status: 'applied' }
}

export function changeCart(state, type, id, quantity) {
  const cart = state.cart || {}
  const lines = list(cart.lines)
  const previous = type === 'add' ? lines.find((line) => line.productId === id) : byId(lines, id)
  const productId = previous?.productId ?? id
  const product = byId(state.products, productId)
  const before = previous?.quantity ?? 0
  if (type !== 'add' && !previous) return fail('This cart item is no longer available.')
  const next = type === 'add' ? before + 1 : type === 'remove' ? 0 : quantity
  if (type !== 'remove' && (!units(next) || (product?.stock != null && next > product.stock))) {
    return fail('Enter a whole quantity within the available stock.')
  }
  if (type !== 'remove' && !product) return fail('This product is unavailable. You can remove it from your cart.')
  const unitPrice = previous?.unitPrice ?? product?.unitPrice
  if (type !== 'remove' && !moneyValue(unitPrice)) return fail('Pricing is unavailable for this product.')
  if (previous && before === next && type !== 'remove') return { state }
  const now = new Date().toISOString()
  const event = baseEvent(state, cart, now, type)
  const lineId = previous?.id ?? uid('cart-line', lines)
  const amount = next ? lineAmount(unitPrice, next) : 0
  const line = { ...previous, id: lineId, productId, quantity: next, unitPrice, lineAmount: amount,
    createdAt: previous?.createdAt ?? now, updatedAt: now, actor: event.actor }
  const nextLines = type === 'remove' ? lines.filter((entry) => entry.id !== lineId)
    : previous ? lines.map((entry) => entry.id === lineId ? line : entry) : [...lines, line]
  return { state: { ...state,
    cart: { ...cart, id: event.cartId, lines: nextLines, updatedAt: now },
    cartEvents: [...list(state.cartEvents), { ...event, lineId, productId, quantityBefore: before,
      quantityAfter: next, unitPrice: moneyValue(unitPrice) ? unitPrice : null, lineAmount: amount }],
  } }
}

export function reviewCart(state) {
  const lines = list(state.cart?.lines)
  let error = lines.length ? '' : 'Add an item to your cart before checkout.'
  const items = lines.map((line) => {
    const product = byId(state.products, line.productId)
    if (!line.id || !product || !moneyValue(line.unitPrice) || !units(line.quantity)
      || (product.stock != null && line.quantity > product.stock)) error = 'Review unavailable items or quantities in your cart.'
    return { ...line, product, lineAmount: moneyValue(line.unitPrice) && units(line.quantity) ? lineAmount(line.unitPrice, line.quantity) : 0 }
  })
  if (new Set(lines.map((line) => line.productId)).size !== lines.length) error = 'Review duplicate products in your cart.'
  return { error, items, subtotal: sumMoney(items.map((item) => item.lineAmount)) }
}

export function checkoutTotals(subtotal, assembly = 0) {
  const tax = roundMoney(subtotal * 0.08)
  return { subtotal, tax, assembly, delivery: deliveryFee, total: sumMoney([subtotal, tax, deliveryFee, assembly]) }
}

export function assemblyChoices(state, order) {
  const active = list(state.bookings).filter((booking) => booking.type === 'assembly'
    && booking.orderId === order.id && ['scheduled', 'completed'].includes(booking.status))
  return list(order.lines).filter((line) => line.id && moneyValue(line.assemblyUnitPrice) && units(line.quantity))
    .map((line) => ({
      ...line, remaining: line.quantity - active.reduce((sum, booking) => sum + list(booking.items)
        .filter((item) => item.orderLineId === line.id && units(item.quantity))
        .reduce((quantity, item) => quantity + item.quantity, 0), 0),
    })).filter((line) => line.remaining > 0)
}

export function assemblyItems(choices, quantities) {
  const selected = Object.entries(quantities).filter(([, value]) => value !== '' && Number(value) !== 0)
  const items = []
  for (const [id, value] of selected) {
    const line = byId(choices, id)
    const quantity = Number(value)
    if (!line || !units(quantity) || quantity > line.remaining) return fail('Review the selected assembly quantities.')
    items.push({ orderLineId: line.orderLineId ?? id, productId: line.productId, quantity, unitPrice: line.assemblyUnitPrice,
      lineAmount: lineAmount(line.assemblyUnitPrice, quantity) })
  }
  if (!items.length) return fail('Select at least one item for assembly.')
  return { items, amount: sumMoney(items.map((item) => item.lineAmount)) }
}

export function assemblySlots(after, now = new Date()) {
  return serviceSlots('assembly', now).filter((slot) => Date.parse(slot.startsAt) > after)
}

function newBooking(state, bookings, { order, type, slot, amount, items, deliveryBookingId, now }) {
  const id = uid('svc', bookings)
  const actor = actorFor(state)
  return {
    id, reference: reference(bookings, 'SV-', 10001), orderId: order.id, type, status: 'scheduled', actor,
    createdAt: now, updatedAt: now, address: { ...order.address }, amount, currency: 'USD', slot, items,
    history: [{ id: uid('service-history'), type: 'scheduled', actor, createdAt: now, statusAfter: 'scheduled' }],
    ...(deliveryBookingId ? { deliveryBookingId } : {}), ...(type === 'assembly' ? { consentAcceptedAt: now } : {}),
  }
}

export function checkout(state, draft) {
  const review = reviewCart(state)
  if (review.error) return fail(review.error)
  if (!hasServiceAddress(draft.address)) return fail('Enter a complete U.S. delivery address and a serviceable five-digit ZIP code.')
  const now = new Date()
  const deliverySlot = byId(serviceSlots('delivery', now), draft.deliverySlot)
  if (!deliverySlot) return fail('Choose an available delivery window.')
  const createdAt = now.toISOString()
  const id = uid('ord', state.orders)
  const lines = review.items.map(({ product, quantity, unitPrice, lineAmount }, index) => ({
    id: id + '-line-' + (index + 1), productId: product.id, articleNumber: product.articleNumber,
    name: product.name, variant: product.variant, quantity, unitPrice, lineAmount,
    assemblyUnitPrice: product.assemblyUnitPrice, parcelEligible: product.parcelEligible === true, returnable: true,
  }))
  const order = {
    id, reference: reference(state.orders, '', 7610041001), actor: actorFor(state), createdAt, status: 'preparing',
    fulfillment: 'delivery', currency: 'USD', address: { ...draft.address }, lines,
  }
  const bookings = list(state.bookings)
  const delivery = newBooking(state, bookings, {
    order, type: 'delivery', slot: deliverySlot, amount: deliveryFee, now: createdAt,
    items: lines.map(({ id: orderLineId, productId, quantity }) => ({ orderLineId, productId, quantity })),
  })
  const nextBookings = [...bookings, delivery]
  let assembly
  if (draft.assembly) {
    if (!draft.consent) return fail('Accept the assembly terms to book this service.')
    const slot = byId(assemblySlots(Date.parse(deliverySlot.endsAt), now), draft.assemblySlot)
    if (!slot) return fail('Choose an available assembly window after delivery.')
    const choices = lines.map((line, index) => ({
      ...line, id: review.items[index].id, orderLineId: line.id, remaining: line.quantity,
    })).filter((line) => moneyValue(line.assemblyUnitPrice))
    const selection = assemblyItems(choices, draft.quantities)
    if (selection.error) return selection
    assembly = newBooking(state, nextBookings, {
      order, type: 'assembly', slot, now: createdAt, deliveryBookingId: delivery.id, ...selection,
    })
    nextBookings.push(assembly)
  }
  order.totals = checkoutTotals(review.subtotal, assembly?.amount)
  const event = baseEvent(state, state.cart, createdAt, 'checkout')
  return { order, delivery, assembly, state: {
    ...state, orders: [...list(state.orders), order], bookings: nextBookings,
    cart: { ...state.cart, id: event.cartId, lines: [], updatedAt: createdAt },
    cartEvents: [...list(state.cartEvents), { ...event, orderId: id, subtotal: review.subtotal,
      lines: review.items.map(({ id: lineId, productId, quantity, unitPrice, lineAmount }) =>
        ({ lineId, productId, quantity, unitPrice, lineAmount })) }],
  } }
}

function relatedDelivery(state, orderId) {
  return list(state.bookings).find((booking) => booking.orderId === orderId && booking.type === 'delivery'
    && ['scheduled', 'completed'].includes(booking.status))
}

export function assemblySchedule(state, order, delivery) {
  if (!order || !['preparing', 'on_the_way', 'delivered', 'collected'].includes(order.status)) return { after: NaN }
  const associated = delivery ?? relatedDelivery(state, order.id)
  const deliveryEnd = Date.parse(associated?.slot?.endsAt)
  if (Number.isFinite(deliveryEnd)) return { after: deliveryEnd, delivery: associated }
  if (!fulfilled(order)) return { after: NaN, delivery: associated }
  const fulfillment = Date.parse(order.fulfilledAt)
  return { after: Number.isFinite(fulfillment) ? fulfillment : order.status === 'collected' ? 0 : NaN, delivery: associated }
}

export function bookAssembly(state, orderId, draft) {
  const order = byId(state.orders, orderId)
  if (!order || !hasServiceAddress(order.address)) return fail('A complete order address is required to book assembly.')
  const now = new Date()
  const schedule = assemblySchedule(state, order)
  const slot = byId(assemblySlots(schedule.after, now), draft.slotId)
  if (!slot) return fail('Choose an available assembly window after fulfillment.')
  if (!draft.consent) return fail('Accept the assembly terms to book this service.')
  const selection = assemblyItems(assemblyChoices(state, order), draft.quantities)
  if (selection.error) return selection
  const bookings = list(state.bookings)
  const booking = newBooking(state, bookings, {
    order, type: 'assembly', slot, now: now.toISOString(), deliveryBookingId: schedule.delivery?.id, ...selection,
  })
  return { booking, state: { ...state, bookings: [...bookings, booking] } }
}

export function dependentAssemblies(state, booking) {
  if (booking.type !== 'delivery') return []
  return list(state.bookings).filter((entry) => entry.type === 'assembly' && entry.status === 'scheduled'
    && (entry.deliveryBookingId === booking.id || (!entry.deliveryBookingId && entry.orderId === booking.orderId)))
}

export function rescheduleSlots(state, booking, now = new Date()) {
  if (booking.type === 'assembly') {
    const delivery = byId(state.bookings, booking.deliveryBookingId)
    const order = byId(state.orders, booking.orderId)
    return assemblySlots(assemblySchedule(state, order, delivery).after, now)
      .filter((slot) => Date.parse(slot.startsAt) !== Date.parse(booking.slot?.startsAt))
  }
  const dependents = dependentAssemblies(state, booking)
  return serviceSlots('delivery', now).filter((slot) => Date.parse(slot.startsAt) !== Date.parse(booking.slot?.startsAt)
    && dependents.every((entry) => Date.parse(slot.endsAt) < Date.parse(entry.slot?.startsAt)))
}

export function manageBooking(state, id, action, slotId) {
  const booking = byId(state.bookings, id)
  const now = new Date()
  if (!booking || !['delivery', 'assembly'].includes(booking.type) || booking.status !== 'scheduled'
    || !future(booking.slot?.startsAt, now)) return fail('This appointment can no longer be changed.')
  if (action === 'cancel' && dependentAssemblies(state, booking).length) {
    return fail('Cancel the linked assembly before cancelling delivery.')
  }
  const slot = action === 'reschedule' ? byId(rescheduleSlots(state, booking, now), slotId) : null
  if (action === 'reschedule' && !slot) return fail('Choose a new time that fits the appointment schedule.')
  const status = action === 'cancel' ? 'cancelled' : booking.status
  const history = list(booking.history)
  const updatedAt = now.toISOString()
  const entry = {
    id: uid('service-history', history), type: action === 'cancel' ? 'cancelled' : 'rescheduled',
    actor: actorFor(state), createdAt: updatedAt, statusAfter: status,
    ...(slot ? { slotBefore: booking.slot, slotAfter: slot } : { statusBefore: booking.status }),
  }
  const changed = { ...booking, ...(slot ? { slot } : {}), status, updatedAt, history: [...history, entry] }
  return { state: { ...state, bookings: list(state.bookings).map((item) => item.id === id ? changed : item) } }
}

export function returnQuantity(state, order, line, condition = 'unopened', now = new Date()) {
  if (!fulfilled(order) || line.returnable !== true || !line.id || !units(line.quantity)
    || !moneyValue(line.unitPrice) || (line.returnBy && localDate(now) > line.returnBy)) return 0
  const fulfillment = Date.parse(order.fulfilledAt)
  const limit = condition === 'opened' ? 180 : 365
  if (Number.isFinite(fulfillment) && now.getTime() > fulfillment + limit * 86400000) return 0
  const claimed = list(state.returns).filter((entry) => entry.orderId === order.id
    && ['requested', 'received', 'refunded'].includes(entry.status))
    .flatMap((entry) => list(entry.items)).filter((item) => item.orderLineId === line.id && units(item.quantity))
    .reduce((total, item) => total + item.quantity, 0)
  return Math.max(0, line.quantity - claimed)
}

export function reviewReturn(state, order, selections, method, now = new Date()) {
  if (!fulfilled(order)) return fail('Choose a delivered or collected order.')
  const choices = Object.entries(selections).filter(([, entry]) => entry.selected)
  const items = []
  let parcelEligible = true
  for (const [id, { quantity: raw, reason, condition }] of choices) {
    const line = byId(order.lines, id)
    const quantity = Number(raw)
    if (!line || !units(quantity) || quantity > returnQuantity(state, order, line, condition, now)) {
      return fail('A selected quantity is no longer returnable. Review the item quantities and conditions.')
    }
    if (!Object.hasOwn(returnReasons, reason) || !Object.hasOwn(returnConditions, condition)) {
      return fail('Choose a reason and condition for each selected item.')
    }
    parcelEligible &&= line.parcelEligible === true
    items.push({ orderLineId: id, productId: line.productId, quantity, reason, condition,
      unitPrice: line.unitPrice, refundAmount: lineAmount(line.unitPrice, quantity) })
  }
  if (!items.length) return fail('Select at least one item to return.')
  if (!Object.hasOwn(returnMethods, method) || (method === 'parcel' && !parcelEligible)) {
    return fail('Choose an eligible return method.')
  }
  const merchandiseAmount = sumMoney(items.map((item) => item.refundAmount))
  const feeAmount = method === 'parcel' && items.some(({ reason }) => ['changed_mind', 'size_or_fit'].includes(reason))
    ? Math.min(5, merchandiseAmount) : 0
  return { items, merchandiseAmount, feeAmount, refundAmount: sumMoney([merchandiseAmount, -feeAmount]) }
}

export function requestReturn(state, orderId, selections, method) {
  const now = new Date()
  const review = reviewReturn(state, byId(state.orders, orderId), selections, method, now)
  if (review.error) return review
  const createdAt = now.toISOString()
  const entry = {
    id: uid('ret', state.returns), reference: reference(state.returns, 'RT-', 10001), orderId,
    actor: actorFor(state), createdAt, updatedAt: createdAt, status: 'requested', method, currency: 'USD', ...review,
  }
  return { entry, state: { ...state, returns: [...list(state.returns), entry] } }
}
