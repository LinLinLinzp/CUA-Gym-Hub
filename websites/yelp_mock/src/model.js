export const records = (world, key) => Array.isArray(world[key])
  ? world[key].filter(record => typeof record?.id === 'string' && record.id.length > 0) : []
export const find = (world, key, id) => records(world, key).find(record => record.id === id)
export const own = (world, key) => records(world, key).filter(record => world.currentUserId && record.userId === world.currentUserId)
export const actor = world => find(world, 'users', world.currentUserId)
export const businessName = business => business?.name || 'Unknown business'
export const collectionName = collection => collection?.name || 'Untitled collection'
export const activeCollections = world => own(world, 'collections').filter(item => item.status === 'active')
export function saved(world) {
  const collectionIds = new Set(activeCollections(world).map(collection => collection.id))
  return own(world, 'bookmarks').filter(item => item.status === 'saved' && collectionIds.has(item.collectionId))
}
export const published = world => own(world, 'reviews').filter(item => item.status === 'published')
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}
export const newId = prefix => `${prefix}_${randomToken()}`
export const stamp = () => new Date().toISOString()
export const append = (world, key, record) => ({ ...world, [key]: [...(Array.isArray(world[key]) ? world[key] : []), record] })
export const update = (world, key, id, change) => ({
  ...world, [key]: world[key].map(record => record?.id === id ? { ...record, ...change } : record),
})
export const statusDate = record => record.updatedAt || record.createdAt || ''
export const dated = (a, b) => String(statusDate(b)).localeCompare(String(statusDate(a))) || a.id.localeCompare(b.id)
export const compareCreated = (a, b, oldestFirst = false) =>
  (oldestFirst ? 1 : -1) * String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || a.id.localeCompare(b.id)
export const matches = (term, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(term.trim().toLowerCase()))
export const services = business => Array.isArray(business?.quoteServices)
  ? [...new Set(business.quoteServices.filter(value => typeof value === 'string' && value.trim()))] : []

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

const validTime = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

export function localClock(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const { year, month, day, hour, minute } = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

export function policyFor(business) {
  const policy = business?.reservationPolicy
  if (!policy || typeof policy.timeZone !== 'string' || !policy.timeZone ||
      !Number.isInteger(policy.maxPartySize) || policy.maxPartySize < 1 ||
      !Array.isArray(policy.openWeekdays) || !Array.isArray(policy.slotTimes)) return null
  try { localClock(policy.timeZone) } catch { return null }
  const openWeekdays = policy.openWeekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  const slotTimes = [...new Set(policy.slotTimes.filter(validTime))]
  return openWeekdays.length && slotTimes.length ? { ...policy, openWeekdays, slotTimes } : null
}

export function futureSlot(record, business) {
  if (!validDate(record.date) || !validTime(record.time)) return false
  let clock
  try { clock = localClock(business?.reservationPolicy?.timeZone || 'America/Los_Angeles') }
  catch { clock = localClock('America/Los_Angeles') }
  return `${record.date}T${record.time}` > `${clock.date}T${clock.time}`
}

const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

export function availableSlots(world, business, { date, time, partySize }, excludeId) {
  const policy = policyFor(business)
  if (!policy || !validDate(date) || !validTime(time) || !Number.isInteger(partySize) ||
      partySize < 1 || partySize > policy.maxPartySize ||
      !policy.openWeekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())) return []
  const occupied = new Set(records(world, 'reservations').filter(item =>
    item.id !== excludeId && item.businessId === business.id && item.date === date && item.status === 'confirmed',
  ).map(item => item.time))
  const clock = localClock(policy.timeZone)
  return policy.slotTimes.filter(slot => !occupied.has(slot) && `${date}T${slot}` > `${clock.date}T${clock.time}`)
    .sort((a, b) => Math.abs(minutes(a) - minutes(time)) - Math.abs(minutes(b) - minutes(time)) || a.localeCompare(b))
}

export function displayDate(value) {
  if (typeof value !== 'string' || !value) return 'Date unavailable'
  const isDay = /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (isDay && !validDate(value)) return 'Date unavailable'
  const date = new Date(isDay ? `${value}T12:00:00Z` : value)
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' :
    new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

export function displayTime(value) {
  if (!validTime(value)) return 'Time unavailable'
  const hours = Number(value.slice(0, 2))
  return `${hours % 12 || 12}:${value.slice(3)} ${hours < 12 ? 'AM' : 'PM'}`
}
