const dayMs = 86_400_000
const dateFormatters = new Map()

export function timeZoneFor(zone) {
  if (typeof zone !== 'string' || !zone) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return zone
  } catch {
    return 'UTC'
  }
}

export function formatDate(value, options, timeZone = 'UTC') {
  if (!value || !Number.isFinite(new Date(value).valueOf())) return ''
  const key = JSON.stringify([timeZone, options])
  if (!dateFormatters.has(key)) {
    dateFormatters.set(key, new Intl.DateTimeFormat('en-US', { ...options, timeZone }))
  }
  return dateFormatters.get(key).format(new Date(value))
}

const dayOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
const timeOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

export function dateKey(value, zone) {
  const date = formatDate(value, dayOptions, zone)
  if (!date) return ''
  const [month, day, year] = date.split('/')
  return `${year}-${month}-${day}`
}

export const timeKey = (value, zone) => formatDate(value, timeOptions, zone)
export const bumpDate = (key, days) => new Date(Date.parse(key) + days * dayMs).toISOString().slice(0, 10)

export function monday(key) {
  return bumpDate(key, -((new Date(key).getUTCDay() + 6) % 7))
}

export function initialWeek(posts, now, zone) {
  const current = monday(dateKey(now, zone))
  const end = bumpDate(current, 7)
  const dated = posts.map((post) => ({ day: dateKey(post.scheduledAt, zone), time: Date.parse(post.scheduledAt) }))
    .filter((post) => post.day)
  if (!dated.length || dated.some(({ day }) => day >= current && day < end)) return current
  const nearest = dated.reduce((best, item) => Math.abs(item.time - now) < Math.abs(best.time - now) ? item : best)
  return monday(nearest.day)
}

export function toInstant(day, time, zone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null
  const desired = Date.parse(`${day}T${time}:00Z`)
  if (!Number.isFinite(desired)) return null
  // Sample offsets around the requested wall time so both sides of a daylight-saving change are considered.
  const possible = [-dayMs, 0, dayMs].map((delta) => {
    const sample = desired + delta
    const local = Date.parse(`${dateKey(sample, zone)}T${timeKey(sample, zone)}:00Z`)
    return desired - (local - sample)
  }).sort((a, b) => a - b)
  const match = possible.find((value) => dateKey(value, zone) === day && timeKey(value, zone) === time)
  return match === undefined ? null : new Date(match).toISOString()
}

export function dateTimeLabel(value, zone) {
  return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }, zone) || 'Unscheduled'
}

export function weekLabel(start) {
  const end = bumpDate(start, 6)
  const left = formatDate(start, { month: 'long', day: 'numeric' })
  const right = start.slice(0, 7) === end.slice(0, 7) ? Number(end.slice(-2)) : formatDate(end, { month: 'long', day: 'numeric' })
  if (start.slice(0, 4) !== end.slice(0, 4)) return `${left}, ${start.slice(0, 4)} – ${right}, ${end.slice(0, 4)}`
  return `${left}–${right}, ${end.slice(0, 4)}`
}

export function relativeTime(date, now = new Date()) {
  const seconds = (Date.parse(date) - now) / 1000
  if (!Number.isFinite(seconds)) return ''
  if (Math.abs(seconds) < 60) return 'Just now'
  const [unit, size] = [['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3600], ['minute', 60]]
    .find(([, size]) => Math.abs(seconds) >= size)
  return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(Math.trunc(seconds / size), unit)
}
