import { byId, dateValue, list } from '../utils/read.js'
import { actor, audit, nowIso } from './cart.js'
import { positiveInt, validCents } from './inventory.js'

export function offerWindow(offer, now = new Date()) {
  const opens = dateValue(offer.startsAt)
  const closes = dateValue(offer.expiresAt)
  if (!Number.isFinite(opens) || !Number.isFinite(closes) || closes <= opens) return 'unavailable'
  if (now.getTime() >= closes) return 'expired'
  if (now.getTime() < opens) return 'upcoming'
  return 'open'
}

export function validOffer(offer) {
  if (!offer.id || !['deal', 'coupon', 'bonus'].includes(offer.kind) || !['item', 'category', 'order'].includes(offer.scope) ||
      !Array.isArray(offer.fulfillment) || !offer.fulfillment.length ||
      !offer.fulfillment.every((method) => ['shipping', 'pickup'].includes(method)) ||
      !validCents(offer.minSpendCents) || !positiveInt(offer.value) ||
      (offer.maxUnits != null && !positiveInt(offer.maxUnits))) return false
  if (offer.scope === 'item' && !list(offer.productIds).length) return false
  if (offer.scope === 'category' && !list(offer.categoryIds).length) return false
  if (offer.kind === 'bonus') return offer.valueType === 'reward'
  if (offer.kind === 'coupon' && offer.scope !== 'item') return false
  return offer.valueType === 'fixed' || (offer.valueType === 'percent' && offer.value <= 100)
}

export function matchesOffer(offer, product, fulfillment) {
  if (!product || (fulfillment && !list(offer.fulfillment).includes(fulfillment))) return false
  if (offer.scope === 'order') return true
  if (offer.scope === 'category') return list(offer.categoryIds).includes(product.categoryId)
  return offer.scope === 'item' && list(offer.productIds).includes(product.id)
}

export function memberOfferState(state, offerId) {
  return list(state.circleOfferStates).find((row) => row.offerId === offerId && row.actorId === actor(state))
}

const timestamp = { saved: 'savedAt', active: 'activatedAt', removed: 'removedAt', redeemed: 'redeemedAt' }

export function changeOfferState(state, { offerId, status }) {
  const current = memberOfferState(state, offerId)
  const offer = byId(state.offers, offerId)
  const now = nowIso()
  if (!actor(state) || !state.guest.circleMember) return { error: 'Target Circle membership is required.' }
  if (!offer || !['coupon', 'bonus'].includes(offer.kind) || current?.status === 'redeemed') return { error: 'This offer is unavailable.' }
  if (current?.status === status) return {}
  if (status === 'removed' && !['active', 'saved'].includes(current?.status)) return { error: 'This offer isn’t saved or active.' }
  if (status === 'saved' && current?.status === 'active') return { error: 'This offer is already active.' }
  if (status !== 'removed' && (!['saved', 'active'].includes(status) || !validOffer(offer) || offerWindow(offer, new Date(now)) !== 'open')) {
    return { error: 'This offer is unavailable.' }
  }
  const row = { ...(current || audit(state, 'circle-state', now)), offerId, status, updatedAt: now, [timestamp[status]]: now }
  const rows = list(state.circleOfferStates)
  return { state: { ...state, circleOfferStates: current ? rows.map((item) => item === current ? row : item) : [...rows, row] }, row }
}

export function redeemManualOffers(state, offerIds, now) {
  return list(state.circleOfferStates).map((row) => row.actorId === actor(state) && row.status === 'active' && offerIds.includes(row.offerId)
    ? { ...row, status: 'redeemed', updatedAt: now, redeemedAt: now } : row)
}
