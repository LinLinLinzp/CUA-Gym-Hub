import { list } from './format.js'

const formatters = new Map()
const hour = 60 * 60 * 1000
const day = 24 * hour
const halfHour = hour / 2

function localEpoch(timestamp, timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
    }))
  }
  const parts = Object.fromEntries(formatters.get(timeZone).formatToParts(timestamp).map(part => [part.type, Number(part.value)]))
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

export function localMidnight(now, timeZone) {
  const local = localEpoch(now.getTime(), timeZone)
  return local - local % day
}

function localToInstants(local, timeZone, offsets) {
  return offsets.map(offset => local - offset).filter(instant => localEpoch(instant, timeZone) === local)
}

export function availableDays(restaurant, now = new Date(), excludedStart) {
  const { timeZone } = restaurant ?? {}
  if (!timeZone) return []
  try {
    const firstDay = localMidnight(now, timeZone)
    const hours = list(restaurant.deliveryHours)
    return Array.from({ length: 5 }, (_, index) => {
      const date = firstDay + index * day
      const offsets = [...new Set([-day, 0, day].map(delta => localEpoch(date + delta, timeZone) - (date + delta)))]
      const weekday = new Date(date).getUTCDay()
      const windows = new Map()
      for (const range of hours) {
        if (!Array.isArray(range.days) || !range.days.includes(weekday)) continue
        const open = dayMinutes(range.opensAt)
        const close = dayMinutes(range.closesAt)
        for (let minute = Math.ceil(open / 30) * 30; minute + 30 <= close; minute += 30) {
          const localStart = date + minute * 60000
          for (const instant of localToInstants(localStart, timeZone, offsets)) {
            if (instant < now.getTime() + 2 * hour || localEpoch(instant + halfHour, timeZone) !== localStart + halfHour) continue
            const windowStartAt = new Date(instant).toISOString()
            if (instant === Date.parse(excludedStart)) continue
            windows.set(instant, { windowStartAt, windowEndAt: new Date(instant + halfHour).toISOString() })
          }
        }
      }
      return { date: new Date(date).toISOString().slice(0, 10), windows: [...windows.entries()].sort(([a], [b]) => a - b).map(([, window]) => window) }
    })
  } catch (error) {
    if (error instanceof RangeError) return []
    throw error
  }
}

function dayMinutes(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) return NaN
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function upcoming(delivery, now = new Date()) {
  const start = Date.parse(delivery?.windowStartAt)
  const end = Date.parse(delivery?.windowEndAt)
  if (delivery?.status !== 'scheduled' || !(start > now.getTime()) || end !== start + halfHour || !delivery.timeZone) return false
  try {
    return Number.isFinite(localEpoch(start, delivery.timeZone))
  } catch (error) {
    if (error instanceof RangeError) return false
    throw error
  }
}

export function schedulePermissions(delivery, order, now = new Date()) {
  const cancel = upcoming(delivery, now) && order?.status === 'scheduled' && !delivery.confirmedAt
  return {
    cancel,
    reschedule: cancel && Date.parse(delivery.windowStartAt) - now.getTime() >= 4 * hour,
  }
}

export function scheduleFor(state, order) {
  const deliveries = list(state.scheduledDeliveries)
  return (order.scheduledDeliveryId && deliveries.find(delivery => delivery.id === order.scheduledDeliveryId && delivery.orderId === order.id))
    || deliveries.find(delivery => delivery.orderId === order.id)
}

export function orderFor(state, delivery) {
  return delivery.orderId && list(state.orders).find(order => order.id === delivery.orderId)
}

export function findSlot(restaurant, start, now, excludedStart) {
  return availableDays(restaurant, now, excludedStart).flatMap(entry => entry.windows).find(slot => slot.windowStartAt === start)
}
