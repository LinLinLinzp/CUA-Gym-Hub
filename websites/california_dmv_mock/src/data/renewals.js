import { addressParts, byId, byVehicle, cleanId, list, newestFirst, normalize } from './display.js'
import { recordIdentity } from './identity.js'

export const paymentLabels = { card: 'Credit or debit card', bank_account: 'Bank account' }
export const blankIdentifiers = { plate: '', suffix: '', owner: '' }

export function identifyVehicle(state, input, method = 'suffix') {
  const plate = cleanId(input.plate)
  const suffix = cleanId(input.suffix)
  const owner = normalize(input.owner)
  const errors = {}
  if (!/^[A-Z0-9]{1,8}$/.test(plate)) errors.plate = 'Enter 1–8 letters or numbers from your license plate or CF number.'
  if (method === 'suffix' && !/^(?:[A-Z0-9]{2,3}|[A-Z0-9]{5})$/.test(suffix)) errors.suffix = 'Enter your five-character VIN or HIN suffix, or the last two or three characters for a short HIN.'
  if (method === 'owner' && !owner) errors.owner = 'Enter the registered owner’s last name or the full business name.'
  if (Object.keys(errors).length) return { errors }

  const vehicle = list(state.vehicles).find((record) => record?.id && cleanId(record.plateNumber) === plate
    && (method === 'owner' ? normalize(record.registeredOwnerLookupName) === owner
      : (suffix.length === 5 || record.type === 'vessel') && cleanId(record.vinHinSuffix) === suffix))
  return { errors, vehicle }
}

export function latestRenewal(state, vehicleId) {
  if (!vehicleId) return undefined
  return list(state.registrationRenewals).filter((record) => record?.vehicleId === vehicleId)
    .sort(newestFirst)[0]
}

const centsOf = (value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)) ? Math.round(Number(value) * 100) : NaN
const money = (cents) => (cents / 100).toFixed(2)

function price(feeLines) {
  if (!Array.isArray(feeLines) || !feeLines.length) return null
  const feeAmounts = feeLines.map((line) => {
    const unit = centsOf(line?.unitAmount)
    const amount = centsOf(line?.amount)
    if (!line?.code || !line.label || !Number.isSafeInteger(line.quantity) || line.quantity < 1
      || !Number.isSafeInteger(unit) || !Number.isSafeInteger(amount) || unit * line.quantity !== amount) return null
    return { code: line.code, label: line.label, quantity: line.quantity, unitAmount: money(unit), amount: money(amount) }
  })
  if (feeAmounts.some((line) => !line)) return null
  const subtotalCents = feeAmounts.reduce((sum, line) => sum + centsOf(line.amount), 0)
  return Number.isSafeInteger(subtotalCents * 195) ? { feeLines: feeAmounts, subtotalCents } : null
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
  const parsed = new Date(`${value}T12:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export function getRenewal(state, vehicleId, requestedOfferId) {
  const vehicle = byId(state.vehicles, vehicleId)
  const registration = byVehicle(state, vehicleId)
  if (!vehicle || !registration?.id) return { error: 'No registration was found for this vehicle.' }

  const offer = registration.renewalOffer
  const alreadyPaid = list(state.registrationRenewals).some((record) => record?.registrationId === registration.id
    && (offer?.id ? record.offerId === offer.id : record.newExpirationDate === registration.expirationDate))
  if (alreadyPaid || !offer && registration.lastRenewalId) return { error: 'This registration has already been renewed. Check its registration status for details.' }
  if (registration.insuranceStatus === 'missing') return { error: 'Insurance information is missing. Have your insurance information updated before renewing online.' }
  if (registration.smogStatus === 'missing') return { error: 'A required smog certification is missing. Complete your smog check before renewing online.' }
  if (!offer?.id) return { error: 'There is no online renewal offer for this registration.' }
  if (requestedOfferId && requestedOfferId !== offer.id) return { error: 'Your renewal offer has changed. Start again to see the current fees.' }
  const fees = price(offer.feeLines)
  if (!fees || !validDate(registration.expirationDate) || !validDate(offer.termEndDate) || offer.termEndDate <= registration.expirationDate) {
    return { error: 'Online renewal details are unavailable for this registration.' }
  }
  const mailingAddress = registration.mailingAddress ?? registration.residentialAddress
  if (!addressParts(mailingAddress).length || !mailingAddress.line1 || !mailingAddress.city || !mailingAddress.state || !mailingAddress.zip) {
    return { error: 'A confirmed mailing address is unavailable for this registration.' }
  }

  return { vehicle, registration, offer, mailingAddress, ...fees }
}

export function totals({ subtotalCents }, method) {
  const fee = method === 'card' ? Math.round(subtotalCents * 195 / 10000) : 0
  return { subtotal: money(subtotalCents), processingFee: money(fee), total: money(subtotalCents + fee) }
}

export function payRenewal(state, draft) {
  const actorId = state.profile?.id
  if (!actorId) throw new Error('Your MyDMV profile is unavailable.')
  if (!draft.inCart || !draft.offerId || !Object.hasOwn(paymentLabels, draft.method)) throw new Error('Choose a payment method before paying.')
  const renewal = getRenewal(state, draft.vehicleId, draft.offerId)
  if (renewal.error) throw new Error(renewal.error)
  const { vehicle, registration, offer, feeLines, mailingAddress } = renewal
  if (draft.registrationId !== registration.id) throw new Error('Your registration has changed. Start again to review the current renewal.')
  const record = {
    ...recordIdentity(state.registrationRenewals, 'rnw', 'RNL'),
    actorId, vehicleId: vehicle.id, registrationId: registration.id, offerId: offer.id,
    previousExpirationDate: registration.expirationDate, newExpirationDate: offer.termEndDate,
    feeLines, ...totals(renewal, draft.method), paymentMethod: draft.method, mailingAddress,
    status: 'paid', createdAt: new Date().toISOString(),
  }
  const registrations = list(state.registrations).map((item) => item === registration ? {
    ...item, expirationDate: record.newExpirationDate, status: 'active', renewalOffer: null, lastRenewalId: record.id,
  } : item)
  return { next: { ...state, registrations, registrationRenewals: [...list(state.registrationRenewals), record] }, record }
}
