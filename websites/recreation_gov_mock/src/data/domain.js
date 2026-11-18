export const rows = (value) => Array.isArray(value) ? value.filter((row) => row && typeof row === 'object') : []
export const find = (value, id) => id ? rows(value).find((row) => row.id === id) : undefined
export const owns = (state, row) => Boolean(state.account?.id && row?.actorId === state.account.id)
export const words = (...parts) => parts.filter(Boolean).join(' ')
export const matches = (query, ...parts) => words(...parts).toLowerCase().includes(query.trim().toLowerCase())
export const isCamp = (row) => row?.kind === 'campsite'
export const typeLabel = (row) => isCamp(row) ? 'Campsite' : row?.kind === 'permit' ? 'Permit' : 'Reservation'
export const dateValue = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN
  const result = Date.parse(value)
  return Number.isFinite(result) && new Date(result).toISOString().slice(0, 10) === value ? result : NaN
}
const day = 86_400_000
export const daysBetween = (first, second) => (dateValue(second) - dateValue(first)) / day
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const formatDate = (value) => Number.isFinite(dateValue(value)) ? dateFormat.format(dateValue(value)) : 'Date unavailable'
export const dateSpan = (row) => row?.endDate ? `${formatDate(row.startDate)} – ${formatDate(row.endDate)}` : formatDate(row?.startDate)
export const formatTime = (value) => {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Date unavailable'
  return `${dateFormat.format(time)} at ${new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'UTC' }).format(time)} UTC`
}
const dayFormats = new Map()
export function today(timeZone, now = new Date()) {
  const zone = timeZone || 'UTC'
  if (!dayFormats.has(zone)) {
    try {
      dayFormats.set(zone, new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone }))
    } catch {
      return today('UTC', now)
    }
  }
  const parts = Object.fromEntries(dayFormats.get(zone).formatToParts(now).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
const cents = (amount) => {
  if (!['string', 'number'].includes(typeof amount) || String(amount).trim() === '') return NaN
  const value = Math.round(Number(amount) * 100)
  return Number.isSafeInteger(value) && Number(amount) >= 0 ? value : NaN
}
const dollars = (amount) => amount / 100
export const money = (amount, currency = 'USD') => {
  if (!Number.isFinite(cents(amount))) return 'Unavailable'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
  } catch {
    return `${Number(amount).toFixed(2)} ${currency}`
  }
}
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0
const fail = (error) => ({ error })

export function reservationView(reservation, facility, now = new Date()) {
  if (reservation.status === 'cancelled') return 'Cancelled'
  const boundary = isCamp(reservation) ? reservation.endDate : reservation.startDate
  if (reservation.status !== 'confirmed' || !Number.isFinite(dateValue(boundary))) return 'Past'
  const current = today(facility?.timeZone, now)
  return boundary < current || (isCamp(reservation) && boundary === current) ? 'Past' : 'Upcoming'
}

export function lotteryWindow(lottery, now = new Date()) {
  const opens = Date.parse(lottery.opensAt)
  const closes = Date.parse(lottery.closesAt)
  if (!Number.isFinite(opens) || !Number.isFinite(closes) || opens >= closes) return 'Closed'
  if (now < opens) return 'Upcoming'
  return now < closes ? 'Open' : 'Closed'
}

const confirmedAt = (state, unit, kind) => rows(state.reservations).filter((row) =>
  row.status === 'confirmed' && row.kind === kind && row.unitId === unit.id)
export const quotaLeft = (state, unit, date) => positiveInteger(unit?.dailyQuota)
  ? Math.max(0, unit.dailyQuota - confirmedAt(state, unit, 'permit').reduce((total, row) =>
    total + (row.startDate === date ? Number(row.partySize || row.quantity) || 0 : 0), 0))
  : null

