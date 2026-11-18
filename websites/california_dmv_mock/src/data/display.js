export const timeZone = 'America/Los_Angeles'

export const services = {
  real_id_first_time: 'First-time REAL ID',
  dl_id_office_application: 'Driver’s license or ID card application',
  dl_id_office_renewal: 'Driver’s license or ID card renewal',
  automobile_drive_test: 'Automobile drive test',
  commercial_drive_test: 'Commercial drive test',
  motorcycle_drive_test: 'Motorcycle drive test',
}

export const labelService = (key) => services[key] || 'DMV appointment'
export const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
export const cleanId = (value) => String(value ?? '').trim().toUpperCase()
export const list = (value) => Array.isArray(value) ? value : []
export const byId = (value, id) => id ? list(value).find((record) => record?.id === id) : undefined
export const byVehicle = (state, id) => id ? list(state.registrations).find((record) => record?.vehicleId === id) : undefined
export const owned = (state, collection) => list(state[collection]).filter((record) => state.profile?.id && record?.actorId === state.profile.id)
export const garage = (state) => list(state.profile?.garageVehicleIds)
  .map((id) => byId(state.vehicles, id))
  .filter((vehicle) => vehicle && state.profile?.id && vehicle.ownerId === state.profile.id)
export const fullName = (contact) => [contact?.firstName, contact?.lastName].filter(Boolean).join(' ')
export const vehicleName = (vehicle) => [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle'
export const addressParts = (address) => [
  address?.line1,
  address?.line2,
  [address?.city, [address?.state, address?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
].filter(Boolean)
export const addressLine = (address) => addressParts(address).join(', ') || 'Address unavailable'

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })
const timestampFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone })
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function pacificNow(now = new Date()) {
  const parts = Object.fromEntries(clockFormat.formatToParts(now).map(({ type, value }) => [type, value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

export function showDate(value) {
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormat.format(date)
}

export function showTimestamp(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : timestampFormat.format(date)
}

export function showTime(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value ?? '')) return 'Time unavailable'
  const [hour, minute] = value.split(':')
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? 'AM' : 'PM'}`
}

export function showPhone(value) {
  const digits = String(value ?? '')
  return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') || 'Not provided'
}

export const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const showMoney = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? dollars.format(Number(value)) : 'Unavailable'
export const newestFirst = (a, b) => String(b?.createdAt ?? '').localeCompare(String(a?.createdAt ?? ''))
