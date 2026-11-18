import { zone } from './ui'

function parts(value, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  return Object.fromEntries(formatter.formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
}

export function wallTime(value, timeZone) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return { date: '', time: '' }
  const { year, month, day, hour, minute } = parts(date, timeZone)
  return { date: [year, month, day].join('-'), time: hour + ':' + minute }
}

export function appointmentInstant(date, time, timeZone) {
  const wall = Date.parse(date + 'T' + time + ':00Z')
  if (!Number.isFinite(wall)) return null
  const candidates = [-1, 0, 1].map(day => {
    const sampled = wall + day * 86400000
    const local = wallTime(sampled, timeZone)
    return wall + sampled - Date.parse(local.date + 'T' + local.time + ':00Z')
  })
  const match = candidates.sort((a, b) => a - b).find(candidate => {
    const local = wallTime(candidate, timeZone)
    return local.date === date && local.time === time
  })
  return match === undefined ? null : new Date(match).toISOString()
}
