import { byId, dateValue, list } from '../utils/read.js'

export const positiveInt = (value) => Number.isSafeInteger(value) && value > 0
export const validCents = (value) => Number.isSafeInteger(value) && value >= 0
export const lineItem = (state, line) => {
  const product = byId(state.products, line.productId)
  return { product, variant: byId(product?.variants, line.variantId) }
}
export const pickupStatus = (pickup, now = new Date()) =>
  pickup.status === 'ready' && dateValue(pickup.holdUntil) <= now.getTime() ? 'expired' : pickup.status

export function pickupStock(state, variant, storeId, now = new Date()) {
  const store = byId(state.stores, storeId)
  const onHand = variant?.pickupStockByStoreId?.[storeId]
  if (!store?.pickupEnabled || !positiveInt(onHand)) return 0
  let reserved = 0
  for (const pickup of list(state.pickupOrders)) {
    if (pickup.storeId !== storeId || !['preparing', 'ready'].includes(pickupStatus(pickup, now))) continue
    const order = byId(state.orders, pickup.orderId)
    for (const item of list(order?.items)) {
      if (item.variantId === variant.id && item.status === 'placed' && list(pickup.orderLineIds).includes(item.id)) {
        reserved += positiveInt(item.quantity) ? item.quantity : 0
      }
    }
  }
  return Math.max(0, onHand - reserved)
}

export const shippingMinimum = 3500
export function shippingSubtotal(state, items) {
  return list(items).reduce((subtotal, line) => {
    const { variant } = lineItem(state, line)
    if (line.fulfillment !== 'shipping' || !variant?.shippingAvailable || !validCents(variant.priceCents) || !positiveInt(line.quantity)) return subtotal
    return subtotal + variant.priceCents * line.quantity
  }, 0)
}

export function lineIssue(state, line, items, now = new Date()) {
  const { product, variant } = lineItem(state, line)
  if (!product || !variant || !validCents(variant.priceCents)) return 'This item or option is no longer available.'
  if (!positiveInt(line.quantity)) return 'Choose a valid quantity.'
  if (line.fulfillment === 'shipping') {
    if (!variant.shippingAvailable) return 'Shipping is unavailable for this item.'
    if (variant.shippingRequiresMinimum && shippingSubtotal(state, items) < shippingMinimum) return 'This item ships with a $35 shipping merchandise subtotal.'
    return ''
  }
  if (line.fulfillment !== 'pickup') return 'Choose a fulfillment method.'
  const store = byId(state.stores, line.storeId)
  if (!store) return 'Choose a store for Order Pickup.'
  if (!store.pickupEnabled) return 'This store does not offer Order Pickup.'
  const requested = list(items).filter((item) =>
    item.productId === line.productId && item.variantId === line.variantId && item.fulfillment === 'pickup' && item.storeId === line.storeId
  ).reduce((total, item) => total + (positiveInt(item.quantity) ? item.quantity : 0), 0)
  const stock = pickupStock(state, variant, line.storeId, now)
  if (!stock) return 'Out of stock at this store.'
  if (requested > stock) return `Only ${stock} available for pickup at this store.`
  return ''
}
