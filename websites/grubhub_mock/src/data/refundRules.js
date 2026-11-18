import { list } from './format.js'
import { allocate, cents, unitAmount } from './money.js'

export const reasons = {
  missing_item: 'Missing item',
  wrong_item: 'Wrong item',
  food_quality: 'Food quality',
  delivery_issue: 'Delivery issue',
  other: 'Other',
}

const reserves = new Set(['requested', 'approved', 'refunded'])

export function refundBalance(order, refunds) {
  const unavailable = { lines: [], amount: 0 }
  const paid = cents(order?.totals?.total)
  const items = list(order?.items)
  if (order?.status !== 'delivered' || !paid || !items.length) return unavailable
  if (new Set(items.map(item => item.id)).size !== items.length
    || items.some(item => !item.id || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) return unavailable

  const stored = items.map(item => cents(item.chargedAmount))
  let allocated = stored
  if (stored.includes(null)) {
    const subtotals = items.map(item => cents(item.subtotal) ?? (cents(item.unitPrice) === null ? null : cents(item.unitPrice) * item.quantity))
    if (!subtotals.every(Number.isSafeInteger) || !subtotals.some(Boolean)
      || !Number.isSafeInteger(subtotals.reduce((sum, subtotal) => sum + subtotal, 0))) return unavailable
    const calculated = allocate(paid, subtotals)
    allocated = stored.map((amount, index) => amount ?? calculated[index])
  }
  const reservedUnits = new Map()
  let reservedAmount = 0
  for (const request of list(refunds)) {
    if (request.orderId !== order.id || !reserves.has(request.status)) continue
    const reservedLines = list(request.lineItems)
    for (const line of reservedLines) {
      if (Number.isSafeInteger(line.quantity) && line.quantity > 0) {
        reservedUnits.set(line.orderItemId, (reservedUnits.get(line.orderItemId) ?? 0) + line.quantity)
      }
    }
    reservedAmount += cents(request.amount) ?? reservedLines.reduce((sum, line) => sum + (cents(line.amount) ?? 0), 0)
  }
  const lines = items.map((item, index) => {
    const used = Math.min(item.quantity, reservedUnits.get(item.id) ?? 0)
    return { item, used, remaining: item.quantity - used, charged: allocated[index] }
  })
  const lineBalance = lines.reduce((sum, line) => sum + unitAmount(line.charged, line.item.quantity, line.used, line.remaining), 0)
  return { lines, amount: Math.max(0, Math.min(lineBalance, paid - reservedAmount)) }
}

export function refundSelection(balance, scope, quantities) {
  if (!balance.amount || !['items', 'full_order'].includes(scope)) return null
  const selected = []
  let amount = 0
  for (const line of balance.lines) {
    const quantity = scope === 'full_order' ? line.remaining : quantities.get(line.item.id) ?? 0
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > line.remaining) return null
    if (!quantity) continue
    const charge = unitAmount(line.charged, line.item.quantity, line.used, quantity)
    selected.push({ orderItemId: line.item.id, quantity, amount: charge / 100 })
    amount += charge
  }
  if (!amount || amount > balance.amount) return null
  return { amount: amount / 100, lineItems: selected }
}