export function inventoryError(state, facility, unit, draft, now = new Date(), claim = false) {
  const { startDate, endDate, partySize, equipment } = draft
  if (!facility?.id || !unit?.id || unit.facilityId !== facility.id ||
      unit.kind !== facility.kind || !['campsite', 'permit'].includes(facility.kind) ||
      (!claim && unit.allocation === 'lottery')) return 'This site or entry point is unavailable.'
  if (!positiveInteger(partySize) || !positiveInteger(unit.maxPartySize) || partySize > unit.maxPartySize) {
    return 'Choose a party size within the limit for this site or entry point.'
  }
  const camping = isCamp(facility)
  const minimum = today(facility.timeZone, now)
  if (!Number.isFinite(dateValue(startDate)) || startDate < minimum || (claim && startDate === minimum)) {
    return 'Choose a valid future date for this reservation.'
  }
  if (camping && !(daysBetween(startDate, endDate) > 0)) return 'Departure must be after arrival.'
  const lastDay = camping ? new Date(dateValue(endDate) - day).toISOString().slice(0, 10) : startDate
  if ((Number.isFinite(dateValue(facility.availableFrom)) && startDate < facility.availableFrom) ||
      (Number.isFinite(dateValue(facility.availableThrough)) && lastDay > facility.availableThrough)) {
    return 'Those dates are outside the booking season.'
  }
  if (camping && (!equipment || !Array.isArray(unit.equipment) || !unit.equipment.includes(equipment))) {
    return 'Choose equipment that this campsite supports.'
  }
  const blocked = Array.isArray(unit.blockedDates) ? unit.blockedDates : []
  if (blocked.some((date) => date >= startDate && date <= lastDay)) return 'This site or entry point is blocked on those dates.'
  if (camping && confirmedAt(state, unit, 'campsite').some((row) => row.startDate < endDate && row.endDate > startDate)) {
    return 'This campsite is already reserved for one or more of those nights.'
  }
  const remaining = camping ? null : quotaLeft(state, unit, startDate)
  if (!camping && (remaining === null || partySize > remaining)) return 'There is not enough entry quota for this party.'
  return ''
}

export function policyValid(policy) {
  return Boolean(policy?.code && Number.isFinite(cents(policy.cancellationFee)) && Number.isSafeInteger(policy.lateDays) &&
    policy.lateDays >= 0 && ['none', 'first_night', 'use_fee'].includes(policy.lateForfeit))
}
export function bookingQuote(facility, unit, draft) {
  const quantity = isCamp(facility) ? daysBetween(draft.startDate, draft.endDate) : draft.partySize
  const rate = cents(unit?.rate)
  const fee = cents(facility?.serviceFee)
  const use = quantity * rate
  if (!positiveInteger(quantity) || !Number.isSafeInteger(use + fee) || !policyValid(facility?.policy)) return null
  return { quantity, currency: 'USD', unitAmount: dollars(rate), useAmount: dollars(use), serviceFee: dollars(fee), totalAmount: dollars(use + fee) }
}

function identifiers(prefix) {
  const id = crypto.randomUUID()
  return { id: `${prefix.toLowerCase()}-${id}`, confirmationCode: `${prefix}-${id.slice(0, 8).toUpperCase()}` }
}

export function bookingPlan(state, facility, unit, draft, now = new Date(), claim = false) {
  if (!state.account?.id) return fail('Your account details are unavailable.')
  const error = inventoryError(state, facility, unit, draft, now, claim)
  if (error) return fail(error)
  const quote = bookingQuote(facility, unit, draft)
  return quote ? { quote, facility, unit, draft } : fail('Booking charges or terms are currently unavailable.')
}

function makeReservation(state, plan, now, lotteryApplicationId) {
  const { facility, unit, draft, quote } = plan
  const createdAt = now.toISOString()
  return {
    ...identifiers('R'), kind: facility.kind, status: 'confirmed', facilityId: facility.id, unitId: unit.id,
    startDate: draft.startDate, partySize: draft.partySize,
    ...(isCamp(facility) ? { endDate: draft.endDate, equipment: draft.equipment } : {}),
    ...quote, policySnapshot: { ...facility.policy }, actorId: state.account.id, createdAt, updatedAt: createdAt,
    ...(lotteryApplicationId ? { lotteryApplicationId } : {}),
  }
}

