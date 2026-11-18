import { actor, cents, newId, oneCentValue, rows } from './model.js'

export const issuedFor = (state, orderId) => rows(state.refunds).filter(item => item.orderId === orderId && item.status === 'issued')
export const totalIssued = records => records.reduce((sum, item) => sum + cents(item.totalAmount), 0)

export function readMoney(value) {
  if (!oneCentValue(value) || cents(value) < 0 || !Number.isSafeInteger(cents(value))) throw new Error('The order or return is missing a valid amount.')
  return cents(value)
}

export function makeRefund(state, {
  orderId, returnId, kind, status, note, lines, shipping, tax, now,
}) {
  const total = lines.reduce((sum, line) => sum + line.amount, shipping + tax)
  return {
    id: newId('ref'), orderId, ...(returnId && { returnId }), kind, status, ...(note && { note }),
    lines: lines.map(line => ({ ...line, amount: line.amount / 100 })),
    shippingAmount: shipping / 100, taxAmount: tax / 100, totalAmount: total / 100,
    actorId: actor(state), createdAt: now,
  }
}

export function cancellationRefund(state, order, now, note) {
  const paid = readMoney(order.total)
  if (issuedFor(state, order.id).length) throw new Error('A refund has already been issued on this order.')
  const lines = rows(order.lines).map(line => {
    if (!line.id || !line.listingId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new Error('The order is missing valid line items.')
    return { orderLineId: line.id, listingId: line.listingId, quantity: line.quantity, amount: readMoney(line.lineTotal) }
  })
  const shipping = readMoney(order.shipping ?? 0)
  const tax = readMoney(order.tax ?? 0)
  if (!lines.length || new Set(lines.map(line => line.orderLineId)).size !== lines.length ||
      lines.reduce((sum, line) => sum + line.amount, shipping + tax) !== paid) throw new Error('The line items, shipping, and tax must add up to the paid amount.')
  return makeRefund(state, { orderId: order.id, kind: 'cancellation', status: 'issued', note, lines, shipping, tax, now })
}
