import { byId, dateValue, list } from '../utils/read.js'
import { actor, audit } from './cart.js'
import { positiveInt } from './inventory.js'
import { canRefund, refundLine } from './refund.js'

export const reasons = {
  changed_mind: 'Changed my mind', wrong_item: 'Wrong item', damaged: 'Arrived damaged',
  did_not_fit: 'Did not fit', other: 'Other',
}
export const methods = { store: 'Return to store', mail: 'Return by mail' }

function usedIndexes(state, orderId, item) {
  const reservations = list(state.returns).filter((request) =>
    request.orderId === orderId && ['submitted', 'in_transit', 'completed'].includes(request.status)
  ).flatMap((request) => list(request.lines)).filter((line) => line.orderLineId === item.id)
  const taken = new Set()
  let unassigned = 0
  for (const line of reservations) {
    const indexes = list(line.unitIndexes).filter((index) => positiveInt(index) && index <= item.quantity)
    const quantity = positiveInt(line.quantity) ? line.quantity : indexes.length
    let assigned = 0
    for (const index of indexes) {
      if (assigned === quantity) break
      if (taken.has(index)) continue
      taken.add(index)
      assigned++
    }
    unassigned += quantity - assigned
  }
  for (let index = 1; unassigned > 0 && index <= item.quantity; index++) {
    if (taken.has(index)) continue
    taken.add(index)
    unassigned--
  }
  return taken
}

export function returnOptions(state, order, now = new Date()) {
  return list(order.items).map((item) => {
    const policy = list(item.returnMethods).filter((method) => Object.hasOwn(methods, method))
    const deadline = dateValue(item.returnUntil)
    let issue = ''
    if (!['collected', 'delivered'].includes(item.status)) issue = 'Item has not been fulfilled.'
    else if (Array.isArray(item.returnMethods) && !item.returnMethods.length) issue = 'Final sale.'
    else if (deadline <= now.getTime()) issue = 'Return window ended.'
    else if (!item.id || !item.productId || !policy.length || !Number.isFinite(deadline) || !canRefund(item)) issue = 'Return information is unavailable.'
    const indexes = issue ? new Set() : usedIndexes(state, order.id, item)
    const remaining = issue ? 0 : Math.max(0, item.quantity - indexes.size)
    return { item, methods: policy, remaining, indexes, issue: issue || (!remaining ? 'All returnable units have already been requested.' : '') }
  })
}

export function commonMethods(options) {
  return options.length ? Object.keys(methods).filter((method) => options.every((option) => option.methods.includes(method))) : []
}

export function prepareReturn(state, order, selection, method, now = new Date()) {
  if (!actor(state)) return { error: 'Guest information is unavailable.' }
  if (!order.payment?.last4) return { error: 'The original payment method is unavailable.' }
  if (!selection.length) return { error: 'Select at least one line to return.' }
  const options = returnOptions(state, order, now)
  const selected = []
  const lines = []
  const ids = new Set()

  for (const entry of selection) {
    const option = options.find((row) => row.item.id === entry.id)
    if (!option || option.issue || ids.has(entry.id) || !positiveInt(entry.quantity) || entry.quantity > option.remaining) {
      return { error: 'Choose a returnable quantity for each selected item.' }
    }
    if (!Object.hasOwn(reasons, entry.reason)) return { error: 'Choose a reason for each selected item.' }
    const unitIndexes = []
    for (let index = 1; unitIndexes.length < entry.quantity; index++) {
      if (!option.indexes.has(index)) unitIndexes.push(index)
    }
    lines.push({ ...refundLine(option.item, unitIndexes), reason: entry.reason, unitIndexes })
    ids.add(entry.id)
    selected.push(option)
  }
  if (!commonMethods(selected).includes(method)) return { error: 'Choose a return method available for every selected item.' }
  const total = (key) => lines.reduce((amount, line) => amount + line[key], 0)
  return { lines, merchandiseCents: total('merchandiseCents'), taxCents: total('taxCents'), amountCents: total('amountCents') }
}

export function submitReturn(state, { orderId, selection, method }) {
  const order = byId(state.orders, orderId)
  if (!order) return { error: 'This order is unavailable.' }
  const clock = new Date()
  const now = clock.toISOString()
  const quote = prepareReturn(state, order, selection, method, clock)
  if (quote.error) return quote
  const record = audit(state, 'return', now)
  const suffix = record.id.slice(7, 15).toUpperCase()
  const refund = {
    ...audit(state, 'refund', now), source: 'return', orderId, returnId: record.id,
    status: 'pending', currency: 'USD', payment: order.payment, updatedAt: now,
    lines: quote.lines.map(({ unitIndexes, reason, ...line }) => line), amountCents: quote.amountCents,
  }
  const request = {
    ...record, orderId, returnNumber: `RET-${suffix}`, method, status: 'submitted', updatedAt: now,
    lines: quote.lines, estimatedRefundCents: quote.amountCents, refundId: refund.id,
    instructions: method === 'store'
      ? { barcode: `99${BigInt(`0x${suffix}`).toString().padStart(10, '0')}` }
      : { labelNumber: `RMA-${suffix}`, carrier: 'UPS' },
  }
  return { request, state: { ...state, returns: [...list(state.returns), request], refunds: [...list(state.refunds), refund] } }
}
