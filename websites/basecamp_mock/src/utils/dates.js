export const UTC = 'UTC'

export function validZone(timeZone, fallback = UTC) {
  if (!timeZone) return fallback
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return timeZone
  } catch {
    return fallback
  }
}

const formatters = new Map()
export function zonedParts(date, timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone, calendar: 'gregory', era: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }))
  }
  return Object.fromEntries(formatters.get(timeZone).formatToParts(date).map(({ type, value }) => [type, value]))
}

function isoDate({ year, era, month, day }) {
  // Intl uses Gregorian era years. ISO year 0000 is 1 BC.
  const isoYear = era === 'BC' ? 1 - Number(year) : Number(year)
  const formattedYear = isoYear >= 0 && isoYear <= 9999
    ? String(isoYear).padStart(4, '0')
    : (isoYear < 0 ? '-' : '+') + String(Math.abs(isoYear)).padStart(6, '0')
  return `${formattedYear}-${month}-${day}`
}

export function dateInZone(date, zone) {
  return isoDate(zonedParts(date, zone))
}

export function timeInZone(date, zone) {
  const { hour, minute } = zonedParts(date, zone)
  return [hour, minute].join(':')
}

export const parseDay = (date) => new Date(`${date}T00:00:00.000Z`)
const firstDay = +parseDay('0000-01-01')
const lastDay = +parseDay('9999-12-31')
export const dayString = (date) => date.toISOString().slice(0, 10)
export const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(+parseDay(date)) && dayString(parseDay(date)) === date
export const validInstant = (value) => Boolean(value) && Number.isFinite(Date.parse(value))
export const plusDays = (date, days) => {
  const shifted = +parseDay(date) + days * 86400000
  return dayString(new Date(Math.max(firstDay, Math.min(shifted, lastDay))))
}
export const daysBetween = (start, end) => (+parseDay(end) - +parseDay(start)) / 86400000
export const monthStart = (date) => `${date.slice(0, 7)}-01`

export function shiftMonth(date, offset) {
  const first = parseDay(monthStart(date))
  first.setUTCMonth(first.getUTCMonth() + offset)
  return +first >= firstDay && +first <= lastDay ? dayString(first) : null
}

export function monthEnd(date) {
  const last = parseDay(monthStart(date))
  last.setUTCMonth(last.getUTCMonth() + 1, 0)
  return dayString(last)
}

export function formatDay(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return validDate(date) ? parseDay(date).toLocaleDateString('en-US', { ...options, timeZone: UTC }) : ''
}

export function formatInstant(value, zone, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return validInstant(value) ? new Date(value).toLocaleString('en-US', { ...options, timeZone: zone }) : ''
}

export function eventDays(entry, zone) {
  if (!entry.allDay && validInstant(entry.startsAt) && validInstant(entry.endsAt)) {
    const start = new Date(entry.startsAt)
    const end = Math.max(+start, Date.parse(entry.endsAt) - 1)
    const startDay = +parseDay(dateInZone(start, zone))
    const endDay = +parseDay(dateInZone(new Date(end), zone))
    if (startDay > lastDay || endDay < firstDay) return []
    return [dayString(new Date(Math.max(startDay, firstDay))), dayString(new Date(Math.min(endDay, lastDay)))]
  }
  if (!validDate(entry.startsOn)) return []
  return [entry.startsOn, validDate(entry.endsOn) && entry.endsOn >= entry.startsOn ? entry.endsOn : entry.startsOn]
}

export function localInstant(day, time, zone) {
  if (!validDate(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const target = Date.parse(`${day}T${time}:00Z`)
  // Sampling offsets on both sides also resolves the repeated hour at fall-back.
  const candidates = new Set()
  for (const adjustment of [-86400000, 0, 86400000]) {
    const sample = target + adjustment
    const parts = zonedParts(new Date(sample), zone)
    const local = Date.parse(`${isoDate(parts)}T${parts.hour}:${parts.minute}:${parts.second}Z`)
    const candidate = new Date(target - (local - sample))
    const candidateParts = zonedParts(candidate, zone)
    if (isoDate(candidateParts) === day && `${candidateParts.hour}:${candidateParts.minute}` === time) candidates.add(+candidate)
  }
  return candidates.size ? new Date(Math.min(...candidates)).toISOString() : null
}
