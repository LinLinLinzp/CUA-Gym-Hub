const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const displayDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export const records = (value) => Array.isArray(value) ? value : []
export const find = (value, id) => id ? records(value).find(record => record.id === id) : undefined
export const recordPath = (root, id) => root + '/' + encodeURIComponent(id)
export const label = (value) => {
  if (!value) return '—'
  if (value === 'hvac') return 'HVAC'
  if (value === 'single_family') return 'Single-family'
  const words = String(value).replaceAll('_', ' ')
  return words[0].toUpperCase() + words.slice(1)
}
export const cents = (amount) => Math.round((Number(amount) || 0) * 100)
export const money = (amount) => amount == null || !Number.isFinite(Number(amount)) ? '—' : usd.format(amount)
export const date = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : displayDate.format(parsed)
}
export function today() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
export function shiftDate(value, days) {
  if (!value) return ''
  const parsed = new Date(value + 'T12:00:00Z')
  if (!Number.isFinite(parsed.getTime())) return ''
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}
export const compare = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true, sensitivity: 'base' })
export const matches = (query, ...parts) => parts.join(' ').toLowerCase().includes(query.trim().toLowerCase())
export const address = (property) => {
  if (!property) return '—'
  const locality = [property.city, [property.region, property.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [property.address1, property.address2, locality].filter(Boolean).join(', ') || '—'
}
export const propertyLabel = (state, id) => find(state.properties, id)?.name || id || '—'
export const unitLabel = (state, id) => find(state.units, id)?.label || id || '—'
export const assigneeLabel = (state, id) => find(state.assignees, id)?.name || id || 'Unassigned'
export const propertyOptions = (properties) => [...properties].sort((a, b) => compare(a.name, b.name)).map(record => [record.id, record.name || record.id])
export const unitOptions = (units) => [...units].sort((a, b) => compare(a.label, b.label)).map(record => [record.id, record.label || record.id])
export const propertyUnits = (state, propertyId) => records(state.units).filter(unit => unit.propertyId === propertyId)
export const propertyOrUnit = (state, record) => [propertyLabel(state, record.propertyId), record.unitId ? 'Unit ' + unitLabel(state, record.unitId) : ''].filter(Boolean).join(' · ')

export const effectiveEnd = (lease) => lease.endedOn && (!lease.endDate || lease.endedOn < lease.endDate) ? lease.endedOn : lease.endDate
export function phase(lease, day = today()) {
  if (lease.endedOn && lease.endedOn <= day) return 'ended'
  if (!lease.endedOn && lease.status === 'ended') return 'ended'
  if (!lease.startDate || !effectiveEnd(lease)) return 'unknown'
  if (lease.startDate > day) return 'upcoming'
  return effectiveEnd(lease) < day ? 'expired' : 'active'
}
export function endingSoon(lease, day = today()) {
  return phase(lease, day) === 'active' && effectiveEnd(lease) <= shiftDate(day, 30)
}

export const propertyTypes = ['multifamily', 'single_family', 'commercial']
export const locationStatuses = ['active', 'archived']
export const priorities = ['urgent', 'high', 'normal', 'low']
export const orderStatuses = ['open', 'assigned', 'scheduled', 'in_progress', 'completed', 'canceled']
export const activeOrder = (order) => order.status !== 'completed' && order.status !== 'canceled'

export function requireValue(condition, field, message) {
  if (!condition) throw Object.assign(new Error(message), { field })
}
export function textValue(value, field, caption) {
  const text = String(value ?? '').trim()
  if (caption) requireValue(text, field, 'Enter ' + caption + '.')
  return text
}
export function numberValue(value, field, { positive = false, places = 2 } = {}) {
  const pattern = new RegExp(places ? '^\\d+(?:\\.\\d{1,' + places + '})?$' : '^\\d+$')
  const raw = String(value ?? '').trim()
  const normalized = raw.startsWith('.') ? '0' + raw : raw
  const amount = Number(normalized)
  requireValue(pattern.test(normalized) && Number.isSafeInteger(cents(amount)) && (!positive || amount > 0), field,
    positive ? 'Enter an amount greater than zero with up to two decimal places.' :
      places ? 'Enter a nonnegative number with up to two decimal places.' : 'Enter a nonnegative whole number.')
  return amount
}
export function dateValue(value, field) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && shiftDate(value, 0) === value, field, 'Enter a valid date.')
  return value
}
export function choice(value, list, field, caption) {
  requireValue(list.includes(value), field, 'Select ' + caption + '.')
  return value
}
export function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return prefix + '-' + suffix
}
export function writeRecord(state, key, existing, patch, prefix, { at, actor }) {
  const record = {
    ...(existing || { id: newId(prefix), createdAt: at, createdBy: actor }),
    ...patch, updatedAt: at, updatedBy: actor,
  }
  const collection = records(state[key])
  const next = existing ? collection.map(item => item.id === existing.id ? record : item) : [...collection, record]
  return { state: { ...state, [key]: next }, record }
}

export const orderNewest = (a, b) => compare(b.createdAt, a.createdAt) || compare(a.id, b.id)
export const chargePayments = (charge, payments) => payments.filter(payment =>
  payment.chargeId === charge.id && payment.leaseId === charge.leaseId && (!payment.status || payment.status === 'recorded'))
export const chargeBalance = (charge, payments) => Math.max(0, cents(charge.amount) -
  chargePayments(charge, payments).reduce((sum, payment) => sum + cents(payment.amount), 0))
export function chargePhase(charge, payments, day = today()) {
  if (chargeBalance(charge, payments) === 0) return 'paid'
  if (charge.dueOn && charge.dueOn < day) return 'overdue'
  return chargePayments(charge, payments).length ? 'partial' : 'open'
}

export const postedCharges = state => records(state.rentCharges).filter(charge => !charge.status || charge.status === 'posted')
