export const list = (value) => Array.isArray(value) ? value.filter((item) => item != null) : []
export const find = (value, id) => id ? list(value).find((item) => item.id === id) : undefined
export const identified = (value) => list(value).filter((item) => typeof item.id === 'string' && item.id)
export const patientName = (state, id) => find(state.patients, id)?.name || 'Patient unavailable'
export const storeName = (store) => store?.name || (store?.storeNumber ? 'Pharmacy #' + store.storeNumber : 'Pharmacy unavailable')
export const address = (store) => [
  store?.address?.street, store?.address?.city,
  [store?.address?.region, store?.address?.postalCode].filter(Boolean).join(' '),
].filter(Boolean).join(', ') || 'Address unavailable'
export const money = (amount) => Number.isFinite(amount) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'
export const medication = (rx) => [rx?.medication, rx?.strength].filter(Boolean).join(' ') || 'Medication unavailable'
export const actor = (state) => typeof state.account?.id === 'string' && state.account.id ? state.account.id : null
export const initials = (name) => (name || 'Account').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
export const validDate = (value) => !!value && Number.isFinite(Date.parse(value))
const utcDate = (date) => date.toISOString().slice(0, 10)
const pickupActive = new Set(['preparing', 'ready', 'checked_in'])

export function timeZone(store) {
  try {
    if (typeof store?.timeZone !== 'string' || !store.timeZone) return undefined
    new Intl.DateTimeFormat('en-US', { timeZone: store.timeZone })
    return store.timeZone
  } catch {
    return undefined
  }
}

export function dateLabel(value) {
  if (!validDate(value)) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

export function instantLabel(value, store, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!validDate(value)) return '—'
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timeZone(store) || 'UTC' }).format(new Date(value))
}

export function windowLabel(window, store) {
  if (!validDate(window?.startsAt)) return 'Pickup time unavailable'
  const start = instantLabel(window.startsAt, store)
  return validDate(window.endsAt) ? start + ' – ' + instantLabel(window.endsAt, store, { timeStyle: 'short' }) : start
}

function wallClock(instant, zone) {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  const { year, month, day, hour, minute, second } = Object.fromEntries(format.formatToParts(instant).map(({ type, value }) => [type, value]))
  return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second
}

export function todayAt(store, now) {
  return wallClock(now, timeZone(store) || 'UTC').slice(0, 10)
}

export function localInstant(day, time, zone) {
  const local = day + 'T' + time + ':00'
  const target = Date.parse(local + 'Z')
  let candidate = target
  for (let attempt = 0; attempt < 3; attempt++) {
    const shown = wallClock(new Date(candidate), zone)
    if (shown === local) return new Date(candidate).toISOString()
    candidate += target - Date.parse(shown + 'Z')
  }
  return null
}

export function daysFrom(day, offset) {
  const date = new Date(day + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return utcDate(date)
}

function schedule(store, now, field, days) {
  const zone = timeZone(store)
  const times = [...new Set(list(store?.[field]).filter((time) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)))].sort()
  const serviceDays = list(store?.serviceDays)
  if (!zone || !times.length || !serviceDays.length) return []
  const today = todayAt(store, now)
  return Array.from({ length: days }, (_, offset) => daysFrom(today, offset)).flatMap((day) => {
    if (!serviceDays.includes(new Date(day + 'T00:00:00Z').getUTCDay())) return []
    return times.flatMap((time) => {
      const instant = localInstant(day, time, zone)
      return instant && Date.parse(instant) > now.getTime() ? [{ day, instant }] : []
    })
  })
}

export const pickupSlots = (store, now) => schedule(store, now, 'pickupWindowStarts', 7)
export const pickupWindow = (startsAt) => ({ startsAt, endsAt: new Date(Date.parse(startsAt) + 3600000).toISOString() })
export const isUpcoming = (visit, now) => visit?.status === 'scheduled' && Date.parse(visit.scheduledFor) > now.getTime()
export const isActivePickup = (order) => pickupActive.has(order?.status)
export const offers = (store, vaccineIds) => vaccineIds.length > 0 && vaccineIds.every((id) => list(store?.vaccineIds).includes(id))

export function vaccineSlots(state, store, patientId, now, editing) {
  if (!store?.id || !patientId) return []
  const held = new Set(list(state.vaccineAppointments)
    .filter((visit) => visit.status === 'scheduled' && visit.id !== editing?.id && (visit.patientId === patientId || visit.storeId === store.id))
    .map((visit) => Date.parse(visit.scheduledFor)))
  if (editing?.storeId === store.id) held.add(Date.parse(editing.scheduledFor))
  return schedule(store, now, 'vaccineSlotTimes', 14).filter(({ instant }) => !held.has(Date.parse(instant)))
}

export function refillReason(state, rx, now) {
  if (!rx) return 'Prescription unavailable'
  if (rx.hidden) return 'Hidden prescription'
  if (rx.status !== 'active') return 'Inactive prescription'
  if (!find(state.patients, rx.patientId) || !rx.id || !rx.rxNumber || !rx.medication ||
      !Number.isInteger(rx.quantity) || rx.quantity < 1 || !Number.isFinite(rx.estimatedCopay) || rx.estimatedCopay < 0 ||
      !validDate(rx.expiresOn) || !validDate(rx.nextRefillOn) || !Number.isInteger(rx.refillsRemaining)) return 'Prescription details unavailable'
  const today = todayAt(find(state.stores, rx.storeId), now)
  if (rx.expiresOn < today) return 'Prescription expired'
  if (rx.refillsRemaining < 1) return 'No refills remaining'
  if (rx.nextRefillOn > today) return 'Too early · available ' + dateLabel(rx.nextRefillOn)
  const contains = (order) => list(order.items).some((item) => item.prescriptionId === rx.id)
  if (list(state.pickupOrders).some((order) => isActivePickup(order) && contains(order))) return 'Already in an open order'
  if (list(state.refillOrders).some((order) => {
    if (order.status !== 'submitted' || !contains(order)) return false
    const pickup = find(state.pickupOrders, order.pickupOrderId)
    return !pickup || isActivePickup(pickup)
  })) return 'Already in an open order'
  return ''
}

export const lineItem = (rx) => ({
  prescriptionId: rx.id, rxNumber: rx.rxNumber, medication: rx.medication, strength: rx.strength || '',
  quantity: rx.quantity, unit: rx.unit || '', estimatedAmount: Math.round(rx.estimatedCopay * 100) / 100,
})
export const totalFor = (items) => items.reduce((sum, item) => sum + Math.round(item.estimatedAmount * 100), 0) / 100
export function uniqueId(prefix) {
  const words = globalThis.crypto.getRandomValues(new Uint32Array(4))
  return prefix + '-' + Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('')
}
export const codeFor = (id, prefix) => prefix + id.slice(-8).toUpperCase()
export const replaceRecord = (records, id, fields) => records.map((record) => record?.id === id ? { ...record, ...fields } : record)
