export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const find = (entries, id) => list(entries).find(entry => entry.id === id)
export const money = (value) => usdFormat.format(Number(value) || 0)
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const date = (value) => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Date unavailable'
export const today = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function shiftDay(day, days) {
  const value = new Date(day + 'T12:00:00Z')
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export const validDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
export const matches = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const cents = (value) => Math.round((Number(value) || 0) * 100)
export const lineCents = (item) => cents(item.unitPrice) * (Number(item.quantity) || 0)
export const merchandise = (items) => list(items).reduce((sum, item) => sum + lineCents(item), 0) / 100
export const quantityOk = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0
export const orderLabel = (order) => order?.orderNumber || order?.id || 'Order'
export const isDateEligible = (order) => {
  if (order?.status !== 'delivered') return false
  if (!order.createdAt) return true
  const purchased = order.createdAt.slice(0, 10)
  return validDay(purchased) && purchased >= shiftDay(today(), -365) && purchased <= today()
}

export function remaining(order, priorReturns) {
  const returned = new Map()
  for (const entry of list(priorReturns)) {
    if (entry.orderId !== order.id) continue
    for (const item of list(entry.items)) {
      returned.set(item.orderItemId, (returned.get(item.orderItemId) || 0) + Math.max(0, Number(item.quantity) || 0))
    }
  }
  return list(order.items).map(item => ({
    item,
    returned: returned.get(item.id) || 0,
    available: isDateEligible(order) && item.returnable !== false && item.id
      ? Math.max(0, (Number(item.quantity) || 0) - (returned.get(item.id) || 0))
      : 0,
  }))
}

export const reasons = {
  wrong_size: 'Wrong size', damaged: 'Damaged', incorrect_item: 'Incorrect item',
  no_longer_needed: 'No longer needed', other: 'Other',
}
export const refundMethods = { original_payment: 'Original payment method', account_credit: 'Chewy account credit' }

export function calculateReturn(order, returns, choices, refundMethod) {
  const previous = list(returns).filter(entry => entry.orderId === order.id)
  const lines = remaining(order, previous)
  const selected = lines.filter(({ item }) => Object.hasOwn(choices, item.id))
  if (!selected.length || selected.length !== Object.keys(choices).length) throw Error('Select at least one eligible item.')
  if (!Object.hasOwn(refundMethods, refundMethod)) throw Error('Choose a refund destination.')
  const items = selected.map(({ item, available }) => {
    const { quantity, reason } = choices[item.id]
    if (!quantityOk(quantity) || Number(quantity) > available) throw Error('Enter an available whole-number quantity for each selected item.')
    if (!Object.hasOwn(reasons, reason)) throw Error('Choose a reason for each selected item.')
    return {
      orderItemId: item.id, productId: item.productId, name: item.name || 'Item',
      quantity: Number(quantity), reason, unitPrice: cents(item.unitPrice) / 100,
      amount: (cents(item.unitPrice) * Number(quantity)) / 100,
    }
  })
  const completesOrder = lines.every(({ item, returned }) => returned + (Number(choices[item.id]?.quantity) || 0) >= Number(item.quantity))
  const itemsCents = items.reduce((sum, item) => sum + cents(item.amount), 0)
  const priorItems = previous.reduce((sum, entry) => sum + list(entry.items).reduce((n, item) => n + cents(item.amount ?? lineCents(item) / 100), 0), 0)
  const priorTax = previous.reduce((sum, entry) => sum + cents(entry.taxRefund), 0)
  const priorShipping = previous.reduce((sum, entry) => sum + cents(entry.shippingRefund), 0)
  const subtotal = cents(order.subtotal ?? merchandise(order.items))
  const tax = cents(order.tax)
  const returnedMerchandise = Math.min(subtotal, priorItems + itemsCents)
  const proportionalTax = subtotal > 0 ? Math.round(tax * returnedMerchandise / subtotal) : 0
  const taxTarget = completesOrder ? tax : proportionalTax
  const taxRefund = Math.max(0, taxTarget - priorTax)
  const shippingRefund = completesOrder ? Math.max(0, cents(order.shipping) - priorShipping) : 0
  return {
    items, refundMethod, itemsAmount: itemsCents / 100, shippingRefund: shippingRefund / 100,
    taxRefund: taxRefund / 100, refundAmount: (itemsCents + shippingRefund + taxRefund) / 100,
  }
}

export function newOrder(source, id, metadata, linkage) {
  const items = list(source.items).map((item, index) => ({
    ...item, id: id + '-item-' + String(index + 1).padStart(2, '0'), lineTotal: lineCents(item) / 100,
  }))
  if (!items.length || items.some(item => !quantityOk(item.quantity))) throw Error('This order has no valid items to submit.')
  const subtotal = merchandise(items)
  const shipping = cents(source.shipping) / 100
  const tax = cents(source.tax) / 100
  return {
    id, orderNumber: 'CHE-' + id.slice(4).toUpperCase(), status: 'processing',
    ...metadata, ...linkage, items, address: source.address, paymentLabel: source.paymentLabel,
    subtotal, shipping, tax, total: (cents(subtotal) + cents(shipping) + cents(tax)) / 100,
  }
}

export const eventId = (prefix) => {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return prefix + '-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