export function applicationOptions(state, lottery, now = new Date()) {
  if (!state.account?.id) return fail('Your account details are unavailable.')
  if (!lottery?.id || lotteryWindow(lottery, now) !== 'Open') return fail('This lottery is not accepting applications.')
  if (hasActiveApplication(state, lottery.id)) return fail('You already have an active application for this lottery.')
  const facility = find(state.facilities, lottery.facilityId)
  const unit = find(state.units, lottery.unitId)
  if (facility?.kind !== 'permit' || unit?.kind !== 'permit' || unit.facilityId !== facility.id) {
    return fail('The lottery entry point is unavailable.')
  }
  const dates = eligibleDates(lottery, facility, now)
  if (!positiveInteger(lottery.maxPartySize) || !positiveInteger(unit.maxPartySize) ||
      !positiveInteger(lottery.maxPreferences) || !dates.length) {
    return fail('Application dates or eligibility details are unavailable.')
  }
  const fee = cents(lottery.applicationFee)
  if (!Number.isFinite(fee)) return fail('The application fee is unavailable.')
  return {
    dates, partyLimit: Math.min(lottery.maxPartySize, unit.maxPartySize),
    preferenceLimit: Math.min(lottery.maxPreferences, dates.length), feeAmount: dollars(fee),
  }
}

export function applicationPlan(state, lottery, draft, now = new Date()) {
  const options = applicationOptions(state, lottery, now)
  if (options.error) return options
  if (!positiveInteger(draft.partySize) || draft.partySize > options.partyLimit) {
    return fail('Enter a party size within the lottery limit.')
  }
  const choices = draft.preferences.filter(Boolean)
  if (!choices.length || choices.length > options.preferenceLimit || choices.some((choice, index) => choice !== draft.preferences[index]) ||
      new Set(choices).size !== choices.length || choices.some((choice) => !options.dates.includes(choice))) {
    return fail('Choose distinct eligible dates and rank them in order.')
  }
  return { preferences: choices.map((entryDate, index) => ({ rank: index + 1, entryDate })), feeAmount: options.feeAmount }
}

export const hasActiveApplication = (state, lotteryId) => rows(state.lotteryApplications).some((app) =>
  owns(state, app) && app.lotteryId === lotteryId && ['submitted', 'selected', 'claimed'].includes(app.status))
export const eligibleDates = (lottery, facility, now = new Date()) => Array.isArray(lottery?.eligibleDates)
  ? [...new Set(lottery.eligibleDates.filter((date) => Number.isFinite(dateValue(date)) && date > today(facility?.timeZone, now)))].sort()
  : []

export function claimPlan(state, app, now = new Date()) {
  if (!owns(state, app) || app.status !== 'selected' || app.reservationId ||
      rows(state.reservations).some((row) => row.lotteryApplicationId === app.id)) {
    return fail('This application cannot be claimed.')
  }
  const lottery = find(state.lotteries, app.lotteryId)
  if (!lottery) return fail('The lottery details are unavailable.')
  const deadline = Date.parse(app.claimDeadlineAt || lottery.claimDeadlineAt)
  if (!Number.isFinite(deadline) || now >= deadline) return fail('The claim deadline has passed or is unavailable.')
  const facility = find(state.facilities, lottery.facilityId)
  const unit = find(state.units, lottery.unitId)
  if (facility?.kind !== 'permit') return fail('The permit destination is unavailable.')
  return bookingPlan(state, facility, unit, { startDate: app.awardedDate, partySize: app.partySize }, now, true)
}

