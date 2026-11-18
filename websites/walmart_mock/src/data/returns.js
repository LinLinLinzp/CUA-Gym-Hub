import { amount, array, cents, day, find, hours, orderFor, time } from './model.js'
import { storeDate, zonedTime } from './pickup.js'

export const returnStatuses = ['delivered', 'picked_up']
export const returnsFor = (state, orderId) => array(state.returns).filter(record => record.orderId === orderId)

export function returnEligibility(state, order, line, now = new Date()) {
  const prior = returnsFor(state, order.id).filter(record => ['submitted', 'completed'].includes(record.status))
    .flatMap(record => array(record.lines)).filter(item => item.orderLineId === line.id)
    .reduce((total, item) => total + (Number(item.quantity) || 0), 0)
  const remaining = Math.max(0, (Number(line.quantity) || 0) - prior)
  const windowDays = Number(line.returnPolicy?.windowDays) || 0
  const methods = Array.isArray(line.returnPolicy?.methods) ? line.returnPolicy.methods.filter(method =>
    ['store', 'mail', 'scheduled_pickup', 'fedex_dropoff'].includes(method) && (method !== 'scheduled_pickup' || order.shippingAddress?.line1)) : []
  const resolutions = Array.isArray(line.returnPolicy?.resolutions) ? line.returnPolicy.resolutions.filter(value => ['refund', 'replacement'].includes(value)) : []
  const expiry = time(order.fulfilledAt) + windowDays * day
  let reason
  if (!returnStatuses.includes(order.status) || !line.id || !Number.isFinite(expiry) || windowDays <= 0 || time(order.fulfilledAt) > +now || !methods.length || !resolutions.length) reason = 'This item isn’t eligible for returns.'
  else if (expiry < +now) reason = 'The return window has closed.'
  else if (!remaining) reason = 'All units have already been returned or requested.'
  return { available: !reason, reason, remaining, prior, methods, resolutions, expiry }
}

export const reasonNames = {
  damaged: 'Damaged or defective',
  wrong_item: 'Received the wrong item',
  changed_mind: 'Changed my mind',
  description: 'Does not match the description',
  missing_parts: 'Missing parts',
}
export const methodNames = { store: 'Return to store', mail: 'Return by mail', scheduled_pickup: 'Scheduled pickup', fedex_dropoff: 'FedEx drop-off' }
export const methodInstructions = {
  store: 'Bring the items and your return code to the customer service desk at a Walmart store.',
  mail: 'Pack the items securely and reference your return code when preparing the package for mailing.',
  scheduled_pickup: 'Have the items packed and ready at the original delivery address during the scheduled window.',
  fedex_dropoff: 'Take the packed items and your return code to a participating FedEx drop-off location.',
}
export const returnTimezone = order => order.shippingAddress?.timezone || 'America/Chicago'

export function returnAppointments(order, now = new Date()) {
  if (!order.shippingAddress?.line1) return []
  const timezone = returnTimezone(order)
  const today = new Date(`${storeDate(now, timezone)}T12:00:00Z`)
  return Array.from({ length: 4 }, (_, offset) => {
    const date = new Date(+today + (offset + 1) * day).toISOString().slice(0, 10)
    return [9, 14].map(hour => {
      const startAt = zonedTime(date, hour, timezone)
      return { startAt, endAt: new Date(time(startAt) + 2 * hours).toISOString() }
    })
  }).flat()
}

export function sharedMethods(eligibilities) {
  if (!eligibilities.length) return []
  return eligibilities[0].methods.filter(method => eligibilities.every(item => item.methods.includes(method)))
}

export function refundFor(line, quantity, prior, resolution) {
  const empty = { refundSubtotal: 0, refundTax: 0, refundAmount: 0 }
  if (resolution !== 'refund' || !Number.isInteger(line.quantity) || line.quantity < 1) return empty
  const unit = cents(line.unitPrice)
  const tax = Number.isFinite(line.lineTax) ? cents(line.lineTax) : Math.round(unit * line.quantity * (Number(line.taxRate) || 0))
  const remainder = tax % line.quantity
  const taxForQuantity = Math.floor(tax / line.quantity) * quantity + Math.max(0, Math.min(quantity, remainder - prior))
  return { refundSubtotal: amount(unit * quantity), refundTax: amount(taxForQuantity), refundAmount: amount(unit * quantity + taxForQuantity) }
}

export function submitReturn(state, { orderId, selections, method, appointment }, context) {
  const order = orderFor(state, orderId)
  if (!order || !returnStatuses.includes(order.status)) return { error: 'This order is unavailable for returns.' }
  if (!selections.length) return { error: 'Choose at least one item to return.' }
  const lines = []
  const eligibilities = []
  const seen = new Set()
  for (const selection of selections) {
    const line = find(order.lines, selection.id)
    if (!line || seen.has(line.id)) return { error: 'Choose each return item once.' }
    seen.add(line.id)
    const eligibility = returnEligibility(state, order, line, context.now)
    const quantity = selection.quantity
    if (!eligibility.available || !Number.isInteger(quantity) || quantity < 1 || quantity > eligibility.remaining) return { error: 'Review item eligibility and select a quantity still available for return.', step: 0 }
    if (!Object.hasOwn(reasonNames, selection.reason) || !eligibility.resolutions.includes(selection.resolution)) return { error: 'Choose a reason and an eligible resolution for each item.', step: 1 }
    const note = selection.comment?.trim()
    if (note?.length > 500) return { error: 'Keep item notes to 500 characters or fewer.', step: 1 }
    eligibilities.push(eligibility)
    lines.push({
      id: context.id('return-line'), orderLineId: line.id, productId: line.productId ?? null, quantity,
      reason: selection.reason, resolution: selection.resolution, ...(note ? { comment: note } : {}),
      unitPrice: Number(line.unitPrice) || 0, ...refundFor(line, quantity, eligibility.prior, selection.resolution),
    })
  }

  const methods = sharedMethods(eligibilities)
  if (!methods.length) return { error: 'These items have no return method in common. Split them into separate returns.', step: 2 }
  if (!methods.includes(method)) return { error: 'Choose a method available for every selected item.', step: 2 }
  const window = method === 'scheduled_pickup' ? returnAppointments(order, context.now).find(option => option.startAt === appointment) : undefined
  if (method === 'scheduled_pickup' && !window) return { error: 'Choose an available pickup window at the original delivery address.', step: 2 }
  const id = context.id('return')
  const identifier = id.slice(-8).toUpperCase()
  const record = {
    id, returnNumber: `RMA-${identifier}`, orderId, status: 'submitted', method, instructionsCode: `RET-${identifier}`,
    actorId: context.actorId, createdAt: context.createdAt, lines,
    refundEstimate: amount(lines.reduce((sum, line) => sum + cents(line.refundAmount), 0)),
    ...(window ? { pickupAppointment: { ...window, address: { ...order.shippingAddress } } } : {}),
  }
  return { state: { ...state, returns: [...array(state.returns), record] }, record }
}
