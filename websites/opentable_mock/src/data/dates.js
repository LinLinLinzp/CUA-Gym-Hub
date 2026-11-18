export const DEFAULT_ZONE = 'America/New_York'

const formatters = new Map()
function zoneFormatter(zone = DEFAULT_ZONE) {
  if (!formatters.has(zone)) {
    try {
      formatters.set(zone, new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }))
    } catch {
      return zoneFormatter()
    }
  }
  return formatters.get(zone)
}

export function localClock(zone, timestamp = new Date()) {
  const parts = Object.fromEntries(zoneFormatter(zone).formatToParts(timestamp).map(({ type, value }) => [type, value]))
  return { date: [parts.year, parts.month, parts.day].join('-'), time: parts.hour + ':' + parts.minute }
}

export function addDays(date, offset) {
  const day = new Date(date + 'T12:00:00Z')
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0, 10)
}

export function slotInstant(date, time, zone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return NaN
  const target = Date.parse(date + 'T' + time + ':00Z')
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== date) return NaN
  let guess = target
  for (let pass = 0; pass < 3; pass++) {
    const local = localClock(zone, guess)
    if (local.date === date && local.time === time) return guess
    guess += target - Date.parse(local.date + 'T' + local.time + ':00Z')
  }
  return NaN
}

export function prettyDate(date, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  const value = new Date(date + 'T12:00:00Z')
  if (!Number.isFinite(+value)) return 'Date unavailable'
  return value.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
}

export function prettyTime(time) {
  const value = new Date('2000-01-01T' + time + ':00Z')
  return Number.isFinite(+value) ? value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : 'Time unavailable'
}

export function prettyTimestamp(timestamp) {
  if (!timestamp) return 'Date unavailable'
  return prettyDate(String(timestamp).slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })
}
