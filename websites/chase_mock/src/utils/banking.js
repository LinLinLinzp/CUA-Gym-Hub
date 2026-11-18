const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const money = (amount) => amount == null || !Number.isFinite(Number(amount)) ? '—' : usd.format(Number(amount))
export const signedMoney = (amount) => Number(amount) > 0 ? '+' + money(amount) : money(amount)

export function localDay(date = new Date()) {
  const two = (value) => String(value).padStart(2, '0')
  return [date.getFullYear(), two(date.getMonth() + 1), two(date.getDate())].join('-')
}

export function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value)
  return Number.isNaN(date.valueOf()) ? '—' : dateFormat.format(date)
}

export function dayLabel(value) {
  const now = new Date()
  if (value === localDay(now)) return 'Today'
  now.setDate(now.getDate() - 1)
  return value === localDay(now) ? 'Yesterday' : dateLabel(value)
}

export function asCents(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  const cents = Math.round(number * 100)
  return Number.isSafeInteger(cents) && Math.abs(number - cents / 100) < 1e-9 ? cents : null
}

export function positiveCents(value) {
  const text = String(value).trim()
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null
  const cents = asCents(text)
  return cents > 0 ? cents : null
}

export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00')
  return !Number.isNaN(date.valueOf()) && localDay(date) === value && value >= localDay()
}

export const records = (value) => Array.isArray(value) ? value.filter((item) => item && item.id != null) : []
export const find = (value, id) => records(value).find((item) => String(item.id) === String(id))
export const open = (account) => account?.status === 'open'
export const isDeposit = (account) => account?.type === 'checking' || account?.type === 'savings'
export const isCard = (account) => account?.type === 'credit_card'
export const accountTitle = (account) => account?.nickname || account?.productName || 'Account'
export const mask = (last4) => last4 ? '•••• ' + String(last4).slice(-4) : ''
export const accountLabel = (account) => account ? [accountTitle(account), mask(account.last4)].filter(Boolean).join(' ') : 'Account unavailable'
export const payeeLabel = (payee) => payee?.name || 'Payee unavailable'
export const transactionTitle = (transaction) => transaction?.description || transaction?.merchant || 'Transaction unavailable'
export const statusLabel = (status) => status ? String(status).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Unknown'
export const matches = (query, ...terms) => terms.some((term) => String(term ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const newest = (items, field) => [...items].sort((a, b) =>
  String(b[field] || '').localeCompare(String(a[field] || '')) || String(a.id).localeCompare(String(b.id)))
export const openCase = (item) => item?.status === 'submitted' || item?.status === 'under_review'
export const existingCase = (state, id) => newest(records(state.disputes).filter((item) => item.transactionId === id), 'createdAt')
  .sort((a, b) => Number(openCase(b)) - Number(openCase(a)))[0]
export const disputable = (transaction, account) =>
  open(account) && (account.type === 'checking' || isCard(account))
  && transaction?.type === 'purchase' && transaction.status === 'posted' && asCents(transaction.amount) < 0

export const accountPath = (id) => '/accounts/' + encodeURIComponent(id)
export const transactionPath = (accountId, id) => accountPath(accountId) + '/transactions/' + encodeURIComponent(id)
export const disputePath = (id) => '/disputes/' + encodeURIComponent(id)
export const audit = (state) => ({ createdAt: new Date().toISOString(), createdBy: state.profile?.id || 'user-alex' })
export const idFor = (prefix) => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return prefix + '-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export const changeRecord = (collection, id, patch) => collection.map((row) => row?.id === id ? { ...row, ...patch } : row)

export const reasons = {
  duplicate_charge: 'Duplicate charge',
  incorrect_amount: 'Incorrect amount',
  not_received: 'Item or service not received',
  cancelled_service: 'Cancelled service',
  unrecognized_charge: 'Unrecognized charge',
  other: 'Other',
}

export const alertTypes = {
  low_balance: { title: 'Low balance', description: 'When your available balance falls below a set amount.', threshold: true },
  deposit_posted: { title: 'Deposit posted', description: 'When a deposit posts to this account.' },
  payment_due: { title: 'Payment due', description: 'When your credit card payment is coming due.' },
  large_purchase: { title: 'Large purchase', description: 'When a purchase reaches or exceeds a set amount.', threshold: true },
}

export const categories = ['Utilities', 'Rent', 'Telecom', 'Insurance', 'Household services', 'Auto', 'Housing', 'Education', 'Memberships', 'Health', 'Other']
