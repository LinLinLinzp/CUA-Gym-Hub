export const STATUS = {
  received: 'Received',
  under_review: 'Under review',
  action_needed: 'Action needed',
  decision_issued: 'Decision issued',
  approved: 'Approved',
  closed: 'Closed',
}

export const PENDING = new Set(['received', 'under_review', 'action_needed'])
export const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export function statusLabel(status) {
  if (Object.hasOwn(STATUS, status)) return STATUS[status]
  if (!status) return 'Status unavailable'
  return String(status).replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
}
export const recordPath = (base, id) => base + '/' + encodeURIComponent(id)
export const actorId = state => state.profile?.id || 'profile-maya'
export const belongsToAccount = (state, item) => !item.actorId || item.actorId === actorId(state)
export const catalogEntry = (state, id) => id ? records(state.formCatalog).find(item => item.id === id) : undefined
export const isTracked = (state, caseId) => records(state.trackedCases).some(item => item.caseId === caseId && belongsToAccount(state, item))

export function associatedCases(state) {
  const ids = new Set(records(state.trackedCases).filter(item => belongsToAccount(state, item)).map(item => item.caseId))
  return records(state.cases).filter(item => item.id && ids.has(item.id))
}

export function latest(items, dateKey) {
  return [...items].sort((a, b) => (Date.parse(b[dateKey]) || 0) - (Date.parse(a[dateKey]) || 0))
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function dateLabel(value) {
  const date = Date.parse(value)
  return Number.isFinite(date) ? dateFormatter.format(date) : 'Date unavailable'
}

export const normalizeReceipt = value => String(value ?? '').trim().toUpperCase().replaceAll('-', '')
export const validReceipt = value => /^[A-Z]{3}[0-9]{10}$/.test(value)
export const matchingCases = (state, receipt) => records(state.cases).filter(item => normalizeReceipt(item.receiptNumber) === receipt)
export function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return prefix + '-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function nextNumber(items, field, prefix, width, first) {
  const used = new Set(items.map(item => normalizeReceipt(item[field])))
  let next = first
  while (used.has(normalizeReceipt(prefix + String(next).padStart(width, '0')))) next += 1
  return prefix + String(next).padStart(width, '0')
}
