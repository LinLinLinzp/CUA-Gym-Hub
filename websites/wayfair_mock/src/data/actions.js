import {
  availableSlots, cancelReasons, canSchedule, findRecord, futureAppointment, itemEligibility, shipmentZone, unitCents,
  issueTypes, resolutions, attachmentTypes, maxAttachmentBytes, refundMethods, returnEstimate, returnReasons,
} from './rules.js'

function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

function newRecord(state, now, prefix) {
  requireValue(state.account?.id, 'Account details are unavailable. Refresh and try again.')
  return { id: prefix + '-' + uuid(), actorId: state.account.id, createdAt: now.toISOString() }
}

const originalArray = (value) => Array.isArray(value) ? value : []

function add(state, key, record) {
  return { ...state, [key]: [...originalArray(state[key]), record] }
}

function selectedLine(state, order, id, quantity, purpose, now) {
  const item = findRecord(order.items, id)
  requireValue(item, 'A selected item is unavailable. Go back and select an item.')
  const eligibility = itemEligibility(state, order, item, purpose, now)
  requireValue(!eligibility.reason, eligibility.reason)
  const units = Number(quantity)
  requireValue(Number.isInteger(units) && units >= 1 && units <= eligibility.quantity,
    'Choose a whole quantity from 1 to ' + eligibility.quantity + ' for ' + (item.name || 'the selected item') + '.')
  return { item, units, ...eligibility }
}

function checkSelections(selections) {
  requireValue(selections.length && selections.length === new Set(selections.map(({ orderItemId }) => orderItemId)).size,
    'Select at least one item. Each item can be selected once.')
}

export function cancelItems(state, now, { orderId, selections, reason }) {
  const order = findRecord(state.orders, orderId)
  requireValue(order, 'This order is unavailable.')
  requireValue(cancelReasons.includes(reason), 'Choose a cancellation reason.')
  checkSelections(selections)
  let total = 0
  const items = selections.map(({ orderItemId, quantity }) => {
    const { item, units } = selectedLine(state, order, orderItemId, quantity, 'cancel', now)
    const credit = Math.max(0, unitCents(item)) * units
    total += credit
    return { orderItemId, quantity: units, estimatedCredit: credit / 100 }
  })
  const record = {
    ...newRecord(state, now, 'cancel'), orderId, status: 'confirmed', reason, items,
    estimatedCredit: total / 100, currency: order.currency || 'USD',
  }
  const quantities = new Map(items.map((item) => [item.orderItemId, item.quantity]))
  const orders = originalArray(state.orders).map((candidate) => candidate?.id === orderId ? {
    ...candidate,
    items: originalArray(candidate.items).map((item) => quantities.has(item?.id) ? {
      ...item, canceledQuantity: (Number(item.canceledQuantity) || 0) + quantities.get(item.id),
    } : item),
  } : candidate)
  return { nextState: add({ ...state, orders }, 'orderCancellations', record), record }
}

function updateRecord(state, key, id, change) {
  let record
  const entries = originalArray(state[key]).map((entry) => {
    if (entry?.id !== id) return entry
    record = { ...entry, ...change }
    return record
  })
  return { nextState: { ...state, [key]: entries }, record }
}

function cancelRecord(state, key, id, now) {
  const timestamp = now.toISOString()
  requireValue(state.account?.id, 'Account details are unavailable. Refresh and try again.')
  return updateRecord(state, key, id, {
    status: 'canceled', updatedAt: timestamp, updatedBy: state.account.id, canceledAt: timestamp,
  })
}

