import { cartChange, cartEvent, cartOrderLine, putActiveLine } from './cart.js'
import { activeLines, allowedModes, amount, array, cartStore, cents, find, hours, orderFor, priceLine, productTitle, quantityLimit, time, totalsFor, validHold } from './model.js'
import { releaseRecord, slotAvailability } from './pickup.js'

export const orderPath = order => `/orders/${encodeURIComponent(order.id)}`
export const orderNumber = order => order.orderNumber || order.id || 'Order'
export const editCutoff = slot => new Date(time(slot.startAt) - 3 * hours).toISOString()

export function pickupPersonInput(value) {
  const name = value?.name?.trim() || ''
  const email = value?.email?.trim() || ''
  if (!name && !email) return { person: null }
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter the pickup person’s name and a valid email address.' }
  return { person: { name, email } }
}

export function reviewCheckout(state, mode, now = new Date()) {
  const lines = activeLines(state.cart, mode)
  const hold = mode === 'pickup' ? validHold(state, now) : undefined
  const slot = find(state.pickupSlots, hold?.slotId)
  const store = find(state.stores, hold?.storeId)
  const products = new Map(array(state.catalog).map(product => [product.id, product]))
  const invalidLine = lines.find(line => {
    const quantity = line.quantity
    return !Number.isInteger(quantity) || quantity < 1 || quantity > quantityLimit(products.get(line.productId), mode, store)
  })
  let error
  if (!allowedModes.includes(mode) || !lines.length) error = 'There are no items in this checkout.'
  else if (mode === 'pickup' && (!hold || !slotAvailability(state, slot, now, hold.id))) error = 'Reserve an available pickup window to continue.'
  else if (invalidLine) error = `${productTitle(products.get(invalidLine.productId))} is unavailable in the requested quantity. Update your cart to continue.`
  return { lines, hold, slot, store, products, error }
}

export function placeOrder(state, { mode, addressId, pickupPerson }, context) {
  const review = reviewCheckout(state, mode, context.now)
  if (review.error) return { error: review.error }
  const { lines, hold, slot, products } = review
  const payment = state.profile?.paymentSummary
  if (!payment?.brand || !payment?.last4) return { error: 'A saved payment method is required.' }
  const address = mode === 'shipping' ? find(state.profile?.addresses, addressId) : undefined
  if (mode === 'shipping' && (!address?.line1 || !address?.city || !address?.region || !address?.postalCode)) return { error: 'Choose a complete shipping address.' }
  const { person, error } = mode === 'pickup' ? pickupPersonInput(pickupPerson) : {}
  if (error) return { error }

  const orderId = context.id('order')
  const orderLines = lines.map(line => cartOrderLine(products.get(line.productId), line.quantity, context.id('order-line')))
  const totals = totalsFor(orderLines, hold?.fee)
  const order = {
    id: orderId,
    orderNumber: `200${parseInt(orderId.slice(6, 14), 16).toString().padStart(10, '0').slice(0, 4)}-${orderId.slice(-8).toUpperCase()}`,
    ownerId: context.actorId, status: 'placed', fulfillmentMode: mode,
    lines: orderLines, totals, paymentSummary: { brand: payment.brand, last4: payment.last4 },
    ...(address ? { shippingAddress: { ...address } } : {}),
    ...(hold ? {
      storeId: hold.storeId, slotId: hold.slotId, pickupReservationId: hold.id,
      editCutoffAt: editCutoff(slot), rescheduleCount: 0, pickupPerson: person,
    } : {}),
    ...context.created,
    events: [context.event('placed', { status: 'placed', totals, ...(hold ? { pickupReservationId: hold.id } : {}) })],
  }
  const next = cartEvent(state, context, 'checkout', array(state.cart?.lines).filter(line => !lines.includes(line)),
    lines.map(line => cartChange(state, line, null)), { orderId })
  if (hold) {
    next.cart.pickupReservationId = null
    next.pickupReservations = array(state.pickupReservations).map(record => record === hold ? {
      ...record, ...context.touch, status: 'booked', orderId,
    } : record)
  }
  next.orders = [...array(state.orders), order]
  return { state: next, order }
}

