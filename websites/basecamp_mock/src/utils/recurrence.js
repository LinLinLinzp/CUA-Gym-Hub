import { dateInZone, daysBetween, eventDays, localInstant, parseDay, plusDays, timeInZone, validDate, validInstant, validZone } from './dates.js'

export const recurrenceOptions = {
  daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}
export const recurring = (value) => typeof value === 'string' && Object.hasOwn(recurrenceOptions, value)

function* scheduledDays(frequency, start, first, last) {
  if (first > last) return
  if (frequency === 'monthly' || frequency === 'yearly') {
    const [year, month, day] = start.split('-').map(Number)
    const monthIndex = (date) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
    const base = year * 12 + month - 1
    const step = frequency === 'yearly' ? 12 : 1
    const lower = monthIndex(first)
    const upper = monthIndex(last)
    const offset = Math.max(0, Math.ceil((lower - base) / step)) * step
    for (let index = base + offset; index <= upper; index += step) {
      const date = [String(Math.floor(index / 12)).padStart(4, '0'),
        String(index % 12 + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-')
      if (validDate(date) && date >= first && date <= last) yield date
    }
    return
  }
  const step = frequency === 'weekly' ? 7 : 1
  const offset = Math.ceil(daysBetween(start, first) / step) * step
  const lastOffset = daysBetween(start, last)
  for (let days = Math.max(0, offset); days <= lastOffset; days += step) {
    const date = plusDays(start, days)
    const weekday = parseDay(date).getUTCDay()
    if (frequency !== 'weekdays' || date === start || weekday >= 1 && weekday <= 5) yield date
  }
}

export function occurrenceRecords(entry, zone, first, last) {
  const { frequency, untilOn } = entry.recurrence ?? {}
  if (!first || !last || !recurring(frequency)) return [entry]
  const eventZone = validZone(entry.timeZone, zone)
  const timed = !entry.allDay && validInstant(entry.startsAt) && validInstant(entry.endsAt)
  const start = timed ? dateInZone(new Date(entry.startsAt), eventZone) : entry.startsOn
  if (!validDate(start)) return [entry]
  const duration = timed ? Math.max(0, Date.parse(entry.endsAt) - Date.parse(entry.startsAt)) : 0
  const span = timed ? Math.ceil(duration / 86400000) + 2
    : validDate(entry.endsOn) && entry.endsOn >= start ? daysBetween(start, entry.endsOn) : 0
  const earliest = plusDays(first, -span)
  const latest = timed ? plusDays(last, 1) : last
  const lower = earliest < start ? start : earliest
  const upper = validDate(untilOn) && untilOn < latest ? untilOn : latest
  const records = []
  const time = timed ? timeInZone(new Date(entry.startsAt), eventZone) : null

  for (const date of scheduledDays(frequency, start, lower, upper)) {
    let record = entry
    if (date !== start && timed) {
      const startsAt = localInstant(date, time, eventZone)
      if (!startsAt) continue
      const endsAt = new Date(Date.parse(startsAt) + duration).toISOString()
      record = { ...entry, startsOn: date, endsOn: dateInZone(new Date(endsAt), eventZone), startsAt, endsAt }
    } else if (date !== start) {
      record = { ...entry, startsOn: date, endsOn: plusDays(date, span) }
    }
    const [startDay, endDay] = eventDays(record, zone)
    if (startDay <= last && endDay >= first) records.push(record)
  }
  return records
}

const searchDays = { daily: 2, weekdays: 4, weekly: 8, monthly: 63, yearly: 2930 }

export function nearbyOccurrences(entry, zone, today) {
  const { frequency, untilOn } = entry.recurrence ?? {}
  if (!recurring(frequency)) return [entry]
  const days = searchDays[frequency]
  const next = occurrenceRecords(entry, zone, today, plusDays(today, days))[0]
  if (next) return next === entry ? [entry] : [entry, next]

  const pivot = validDate(untilOn) && untilOn < today ? untilOn : today
  const last = occurrenceRecords(entry, zone, plusDays(pivot, -days), plusDays(pivot, 1)).at(-1)
  return last && last !== entry ? [entry, last] : [entry]
}