export function bookDelivery(state, now, { shipmentId, slotId, instructions, expectedAppointmentId }) {
  const shipment = findRecord(state.shipments, shipmentId)
  requireValue(shipment && canSchedule(state, shipment, now), 'This shipment can no longer be scheduled.')
  const previous = futureAppointment(state, shipment, now)
  requireValue((previous?.id || null) === expectedAppointmentId, 'The current booking has changed. Reopen scheduling to continue.')
  const slot = findRecord(availableSlots(state, shipment, now), slotId)
  requireValue(slot, 'This time window is no longer available. Choose another window.')
  requireValue(typeof instructions === 'string' && instructions.length <= 500, 'Use 500 characters or fewer for delivery instructions.')
  const record = {
    ...newRecord(state, now, 'appt'), orderId: shipment.orderId, shipmentId, slotId,
    startAt: slot.startAt, endAt: slot.endAt, timeZone: shipmentZone(state, shipment),
    instructions: instructions.trim(), status: 'confirmed',
  }
  let current = state
  if (previous) {
    record.previousAppointmentId = previous.id
    current = updateRecord(state, 'deliveryAppointments', previous.id, {
      status: 'rescheduled', updatedAt: record.createdAt, updatedBy: record.actorId, replacedByAppointmentId: record.id,
    }).nextState
  }
  return { nextState: add(current, 'deliveryAppointments', record), record }
}

export function cancelDelivery(state, now, { shipmentId, appointmentId }) {
  const shipment = findRecord(state.shipments, shipmentId)
  requireValue(shipment && findRecord(state.orders, shipment.orderId), 'The shipment or its order is unavailable.')
  const appointment = futureAppointment(state, shipment, now)
  requireValue(appointment?.id === appointmentId, 'This appointment has changed or its window has already started.')
  return cancelRecord(state, 'deliveryAppointments', appointmentId, now)
}

export function submitClaim(state, now, { orderId, orderItemId, quantity, issueType, description, requestedResolution, attachments }) {
  const order = findRecord(state.orders, orderId)
  requireValue(order, 'Choose an available order.')
  const { units, shipment } = selectedLine(state, order, orderItemId, quantity, 'claim', now)
  requireValue(issueTypes.includes(issueType), 'Choose an issue type.')
  requireValue(resolutions.includes(requestedResolution), 'Choose a preferred resolution.')
  const details = description.trim()
  requireValue(details.length >= 10 && details.length <= 1000, 'Describe the issue in 10 to 1,000 characters.')
  requireValue(attachments.length <= 3 && attachments.every((file) => attachmentTypes.includes(file.type)
    && Number.isInteger(file.size) && file.size >= 0 && file.size <= maxAttachmentBytes), 'Choose up to three JPEG or PNG photos of 5 MB or less each.')
  const record = {
    ...newRecord(state, now, 'claim'), orderId, orderItemId, shipmentId: shipment.id, quantity: units, issueType,
    description: details, requestedResolution, status: 'submitted',
    attachments: attachments.map(({ name, size, type }) => ({
      name: name.split(/[\\/]/).at(-1).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || 'Photo', size, type,
    })),
  }
  return { nextState: add(state, 'damageClaims', record), record }
}

export function requestReturn(state, now, { orderId, selections, handoffMethod, refundMethod }) {
  const order = findRecord(state.orders, orderId)
  requireValue(order, 'Choose an available order.')
  requireValue(refundMethods.includes(refundMethod), 'Choose a refund method.')
  checkSelections(selections)
  let subtotal = 0
  const items = selections.map(({ orderItemId, quantity, reason }) => {
    const { item, units, handoff } = selectedLine(state, order, orderItemId, quantity, 'return', now)
    requireValue(handoff === handoffMethod, 'Return parcel and freight items in separate requests.')
    requireValue(returnReasons.includes(reason), 'Choose a return reason for each item.')
    const refund = Math.max(0, unitCents(item)) * units
    subtotal += refund
    return { orderItemId, quantity: units, reason, refundAmount: refund / 100 }
  })
  const record = {
    ...newRecord(state, now, 'return'), orderId, items, handoffMethod, refundMethod,
    ...returnEstimate(subtotal, handoffMethod), currency: order.currency || 'USD', status: 'requested',
  }
  return { nextState: add(state, 'returns', record), record }
}

export function cancelReturn(state, now, returnId) {
  const entry = findRecord(state.returns, returnId)
  requireValue(entry?.status === 'requested', 'This return can no longer be canceled.')
  return cancelRecord(state, 'returns', returnId, now)
}
