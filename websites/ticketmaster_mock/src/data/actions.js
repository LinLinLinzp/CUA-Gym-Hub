import { canAccept, find, free, heldBy, issueFor, priceInCents, refundItems, refundTotals, rows, seatsFor } from './model.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const refundReasons = ['event_changed', 'cant_attend', 'other']
const unavailable = 'This action is no longer available. Close this dialog and check the current status.'

export function formIssue(world, action) {
  if (action.type === 'transfer') {
    if (!action.name?.trim() || action.name.trim().length > 100) return 'Enter the recipient’s name (up to 100 characters).'
    if (!emailPattern.test(action.email?.trim() ?? '') || action.email.trim().length > 254) return 'Enter a valid email address.'
    if (action.email.trim().toLowerCase() === world.account?.email?.trim().toLowerCase()) return 'Enter an email address other than your own.'
  }
  if (action.type === 'listing' || action.type === 'editListing') {
    if (priceInCents(action.price, action.quantity) === null) return 'Enter a positive USD price with up to two decimal places.'
    if (action.type === 'listing') {
      const method = find(world, 'payoutMethods', action.payout)
      if (!method?.label || !method.last4) return 'Select a payout method.'
    }
  }
  if (action.type === 'refund' && !refundReasons.includes(action.reason)) return 'Select a refund reason.'
  return ''
}

export function applyAction(world, action) {
  const actorId = world.account?.id
  if (!actorId) return unavailable
  const now = new Date().toISOString()
  const audit = { updatedAt: now, updatedBy: actorId }
  const create = (prefix) => ({ id: `${prefix}-${crypto.randomUUID()}`, actorId, createdAt: now })
  const update = (key, id, changes) => rows(world, key).map((row) => row.id === id ? { ...row, ...changes, ...audit } : row)
  const order = find(world, 'orders', action.orderId)
  const orderSeats = seatsFor(world, order?.id)

  if (action.type === 'saveOrder') {
    if (!order || !Number.isSafeInteger(order.quantity) || order.quantity < 1) return 'The order’s ticket quantity is unavailable.'
    const saved = rows(world, 'orderSaves').find((row) => row.orderId === order.id && row.actorId === actorId)
    const status = action.saved ? 'saved' : 'removed'
    if (saved?.status === status || (!saved && !action.saved)) return unavailable
    const quantity = order.quantity
    return {
      ...world,
      orderSaves: saved ? update('orderSaves', saved.id, action.saved ? { status, quantity } : { status }) :
        [...rows(world, 'orderSaves'), { ...create('save'), orderId: order.id, status, quantity }],
    }
  }

  if (['transfer', 'listing', 'refund'].includes(action.type)) {
    if (!order) return unavailable
    const event = find(world, 'events', order.eventId)
    const issue = issueFor(order, event, orderSeats, action.type, world)
    if (issue) return issue
    const ticketIds = action.ticketIds
    const quantity = ticketIds?.length
    if (!Array.isArray(ticketIds) || !quantity || new Set(ticketIds).size !== quantity ||
      !ticketIds.every((id) => orderSeats.some((ticket) => ticket.id === id && free(ticket)))) {
      return 'The selected seats are no longer available.'
    }
    if (action.type === 'refund' && quantity !== orderSeats.length) return 'The seats on this order have changed. Review the order again.'
    const error = formIssue(world, { ...action, quantity })
    if (error) return error
    const base = { orderId: order.id, ticketIds, quantity }

    function applyHold(key, record, status) {
      return {
        ...world,
        [key]: [...rows(world, key), record],
        tickets: rows(world, 'tickets').map((ticket) => ticket.orderId === order.id && ticketIds.includes(ticket.id) ?
          { ...ticket, status, holdId: record.id, ...audit } : ticket),
      }
    }

    if (action.type === 'transfer') {
      return applyHold('transfers', {
        ...create('xfer'), ...base, direction: 'outgoing', status: 'pending',
        recipientName: action.name.trim(), recipientEmail: action.email.trim(),
      }, 'transfer_pending')
    }
    if (action.type === 'listing') {
      const price = priceInCents(action.price, quantity)
      return applyHold('listings', {
        ...create('lst'), ...base, payoutMethodId: action.payout, pricePerTicketCents: price,
        totalCents: price * quantity, currency: 'USD', status: 'active',
      }, 'listed')
    }
    const lineItems = refundItems(orderSeats)
    const totals = refundTotals(lineItems)
    if (action.reviewedTotal !== totals.totalCents || action.reviewedPayment !== order.paymentMethodId ||
      Object.keys(totals).some((key) => totals[key] !== action.reviewedAmounts?.[key])) {
      return 'The refund amount or payment details have changed. Review the order again.'
    }
    return {
      ...applyHold('refunds', {
        ...create('ref'), ...base, reason: action.reason, paymentMethodId: order.paymentMethodId,
        currency: 'USD', lineItems, ...totals, status: 'requested',
      }, 'refund_requested'),
      orders: update('orders', order.id, { status: 'refund_requested' }),
    }
  }

  function closeActivity(key, record, status, heldStatus) {
    return {
      ...world,
      [key]: update(key, record.id, { status }),
      tickets: rows(world, 'tickets').map((ticket) => {
        if (!heldBy(ticket, record, heldStatus)) return ticket
        const { holdId, ...released } = ticket
        return { ...released, status: 'available', ...audit }
      }),
    }
  }

  if (action.type === 'cancelTransfer' || action.type === 'acceptTransfer') {
    const transfer = find(world, 'transfers', action.id)
    if (transfer?.status !== 'pending') return unavailable
    if (action.type === 'acceptTransfer') {
      if (!canAccept(world, transfer)) return unavailable
      return closeActivity('transfers', transfer, 'accepted', 'transfer_pending')
    }
    if (transfer.direction !== 'outgoing' || transfer.actorId !== actorId) return unavailable
    return closeActivity('transfers', transfer, 'canceled', 'transfer_pending')
  }

  if (action.type === 'removeListing' || action.type === 'editListing') {
    const listing = find(world, 'listings', action.id)
    if (listing?.status !== 'active' || listing.actorId !== actorId) return unavailable
    if (action.type === 'removeListing') return closeActivity('listings', listing, 'removed', 'listed')
    if (action.quantity !== listing.quantity) return 'The listing quantity has changed. Review the listing again.'
    const error = formIssue(world, action)
    if (error) return error
    const price = priceInCents(action.price, listing.quantity)
    if (price === listing.pricePerTicketCents) return 'Enter a different price to update this listing.'
    return { ...world, listings: update('listings', listing.id, { pricePerTicketCents: price, totalCents: price * listing.quantity }) }
  }

  return unavailable
}
