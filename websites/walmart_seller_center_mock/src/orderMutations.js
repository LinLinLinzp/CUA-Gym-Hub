import { actionId, list, openOrders, recordLines } from './model.js'

const isLine = (line) => typeof line.id === 'string' && line.id && typeof line.sku === 'string' && line.sku
  && Number.isSafeInteger(line.quantity) && line.quantity > 0

export const eligibleOrderLines = (order, type) => recordLines(order).filter((line) => type === 'acknowledged'
  ? line.status === 'new' : openOrders(line))

export function canUpdateOrder(order, type) {
  if (order.fulfillment !== 'seller') return false
  if (type === 'acknowledged' && order.status !== 'new') return false
  if (type === 'shipped' && order.status !== 'acknowledged') return false
  if (type === 'canceled' && !openOrders(order)) return false
  const lines = eligibleOrderLines(order, type)
  return lines.length > 0 && lines.every(isLine) && new Set(lines.map((line) => line.id)).size === lines.length
}

export function updateOrders(state, { ids, type, carrier, trackingNumber, reason }) {
  const orders = list(state.orders)
  const target = new Set(ids)
  const selected = orders.filter((order) => target.has(order.id))
  if (!target.size || selected.length !== target.size || selected.some((order) => !canUpdateOrder(order, type))) {
    return 'At least one selected order is no longer eligible. Review the order status and try again.'
  }
  const milestone = { acknowledged: 'acknowledgedAt', shipped: 'shippedAt', canceled: 'canceledAt' }[type]
  if (!milestone) return 'Choose a supported order action.'
  const details = {}
  if (type === 'shipped') {
    if (!carrier?.trim() || !trackingNumber?.trim()) return 'Enter a carrier and tracking number.'
    details.carrier = carrier.trim()
    details.trackingNumber = trackingNumber.trim()
  }
  if (type === 'canceled') {
    if (!reason?.trim()) return 'Select a reason for cancellation.'
    details.reason = reason.trim()
  }

  const actorId = state.account.actorId
  const createdAt = new Date().toISOString()
  const actions = []
  const nextOrders = orders.map((order) => {
    if (!target.has(order.id)) return order
    const lines = eligibleOrderLines(order, type)
    const changed = new Set(lines.map((line) => line.id))
    actions.push({
      id: actionId('oa'), orderId: order.id, type, status: type, actorId, createdAt,
      lines: lines.map((line) => ({ orderLineId: line.id, sku: line.sku, quantity: line.quantity })), ...details,
    })
    return {
      ...order, status: type, [milestone]: createdAt, updatedAt: createdAt, updatedBy: actorId,
      lines: order.lines.map((line) => changed.has(line.id) ? { ...line, status: type } : line),
    }
  })

  return { ...state, orders: nextOrders, orderActions: [...list(state.orderActions), ...actions] }
}
