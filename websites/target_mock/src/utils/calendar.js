function formatter(timeZone) {
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }
  try { return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timeZone || 'UTC' }) }
  catch { return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }) }
}

function wallTime(clock, format) {
  const parts = Object.fromEntries(format.formatToParts(clock).map(({ type, value }) => [type, Number(value)]))
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, clock.getUTCMilliseconds())
}

export function shiftStoreDays(timestamp, days, timeZone, closingHour) {
  const format = formatter(timeZone)
  const wall = new Date(wallTime(new Date(timestamp), format))
  wall.setUTCDate(wall.getUTCDate() + days)
  if (Number.isInteger(closingHour)) wall.setUTCHours(closingHour, 0, 0, 0)
  const target = wall.getTime()
  let instant = target
  for (let retry = 0; retry < 3; retry++) {
    const difference = target - wallTime(new Date(instant), format)
    if (difference === 0) break
    instant += difference
  }
  return new Date(instant).toISOString()
}
