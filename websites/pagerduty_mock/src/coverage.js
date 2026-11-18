const day = 86_400_000
const formats = new Map()
const array = value => Array.isArray(value) ? value : []

function formatter(zone) {
  if (!formats.has(zone)) formats.set(zone, new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }))
  return formats.get(zone)
}
export function validZone(zone) {
  if (!zone || /^[+-]/.test(zone)) return false
  try { formatter(zone); return true } catch { return false }
}
export const scheduleZone = schedule => validZone(schedule?.timeZone) ? schedule.timeZone : 'UTC'
function localClock(at, zone) {
  const parts = formatter(zone).formatToParts(at)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]))
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second)
}
const dateKey = clock => new Date(clock).toISOString().slice(0, 10)
const dayOf = clock => Math.floor(clock / day) * day
const weekday = clock => new Date(clock).getUTCDay() || 7

export function localInput(at, zone) {
  const instant = typeof at === 'number' ? at : Date.parse(at)
  return Number.isFinite(instant) ? new Date(localClock(instant, zone)).toISOString().slice(0, 16) : ''
}
export function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) }

function possibleInstants(clock, zone) {
  const offsets = new Set([-day, 0, day].map(delta => localClock(clock + delta, zone) - clock - delta))
  return [...offsets].map(offset => clock - offset).sort((a, b) => a - b)
}
function toInstant(clock, zone) {
  const candidates = possibleInstants(clock, zone)
  // Recurring shifts advance across a skipped wall-clock hour.
  return candidates.find(at => localClock(at, zone) === clock) ?? candidates.find(at => localClock(at, zone) > clock) ?? NaN
}
export function localOccurrences(value, zone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) return []
  const clock = Date.parse(value + ':00.000Z')
  if (!Number.isFinite(clock) || new Date(clock).toISOString().slice(0, 16) !== value) return []
  return possibleInstants(clock, zone).filter(at => localClock(at, zone) === clock)
}
export function parseLocal(value, zone) {
  const instant = localOccurrences(value, zone)[0]
  return instant === undefined ? null : new Date(instant).toISOString()
}
const timeOfDay = time => Number(time.slice(0, 2)) * 3_600_000 + Number(time.slice(3)) * 60_000
export function weekStart(at, zone) {
  const clock = dayOf(localClock(at, zone))
  return clock - (weekday(clock) - 1) * day
}
export function weekDates(start, offset) {
  return Array.from({ length: 8 }, (_, index) => dateKey(start + (index + offset * 7) * day))
}
export const dateText = value => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00Z'))

