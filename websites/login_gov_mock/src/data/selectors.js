export const paths = {
  account: '/',
  identity: '/identity',
  verify: '/identity/verify',
  connections: '/connected-services',
  catalog: '/connected-services/catalog',
  consent: id => `/connected-services/consent/${encodeURIComponent(id)}`,
  connection: id => `/connected-services/${encodeURIComponent(id)}`,
  verifyFor: id => `/identity/verify?service=${encodeURIComponent(id)}`,
}

export const statuses = {
  verified: 'Verified',
  unverified: 'Unverified',
  in_progress: 'In progress',
  pending_in_person: 'Waiting for visit',
  canceled: 'Canceled',
  connected: 'Connected',
  disconnected: 'Disconnected',
}

export function records(value) {
  return Array.isArray(value) ? value.filter(item => item?.id) : []
}

export function owned(state, key) {
  return records(state[key]).filter(item => item.accountId === state.account?.id)
}

export function findService(state, id) {
  return records(state.services).find(item => item.id === id)
}

export function findEmail(state, id) {
  return records(state.emails).find(item => item.id === id)
}

export function eligibleEmails(state) {
  return records(state.emails).filter(item => item.status === 'confirmed' && item.address)
}

export function isVerified(state) {
  return state.identity?.accountId === state.account?.id && state.identity?.status === 'verified'
}

export function activeAttempt(state) {
  return owned(state, 'verificationAttempts').find(item => ['in_progress', 'pending_in_person'].includes(item.status))
}

export function searchMatches(query, ...values) {
  const term = query.trim().toLowerCase()
  return !term || values.some(value => String(value ?? '').toLowerCase().includes(term))
}

export function dateValue(value) {
  return Date.parse(value) || 0
}

const shortDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(value, withTime = false) {
  if (!Number.isFinite(Date.parse(value))) return 'Date unavailable'
  return (withTime ? longDate : shortDate).format(new Date(value))
}

const attributeNames = { email: 'Email address', given_name: 'Given name', family_name: 'Family name' }

export const attributes = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
export const attributeLabel = key => attributeNames[key] ?? key.replaceAll('_', ' ')
