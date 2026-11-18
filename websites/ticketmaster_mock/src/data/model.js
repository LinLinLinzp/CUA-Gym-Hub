export const rows = (world, key) => Array.isArray(world[key]) ? world[key].filter(Boolean) : []
export const find = (world, key, id) => id ? rows(world, key).find((row) => row.id === id) : undefined
export const seatsFor = (world, orderId) => orderId ? rows(world, 'tickets').filter((ticket) => ticket.orderId === orderId) : []
export const free = (ticket) => ticket.status === 'available' && !ticket.holdId
export const cents = (value) => Number.isSafeInteger(value) && value >= 0

export const reasons = {
  event_changed: 'The event changed',
  cant_attend: 'I can no longer attend',
  other: 'Other reason',
  event_canceled: 'Event canceled',
}

export function issueFor(order, event, seats, kind, world) {
  if (kind === 'refund') {
    if (rows(world, 'refunds').some((record) => record.orderId === order.id)) {
      if (order.refundPolicy === 'automatic') return 'The organizer is handling refunds automatically. See Refunds for the status.'
      if (order.status === 'refunded') return 'This order has already been refunded.'
      return 'A refund has already been requested for this order.'
    }
    if (order.status === 'refund_requested') return 'A refund has already been requested for this order.'
    if (order.status === 'refunded') return 'This order has already been refunded.'
    if (order.refundPolicy === 'automatic') return 'The organizer is handling refunds automatically.'
    if (order.refundPolicy !== 'requestable' || order.status !== 'confirmed' || order.source !== 'purchase') {
      return 'The organizer hasn’t made this order eligible for a refund request.'
    }
    if (order.refundDeadline && !(Date.parse(order.refundDeadline) > new Date().getTime())) {
      return 'The organizer’s refund request window has closed.'
    }
    const payment = find(world, 'paymentMethods', order.paymentMethodId)
    if (!payment?.label || !payment.last4 || !Number.isSafeInteger(order.quantity) || order.quantity !== seats.length || !seats.length ||
      seats.some((seat) => !seat.id || ![seat.faceValueCents, seat.feeCents, seat.taxCents].every(cents)) ||
      ![order.subtotalCents, order.feeCents, order.taxCents, order.totalCents].every(cents)) {
      return 'The original payment or itemized receipt is unavailable.'
    }
    const totals = refundTotals(refundItems(seats))
    if (Object.keys(totals).some((key) => !cents(totals[key]) || totals[key] !== order[key])) {
      return 'The original payment or itemized receipt is unavailable.'
    }
    if (!seats.every(free)) return 'All seats must be available before you can request a refund.'
    return ''
  }

  const eligible = kind === 'transfer' ? order.transferEligible : order.resaleEligible
  if (order.status !== 'confirmed' || eligible !== true || !['scheduled', 'rescheduled'].includes(event?.status) ||
    !(Date.parse(event?.startsAt) > new Date().getTime())) {
    return kind === 'transfer' ? 'Ticket transfer is unavailable for this order.' : 'Resale is unavailable for this order.'
  }
  if (kind === 'listing' && !rows(world, 'payoutMethods').some((method) => method.id && method.label && method.last4)) {
    return 'A payout method is required to list tickets.'
  }
  return seats.some((ticket) => ticket.id && free(ticket)) ? '' : 'There are no available seats for this action.'
}

export function refundItems(seats) {
  return seats.map((seat) => ({
    ticketId: seat.id,
    quantity: 1,
    subtotalCents: seat.faceValueCents,
    feeCents: seat.feeCents,
    taxCents: seat.taxCents,
    totalCents: seat.faceValueCents + seat.feeCents + seat.taxCents,
  }))
}

export function refundTotals(items) {
  const totals = { subtotalCents: 0, feeCents: 0, taxCents: 0, totalCents: 0 }
  for (const item of items) for (const key of Object.keys(totals)) totals[key] += item[key]
  return totals
}

export function priceInCents(input, quantity) {
  const value = String(input ?? '').trim()
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value)) return null
  const [dollars, fraction = ''] = value.split('.')
  const price = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'))
  return price > 0 && cents(price) && Number.isSafeInteger(quantity) && quantity > 0 && cents(price * quantity) ? price : null
}

export const heldBy = (ticket, record, status) => !!ticket && !!record.id && ticket.orderId === record.orderId &&
  ticket.status === status && ticket.holdId === record.id && Array.isArray(record.ticketIds) && record.ticketIds.includes(ticket.id)

export function canAccept(world, transfer) {
  const email = world.account?.email?.trim().toLowerCase()
  const order = find(world, 'orders', transfer.orderId)
  const ids = transfer.ticketIds
  return transfer.direction === 'incoming' && transfer.status === 'pending' && !!email &&
    transfer.recipientEmail?.trim().toLowerCase() === email && order?.source === 'transfer' &&
    order.status === 'confirmed' && Array.isArray(ids) && ids.length > 0 &&
    ids.length === transfer.quantity && new Set(ids).size === ids.length &&
    ids.every((id) => heldBy(find(world, 'tickets', id), transfer, 'transfer_pending'))
}
