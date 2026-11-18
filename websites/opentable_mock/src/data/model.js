import { slotInstant } from './dates.js'

export const rows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const owned = (state, key) => state.account?.id ? rows(state[key]).filter(row => row.actorId === state.account.id) : []
export const venue = (state, id) => rows(state.restaurants).find(restaurant => restaurant.id === id)
export const reservation = (state, id) => owned(state, 'reservations').find(booking => booking.id === id)
export const restaurantName = (state, id) => venue(state, id)?.name || 'Restaurant unavailable'
export const partyLabel = count => Number(count) === 1 ? '1 guest' : count ? count + ' guests' : 'Party size unavailable'
export const points = value => Number.isFinite(Number(value)) ? Number(value) : 0
export const number = value => points(value).toLocaleString('en-US')
export const money = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, trailingZeroDisplay: 'stripIfInteger' }).format(points(amount))
  } catch {
    return '$' + number(amount)
  }
}
const zone = (state, restaurant) => restaurant?.timeZone || state.account?.timeZone
export const start = (state, booking) => slotInstant(booking.date, booking.time, zone(state, venue(state, booking.restaurantId)))
export const manageable = (state, booking, now = new Date()) => Boolean(booking?.status === 'confirmed' && start(state, booking) > +now)
export const latest = (a, b) => String(b.createdAt || '').localeCompare(a.createdAt || '') || String(a.id || '').localeCompare(b.id || '')

export function availableSlots(state, restaurant, date, partySize, current, now = new Date()) {
  if (!restaurant || !Number.isInteger(partySize) || partySize < 1 || partySize > 20) return []
  const otherStarts = owned(state, 'reservations')
    .filter(item => item.status === 'confirmed' && item.id !== current?.id)
    .map(item => start(state, item))
  const slots = rows(restaurant.slots)
  const original = current?.date === date && current.partySize === partySize
  if (original && !slots.some(slot => slot.time === current.time && slot.seating === current.seating && Number(slot.maxPartySize) >= partySize)) {
    slots.push({ time: current.time, seating: current.seating, potentialPoints: current.potentialPoints, maxPartySize: partySize })
  }
  return slots.filter(slot => {
    const instant = slotInstant(date, slot.time, zone(state, restaurant))
    return instant > +now && partySize <= Number(slot.maxPartySize)
      && !otherStarts.some(other => Math.abs(other - instant) < 150 * 60_000)
  }).sort((a, b) => a.time.localeCompare(b.time) || String(a.seating || '').localeCompare(b.seating || ''))
}

export const slotKey = slot => JSON.stringify([slot.time, slot.seating || ''])
export function reviewFor(state, booking) {
  return owned(state, 'reviews').find(review => review.reservationId === booking.id)
}
export function canReview(state, booking, now = new Date()) {
  if (booking?.status !== 'completed' || !booking.id || !booking.restaurantId || reviewFor(state, booking)) return false
  return !(start(state, booking) > +now)
}
export const posted = state => owned(state, 'pointTransactions').filter(transaction => transaction.status === 'posted')
export const balance = state => posted(state).reduce((total, transaction) => total + points(transaction.points), 0)

function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function snapshot({ date, time, partySize, seating, occasion, specialRequest, status, potentialPoints }) {
  return {
    date: date ?? null, time: time ?? null, partySize: partySize ?? null, seating: seating ?? '',
    occasion: occasion ?? '', specialRequest: specialRequest ?? '', status: status ?? null, potentialPoints: points(potentialPoints),
  }
}

function reservationChange(state, type, before, after, timestamp) {
  const reservations = rows(state.reservations)
  const event = {
    id: 'evt-' + token(), reservationId: after.id, actorId: after.actorId, type,
    before: before ? snapshot(before) : null, after: snapshot(after), createdAt: timestamp,
  }
  return { result: after, next: {
    ...state,
    reservations: before ? reservations.map(item => item.id === after.id && item.actorId === after.actorId ? after : item) : [...reservations, after],
    reservationEvents: [...rows(state.reservationEvents), event],
  } }
}

