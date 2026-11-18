import { actionId, cents, list, recordLines, remaining } from './model.js'

const hasId = (value) => typeof value === 'string' && value.trim().length > 0
const validMoney = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(cents(value))

function validReturnLines(state, record) {
  const lines = recordLines(record)
  if (!hasId(record.orderId) || !lines.length || new Set(lines.map((line) => line.id)).size !== lines.length) return false
  const order = list(state.orders).find((entry) => entry.id === record.orderId)
  const orderLines = order ? recordLines(order) : []
  const quantities = new Map()
  return lines.every((line) => {
    if (!hasId(line.id) || !hasId(line.orderLineId) || !hasId(line.sku) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) return false
    if (!orderLines.length) return true
    const original = orderLines.find((entry) => entry.id === line.orderLineId)
    const quantity = (quantities.get(line.orderLineId) ?? 0) + line.quantity
    quantities.set(line.orderLineId, quantity)
    return original && original.sku === line.sku && quantity <= original.quantity
  })
}

function validRefundLine(line) {
  const refunded = line.refundedQuantity ?? 0
  return Number.isSafeInteger(refunded) && refunded >= 0 && refunded <= line.quantity
    && validMoney(line.unitRefundAmount) && Number.isSafeInteger(cents(line.unitRefundAmount) * line.quantity)
}

export const eligibleRefund = (line) => validRefundLine(line) && remaining(line) > 0

export function canUpdateReturn(state, record, type) {
  if (type === 'received') return record.status === 'in_transit' && validReturnLines(state, record)
  const lines = recordLines(record)
  return type === 'refund' && record.status === 'received' && validReturnLines(state, record)
    && lines.every(validRefundLine) && lines.some(eligibleRefund)
}

function updateRecord(state, id, changes) {
  return state.returns.map((record) => record.id === id ? { ...record, ...changes } : record)
}

export function receiveReturn(state, id) {
  const record = list(state.returns).find((entry) => entry.id === id)
  if (!record || !canUpdateReturn(state, record, 'received')) return 'This return is no longer eligible for receipt.'
  const createdAt = new Date().toISOString()
  const actorId = state.account.actorId
  const action = {
    id: actionId('ra'), returnId: id, orderId: record.orderId, type: 'received', status: 'received', actorId, createdAt,
    lines: record.lines.map(({ id: returnLineId, orderLineId, sku, quantity }) => ({ returnLineId, orderLineId, sku, quantity })),
  }
  return {
    ...state,
    returns: updateRecord(state, id, { status: 'received', receivedAt: createdAt, updatedAt: createdAt, updatedBy: actorId }),
    returnActions: [...list(state.returnActions), action],
  }
}

export function issueRefund(state, id, quantities) {
  const record = list(state.returns).find((entry) => entry.id === id)
  if (!record || !canUpdateReturn(state, record, 'refund')) return 'This return is no longer eligible for a refund.'
  const selected = Object.entries(quantities)
  if (!selected.length) return 'Select at least one line to refund.'
  const lines = []
  let amountCents = 0
  for (const [key, quantity] of selected) {
    const line = record.lines.find((entry) => entry.id === key)
    if (!line || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > remaining(line)) {
      return 'Enter a whole quantity within the remaining eligible units for each selected line.'
    }
    const lineCents = cents(line.unitRefundAmount) * quantity
    amountCents += lineCents
    lines.push({ returnLineId: line.id, orderLineId: line.orderLineId, sku: line.sku, quantity, amount: lineCents / 100 })
  }
  const updatedLines = record.lines.map((line) => Object.hasOwn(quantities, line.id)
    ? { ...line, refundedQuantity: (line.refundedQuantity ?? 0) + quantities[line.id] } : line)
  const fullyRefunded = updatedLines.every((line) => remaining(line) === 0)
  const createdAt = new Date().toISOString()
  const actorId = state.account.actorId
  const originalCents = record.lines.reduce((sum, line) => sum + cents(line.unitRefundAmount) * line.quantity, 0)
  const previousCents = validMoney(record.refundedAmount) ? cents(record.refundedAmount)
    : record.lines.reduce((sum, line) => sum + cents(line.unitRefundAmount) * (line.refundedQuantity ?? 0), 0)
  const refundableCents = validMoney(record.refundableAmount) ? cents(record.refundableAmount) : originalCents
  if (!Number.isSafeInteger(amountCents + previousCents) || amountCents + previousCents > refundableCents) {
    return 'The selected amount exceeds the remaining refundable balance.'
  }
  const changes = {
    lines: updatedLines, refundableAmount: refundableCents / 100, refundedAmount: (previousCents + amountCents) / 100,
    status: fullyRefunded ? 'refunded' : 'received', refundStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
    updatedAt: createdAt, updatedBy: actorId, ...(fullyRefunded ? { refundedAt: createdAt } : {}),
  }
  const refund = {
    id: actionId('rf'), returnId: id, orderId: record.orderId, actorId, createdAt,
    status: 'issued', currency: 'USD', amount: amountCents / 100, lines,
  }
  return { ...state, returns: updateRecord(state, id, changes), refunds: [...list(state.refunds), refund] }
}
