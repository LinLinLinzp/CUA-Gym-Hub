import { reasonCodes } from './data/seed.js'

import { asArray, cents, list } from './records.js'

const hasId = (value) => typeof value === 'string' && Boolean(value.trim())
const hasQuantity = (value) => Number.isSafeInteger(value) && value > 0
const hasCurrency = (value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value)
const find = (value, id) => list(value).find((record) => record.id === id)
const fail = (error) => ({ error })

function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return prefix + '-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function belongsToAccount(state, order) {
  return hasId(state.account?.id) && (!order.accountId || order.accountId === state.account.id)
}

export function canCancel(state, order, now = new Date()) {
  return Boolean(order && belongsToAccount(state, order) && hasId(order.id)
    && ['placed', 'in_progress'].includes(order.status)
    && Date.parse(order.cancelUntil) > now.getTime()
    && Date.parse(order.placedAt) <= now.getTime()
    && !order.cancelledAt && !order.deliveredAt
    && hasCurrency(order.currency) && cents(order.total) !== null
    && list(order.items).length > 0
    && list(order.items).every((line) => hasId(line.id) && hasQuantity(line.quantity))
    && !list(order.shipments).some((shipment) => !['preparing', 'pending'].includes(shipment.status)
      || shipment.trackingNumber || list(shipment.events).length)
    && !list(state.pointsTransactions).some((entry) => entry.orderId === order.id
      && (entry.type === 'earn' || entry.pointsDelta > 0)))
}

export function cancelOrder(state, orderId) {
  const now = new Date()
  const order = find(state.orders, orderId)
  if (!canCancel(state, order, now)) return fail('This order can no longer be cancelled.')
  const createdAt = now.toISOString()
  const event = {
    id: newId('oe'), orderId, type: 'cancelled', status: 'cancelled',
    amount: cents(order.total) / 100, currency: order.currency,
    items: list(order.items).map((line) => ({ orderLineId: line.id, quantity: line.quantity })),
    actorId: state.account.id, createdAt,
  }
  return { state: {
    ...state,
    orders: asArray(state.orders).map((entry) => entry === order ? { ...order, status: 'cancelled', cancelledAt: createdAt } : entry),
    orderEvents: [...asArray(state.orderEvents), event],
  } }
}

export function rewardBlock(state, reward) {
  const member = state.beautyInsider
  if (!reward || !hasId(reward.id) || !hasId(state.account?.id)
    || member?.accountId && member.accountId !== state.account.id
    || !hasQuantity(reward.pointsCost) || !Number.isSafeInteger(reward.stock)
    || typeof reward.requiresPurchase !== 'boolean' || !Number.isSafeInteger(member?.pointsBalance)) {
    return 'Details unavailable'
  }
  if (reward.stock <= 0) return 'Sold out'
  if (reward.requiresPurchase) return 'Purchase required'
  if (list(reward.eligibleTiers).length && !reward.eligibleTiers.includes(member.tier)) return 'Tier requirement'
  if (member.pointsBalance < reward.pointsCost) return 'Not enough points'
  return null
}

export function redeemReward(state, rewardId) {
  const reward = find(state.rewards, rewardId)
  const block = rewardBlock(state, reward)
  if (block) return fail(block + '.')
  const createdAt = new Date().toISOString()
  const accountId = state.account.id
  const balanceAfter = state.beautyInsider.pointsBalance - reward.pointsCost
  const redemption = {
    id: newId('red'), accountId, rewardId, rewardName: reward.name || rewardId,
    pointsSpent: reward.pointsCost, quantity: 1, status: 'redeemed',
    pointsTransactionId: newId('pt'), actorId: accountId, createdAt,
  }
  const transaction = {
    id: redemption.pointsTransactionId, accountId, type: 'redeem', pointsDelta: -redemption.pointsSpent,
    balanceAfter, description: redemption.rewardName, actorId: accountId, createdAt, redemptionId: redemption.id,
  }
  return { state: {
    ...state,
    beautyInsider: { ...state.beautyInsider, pointsBalance: balanceAfter },
    rewards: asArray(state.rewards).map((entry) => entry === reward ? { ...reward, stock: reward.stock - 1 } : entry),
    redemptions: [...asArray(state.redemptions), redemption],
    pointsTransactions: [...asArray(state.pointsTransactions), transaction],
  }, record: redemption }
}

export function returnableLines(state, order, now = new Date()) {
  if (!order || order.status !== 'delivered' || !hasId(order.id)
    || !belongsToAccount(state, order) || !hasCurrency(order.currency)) return []
  const usedByLine = new Map()
  for (const request of list(state.returns)) {
    if (request.orderId !== order.id || !['submitted', 'in_transit', 'completed'].includes(request.status)) continue
    for (const item of list(request.items)) {
      if (hasQuantity(item.quantity)) usedByLine.set(item.orderLineId, (usedByLine.get(item.orderLineId) ?? 0) + item.quantity)
    }
  }
  return list(order.items).flatMap((line) => {
    const deadline = line.returnEligibleUntil != null
      ? Date.parse(line.returnEligibleUntil)
      : Date.parse(order.placedAt) + 30 * 86_400_000
    if (!hasId(line.id) || !hasQuantity(line.quantity) || line.returnable !== true
      || !(deadline >= now.getTime()) || cents(line.refundableUnitAmount) === null) return []
    const remaining = line.quantity - (usedByLine.get(line.id) ?? 0)
    return remaining > 0 ? [{ line, remaining }] : []
  })
}

function estimateFrom(lines, selected) {
  let totalCents = 0
  const items = []
  for (const [id, selection] of Object.entries(selected)) {
    const available = lines.find(({ line }) => line.id === id)
    if (!available || !hasQuantity(selection.quantity) || selection.quantity > available.remaining) {
      return fail('An item or quantity is no longer available to return.')
    }
    if (!Object.hasOwn(reasonCodes, selection.reasonCode)) return fail('Choose a reason for each selected item.')
    const amount = cents(available.line.refundableUnitAmount) * selection.quantity
    items.push({ orderLineId: id, quantity: selection.quantity, reasonCode: selection.reasonCode, estimatedRefund: amount / 100 })
    totalCents += amount
  }
  if (!items.length) return fail('Select at least one item to return.')
  return { items, estimatedRefund: totalCents / 100 }
}

export function estimateReturn(state, orderId, selected, now = new Date()) {
  return estimateFrom(returnableLines(state, find(state.orders, orderId), now), selected)
}

export function submitReturn(state, orderId, selected) {
  const now = new Date()
  const estimate = estimateReturn(state, orderId, selected, now)
  if (estimate.error) return estimate
  const order = find(state.orders, orderId)
  const id = newId('ret')
  const createdAt = now.toISOString()
  const record = {
    id, returnNumber: 'RT-' + id.slice(4, 16).toUpperCase(), orderId, accountId: state.account.id,
    status: 'submitted', method: 'mail', refundMethod: 'original_payment',
    ...estimate, currency: order.currency, createdAt, actorId: state.account.id,
    timeline: [{ status: 'submitted', at: createdAt }],
  }
  return { state: { ...state, returns: [...asArray(state.returns), record] }, record }
}
