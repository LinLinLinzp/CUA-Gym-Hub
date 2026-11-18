export const array = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const find = (value, id) => id == null ? undefined : array(value).find(item => item.id === id)
export const cents = value => Math.round((Number(value) || 0) * 100)
export const amount = value => value / 100
export const time = value => value ? new Date(value).getTime() : NaN
export const signedIn = state => state.profile?.id || 'user-maya'
export const allowedModes = ['pickup', 'shipping']
export const modeNames = { pickup: 'Pickup', shipping: 'Shipping', delivery: 'Delivery' }
export const hours = 3600000
export const day = 24 * hours
export const activeLines = (cart, mode) => array(cart?.lines).filter(line => line.status === 'active' && (!mode || line.fulfillmentMode === mode))
export const orderFor = (state, id) => {
  const order = find(state.orders, id)
  return order && (!order.ownerId || order.ownerId === signedIn(state)) ? order : undefined
}
export const heldReservation = state => {
  const reservation = find(state.pickupReservations, state.cart?.pickupReservationId)
  return reservation?.status === 'held' ? reservation : undefined
}
export const validHold = (state, now = new Date()) => {
  const hold = heldReservation(state)
  const slot = find(state.pickupSlots, hold?.slotId)
  return hold && time(hold.expiresAt) > +now && time(slot?.startAt) > +now && slot.storeId === hold.storeId ? hold : undefined
}
export const preferredStore = state => find(state.stores, state.profile?.preferredStoreId) || array(state.stores).find(store => store.pickupEnabled)
export const cartStore = (state, now) => find(state.stores, validHold(state, now)?.storeId) || preferredStore(state)
export const productTitle = product => product?.title || 'Product details unavailable'
export const snapshot = product => Object.fromEntries(['title', 'variant', 'seller', 'imagePath'].filter(key => product?.[key] !== undefined).map(key => [key, product[key]]))

export function actionContext(state, now = new Date()) {
  const actorId = signedIn(state)
  const createdAt = now.toISOString()
  const id = prefix => `${prefix}-${globalThis.crypto.randomUUID()}`
  return {
    now, id, actorId, createdAt,
    touch: { updatedBy: actorId, updatedAt: createdAt },
    created: { actorId, createdAt, updatedBy: actorId, updatedAt: createdAt },
    event: (type, fields = {}) => ({ id: id('event'), type, actorId, createdAt, ...fields }),
  }
}

export function quantityLimit(product, mode, store) {
  if (!product || !Number.isFinite(product.price) || product.price < 0) return 0
  const stock = mode === 'pickup' && store?.pickupEnabled ? product.pickupStockByStore?.[store.id]
    : mode === 'shipping' ? product.shippingStock : 0
  const limit = Number.isInteger(product.maxOrderQty) ? product.maxOrderQty : Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.min(limit, Number.isInteger(stock) ? stock : 0))
}

export const priceLine = (line, quantity) => ({
  ...line,
  quantity,
  lineSubtotal: amount(cents(line.unitPrice) * quantity),
  lineTax: amount(Math.round(cents(line.unitPrice) * quantity * (Number(line.taxRate) || 0))),
})

export const minimumFee = subtotal => subtotal < 3500 ? 699 : 0

export function totalsFor(lines, slotFee = 0) {
  const subtotal = lines.reduce((sum, line) => sum + cents(line.lineSubtotal), 0)
  const tax = lines.reduce((sum, line) => sum + cents(line.lineTax), 0)
  const fee = minimumFee(subtotal) + cents(slotFee)
  return { subtotal: amount(subtotal), tax: amount(tax), fulfillmentFee: amount(fee), total: amount(subtotal + tax + fee), currency: 'USD' }
}

export function cartTotals(state, mode, now) {
  const products = new Map(array(state.catalog).map(product => [product.id, product]))
  const lines = activeLines(state.cart, mode).map(line => {
    const product = products.get(line.productId)
    return priceLine({ unitPrice: product?.price, taxRate: product?.taxRate }, Number(line.quantity) || 0)
  })
  return totalsFor(lines, mode === 'pickup' ? validHold(state, now)?.fee : 0)
}
