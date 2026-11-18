export const travelTypes = [['flight', 'Flight'], ['stay', 'Stay'], ['car', 'Car rental']]
export const itemTypes = [['activity', 'Activity'], ...travelTypes, ['note', 'Note']]
export const cadences = [['daily', 'Daily'], ['significant_change', 'Significant changes']]
export const sources = [['account_receipt', 'Account receipt'], ['manual', 'Saved booking']]

export const records = (value) => Array.isArray(value) ? value.filter((record) => record && typeof record === 'object') : []
export const visibleTrips = (world) => records(world.trips).filter((trip) => trip.status !== 'deleted')
export const visibleBookings = (world) => records(world.bookings).filter((booking) => booking.status !== 'removed')
export const text = (value) => String(value ?? '')
export const normalize = (value) => text(value).trim().toLowerCase()
export const matches = (query, ...values) => values.some((value) => normalize(value).includes(normalize(query)))
export const label = (options, value, fallback = '—') => options.find(([key]) => key === value)?.[1] || fallback
export const replace = (list, id, fields) => list.map((record) => record?.id === id ? { ...record, ...fields } : record)
export const find = (list, id) => list.find((record) => record.id === id)
export const dateAscending = (a, b) => text(a || '9999').localeCompare(text(b || '9999'))
export const idAscending = (a, b) => text(a.id).localeCompare(text(b.id))

export function createRecord(prefix, fields, update) {
  return {
    id: `${prefix}_${crypto.randomUUID()}`,
    ...fields,
    createdAt: update.updatedAt,
    createdBy: update.updatedBy,
    ...update,
  }
}

export function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function tripStatus(trip) {
  if (!trip.startDate || !trip.endDate) return 'Planning'
  return trip.endDate < today() ? 'Past' : 'Upcoming'
}

export function alertStatus(alert) {
  if (alert.dateMode !== 'flexible' && alert.endDate && alert.endDate < today()) return 'Expired'
  return alert.status === 'paused' ? 'Paused' : 'Active'
}

export function bookingStatus(booking) {
  if (booking.status === 'pending') return 'Pending'
  if (booking.status === 'cancelled') return 'Cancelled'
  if (booking.status !== 'confirmed') return '—'
  if (!booking.endDate) return 'Confirmed'
  return booking.endDate < today() ? 'Past' : 'Upcoming'
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const shortFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function formatDate(value, formatter) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.valueOf()) ? '' : formatter.format(date)
}

export const dayLabel = (value) => formatDate(value, longFormat) || 'Date to be confirmed'

export function dateRange(start, end, fallback = 'Dates to be confirmed') {
  const first = formatDate(start, dateFormat)
  const last = formatDate(end, dateFormat)
  if (!first || !last || first === last) return first || last || fallback
  return `${start.slice(0, 4) === end.slice(0, 4) ? formatDate(start, shortFormat) : first} – ${last}`
}

export function money(amount, currency) {
  if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return ''
  if (!currency) return Number(amount).toFixed(2)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`
  }
}

export function validateDates(values, errors, required = false) {
  if ((required || values.endDate) && !values.startDate) errors.startDate = 'Enter a start date.'
  if ((required || values.startDate) && !values.endDate) errors.endDate = 'Enter an end date.'
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'End date must be on or after the start date.'
  }
}

export function readFields(values, names) {
  return Object.fromEntries(names.map((name) => [name, text(values[name]).trim()]))
}

export function tripItinerary(world, tripId) {
  const manual = records(world.itineraryItems).filter((item) => item.tripId === tripId && item.status !== 'removed')
  const linked = visibleBookings(world).filter((booking) => booking.tripId === tripId)
  return [
    ...manual.map((record) => ({ record, source: 'manual' })),
    ...[...new Map(linked.map((record) => [record.id, record])).values()].map((record) => ({ record, source: 'booking' })),
  ].sort((a, b) => dateAscending(a.record.startDate, b.record.startDate)
    || text(a.record.startTime || '99:99').localeCompare(text(b.record.startTime || '99:99'))
    || idAscending(a.record, b.record))
}
