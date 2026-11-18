export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (items, id) => list(items).find((item) => item.id === id)
export const moneyValue = (amount) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
export const units = (value) => Number.isSafeInteger(value) && value > 0
export const future = (value, now = new Date()) => Date.parse(value) > now.getTime()
export const newest = (items) => [...list(items)].sort((a, b) =>
  (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
export const money = (amount) => moneyValue(amount)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'
export const orderLabel = (order) => order?.reference ?? order?.id ?? 'Order unavailable'
export const dateText = (value) => Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Date unavailable'
export const addressText = (address) => [address?.line1, address?.line2,
  [address?.city, address?.region, address?.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')

const statusLabels = {
  preparing: 'Preparing', on_the_way: 'On the way', delivered: 'Delivered', collected: 'Collected',
  scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', requested: 'Requested',
  received: 'Received', refunded: 'Refunded', declined: 'Declined',
}
export const statusLabel = (status) => statusLabels[status] ?? (status ? String(status).replaceAll('_', ' ') : 'Status unavailable')
export const serviceLabel = (type) => type === 'assembly' ? 'Assembly' : type === 'delivery' ? 'Delivery' : 'Service'

export const serviceZone = 'America/New_York'
const zoneDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: serviceZone, year: 'numeric', month: '2-digit', day: '2-digit',
})

export function localDate(value = new Date()) {
  const parts = Object.fromEntries(zoneDate.formatToParts(value).map(({ type, value: part }) => [type, part]))
  return [parts.year, parts.month, parts.day].join('-')
}

function serviceTime(date, hour) {
  const utc = new Date(date + 'T' + String(hour).padStart(2, '0') + ':00:00Z')
  const zoneHour = Number(new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hourCycle: 'h23', timeZone: serviceZone,
  }).format(utc))
  utc.setUTCHours(utc.getUTCHours() + (hour - zoneHour + 24) % 24)
  return utc.toISOString()
}

export function serviceSlots(type, now = new Date()) {
  const start = Date.parse(localDate(now) + 'T00:00:00Z')
  return Array.from({ length: 7 }, (_, i) => new Date(start + (i + 1) * 86400000).toISOString().slice(0, 10))
    .flatMap((date) => [[9, 12, 'am'], [13, 16, 'pm']].map(([from, to, period]) => ({
      id: [type, date, period].join('-'), startsAt: serviceTime(date, from),
      endsAt: serviceTime(date, to), timeZone: serviceZone,
    })))
}

export function slotText(slot) {
  if (!Number.isFinite(Date.parse(slot?.startsAt)) || !Number.isFinite(Date.parse(slot?.endsAt))) return 'Time unavailable'
  try {
    const timeZone = slot.timeZone || serviceZone
    const start = new Date(slot.startsAt)
    const date = new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone,
    }).format(start)
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
    return date + ' · ' + time.format(start) + '–' + time.format(new Date(slot.endsAt))
  } catch {
    return 'Time unavailable'
  }
}

export function hasServiceAddress(address) {
  return ['line1', 'city', 'region'].every((key) => typeof address?.[key] === 'string' && address[key].trim())
    && /^\d{5}$/.test(address?.postalCode) && Number(address.postalCode) >= 501 && Number(address.postalCode) <= 99950
    && (!address.country || address.country === 'US')
}
