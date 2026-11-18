const statuses = {
  active: 'Active', locked: 'Locked', canceled: 'Canceled', pending_review: 'Pending review',
  approved: 'Approved', denied: 'Denied', attached: 'Attached', unmatched: 'Unmatched',
  removed: 'Removed', archived: 'Archived', pending: 'Pending',
  virtual: 'Virtual', physical: 'Physical', monthly: 'Monthly', quarterly: 'Quarterly',
  one_time: 'One time', card: 'Card purchase', reimbursement: 'Reimbursement',
}

export const label = value => statuses[value] ?? (value || 'Unavailable')
export const records = value => Array.isArray(value) ? value.filter(Boolean) : []
export const lookup = (collection, id) => id ? records(collection).find(item => item.id === id) : undefined
export const memberName = (state, id) => lookup(state.members, id)?.name || (id && id === state.currentUser?.id ? state.currentUser.name : '') || 'Unknown team member'
export const receiptFor = (state, expenseId) => expenseId ? records(state.receipts).find(item => item.expenseId === expenseId && item.status === 'attached') : undefined
export const activeLimits = state => records(state.limits).filter(item => item.status === 'active')
export const matches = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100
export const numeric = amount => amount !== '' && amount != null && Number.isFinite(Number(amount))
export const cents = amount => numeric(amount) ? Math.round(Number(amount) * 100) : 0
export const sumSpend = expenses => expenses.reduce((sum, expense) => sum + cents(expense.amount), 0) / 100
export const isRecorded = expense => expense.kind === 'card' || (expense.kind === 'reimbursement' && expense.status === 'approved')
export const limitSpend = (state, limit) => limit.id && limit.currency
  ? sumSpend(records(state.expenses).filter(item => item.limitId === limit.id && item.currency === limit.currency && isRecorded(item)))
  : 0
export const currencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY']

export function money(amount, currency) {
  if (!currency || !numeric(amount)) return '—'
  return `${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount))}`
}

export function date(value) {
  if (!value) return '—'
  const calendarDate = new Date(`${String(value).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(calendarDate.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(calendarDate)
}

export function positiveAmount(value) {
  const input = String(value ?? '').trim()
  const message = 'Enter a positive amount with up to two decimal places.'
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(input)) throw new Error(message)

  const [whole, fraction = ''] = input.split('.')
  const wholeDigits = whole.replace(/^0+/, '') || '0'
  const fractionDigits = fraction.replace(/0+$/, '')
  const decimal = fractionDigits ? `${wholeDigits}.${fractionDigits}` : wholeDigits
  const amount = Number(input)
  const minorUnits = Number(wholeDigits + fraction.padEnd(2, '0'))
  if (minorUnits <= 0 || !Number.isSafeInteger(minorUnits) || String(amount) !== decimal || cents(amount) !== minorUnits) throw new Error(message)
  return amount
}

export function validDate(value) {
  const parsed = new Date(`${value}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Enter a valid transaction date.')
  }
  return value
}

export function localFileUrl(value) {
  if (typeof value !== 'string' || !/^\/(?:files|receipts-fixtures)\/(?:[a-zA-Z0-9_.%-]+\/)*[a-zA-Z0-9_.%-]+$/.test(value)) return null
  const traverses = value.split('/').some(segment => /^\.{1,2}$/.test(segment.replace(/%2e/gi, '.')))
  return traverses ? null : value
}
