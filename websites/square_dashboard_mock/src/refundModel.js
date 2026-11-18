import { cents, find, inputCents, metadata, newId, replace, rows, whole } from './model.js'

export function refundContext(state, payment) {
  const order = find(state.orders, payment.orderId)
  const history = rows(state.refunds).filter((refund) => refund.paymentId === payment.id)
  const completed = history.filter((refund) => refund.status === 'completed')
  const amount = cents(payment.amount) ?? 0
  const refunded = Math.max(0, cents(payment.refundedAmount) ?? 0, completed.reduce((sum, refund) => sum + Math.max(0, cents(refund.amount) ?? 0), 0))
  const remaining = Math.max(0, amount - refunded)
  const peers = rows(state.payments).filter((record) => record.orderId === payment.orderId)
  const allLines = rows(order?.lineItems)
  const orderLines = allLines.filter((line) => {
    if (Array.isArray(payment.orderLineIds)) return payment.orderLineIds.includes(line.id)
    if (line.paymentId != null) return line.paymentId === payment.id
    return peers.length === 1
  })
  const lines = orderLines.flatMap((line) => {
    const quantity = whole(line.quantity)
    const gross = cents(line.totalAmount) ?? ((cents(line.unitPrice) ?? -1) * quantity)
    if (!line.id || !quantity || gross < 0 || !Number.isSafeInteger(gross)) return []
    const refunded = completed.reduce((total, refund) => total + rows(refund.lineItems)
      .filter((record) => record.orderLineId === line.id)
      .reduce((sum, record) => sum + (whole(record.quantity) ?? 0), 0), 0)
    const used = Math.min(quantity, refunded)
    return [{ line, available: quantity - used, quantity, gross, used }]
  })
  const eligible = Boolean(payment.id && payment.status === 'paid' && remaining > 0)
  return { order, history, amount, refunded, remaining, lines, eligible, completeAttribution: lines.length === orderLines.length }
}

function lineAmount(entry, quantity) {
  const unit = Math.floor(entry.gross / entry.quantity)
  const remainder = entry.gross % entry.quantity
  return unit * quantity + Math.min(quantity, Math.max(0, remainder - entry.used))
}
function buildLine(entry, quantity) {
  const { line } = entry
  return {
    orderLineId: line.id, ...(line.itemId ? { itemId: line.itemId } : {}), ...(line.variationId ? { variationId: line.variationId } : {}),
    name: line.name || 'Order item', quantity, amount: lineAmount(entry, quantity) / 100,
  }
}

export function refundQuote(state, paymentId, draft) {
  const payment = find(state.payments, paymentId)
  if (!payment) return { error: 'This payment is unavailable.' }
  const context = refundContext(state, payment)
  if (!context.eligible) return { error: 'This payment has no refundable balance.' }
  const reason = draft.reason.trim()
  if (!reason) return { error: 'Enter a refund reason.' }
  let amount = context.remaining
  let lineItems = []
  if (draft.mode === 'custom') {
    amount = inputCents(draft.amount)
  } else if (draft.mode === 'itemized') {
    const eligibleLines = new Map(context.lines.map((entry) => [entry.line.id, entry]))
    for (const [id, value] of Object.entries(draft.quantities)) {
      const quantity = value === '' ? 0 : whole(value)
      const entry = eligibleLines.get(id)
      if (quantity === 0) continue
      if (!entry || quantity === null || quantity > entry.available) return { error: 'Choose quantities within the remaining sold quantities.' }
      lineItems.push(buildLine(entry, quantity))
    }
    amount = lineItems.reduce((sum, line) => sum + cents(line.amount), 0)
  } else {
    const all = context.lines.filter((entry) => entry.available > 0).map((entry) => buildLine(entry, entry.available))
    if (context.completeAttribution && all.reduce((sum, line) => sum + cents(line.amount), 0) === amount) lineItems = all
  }
  if (amount === null || amount <= 0) return { error: draft.mode === 'itemized' ? 'Choose items with a positive refund total.' : 'Enter a positive amount with up to two decimals.' }
  if (amount > context.remaining) return { error: 'The refund exceeds the remaining refundable amount.' }
  const currency = payment.currency || state.account?.currency || 'USD'
  const locationId = payment.locationId ?? context.order?.locationId ?? null
  return { payment, context, quote: {
    amount, lineItems, reason, mode: draft.mode, method: payment.method ?? null, cardLast4: payment.cardLast4 ?? null,
    refunded: context.refunded, orderId: payment.orderId ?? null, locationId, currency,
  } }
}

export function issueRefund(state, paymentId, draft, reviewed) {
  const result = refundQuote(state, paymentId, draft)
  if (result.error) return result
  const { payment, context, quote } = result
  if (JSON.stringify(quote) !== JSON.stringify(reviewed)) return { error: 'This payment changed. Review the current refund details.' }
  const meta = metadata(state)
  const refund = {
    id: newId('ref'), orderId: quote.orderId, paymentId,
    locationId: quote.locationId, mode: quote.mode, status: 'completed',
    amount: quote.amount / 100, currency: quote.currency,
    reason: quote.reason, lineItems: quote.lineItems, actorId: meta.actorId, createdAt: meta.updatedAt,
  }
  const total = context.refunded + quote.amount
  const updated = { ...payment, refundedAmount: total / 100, refundStatus: total === context.amount ? 'full' : 'partial', ...meta }
  return { id: refund.id, message: 'Refund issued.', state: { ...state, refunds: [...rows(state.refunds), refund], payments: replace(state.payments, updated) } }
}


