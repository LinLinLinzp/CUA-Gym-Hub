export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (value, id) => id ? list(value).find((record) => record.id === id) : undefined
export const ordersNewest = (value) => [...list(value)].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))
export const timestamp = (value) => Date.parse(value) || 0
export const quantityOf = (items) => list(items).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
export const subtotalOf = (items) => list(items).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceCents) || 0), 0)
export const merchantName = (state, record) => record.merchantName || byId(state.merchants, record.merchantId)?.name || 'Restaurant'
export const orderPath = (id) => '/orders/' + encodeURIComponent(id)
export const groupPath = (id) => '/group-orders/' + encodeURIComponent(id)
export const refundPath = (id) => '/refunds/' + encodeURIComponent(id)
export const paymentPath = (id) => '/dashpass/payments/' + encodeURIComponent(id)

export function newId(prefix) {
  return prefix + '-' + crypto.randomUUID()
}

export function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

export function replaceRecord(collection, next) {
  return list(collection).map((record) => record.id === next.id ? next : record)
}

export function validQuantity(value, limit = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= limit
}

export function totalsFor(items, fees = {}) {
  const subtotalCents = subtotalOf(items)
  const deliveryFeeCents = Number(fees.deliveryFeeCents) || 0
  const serviceFeeCents = Number(fees.serviceFeeCents) || 0
  const taxCents = Number(fees.taxCents) || 0
  const tipCents = Number(fees.tipCents) || 0
  return { subtotalCents, deliveryFeeCents, serviceFeeCents, taxCents, tipCents,
    totalCents: subtotalCents + deliveryFeeCents + serviceFeeCents + taxCents + tipCents }
}

export function makeOrder(account, merchant, items, totals, now, relation) {
  ensure(account?.id, 'An account is required to place an order.')
  return {
    id: newId('DD'), merchantId: merchant.id, merchantName: merchant.name,
    createdBy: account.id, createdAt: now, status: 'placed', items, totals,
    deliveryAddress: account.deliveryAddress, paymentLabel: account.paymentLabel, ...relation,
  }
}

export const plans = {
  monthly: { label: 'Monthly', amountCents: 999, months: 1 },
  annual: { label: 'Annual', amountCents: 9600, months: 12 },
}

export function periodEnd(start, months) {
  const end = new Date(start)
  const day = end.getUTCDate()
  end.setUTCDate(1)
  end.setUTCMonth(end.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  end.setUTCDate(Math.min(day, lastDay))
  return end.toISOString()
}