function eligibleWindow(window, clockDay, zone) {
  if (window?.dayOfWeek !== weekday(clockDay) || !validTime(window.startTime) || !validTime(window.endTime) || window.startTime === window.endTime) return null
  const start = toInstant(clockDay + timeOfDay(window.startTime), zone)
  const end = toInstant(clockDay + timeOfDay(window.endTime) + (window.endTime < window.startTime ? day : 0), zone)
  return [start, end]
}
function layerCover(layer, at, zone) {
  const start = Date.parse(layer.startAt)
  const users = array(layer.userIds)
  const days = Number(layer.rotationDays || (layer.rotationType === 'daily' ? 1 : 7))
  if (!users.length || !Number.isFinite(start) || start > at || !Number.isInteger(days) || days < 1) return null
  const localDay = dayOf(localClock(at, zone))
  const firstDay = dayOf(localClock(start, zone))
  const handoff = validTime(layer.handoffTime) ? timeOfDay(layer.handoffTime) : localClock(start, zone) - firstDay
  let shift = Math.floor((localDay - firstDay) / (day * days))
  if (shift > 0 && at < toInstant(firstDay + shift * days * day + handoff, zone)) shift--
  const restrictions = array(layer.restrictions)
  if (restrictions.length && !restrictions.some(window => [localDay - day, localDay].some(clockDay => {
    const span = eligibleWindow(window, clockDay, zone)
    return span && span[0] <= at && at < span[1]
  }))) return null
  return users[shift % users.length] || null
}
function activeOverride(overrides, id, at) {
  return array(overrides).filter(item => item.scheduleId === id && item.status === 'active' && Date.parse(item.startAt) <= at && at < Date.parse(item.endAt))
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt) || String(b.id).localeCompare(String(a.id)))[0]
}
export function coverage(schedule, overrides, at, zone = scheduleZone(schedule)) {
  if (!schedule) return { userId: null, override: null, layers: [] }
  const override = activeOverride(overrides, schedule.id, at)
  const layers = array(schedule.layers).map(layer => layerCover(layer, at, zone))
  return { userId: override?.userId || layers.findLast(Boolean) || null, override, layers }
}
export function responders(state, policy, at) {
  for (const rule of array(policy?.rules)) {
    const ids = array(rule.targets).map(target => {
      if (target?.type === 'user') return target.id
      if (target?.type !== 'schedule') return null
      const schedule = array(state.schedules).find(item => item.id === target.id)
      return coverage(schedule, state.scheduleOverrides, at).userId
    }).filter(id => id && array(state.users).some(user => user.id === id))
    if (ids.length) return [...new Set(ids)]
  }
  return []
}
export function snapshot(policy) {
  return { policyId: policy.id, rules: structuredClone(array(policy.rules)), repeatCount: policy.repeatCount ?? 0 }
}

export function timeline(schedule, overrides, dates) {
  const zone = scheduleZone(schedule)
  const layers = array(schedule.layers)
  const midnights = dates.map(date => toInstant(Date.parse(date + 'T00:00Z'), zone))
  const start = midnights[0], end = midnights.at(-1)
  const edges = new Set(midnights)
  const add = at => { if (at > start && at < end) edges.add(at) }
  const related = array(overrides).filter(item => item.scheduleId === schedule.id && item.status === 'active')
  for (const item of related) { add(Date.parse(item.startAt)); add(Date.parse(item.endAt)) }
  for (const layer of layers) {
    const anchor = Date.parse(layer.startAt)
    add(anchor)
    for (let index = -1; index < dates.length; index++) {
      const clock = Date.parse(dates[0] + 'T00:00Z') + index * day
      if (Number.isFinite(anchor)) {
        const firstClock = localClock(anchor, zone)
        const days = Number(layer.rotationDays || (layer.rotationType === 'daily' ? 1 : 7))
        if (days > 0 && clock > dayOf(firstClock) && (clock - dayOf(firstClock)) % (days * day) === 0) {
          const handoff = validTime(layer.handoffTime) ? timeOfDay(layer.handoffTime) : firstClock - dayOf(firstClock)
          add(toInstant(clock + handoff, zone))
        }
      }
      for (const window of array(layer.restrictions)) {
        const span = eligibleWindow(window, clock, zone)
        if (span) span.forEach(add)
      }
    }
  }
  const sorted = [...edges].sort((a, b) => a - b)
  const lanes = [...layers.map(layer => ({ id: layer.id, name: layer.name || 'Unnamed layer', shifts: [] })),
    { id: 'overrides', name: 'Overrides', shifts: [] }, { id: 'effective', name: 'Effective coverage', shifts: [] }]
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i], to = sorted[i + 1]
    const result = coverage(schedule, related, from, zone)
    const ids = [...result.layers, result.override?.userId || null, result.userId]
    ids.forEach((userId, lane) => {
      const shift = lanes[lane].shifts.at(-1)
      const overrideId = lane >= layers.length ? result.override?.id : undefined
      if (shift && shift.userId === userId && shift.overrideId === overrideId) shift.end = to
      else lanes[lane].shifts.push({ start: from, end: to, userId, overrideId })
    })
  }
  return { lanes, start, end, midnights, zone }
}
