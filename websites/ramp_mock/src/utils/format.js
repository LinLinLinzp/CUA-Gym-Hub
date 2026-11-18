export const APP = 'ramp_mock'
export const list = value => Array.isArray(value) ? value.filter(record => record && typeof record === 'object') : []
export const find = (value, id) => id == null ? undefined : list(value).find(record => record.id === id)
export const uid = prefix => prefix + '-' + crypto.randomUUID()
export const actor = state => find(state.people, state.workspace?.currentUserId)
export const personName = (state, id) => find(state.people, id)?.name || 'Unknown person'
export const vendorName = (state, id) => find(state.vendors, id)?.name || 'Unknown vendor'
export const dateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export function today() {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function cents(value) {
  const input = String(value ?? '').trim()
  const match = /^(\d*)(?:\.(\d{1,2}))?$/.exec(input)
  if (!match || !input) return null
  const amount = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 999999999999 ? amount : null
}

export function money(value, currency = 'USD') {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  const code = typeof currency === 'string' && /^[a-z]{3}$/i.test(currency) ? currency : 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value))
}

export function fmtDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...(dateOnly(value) ? { timeZone: 'UTC' } : {}),
  }).format(new Date(value))
}

const labels = { ach: 'ACH', pending_approval: 'Pending approval', spend_request: 'Spend request', one_time: 'One time', finance_admin: 'Finance Admin', ap_specialist: 'AP Specialist' }
export const label = value => (Object.hasOwn(labels, value) ? labels[value] : null) || (typeof value === 'string' && value ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Unknown')
export const initials = name => String(name || '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '–'
export const matches = (search, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase()))
export const byText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true })

