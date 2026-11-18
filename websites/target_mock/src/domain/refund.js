import { positiveInt, validCents } from './inventory.js'

export function canRefund(item) {
  return positiveInt(item.quantity) && validCents(item.merchandiseCents) && validCents(item.discountCents) &&
    item.discountCents <= item.merchandiseCents && validCents(item.taxCents)
}

function share(cents, quantity, indexes) {
  const base = Math.floor(cents / quantity)
  const remainder = cents % quantity
  return indexes.reduce((total, index) => total + base + Number(index <= remainder), 0)
}

export function refundLine(item, indexes = null) {
  const net = item.merchandiseCents - item.discountCents
  const merchandiseCents = indexes ? share(net, item.quantity, indexes) : net
  const taxCents = indexes ? share(item.taxCents, item.quantity, indexes) : item.taxCents
  return {
    orderLineId: item.id, productId: item.productId, quantity: indexes ? indexes.length : item.quantity,
    merchandiseCents, taxCents, amountCents: merchandiseCents + taxCents,
  }
}