export function saveBooking(state, { restaurantId, id, date, partySize, selected, occasion, specialRequest }) {
  const now = new Date()
  const actorId = state.account?.id
  const current = id ? reservation(state, id) : null
  if (!actorId || (id && !manageable(state, current, now))) return { error: 'This reservation can no longer be changed.' }
  const restaurant = venue(state, current?.restaurantId ?? restaurantId)
  if (!restaurant) return { error: 'Restaurant availability could not be found.' }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) return { error: 'Choose a party size between 1 and 20 guests.' }
  const slot = availableSlots(state, restaurant, date, partySize, current, now).find(candidate => slotKey(candidate) === selected)
  if (!slot) return { error: 'Choose an available future time that does not conflict with your reservations.' }

  const timestamp = now.toISOString()
  const sameSlot = current?.date === date && slotKey(current) === selected
  const details = {
    date, time: slot.time, partySize, seating: slot.seating || '', occasion: occasion.trim(), specialRequest: specialRequest.trim(),
    status: 'confirmed', potentialPoints: points(sameSlot && current.partySize === partySize ? current.potentialPoints : slot.potentialPoints),
  }
  if (current && JSON.stringify(snapshot(current)) === JSON.stringify(snapshot(details))) return { unchanged: true, result: current }
  const after = current ? { ...current, ...details, updatedAt: timestamp } : {
    id: 'res-' + token(), restaurantId: restaurant.id, actorId,
    confirmationCode: 'OT-' + token().slice(0, 10).toUpperCase(),
    ...details, createdAt: timestamp, updatedAt: timestamp,
  }
  return reservationChange(state, current ? 'modified' : 'booked', current, after, timestamp)
}

export function cancelBooking(state, id) {
  const now = new Date()
  const current = reservation(state, id)
  if (!manageable(state, current, now)) return { error: 'This reservation can no longer be canceled.' }
  const timestamp = now.toISOString()
  const after = { ...current, status: 'canceled', canceledAt: timestamp, updatedAt: timestamp, potentialPoints: 0 }
  return reservationChange(state, 'canceled', current, after, timestamp)
}

export const ratingFields = ['overall', 'food', 'service', 'ambience', 'value']
export function submitReview(state, id, draft) {
  const booking = reservation(state, id)
  if (!canReview(state, booking)) return { error: 'This visit is no longer eligible for a review.' }
  const validRating = value => Number.isInteger(value) && value >= 1 && value <= 5
  if (!validRating(draft.overall)) return { error: 'Choose an overall rating.' }
  const ratings = Object.fromEntries(ratingFields.filter(key => validRating(draft[key])).map(key => [key, draft[key]]))
  const comment = draft.comment.trim()
  if (comment.length > 1000) return { error: 'Keep your comment to 1,000 characters or fewer.' }
  const result = {
    id: 'rev-' + token(), reservationId: id, restaurantId: booking.restaurantId, actorId: state.account.id,
    ...ratings, comment, status: 'submitted', createdAt: new Date().toISOString(),
  }
  return { result, next: { ...state, reviews: [...rows(state.reviews), result] } }
}

export function rewardAvailable(state, option) {
  return Boolean(state.account?.id && option?.id && Number.isInteger(option.pointsCost) && option.pointsCost > 0 && balance(state) >= option.pointsCost)
}
export function redeem(state, id) {
  const option = rows(state.rewardOptions).find(item => item.id === id)
  if (!rewardAvailable(state, option)) return { error: 'Your balance is too low for this dining credit.' }
  const actorId = state.account.id
  const createdAt = new Date().toISOString()
  const result = {
    id: 'redeem-' + token(), actorId, rewardOptionId: id, pointsSpent: option.pointsCost,
    amount: points(option.amount), currency: option.currency || 'USD', status: 'issued', createdAt,
  }
  const debit = {
    id: 'pts-' + token(), type: 'redeemed', actorId, points: -option.pointsCost,
    status: 'posted', redemptionId: result.id, createdAt,
  }
  return { result, next: {
    ...state, pointRedemptions: [...rows(state.pointRedemptions), result], pointTransactions: [...rows(state.pointTransactions), debit],
  } }
}
