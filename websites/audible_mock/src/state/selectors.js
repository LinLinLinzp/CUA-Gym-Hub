export const rows = (state, key) => Array.isArray(state[key]) ? state[key].filter(Boolean) : []
export const titleById = (state, id) => id && rows(state, 'titles').find((title) => title.id === id)
export const orderById = (state, id) => id && rows(state, 'purchases').find((order) => order.id === id)
export const activeLibrary = (state, titleId) => rows(state, 'library').find(
  (entry) => entry.titleId === titleId && entry.status === 'active',
)
export const activeWish = (state, titleId) => rows(state, 'wishlist').find(
  (entry) => entry.titleId === titleId && entry.status === 'saved',
)
export const titleLabel = (title) => title?.title || 'Audiobook details unavailable'
export const DAY = 86_400_000

function activeMembership(state) {
  return Boolean(state.account?.id && state.account.membershipStatus === 'active' &&
    /premium/i.test(state.account.plan || ''))
}

export function creditStatus(credit, now) {
  if (credit.status === 'spent') return 'Used'
  if (credit.status !== 'available' || !Number.isFinite(Date.parse(credit.createdAt))) return 'Unavailable'
  if (Date.parse(credit.createdAt) > now.getTime()) return 'Scheduled'
  if (!credit.expiresAt) return 'Available'
  const expires = Date.parse(credit.expiresAt)
  if (!Number.isFinite(expires)) return 'Unavailable'
  return expires <= now.getTime() ? 'Expired' : 'Available'
}

export function usableCredits(state, now) {
  return rows(state, 'credits').filter((credit) =>
    credit.id && credit.quantity === 1 && creditStatus(credit, now) === 'Available',
  ).sort((left, right) =>
    ((Date.parse(left.expiresAt) || Infinity) - (Date.parse(right.expiresAt) || Infinity)) ||
    Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
    String(left.id).localeCompare(String(right.id)),
  )
}

export function purchaseBlock(state, title, now) {
  if (!title?.id || title.creditEligible !== true) return 'This title is unavailable for credit purchase.'
  if (activeLibrary(state, title.id)) return 'This title is already in your Library.'
  if (!activeMembership(state)) return 'An active Premium Plus membership is required.'
  if (!usableCredits(state, now).length) return 'You have no available credits.'
  return null
}

export function returnBlock(state, order, now) {
  if (!order?.id) return 'This order is unavailable.'
  if (order.status === 'returned' || order.returnId || rows(state, 'returns').some((entry) => entry.purchaseId === order.id)) {
    return 'This title has already been returned.'
  }
  if (order.status !== 'completed' || !order.titleId) return 'This order is incomplete.'
  if (order.paymentMethod !== 'credit') return 'Only orders paid with a credit can be returned here.'
  if (!activeMembership(state) || state.account.canReturn !== true) {
    return 'Self-service returns are unavailable for this membership.'
  }
  if (order.selfServiceBlocked) return 'This order is ineligible for a self-service return.'
  const age = now.getTime() - Date.parse(order.createdAt)
  if (!Number.isFinite(age) || age < 0) return 'The purchase date is unavailable.'
  if (age > 365 * DAY) return 'The 365-day return window has closed.'
  return null
}

export function oneYearLater(now) {
  const expiration = new Date(now)
  const month = expiration.getUTCMonth()
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 1)
  if (expiration.getUTCMonth() !== month) expiration.setUTCDate(0)
  return expiration.toISOString()
}
