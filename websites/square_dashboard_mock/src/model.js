export const rows = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const find = (records, id) => rows(records).find((record) => id != null && record.id === id)
export const replace = (records, next) => rows(records).map((record) => record.id === next.id ? next : record)
export const contains = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const finite = (value) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value))
export const cents = (value) => {
  if (!finite(value)) return null
  const amount = Math.round(Number(value) * 100)
  return Number.isSafeInteger(amount) ? amount : null
}
export const inputCents = (value) => /^\d+(?:\.\d{1,2})?$/.test(String(value).trim()) ? cents(value) : null
export const whole = (value) => /^\d+$/.test(String(value).trim()) && Number.isSafeInteger(Number(value)) ? Number(value) : null
export const money = (value, currency = 'USD') => {
  if (!finite(value)) return '—'
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value))
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
export const stamp = (value) => value ? new Date(value).getTime() : NaN
export const date = (value, includeTime = false) => {
  const time = stamp(value)
  return Number.isFinite(time) ? dateFormat.format(time) + (includeTime ? ' · ' + timeFormat.format(time) : '') : '—'
}
export const dayKey = (value) => {
  const time = stamp(value)
  if (!Number.isFinite(time)) return ''
  const day = new Date(time)
  return [day.getFullYear(), day.getMonth() + 1, day.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}
export const byRecent = (a, b) => (stamp(b.createdAt) || 0) - (stamp(a.createdAt) || 0)
export const inRange = (value, from, to) => {
  const day = dayKey(value)
  return (!from || day && day >= from) && (!to || day && day <= to)
}
export const label = (value) => ({
  in_progress: 'In progress', point_of_sale: 'Point of sale', bank_account: 'Bank account',
  debit_card: 'Debit card', none: 'No refunds', partial: 'Partially refunded', full: 'Full',
})[value] ?? (typeof value === 'string' && value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : '—')
export const ref = (record, key) => record?.[key] || record?.id || '—'
export const nameOf = (records, id, fallback = '—') => find(records, id)?.name || fallback
export const masked = (record) => record ? [record.name, record.last4 && '•••• ' + record.last4].filter(Boolean).join(' ') || 'Linked destination' : 'Destination unavailable'
export const paymentMethod = (record) => record.method === 'card' && record.cardLast4 ? 'Card •••• ' + record.cardLast4 : label(record.method)
export const newId = (prefix) => prefix + '_' + Array.from(crypto.getRandomValues(new Uint8Array(12)), (value) => value.toString(16).padStart(2, '0')).join('')
export const metadata = (state) => ({ actorId: state.account?.actorId ?? null, updatedAt: new Date().toISOString() })
