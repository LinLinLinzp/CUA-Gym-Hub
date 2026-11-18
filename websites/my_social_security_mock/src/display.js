const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const calendar = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

export const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const show = value => value === null || value === undefined || value === '' ? 'Unavailable' : String(value)
export const money = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ? 'Unavailable'
  : currency.format(Number(value))

export function date(value) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(time) ? calendar.format(time) : 'Date unavailable'
}

export const byNewest = (left, right) => compareDates(left.date, right.date, left.id, right.id, 'newest')
export function compareDates(left, right, leftId, rightId, order) {
  const leftDate = Date.parse(left)
  const rightDate = Date.parse(right)
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
    return order === 'newest' ? rightDate - leftDate : leftDate - rightDate
  }
  if (Number.isFinite(leftDate) !== Number.isFinite(rightDate)) return Number.isFinite(leftDate) ? -1 : 1
  return String(leftId ?? '').localeCompare(String(rightId ?? ''))
}

export const nameOf = profile => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
export const accountType = type => ({ checking: 'Checking', savings: 'Savings' }[type] || 'Unavailable')
export const mask = last4 => /^\d{4}$/.test(String(last4 ?? '')) ? '•••• ' + last4 : 'Unavailable'
export const benefitStatus = status => ({
  receiving: 'Receiving benefits',
  not_receiving: 'Not receiving benefits',
  pending: 'Application pending',
}[status] || 'Status unavailable')
export const letterTypes = {
  benefit_verification: 'Benefit verification',
  benefit_notice: 'Benefit notice',
  payment_notice: 'Payment notice',
  account_notice: 'Account notice',
}
