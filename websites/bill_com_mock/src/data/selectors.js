export const rows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const byId = (value, id) => id == null ? undefined : rows(value).find(row => row.id === id)
export const activeUser = state => byId(state.users, state.account?.activeUserId)
export const vendorName = (state, id) => byId(state.vendors, id)?.name || 'Unknown vendor'
export const userName = (state, id) => byId(state.users, id)?.name || 'Unknown user'
export const editable = bill => ['draft', 'denied'].includes(bill?.approvalStatus)
export const methods = vendor => Array.isArray(vendor?.paymentMethods)
  ? [...new Set(vendor.paymentMethods.filter(method => method === 'ach' || method === 'check'))]
  : []
export const fundingLabel = funding => funding
  ? [funding.name || 'Funding account', funding.last4 && `•••• ${funding.last4}`].filter(Boolean).join(' ')
  : 'Unknown funding account'

export function payable(state, bill) {
  return bill?.approvalStatus === 'approved' && bill.paymentStatus === 'unpaid'
    && Number.isFinite(Number(bill.amount)) && Number(bill.amount) > 0
    && methods(byId(state.vendors, bill.vendorId)).length > 0 && rows(state.fundingAccounts).some(funding => funding.id)
    && !rows(state.payments).some(payment => payment.billId === bill.id && ['scheduled', 'processing', 'paid'].includes(payment.status))
}

export function actionable(state, approval) {
  const user = activeUser(state)
  const bill = byId(state.bills, approval?.billId)
  return Boolean(user && approval?.status === 'pending' && approval.approverId === user.id
    && bill?.approvalStatus === 'pending' && bill.approvalId === approval.id)
}

const utcDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const cents = value => Math.round(Number(value) * 100)
export const money = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? currencyFormat.format(Number(value)) : '—'
export const total = value => value.reduce((sum, row) => {
  const amount = cents(row.amount)
  return Number.isFinite(amount) ? sum + amount : sum
}, 0) / 100
export const today = () => {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part, i) => String(part).padStart(i ? 2 : 4, '0')).join('-')
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function dateLabel(value) {
  const day = typeof value === 'string' ? value.slice(0, 10) : ''
  return validDate(day) ? utcDate.format(new Date(day + 'T00:00:00.000Z')) : '—'
}
export const includes = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const recentFirst = (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
