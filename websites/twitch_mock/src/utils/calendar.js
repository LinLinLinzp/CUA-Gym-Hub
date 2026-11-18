export const CHANNEL_ZONE = 'America/New_York'
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const formatters = new Map()

export function zonedParts(value, zone = CHANNEL_ZONE) {
  if (!formatters.has(zone)) {
    const options = { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }
    try {
      formatters.set(zone, new Intl.DateTimeFormat('en-CA', options))
    } catch {
      formatters.set(zone, new Intl.DateTimeFormat('en-CA', { ...options, timeZone: CHANNEL_ZONE }))
    }
  }
  const valueDate = new Date(value)
  if (!Number.isFinite(+valueDate)) return null
  const p = Object.fromEntries(formatters.get(zone).formatToParts(valueDate).map(({ type, value }) => [type, value]))
  return { date: [p.year, p.month, p.day].join('-'), time: [p.hour, p.minute, p.second].join(':') }
}

export function wallTime(date, time, zone) {
  const fullTime = time.length === 5 ? time + ':00' : time
  const stamp = Date.parse(date + 'T' + fullTime + 'Z')
  if (!Number.isFinite(stamp)) return null
  let guess = stamp
  // Seek the instant that round-trips to this local date and time.
  for (let attempt = 0; attempt < 4; attempt++) {
    const local = zonedParts(guess, zone)
    const delta = stamp - Date.parse(local.date + 'T' + local.time + 'Z')
    if (delta === 0) return new Date(guess).toISOString()
    guess += delta
  }
  return null
}

export const utcDay = date => new Date(date + 'T12:00:00Z')
export const dateKey = date => date.toISOString().slice(0, 10)
export const addDays = (date, days) => dateKey(new Date(+utcDay(date) + days * 86400000))
export const weekdayOf = date => utcDay(date).getUTCDay() || 7
export const monthStart = date => date.slice(0, 7) + '-01'
export function moveMonth(date, direction) {
  const next = utcDay(monthStart(date))
  next.setUTCMonth(next.getUTCMonth() + direction)
  return dateKey(next)
}

export function displayDate(date, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!date || !Number.isFinite(+utcDay(date))) return '—'
  return utcDay(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
}

export function displayInstant(instant, zone = CHANNEL_ZONE) {
  const local = instant && zonedParts(instant, zone)
  return local ? displayDate(local.date, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

export function displayTime(instant, zone) {
  const local = instant && zonedParts(instant, zone)
  if (!local) return '—'
  const [hour, minute] = local.time.split(':')
  return (Number(hour) % 12 || 12) + ':' + minute + (Number(hour) < 12 ? ' AM' : ' PM')
}

export function agendaBetween(state, from, to) {
  const exceptions = new Map((state.scheduleExceptions ?? []).map(item => [item.entryId + ':' + item.occurrenceDate, item]))
  const zone = state.scheduleSettings?.timezone || CHANNEL_ZONE
  const agenda = []
  for (const entry of state.scheduleEntries ?? []) {
    if (entry.status === 'deleted' || !entry.startsAt) continue
    const entryZone = entry.timezone || zone
    const anchor = zonedParts(entry.startsAt, entryZone)
    if (!anchor) continue
    if (entry.recurrence !== 'weekly') {
      const date = zonedParts(entry.startsAt, zone).date
      if (date >= from && date <= to) agenda.push({ entry, date, startsAt: entry.startsAt, status: entry.status || 'scheduled' })
      continue
    }
    const first = [addDays(from, -1), anchor.date].sort().at(-1)
    const weekday = entry.weekday || weekdayOf(anchor.date)
    let date = addDays(first, (weekday - weekdayOf(first) + 7) % 7)
    const last = addDays(to, 1)
    for (; date <= last; date = addDays(date, 7)) {
      const startsAt = date === anchor.date ? entry.startsAt : wallTime(date, anchor.time, entryZone)
      if (!startsAt) continue
      const channelDate = zonedParts(startsAt, zone).date
      if (channelDate < from || channelDate > to) continue
      const exception = exceptions.get(entry.id + ':' + date)
      const status = exception?.status === 'restored' ? 'scheduled' : exception?.status || entry.status || 'scheduled'
      agenda.push({ entry, date: channelDate, occurrenceDate: date, startsAt, status })
    }
  }
  return agenda.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function onVacation(settings, date) {
  return Boolean(settings?.vacationEnabled && settings.vacationStartDate && settings.vacationEndDate
    && date >= settings.vacationStartDate && date <= settings.vacationEndDate)
}
