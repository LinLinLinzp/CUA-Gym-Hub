import { byId, list } from '../utils/read.js'
import { matchesOffer, memberOfferState, offerWindow, validOffer } from './circle.js'
import { lineIssue, lineItem, positiveInt, shippingMinimum, shippingSubtotal, validCents } from './inventory.js'

const net = (entry) => entry.merchandiseCents - entry.discountCents
const ascendingId = (a, b) => a.id < b.id ? -1 : Number(a.id > b.id)
const byValue = (a, b) => b.amount - a.amount || ascendingId(a.offer, b.offer)

function addDiscount(entry, offer, amountCents) {
  if (!amountCents) return
  entry.discountCents += amountCents
  entry.offerDiscounts.push({ offerId: offer.id, amountCents })
}

function applyLineDiscounts(lines, offers, stage) {
  const remainingUnits = new Map(offers.map((offer) => [offer.id, offer.maxUnits ?? Infinity]))
  for (const entry of lines) {
    const candidates = offers.filter((offer) => stage(offer) && matchesOffer(offer, entry.product, entry.line.fulfillment))
      .map((offer) => {
        const units = Math.min(remainingUnits.get(offer.id), entry.quantity)
        const amount = offer.valueType === 'fixed' ? units * offer.value :
          Math.round(net(entry) * (units / entry.quantity) * offer.value / 100)
        return { offer, units, amount: Math.min(amount, net(entry)) }
      }).filter((candidate) => candidate.amount > 0).sort(byValue)
    const best = candidates[0]
    if (!best) continue
    addDiscount(entry, best.offer, best.amount)
    remainingUnits.set(best.offer.id, remainingUnits.get(best.offer.id) - best.units)
  }
}

function eligibleLines(lines, offer) {
  const eligible = lines.filter((entry) => matchesOffer(offer, entry.product, entry.line.fulfillment))
  const subtotal = eligible.reduce((sum, entry) => sum + entry.merchandiseCents, 0)
  return subtotal >= offer.minSpendCents ? eligible : []
}

function applyOrderDeal(lines, offers) {
  const best = offers.filter((offer) => offer.kind === 'deal' && offer.scope === 'order').map((offer) => {
    const eligible = eligibleLines(lines, offer).filter((entry) => net(entry) > 0)
    const subtotal = eligible.reduce((sum, entry) => sum + net(entry), 0)
    const amount = offer.valueType === 'fixed' ? offer.value : Math.round(subtotal * offer.value / 100)
    return { offer, eligible, subtotal, amount: Math.min(amount, subtotal) }
  }).filter((item) => item.amount > 0).sort(byValue)[0]
  if (!best) return
  const shares = best.eligible.map((entry) => Math.floor(best.amount * net(entry) / best.subtotal))
  let remainder = best.amount - shares.reduce((sum, part) => sum + part, 0)
  best.eligible.forEach((entry, index) => {
    const extra = Number(remainder > 0 && shares[index] < net(entry))
    remainder -= extra
    addDiscount(entry, best.offer, shares[index] + extra)
  })
}

export function priceCart(state, now = new Date()) {
  const items = list(state.cart?.items)
  const lines = items.map((line) => {
    const { product, variant } = lineItem(state, line)
    const unitPriceCents = validCents(variant?.priceCents) ? variant.priceCents : validCents(line.unitPriceCents) ? line.unitPriceCents : 0
    const quantity = positiveInt(line.quantity) ? line.quantity : 0
    return {
      line, product, variant, unitPriceCents, quantity, merchandiseCents: quantity * unitPriceCents,
      discountCents: 0, offerDiscounts: [], issue: lineIssue(state, line, items, now),
    }
  })
  const eligible = lines.filter((entry) => !entry.issue).sort((a, b) => ascendingId(a.line, b.line))
  const offers = state.guest?.id && state.guest.circleMember ? list(state.offers).filter((offer) =>
    validOffer(offer) && offerWindow(offer, now) === 'open' &&
    (offer.kind === 'deal' || memberOfferState(state, offer.id)?.status === 'active') &&
    eligibleLines(eligible, offer).length > 0
  ) : []
  applyLineDiscounts(eligible, offers, (offer) => offer.kind === 'deal' && offer.scope === 'item')
  applyLineDiscounts(eligible, offers, (offer) => offer.kind === 'deal' && offer.scope === 'category')
  applyLineDiscounts(eligible, offers, (offer) => offer.kind === 'coupon')
  applyOrderDeal(eligible, offers)

  const reward = offers.filter((offer) => offer.kind === 'bonus')
    .map((offer) => ({ offer, entries: eligibleLines(eligible, offer), amount: offer.value }))
    .sort(byValue)[0] || null
  for (const entry of lines) {
    const taxRate = entry.line.fulfillment === 'pickup' ? byId(state.stores, entry.line.storeId)?.taxBasisPoints : state.guest?.shippingTaxBasisPoints
    entry.taxCents = Math.round(net(entry) * (validCents(taxRate) ? taxRate : 0) / 10000)
    entry.paidCents = net(entry) + entry.taxCents
  }
  const sum = (key) => lines.reduce((total, entry) => total + entry[key], 0)
  const subtotalCents = sum('merchandiseCents')
  const discountCents = sum('discountCents')
  const taxCents = sum('taxCents')
  const shippingCents = lines.some((entry) => entry.line.fulfillment === 'shipping') &&
    shippingSubtotal(state, items) < shippingMinimum ? 599 : 0
  return {
    lines, subtotalCents, discountCents, taxCents, shippingCents, reward,
    totalCents: subtotalCents - discountCents + taxCents + shippingCents,
  }
}
