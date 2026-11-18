import { array, find, heldReservation, hours, time } from './model.js'

export function slotAvailability(state, slot, now = new Date(), omitId) {
  if (!slot || slot.enabled === false || time(slot.startAt) <= +now || !Number.isFinite(time(slot.startAt))) return 0
  if (!find(state.stores, slot.storeId)?.pickupEnabled) return 0
  const used = array(state.pickupReservations).filter(reservation => reservation.id !== omitId &&
    reservation.slotId === slot.id && reservation.storeId === slot.storeId &&
    (reservation.status === 'booked' || (reservation.status === 'held' && time(reservation.expiresAt) > +now))).length
  return Math.max(0, (Number(slot.capacity) || 0) - (Number(slot.filled) || 0) - used)
}

export const releaseRecord = (reservation, reason, context) => ({
  ...reservation, ...context.touch, status: 'released', releaseReason: reason,
})

export function changeHold(state, { slotId, storeId, release }, context) {
  const previous = heldReservation(state)
  const cart = state.cart ?? {}
  const reservations = array(state.pickupReservations)
  if (release) {
    if (!cart.pickupReservationId) return { error: 'There is no pickup reservation to release.' }
    return {
      state: {
        ...state,
        cart: { ...cart, pickupReservationId: null },
        pickupReservations: reservations.map(record => record === previous ? releaseRecord(record, 'user_released', context) : record),
      },
    }
  }

  const slot = find(state.pickupSlots, slotId)
  if (!slot || slot.storeId !== storeId || !slotAvailability(state, slot, context.now, previous?.id)) return { error: 'This time is no longer available. Choose another window.' }
  if (previous?.slotId === slot.id && previous?.storeId === storeId && time(previous.expiresAt) > +context.now) return { error: 'This time is already reserved for your cart.' }

  const booking = {
    id: context.id('reservation'), cartId: cart.id || `cart-${context.actorId}`, slotId, storeId,
    status: 'held', fee: Number(slot.fee) || 0,
    expiresAt: new Date(Math.min(+context.now + hours, time(slot.startAt))).toISOString(),
    ...context.created,
  }
  return {
    state: {
      ...state,
      cart: { ...cart, id: booking.cartId, pickupReservationId: booking.id },
      pickupReservations: [...reservations.map(record => record === previous ? releaseRecord(record, 'changed', context) : record), booking],
    },
  }
}

const twoDigits = value => String(value).padStart(2, '0')
const zonedFormat = (value, zone, options) => {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: zone }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(value))
  }
}

export function storeDate(value, zone) {
  if (!Number.isFinite(time(value))) return ''
  const [month, date, year] = zonedFormat(value, zone, { year: 'numeric', month: 'numeric', day: 'numeric' }).split('/')
  return `${year}-${twoDigits(month)}-${twoDigits(date)}`
}

export function windowTime(slot, timezone) {
  if (!Number.isFinite(time(slot?.startAt))) return 'Window unavailable'
  const format = value => zonedFormat(value, timezone, { hour: 'numeric', minute: '2-digit' })
  return Number.isFinite(time(slot.endAt)) ? `${format(slot.startAt)}–${format(slot.endAt)}` : format(slot.startAt)
}

export function windowLabel(slot, timezone) {
  if (!Number.isFinite(time(slot?.startAt))) return 'Window unavailable'
  const date = zonedFormat(slot.startAt, timezone, { weekday: 'short', month: 'short', day: 'numeric' })
  return `${date}, ${windowTime(slot, timezone)}`
}

export function dateStripLabel(date, timezone, now) {
  if (date === storeDate(now, timezone)) return 'Today'
  return zonedFormat(`${date}T12:00:00Z`, 'UTC', { weekday: 'short' })
}

export function zonedTime(date, hour, timezone) {
  const local = new Date(`${date}T${twoDigits(hour)}:00:00Z`)
  let adjustment = 0
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const instant = new Date(+local + adjustment)
    const calendarDay = storeDate(instant, timezone)
    const hourMinute = zonedFormat(instant, timezone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    adjustment += +local - +new Date(`${calendarDay}T${hourMinute}:00Z`)
  }
  return new Date(+local + adjustment).toISOString()
}