export const canEditOrder = (order, now = new Date()) => order?.status === 'placed' && order.fulfillmentMode === 'pickup' && time(order.editCutoffAt) > +now
export const canCancelOrder = (order, now = new Date()) => order?.status === 'placed' && (order.fulfillmentMode !== 'pickup' || canEditOrder(order, now))

export function changeOrder(state, order, updates, type, fields, context) {
  const updated = { ...order, ...updates, ...context.touch, events: [...array(order.events), context.event(type, fields)] }
  return { ...state, orders: array(state.orders).map(item => item === order ? updated : item) }
}

export function editOrderItems(state, { orderId, items }, context) {
  const order = orderFor(state, orderId)
  if (!canEditOrder(order, context.now)) return { error: 'The editing window for this order has closed.' }
  if (!items.length) return { error: 'Keep at least one item in the order.' }
  const existing = array(order.lines)
  const store = find(state.stores, order.storeId)
  const nextLines = []
  const lineChanges = []
  const seenProducts = new Set()

  for (const item of items) {
    const before = find(existing, item.id)
    const productId = before?.productId ?? item.productId
    const product = find(state.catalog, productId)
    const quantity = item.quantity
    if (seenProducts.has(productId)) return { error: 'Use one row per product.' }
    seenProducts.add(productId)
    if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Enter a positive whole quantity for each item.' }
    if (before && before.quantity === quantity) {
      nextLines.push(before)
      continue
    }
    if (quantity > quantityLimit(product, 'pickup', store)) return { error: `${productTitle(product || before?.product)} is unavailable in that quantity at this store.` }
    const after = before ? priceLine(before, quantity) : cartOrderLine(product, quantity, context.id('order-line'))
    nextLines.push(after)
    lineChanges.push({ orderLineId: after.id, productId, beforeQuantity: before?.quantity ?? 0, afterQuantity: quantity, unitPrice: after.unitPrice ?? null })
  }

  for (const line of existing) {
    if (!items.some(item => item.id === line.id)) lineChanges.push({ orderLineId: line.id, productId: line.productId, beforeQuantity: line.quantity ?? 0, afterQuantity: 0, unitPrice: line.unitPrice ?? null })
  }
  if (!lineChanges.length) return { error: 'Change a quantity, add an item or remove an item before saving.' }
  const slotFee = find(state.pickupReservations, order.pickupReservationId)?.fee ?? find(state.pickupSlots, order.slotId)?.fee
  const totals = totalsFor(nextLines, slotFee)
  return { state: changeOrder(state, order, { lines: nextLines, totals }, 'items_edited', { lineChanges, beforeTotals: order.totals ?? null, afterTotals: totals }, context) }
}

export function editPickupPerson(state, { orderId, pickupPerson }, context) {
  const order = orderFor(state, orderId)
  if (!canEditOrder(order, context.now)) return { error: 'The editing window for this order has closed.' }
  const { person, error } = pickupPersonInput(pickupPerson)
  if (error) return { error }
  const before = order.pickupPerson ?? null
  if (before?.name === person?.name && before?.email === person?.email) return { error: 'Change the pickup person’s details before saving.' }
  return { state: changeOrder(state, order, { pickupPerson: person }, 'pickup_person_updated', { beforePickupPerson: before, afterPickupPerson: person }, context) }
}

export function cancelOrder(state, { orderId }, context) {
  const order = orderFor(state, orderId)
  if (!canCancelOrder(order, context.now)) return { error: 'This order can no longer be canceled.' }
  const booking = find(state.pickupReservations, order.pickupReservationId)
  const fields = { previousStatus: order.status, status: 'canceled' }
  if (order.pickupReservationId) fields.pickupReservationId = order.pickupReservationId
  const next = changeOrder(state, order, { status: 'canceled' }, 'canceled', fields, context)
  if (booking?.status === 'booked' && (!booking.orderId || booking.orderId === order.id)) {
    next.pickupReservations = array(state.pickupReservations).map(item => item === booking ? releaseRecord(item, 'order_canceled', context) : item)
  }
  return { state: next }
}

