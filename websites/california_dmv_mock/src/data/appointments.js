import { byId, list, normalize, owned, pacificNow, services, timeZone } from './display.js'
import { recordIdentity } from './identity.js'

export const blankContact = { firstName: '', lastName: '', phone: '', email: '' }

export const phoneDigits = (value) => {
  const phone = String(value ?? '').trim().replace(/[\s.+()-]/g, '').replace(/^1(?=\d{10}$)/, '')
  return /^\d{10}$/.test(phone) ? phone : ''
}

export function readContact(input) {
  const firstName = String(input?.firstName ?? '').trim()
  const lastName = String(input?.lastName ?? '').trim()
  const phone = phoneDigits(input?.phone)
  const email = String(input?.email ?? '').trim()
  const errors = {}
  if (!firstName) errors.firstName = 'Enter a first name.'
  if (!lastName) errors.lastName = 'Enter a last name.'
  if (!phone) errors.phone = 'Enter a valid 10-digit phone number.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  return { errors, contact: { firstName, lastName, phone, ...(email ? { email } : {}) } }
}

export function officeMatches(office, search) {
  const term = normalize(search)
  return !term || [office?.name, office?.address?.city].some((value) => normalize(value).includes(term))
    || String(office?.address?.zip ?? '').startsWith(term)
}

export function appointmentMoment(record) {
  return `${record?.date || ''}T${record?.time || ''}`
}

export function isFuture(record, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record?.date ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(record?.time ?? '')) return false
  const parsed = new Date(`${record.date}T12:00Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== record.date) return false
  return appointmentMoment(record) > appointmentMoment(pacificNow(now))
}

export function availableSlots(state, office, service, now = new Date()) {
  if (!office?.id || !list(office.serviceTypes).includes(service)) return []
  const occupied = new Set(list(state.appointments).filter((record) => record?.status === 'scheduled').map((record) => record.slotId))
  return list(state.appointmentSlots).filter((slot) => slot?.id && slot.officeId === office.id
    && list(slot.serviceTypes).includes(service) && !occupied.has(slot.id) && isFuture(slot, now))
    .sort((a, b) => appointmentMoment(a).localeCompare(appointmentMoment(b)))
}

export function findAppointments(state, contact) {
  return owned(state, 'appointments').filter((record) => {
    const saved = record.contact
    return normalize(saved?.firstName) === normalize(contact.firstName)
      && normalize(saved?.lastName) === normalize(contact.lastName)
      && phoneDigits(saved?.phone) === contact.phone
      && (!contact.email || normalize(saved?.email) === normalize(contact.email))
  })
}

export function bookAppointment(state, draft) {
  const now = new Date()
  const actorId = state.profile?.id
  const office = byId(state.offices, draft.officeId)
  const slot = availableSlots(state, office, draft.service, now).find((item) => item.id === draft.slotId)
  const { errors, contact } = readContact(draft.contact)
  if (!actorId) throw new Error('Your MyDMV profile is unavailable.')
  if (!slot || !Object.hasOwn(services, draft.service)) throw new Error('That appointment time is no longer available. Choose another date or time.')
  if (Object.keys(errors).length) throw new Error('Check your contact information before confirming.')
  const record = {
    ...recordIdentity(state.appointments, 'appt', 'APT'), actorId, serviceType: draft.service, officeId: office.id, slotId: slot.id,
    date: slot.date, time: slot.time, timeZone, contact, status: 'scheduled', createdAt: now.toISOString(),
  }
  return { next: { ...state, appointments: [...list(state.appointments), record] }, record }
}

export function cancelAppointment(state, id) {
  const now = new Date()
  const match = byId(owned(state, 'appointments'), id)
  if (match?.status !== 'scheduled' || !isFuture(match, now)) throw new Error('This appointment is no longer available for cancellation.')
  const record = { ...match, status: 'cancelled', cancelledAt: now.toISOString() }
  return { next: { ...state, appointments: list(state.appointments).map((item) => item === match ? record : item) }, record }
}
