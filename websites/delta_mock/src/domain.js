export const rows = (value) => Array.isArray(value) ? value.filter((record) => record && typeof record === 'object') : []
export const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
export const compact = (value) => normalize(value).replace(/\s+/g, '')
export const sameName = (a, b) => !!normalize(a) && normalize(a) === normalize(b)
export const cents = (value) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return NaN
  return Math.round(Number(value) * 100)
}
export const dollars = (value) => value / 100
export const validMoney = (value) => Number.isSafeInteger(cents(value)) && cents(value) >= 0
export const currencyOf = (record) => /^[A-Z]{3}$/.test(record?.currency) ? record.currency : 'USD'
export const code = (record) => record?.confirmationCode || record?.id || 'Reference unavailable'
export const tripPath = (id) => '/my-trips/' + encodeURIComponent(id)
export const signedIn = (record, account) => !!account?.id && record.accountId === account.id
export const isUnlinked = (record) => record.accountId === null || record.accountId === undefined || record.accountId === ''
export const datePart = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
export const validDate = (value) => {
  if (datePart(value) !== value || !value) return false
  const stamp = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(stamp.valueOf()) && stamp.toISOString().slice(0, 10) === value
}
export function localToday(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function orderedSegments(trip) {
  return rows(trip.segments).sort((a, b) => (Date.parse(a.departureAt) || Infinity) - (Date.parse(b.departureAt) || Infinity))
}

export function tripGroup(trip, now = new Date()) {
  if (trip.status === 'canceled') return 'Canceled'
  if (trip.status === 'completed') return 'Past'
  return rows(trip.segments).some(({ departureAt }) => Date.parse(departureAt) > now.valueOf()) ? 'Upcoming' : 'Past'
}

export function tripTitle(trip) {
  const first = orderedSegments(trip)[0]
  return first?.destinationCity || first?.destination || 'Trip itinerary'
}

export function serviceError(trip, account, flag) {
  if (!trip || !signedIn(trip, account)) return 'This trip is unavailable in your account.'
  const segments = rows(trip.segments)
  if (trip.status !== 'confirmed' || !segments.length
      || segments.some((segment) => !(Date.parse(segment.departureAt) > Date.now()))) {
    return 'This trip can only be managed before its first departure.'
  }
  return trip[flag] === true ? '' : 'This fare is ineligible for this action.'
}

export function creditGroup(credit) {
  if (credit.status === 'used' || cents(credit.remainingAmount) === 0) return 'Used'
  if (credit.status === 'expired' || (validDate(credit.expiresOn) && credit.expiresOn < localToday())) return 'Expired'
  if (credit.status === 'available' && cents(credit.remainingAmount) > 0 && validDate(credit.expiresOn)) return 'Available'
  return 'Unavailable'
}

export const money = (value, currency = 'USD') => validMoney(value)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value))
  : '—'

export const number = (value) => value != null && Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-US').format(Number(value))
  : '—'

export function dateLabel(value, long = false) {
  const date = datePart(value)
  return validDate(date) ? new Intl.DateTimeFormat('en-US', {
    month: long ? 'long' : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z')) : 'Date unavailable'
}

export function flightTime(value) {
  const clock = typeof value === 'string' && /T(\d{2}):(\d{2})/.exec(value)
  if (!clock) return '—'
  const hours = Number(clock[1])
  return `${hours % 12 || 12}:${clock[2]} ${hours >= 12 ? 'PM' : 'AM'}`
}

export const fullName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ')
export const statusLabel = (value) => typeof value === 'string' && value
  ? value[0].toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Status unavailable'

export function newId(prefix) {
  const random = crypto.getRandomValues(new Uint8Array(16))
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${suffix}`
}

export function eventRecord(actorId, prefix) {
  return { id: newId(prefix), actorId, createdAt: new Date().toISOString() }
}

export const fail = (error) => ({ error })