export function buyAgain(state, { orderId }, context) {
  const order = orderFor(state, orderId)
  if (!order) return { error: 'This order is unavailable.' }
  const mode = order.fulfillmentMode === 'pickup' ? 'pickup' : 'shipping'
  const store = cartStore(state, context.now)
  let lines = array(state.cart?.lines)
  const changes = []
  const unavailable = []
  const limited = []
  for (const original of array(order.lines)) {
    const product = find(state.catalog, original.productId)
    const requested = Number.isInteger(original.quantity) ? original.quantity : 0
    const inCart = activeLines({ lines }, mode).find(line => line.productId === original.productId)
    const add = Math.min(requested, quantityLimit(product, mode, store) - (Number(inCart?.quantity) || 0))
    const name = productTitle(original.product || product)
    if (add <= 0) {
      unavailable.push(name)
      continue
    }
    const result = putActiveLine(state, lines, { productId: original.productId, quantity: add, fulfillmentMode: mode }, context)
    if (result.error) {
      unavailable.push(name)
      continue
    }
    lines = result.lines
    changes.push(...result.changes)
    if (add < requested) limited.push(`${name} (${add} of ${requested})`)
  }
  const details = [
    unavailable.length ? `Skipped: ${unavailable.join(', ')}.` : '',
    limited.length ? `Limited quantities: ${limited.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
  if (!changes.length) return { error: ['No items were added to the cart.', details].filter(Boolean).join(' ') }
  return { state: cartEvent(state, context, 'reordered', lines, changes, { orderId: order.id }), message: ['Items added to cart.', details].filter(Boolean).join(' ') }
}

export const canRescheduleOrder = (order, now) => canEditOrder(order, now) && (order.rescheduleCount ?? 0) === 0 && Boolean(order.storeId)

export function rescheduleOrder(state, { orderId, storeId, slotId }, context) {
  const order = orderFor(state, orderId)
  if (!canRescheduleOrder(order, context.now)) return { error: 'This order can no longer be rescheduled.' }
  if (order.storeId !== storeId || order.slotId === slotId) return { error: 'Choose a different window at the same store.' }
  const slot = find(state.pickupSlots, slotId)
  if (slot?.storeId !== storeId || !slotAvailability(state, slot, context.now)) return { error: 'This time is no longer available. Choose another window.' }
  const previous = find(state.pickupReservations, order.pickupReservationId)
  const oldFee = previous?.fee ?? find(state.pickupSlots, order.slotId)?.fee ?? 0
  const booking = {
    id: context.id('reservation'), orderId, slotId, storeId, status: 'booked', fee: Number(slot.fee) || 0, ...context.created,
  }
  const beforeTotals = order.totals || totalsFor(array(order.lines), oldFee)
  const feeDifference = cents(booking.fee) - cents(oldFee)
  const totals = {
    ...beforeTotals,
    fulfillmentFee: amount(cents(beforeTotals.fulfillmentFee) + feeDifference),
    total: amount(cents(beforeTotals.total) + feeDifference),
  }
  const updates = { pickupReservationId: booking.id, slotId, editCutoffAt: editCutoff(slot), rescheduleCount: (order.rescheduleCount ?? 0) + 1, totals }
  const change = {
    pickupReservationId: booking.id, previousReservationId: order.pickupReservationId ?? null,
    slotId, previousSlotId: order.slotId ?? null,
    beforeTotals, afterTotals: totals,
  }
  const next = changeOrder(state, order, updates, 'rescheduled', change, context)
  next.pickupReservations = [
    ...array(state.pickupReservations).map(record => record === previous && record.status === 'booked' && (!record.orderId || record.orderId === orderId)
      ? releaseRecord(record, 'rescheduled', context) : record),
    booking,
  ]
  return { state: next }
}
