const formatters = new Map()

function clockParts(instant, timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }))
  }
  return Object.fromEntries(formatters.get(timeZone).formatToParts(instant).map(({ type, value }) => [type, value]))
}

export function localDay(now = new Date()) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function isDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const instant = Date.parse(day + 'T00:00:00Z')
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === day
}

export function moveDay(day, days) {
  const date = new Date(Date.parse(day + 'T00:00:00Z') + days * 86400000)
  return Number.isFinite(+date) ? date.toISOString().slice(0, 10) : null
}

export function nextYear(day) {
  const year = Number(day.slice(0, 4)) + 1
  const candidate = year + day.slice(4)
  return day.endsWith('-02-29') && moveDay(candidate, 0) !== candidate ? year + '-02-28' : candidate
}

export function airportInstant(day, time, timeZone) {
  if (!isDay(day) || !/^\d{2}:\d{2}$/.test(time ?? '')) return null
  const target = Date.parse(day + 'T' + time + ':00Z')
  if (!Number.isFinite(target) || !timeZone) return null
  let instant = target
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { year, month, day: date, hour, minute } = clockParts(new Date(instant), timeZone)
      const asUtc = Date.parse(year + '-' + month + '-' + date + 'T' + hour + ':' + minute + ':00Z')
      if (asUtc === target) return new Date(instant).toISOString()
      instant += target - asUtc
    }
  } catch {
    return null
  }
  return null
}
