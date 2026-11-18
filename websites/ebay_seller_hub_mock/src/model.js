export const rows = value => Array.isArray(value) ? value.filter(record => record && typeof record === 'object') : []
export const find = (value, id) => rows(value).find(item => id != null && item.id === id)
export const scalar = value => value != null && value !== '' && Number.isFinite(Number(value))
export const cents = value => Math.round(Number(value) * 100)
export const oneCentValue = value => scalar(value) && Math.abs(Number(value) * 100 - cents(value)) < 0.000001
export const money = value => scalar(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)) : '—'
export const date = (value, time = false) => {
  const parsed = new Date(value || '')
  if (!Number.isFinite(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(parsed)
}
export const match = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const byText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true })
export const byNumber = (a, b) => (Number(a) || 0) - (Number(b) || 0)
export const recordPath = (section, id) => '/' + section + '/' + encodeURIComponent(id)
export const actor = state => state.seller?.id || 'seller-001'
export const timestamp = () => new Date().toISOString()
export const newId = prefix => prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2))

export const listingStatuses = [['active', 'Active'], ['draft', 'Draft'], ['ended', 'Ended']]
export const orderStatuses = [['awaiting_shipment', 'Awaiting shipment'], ['shipped', 'Shipped'], ['canceled', 'Canceled']]
export const returnStatuses = [['requested', 'Needs response'], ['accepted', 'Accepted'], ['received', 'Received'], ['offer_sent', 'Offer sent'], ['refunded', 'Closed']]
export const promoStatuses = [['draft', 'Draft'], ['scheduled', 'Scheduled'], ['active', 'Active'], ['ended', 'Ended']]
export const promoTypes = [['sale_event', 'Sale event'], ['order_discount', 'Order discount'], ['coupon', 'Coupon']]
export const statusLabels = Object.fromEntries([...listingStatuses, ...orderStatuses, ...returnStatuses, ...promoStatuses, ['refunded', 'Refunded'], ['closed', 'Closed'], ['paid', 'Paid']])

export function effectivePromotion(item, now = new Date()) {
  if (item.status !== 'active' && item.status !== 'scheduled') return item.status
  if (item.endsAt && now >= new Date(item.endsAt)) return 'ended'
  if (item.startsAt && now < new Date(item.startsAt)) return 'scheduled'
  return item.startsAt ? 'active' : item.status
}

export function replace(records, record) {
  const list = Array.isArray(records) ? records : []
  return find(list, record.id) ? list.map(item => item?.id === record.id ? record : item) : [...list, record]
}

export function event(state, type, entityType, entityId, createdAt, details) {
  return { id: newId('evt'), type, entityType, entityId, actorId: actor(state), createdAt, details }
}

export function append(state, key, ...entries) {
  return [...(Array.isArray(state[key]) ? state[key] : []), ...entries]
}

