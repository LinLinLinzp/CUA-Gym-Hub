import { byVehicle, garage, list, normalize } from './display.js'
import { recordIdentity } from './identity.js'

export const blankAddress = { line1: '', line2: '', city: '', state: 'CA', zip: '' }
export const postalStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
  'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'AS', 'GU', 'MP', 'PR', 'VI',
]

export const completeAddress = (address) => Boolean(normalize(address?.line1) && normalize(address?.city) && normalize(address?.state) && normalize(address?.zip))
const addressKey = (address) => ['line1', 'line2', 'city', 'state', 'zip'].map((key) => normalize(address?.[key])).join('|')
const poBox = /\b(?:p\s*\.?\s*o\s*\.?\s*(?:box|b\.?)|post\s+office\s+box)\b/i

export function changeableVehicles(state) {
  return garage(state).map((vehicle) => ({ vehicle, registration: byVehicle(state, vehicle.id) }))
}

export function resolveTargets(state, draft) {
  const profile = state.profile
  const credential = draft.credentialId && profile?.credential?.id === draft.credentialId ? profile.credential : null
  const vehicleIds = [...new Set(list(draft.vehicleIds))]
  const vehicles = changeableVehicles(state)
  const selected = vehicleIds.map((id) => vehicles.find(({ vehicle }) => vehicle.id === id))

  if (!profile?.id || profile.canChangeAddressOnline !== true) return { error: 'Your MyDMV account is currently ineligible for an online address change.' }
  if (!draft.credentialId && !vehicleIds.length) return { error: 'Select at least one driver’s license, ID card or vehicle registration.' }
  if (draft.credentialId && (!credential || !completeAddress(credential.residentialAddress))) {
    return { error: 'A confirmed address is unavailable for this driver’s license or ID card.' }
  }
  if (vehicleIds.length > 3) return { error: 'Select up to three vehicle registrations per request.' }
  if (selected.some((target) => !target?.registration?.id || !completeAddress(target.registration.residentialAddress))) {
    return { error: 'A selected vehicle registration is unavailable or lacks a confirmed address.' }
  }
  if (new Set(selected.map(({ registration }) => addressKey(registration.residentialAddress))).size > 1) {
    return { error: 'Selected vehicles must have the same current residential address. Submit a separate request for vehicles at a different address.' }
  }

  return { credential, selected }
}

export function readAddress(input, { residential = false, california = false } = {}) {
  const line1 = String(input?.line1 ?? '').trim()
  const line2 = String(input?.line2 ?? '').trim()
  const city = String(input?.city ?? '').trim()
  const state = String(input?.state ?? '').trim().toUpperCase()
  const zip = String(input?.zip ?? '').trim()
  const errors = {}

  if (!line1) errors.line1 = residential ? 'Enter a residential street address.' : 'Enter a mailing address.'
  else if (residential && (poBox.test(line1) || poBox.test(line2) || !/^\d+[A-Z]?(?:[-/]\d+[A-Z]?)?\s+\S/i.test(line1))) {
    errors.line1 = 'Enter a street address for the residence. Use the mailing address field for a PO box.'
  }
  if (!city) errors.city = 'Enter a city.'
  if (!postalStates.includes(state)) errors.state = 'Select a state or territory.'
  else if (california && state !== 'CA') errors.state = 'A California commercial driver’s license requires a California residential address.'
  if (!/^\d{5}(?:-\d{4})?$/.test(zip)) errors.zip = 'Enter a 5-digit ZIP code or ZIP+4.'

  return { errors, address: { line1, ...(line2 ? { line2 } : {}), city, state, zip } }
}

export function proposedAddresses(draft, credential) {
  const residential = readAddress(draft.residential, { residential: true, california: credential?.type === 'CDL' })
  const mailing = draft.separate ? readAddress(draft.mailing) : null
  return { residential, mailing }
}

export function submitAddressChange(state, draft) {
  const targets = resolveTargets(state, draft)
  if (targets.error) throw new Error(targets.error)
  const { selected, credential } = targets
  const { residential, mailing } = proposedAddresses(draft, credential)
  if (Object.keys(residential.errors).length || mailing && Object.keys(mailing.errors).length) {
    throw new Error('Check the new address before submitting your request.')
  }
  const previousAddresses = [
    ...(credential ? [{ type: 'credential', id: credential.id, residentialAddress: credential.residentialAddress, mailingAddress: credential.mailingAddress ?? null }] : []),
    ...selected.map(({ registration }) => ({
      type: 'registration', id: registration.id, residentialAddress: registration.residentialAddress, mailingAddress: registration.mailingAddress ?? null,
    })),
  ]
  const record = {
    ...recordIdentity(state.addressChangeRequests, 'coa', 'COA'), actorId: state.profile.id,
    credentialId: credential?.id ?? null, vehicleIds: selected.map(({ vehicle }) => vehicle.id),
    registrationIds: selected.map(({ registration }) => registration.id), previousAddresses,
    newResidentialAddress: residential.address, newMailingAddress: mailing?.address ?? null,
    status: 'submitted', createdAt: new Date().toISOString(),
  }
  return { next: { ...state, addressChangeRequests: [...list(state.addressChangeRequests), record] }, record }
}
