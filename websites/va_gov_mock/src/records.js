import { useParams } from 'react-router-dom'

export function recordPath(base, id) {
  if (id && !/[^\w.-]/.test(id) && !['new', '.', '..'].includes(id.toLowerCase())) return `${base}/${id}`
  // Keep reserved names and arbitrary IDs out of the ordinary route segment.
  const token = encodeURIComponent(id).replaceAll('~', '%7E').replaceAll('%', '~')
  return `${base}/record/id-${token}`
}

export function useRecordId() {
  const { id, token } = useParams()
  if (token === undefined) return id
  if (!token.startsWith('id-')) return undefined
  try {
    return decodeURIComponent(token.slice(3).replaceAll('~', '%'))
  } catch {
    return undefined
  }
}

export function newest(field, tie = 'id') {
  return (a, b) => String(b[field] || '').localeCompare(String(a[field] || '')) ||
    String(a[tie] || '').localeCompare(String(b[tie] || ''))
}

export function dateLabel(value, options = {}) {
  if (!value) return '—'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(dateOnly ? value + 'T00:00:00Z' : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    ...options,
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  }).format(date)
}

export function money(value, currency = 'USD') {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value))
}

export function facilityName(facility) {
  return facility?.name || 'Facility unavailable'
}

export function zonedClock(timeZone) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  let formatter
  try { formatter = new Intl.DateTimeFormat('en-US', { ...options, timeZone }) }
  catch { formatter = new Intl.DateTimeFormat('en-US', options) }
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(({ type, value }) => [type, value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, timeZone: formatter.resolvedOptions().timeZone }
}

export function appointmentSection(visit) {
  if (visit.status === 'requested') return 'Requests'
  if (visit.status === 'scheduled' && new Date(visit.startsAt) > new Date()) return 'Upcoming'
  return 'Past'
}

export function matches(query, ...values) {
  const normalized = query.trim().toLowerCase()
  return !normalized || values.some(value => String(value ?? '').toLowerCase().includes(normalized))
}

export function label(value) {
  if (!value) return '—'
  const text = String(value).replaceAll('_', ' ')
  return text[0].toUpperCase() + text.slice(1)
}
