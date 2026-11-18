export const records = (value) => (Array.isArray(value) ? value.filter((record) => record && typeof record === 'object') : [])
export const findRecord = (value, id) => id ? records(value).find((record) => record.id === id) : undefined
export const dateValue = (value) => value ? new Date(value).getTime() : NaN
export const byRecent = (first, second) => (dateValue(second) || 0) - (dateValue(first) || 0)
export const cents = (amount) => Number.isFinite(Number(amount)) ? Math.round(Number(amount) * 100) : 0
export const unitCents = (item) => cents(item.unitPrice) + cents(item.unitTax)
export const remaining = (item) => Math.max(0, (Number(item.quantity) || 0) - (Number(item.canceledQuantity) || 0))
export const orderNumber = (order) => order?.orderNumber || order?.id || 'Order unavailable'
export const shipmentZone = (state, shipment) => shipment?.timeZone || state.account?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone

export function dateFormatter(options, zone) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: zone })
  } catch {
    return new Intl.DateTimeFormat('en-US', options)
  }
}

export function formatDate(value, zone, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return Number.isFinite(dateValue(value)) ? dateFormatter(options, zone).format(new Date(value)) : 'Date unavailable'
}

export function formatWindow(window, zone) {
  const date = formatDate(window.startAt, zone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  if (!(dateValue(window.endAt) > dateValue(window.startAt))) return date
  const time = dateFormatter({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }, zone)
  const start = new Date(window.startAt)
  const end = new Date(window.endAt)
  return date + ' · ' + time.formatRange(start, end)
}

export function money(amount, currency = 'USD') {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return 'Unavailable'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return Number(amount).toFixed(2)
  }
}

const labels = {
  changed_mind: 'Changed my mind', ordered_by_mistake: 'Ordered by mistake', delivery_timing: 'Delivery timing',
  did_not_fit: 'Did not fit', did_not_match: 'Did not match expectations', other: 'Other',
  damaged: 'Arrived damaged', defective: 'Defective', missing_parts: 'Missing parts', wrong_item: 'Wrong item',
  replacement: 'Replacement', replacement_parts: 'Replacement parts', refund: 'Refund',
  drop_off: 'Parcel drop-off', pickup: 'Freight pickup', original_payment: 'Original payment method', store_credit: 'Store credit',
  ready_to_schedule: 'Ready to schedule', scheduled: 'Scheduled', appointment_started: 'Appointment in progress',
}
export const label = (value) => labels[value] || (value ? String(value).replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) : 'Unavailable')
export const cancelReasons = ['changed_mind', 'ordered_by_mistake', 'delivery_timing', 'other']
export const returnReasons = ['changed_mind', 'did_not_fit', 'did_not_match', 'ordered_by_mistake', 'other']
export const issueTypes = ['damaged', 'defective', 'missing_parts', 'wrong_item']
export const resolutions = ['replacement', 'replacement_parts', 'refund']
export const attachmentTypes = ['image/jpeg', 'image/png']
export const maxAttachmentBytes = 5 * 1024 * 1024
export const refundMethods = ['original_payment', 'store_credit']
export const claimStatuses = ['submitted', 'in_review', 'approved', 'resolved', 'denied', 'withdrawn']
export const returnStatuses = ['requested', 'in_transit', 'received', 'refunded', 'canceled']

const claimReservations = new Set(claimStatuses.slice(0, 4))
const returnReservations = new Set(returnStatuses.slice(0, 4))

export function itemShipment(state, order, item) {
  const shipment = findRecord(state.shipments, item.shipmentId)
  return shipment?.orderId === order.id ? shipment : undefined
}

export function shipmentItems(state, shipment) {
  const order = findRecord(state.orders, shipment.orderId)
  return records(order?.items).filter((item) => item.shipmentId === shipment.id)
}

export function orderStatus(state, order) {
  const items = records(order.items)
  const activeItems = items.filter((item) => remaining(item) > 0)
  const partiallyCanceled = activeItems.length > 0 && items.some((item) => Number(item.canceledQuantity) > 0)
  if (items.length && !activeItems.length && items.some((item) => Number(item.canceledQuantity) > 0)) {
    return { status: 'canceled', partiallyCanceled }
  }
  const stages = activeItems.map((item) => itemShipment(state, order, item)?.status)
  const delivered = stages.filter((stage) => stage === 'delivered').length
  let status = 'preparing'
  if (delivered && delivered === stages.length) status = 'delivered'
  else if (delivered) status = 'partially_delivered'
  else if (stages.some((stage) => stage === 'in_transit' || stage === 'out_for_delivery')) status = 'in_transit'
  return { status, partiallyCanceled }
}