export function cancellationPlan(state, reservation, now = new Date()) {
  if (!owns(state, reservation) || reservation.status !== 'confirmed' || reservation.cancellationId ||
      rows(state.cancellations).some((row) => row.reservationId === reservation.id)) {
    return fail('This reservation cannot be cancelled.')
  }
  const facility = find(state.facilities, reservation.facilityId)
  const daysToStart = daysBetween(today(facility?.timeZone, now), reservation.startDate)
  if (!(daysToStart >= 1)) return fail('Cancellation is available before the start date.')
  const policy = reservation.policySnapshot
  const paid = cents(reservation.totalAmount)
  const use = cents(reservation.useAmount)
  const rate = cents(reservation.unitAmount)
  const service = cents(reservation.serviceFee)
  if (!policyValid(policy) || ![paid, use, rate, service].every(Number.isFinite) || !positiveInteger(reservation.quantity) ||
      paid !== use + service || use !== rate * reservation.quantity || !reservation.currency) {
    return fail('The original charges or cancellation terms are unavailable.')
  }
  const chargeLines = [
    { code: 'use', quantity: reservation.quantity, unitAmount: dollars(rate), amount: dollars(use) },
    { code: 'service', quantity: 1, unitAmount: dollars(service), amount: dollars(service) },
  ]
  let remaining = paid
  const deductionLines = []
  const deduct = (code, requested) => {
    const amount = Math.min(remaining, requested)
    if (amount <= 0) return
    remaining -= amount
    deductionLines.push({ code, quantity: 1, unitAmount: dollars(amount), amount: dollars(amount) })
  }
  deduct('service', service)
  deduct('cancellation', cents(policy.cancellationFee))
  if (daysToStart <= policy.lateDays) {
    if (policy.lateForfeit === 'first_night') deduct('late_forfeit', rate)
    if (policy.lateForfeit === 'use_fee') deduct('late_forfeit', use)
  }
  return { policyCode: policy.code, paidAmount: dollars(paid), chargeLines, deductionLines, refundAmount: dollars(remaining), currency: reservation.currency }
}

export function transact(state, action, now = new Date()) {
  const createdAt = now.toISOString()
  switch (action.type) {
    case 'book': {
      const facility = find(state.facilities, action.facilityId)
      const unit = find(state.units, action.draft.unitId)
      const plan = bookingPlan(state, facility, unit, action.draft, now)
      if (plan.error) return plan
      const record = makeReservation(state, plan, now)
      return { record, state: { ...state, reservations: [...rows(state.reservations), record] } }
    }
    case 'apply': {
      const lottery = find(state.lotteries, action.lotteryId)
      const plan = applicationPlan(state, lottery, action.draft, now)
      if (plan.error) return plan
      const record = {
        ...identifiers('L'), status: 'submitted', lotteryId: lottery.id, ...plan,
        partySize: action.draft.partySize, currency: 'USD', actorId: state.account.id, createdAt, updatedAt: createdAt,
      }
      return { record, state: { ...state, lotteryApplications: [...rows(state.lotteryApplications), record] } }
    }
    case 'claim': {
      const app = find(state.lotteryApplications, action.id)
      const plan = claimPlan(state, app, now)
      if (plan.error) return plan
      const record = makeReservation(state, plan, now, app.id)
      return { record, state: {
        ...state,
        lotteryApplications: rows(state.lotteryApplications).map((row) => row.id === app.id
          ? { ...row, status: 'claimed', claimedAt: createdAt, updatedAt: createdAt, reservationId: record.id }
          : row),
        reservations: [...rows(state.reservations), record],
      } }
    }
    case 'cancel': {
      const reservation = find(state.reservations, action.id)
      const plan = cancellationPlan(state, reservation, now)
      if (plan.error) return plan
      const record = {
        id: `cancel-${crypto.randomUUID()}`, status: 'completed', reservationId: reservation.id,
        actorId: state.account.id, createdAt, ...plan,
      }
      return { record, state: {
        ...state,
        reservations: rows(state.reservations).map((row) => row.id === reservation.id
          ? { ...row, status: 'cancelled', cancelledAt: createdAt, updatedAt: createdAt, cancellationId: record.id }
          : row),
        cancellations: [...rows(state.cancellations), record],
      } }
    }
    default:
      return fail('This action is unavailable.')
  }
}
