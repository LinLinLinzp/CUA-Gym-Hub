export function addMonths(date, months, utc = true) {
  const result = new Date(date)
  if (utc) {
    const day = result.getUTCDate()
    result.setUTCMonth(result.getUTCMonth() + months, 1)
    const last = new Date(result)
    last.setUTCMonth(last.getUTCMonth() + 1, 0)
    result.setUTCDate(Math.min(day, last.getUTCDate()))
  } else {
    const day = result.getDate()
    result.setMonth(result.getMonth() + months, 1)
    const last = new Date(result)
    last.setMonth(last.getMonth() + 1, 0)
    result.setDate(Math.min(day, last.getDate()))
  }
  return result
}

export function localInput(iso) {
  const date = new Date(iso)
  if (!iso || !Number.isFinite(+date)) return ''
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const days = { '7d': 7, '30d': 30, '90d': 90 }
const months = { '1mo': 1, '3mo': 3, '6mo': 6, '1y': 12 }

export function durationEnd(start, duration) {
  if (Object.hasOwn(days, duration)) return new Date(+start + days[duration] * 86400000).toISOString()
  if (Object.hasOwn(months, duration)) return addMonths(start, months[duration]).toISOString()
  return null
}