export function appointmentHistory(state, shipment) {
  return records(state.deliveryAppointments)
    .filter((booking) => booking.shipmentId === shipment.id && booking.orderId === shipment.orderId)
    .sort((a, b) => byRecent(a.startAt, b.startAt))
}

export function confirmedAppointment(state, shipment) {
  return appointmentHistory(state, shipment).find((booking) => booking.status === 'confirmed')
}

export function futureAppointment(state, shipment, now = new Date()) {
  const booking = confirmedAppointment(state, shipment)
  return dateValue(booking?.startAt) > now ? booking : undefined
}

export function deliveryStatus(state, shipment, now = new Date()) {
  const items = shipmentItems(state, shipment)
  if (items.length && items.every((item) => remaining(item) === 0 && Number(item.canceledQuantity) > 0)) return 'canceled'
  if (shipment.status !== 'ready_to_schedule') return shipment.status
  const booking = confirmedAppointment(state, shipment)
  if (booking) return dateValue(booking.startAt) > now ? 'scheduled' : 'appointment_started'
  return 'ready_to_schedule'
}

export function canSchedule(state, shipment, now = new Date()) {
  const booking = confirmedAppointment(state, shipment)
  return shipment.type === 'freight' && shipment.status === 'ready_to_schedule'
    && shipmentItems(state, shipment).some((item) => remaining(item) > 0)
    && (!booking || dateValue(booking.startAt) > now)
}

export function availableSlots(state, shipment, now = new Date()) {
  const current = confirmedAppointment(state, shipment)
  return records(shipment.availableSlots)
    .filter((slot) => slot.id && slot.id !== current?.slotId && dateValue(slot.startAt) > now && dateValue(slot.endAt) > dateValue(slot.startAt))
    .sort((a, b) => byRecent(b.startAt, a.startAt))
}

export function availableQuantity(state, order, item) {
  const claimed = records(state.damageClaims)
    .filter((claim) => claim.orderId === order.id && claim.orderItemId === item.id && claimReservations.has(claim.status))
    .reduce((sum, claim) => sum + (Number(claim.quantity) || 0), 0)
  const returned = records(state.returns)
    .filter((entry) => entry.orderId === order.id && returnReservations.has(entry.status))
    .flatMap((entry) => records(entry.items))
    .filter((line) => line.orderItemId === item.id)
    .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  return Math.max(0, remaining(item) - claimed - returned)
}

function dayNumber(value, zone) {
  const parts = dateFormatter({ year: 'numeric', month: 'numeric', day: 'numeric' }, zone).formatToParts(new Date(value))
  const fields = Object.fromEntries(parts.map(({ type, value: part }) => [type, Number(part)]))
  return Date.UTC(fields.year, fields.month - 1, fields.day) / 86400000
}

export function itemEligibility(state, order, item, purpose, now = new Date()) {
  const shipment = itemShipment(state, order, item)
  if (!shipment) return { reason: 'Shipment information is unavailable.' }
  if (purpose === 'cancel') {
    if (shipment.status !== 'preparing') return { reason: 'Only items being prepared can be canceled.' }
    if (remaining(item) < 1) return { reason: 'All units have been canceled.' }
    return { quantity: remaining(item), shipment }
  }
  if (purpose === 'return' && item.returnable === false) return { reason: 'Final sale. This item cannot be returned.' }
  if (shipment.status !== 'delivered') return { reason: 'This item is awaiting delivery.' }
  if (purpose === 'return') {
    if (!Number.isFinite(dateValue(shipment.deliveredAt))) return { reason: 'Return deadline unavailable. The delivery date is missing.' }
    const zone = shipmentZone(state, shipment)
    const elapsed = dayNumber(now, zone) - dayNumber(shipment.deliveredAt, zone)
    if (elapsed < 0) return { reason: 'The recorded delivery date is in the future.' }
    if (elapsed > 30) return { reason: 'The 30-day return window has expired.' }
    if (!['parcel', 'freight'].includes(shipment.type)) return { reason: 'A return handoff is unavailable for this shipment.' }
  }
  const quantity = availableQuantity(state, order, item)
  if (quantity < 1) return { reason: 'No units are available. Check existing claims, returns or cancellations.' }
  return { quantity, shipment, handoff: shipment.type === 'freight' ? 'pickup' : 'drop_off' }
}

export function returnEstimate(subtotalCents, handoff) {
  const fee = Math.min(subtotalCents, handoff === 'pickup' ? 3995 : 895)
  return { refundSubtotal: subtotalCents / 100, returnFee: fee / 100, estimatedRefund: (subtotalCents - fee) / 100 }
}
