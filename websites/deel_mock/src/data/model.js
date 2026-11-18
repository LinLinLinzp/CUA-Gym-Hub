export const contractTypes = { fixed_rate: 'Fixed rate', pay_as_you_go: 'Pay as you go', milestone: 'Milestone' }
export const leaveTypes = { vacation: 'Vacation', sick: 'Sick', unpaid: 'Unpaid' }
export const labels = {
  ...contractTypes, ...leaveTypes, draft: 'Draft', pending_signature: 'Pending signature', active: 'Active',
  cancelled: 'Cancelled', open: 'Open', overdue: 'Overdue', processing: 'Processing', paid: 'Paid',
  pending: 'Pending', approved: 'Approved', denied: 'Denied', studio_balance: 'Studio balance',
  full_day: 'Full day', half_day: 'Half day',
}

export const list = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
export const find = (values, id) => id == null ? undefined : list(values).find(item => item.id === id)
export const label = value => value ? (Object.hasOwn(labels, value) ? labels[value] : value) : '—'
export const initials = name => (name || '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
export const number = value => (typeof value === 'number' || (typeof value === 'string' && value.trim())) && Number.isFinite(Number(value)) ? Number(value) : null
export const cents = value => Math.round((value + Number.EPSILON) * 100)
export const money = (value, currency) => {
  const amount = number(value)
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + (currency ? ' ' + currency : '')
}
export const calendarDate = date => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
].join('-')
export const utcDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}
export function displayDate(value) {
  const date = utcDate(typeof value === 'string' ? value.slice(0, 10) : null)
  return date ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date) : '—'
}
export const invoiceStatus = (invoice, today = calendarDate(new Date())) =>
  invoice.status === 'open' && utcDate(invoice.dueDate) && invoice.dueDate < today ? 'overdue' : invoice.status
export const isPayable = invoice => Boolean(invoice.id) && ['open', 'overdue'].includes(invoice.status) &&
  !invoice.paymentId && typeof invoice.currency === 'string' && /^[A-Z]{3}$/.test(invoice.currency) &&
  number(invoice.total) > 0 && cents(Number(invoice.total)) > 0 && Number.isSafeInteger(cents(Number(invoice.total)))
export const searchMatches = (query, ...values) => {
  const term = query.trim().toLowerCase()
  return !term || values.some(value => String(value ?? '').toLowerCase().includes(term))
}
export function compareDates(a, b, direction = 1) {
  if (!a || !b) return Number(Boolean(b)) - Number(Boolean(a))
  return direction * String(a).localeCompare(String(b))
}
export const newId = prefix => prefix + '-' + crypto.randomUUID()
export const workerFor = (state, item) => find(state.workers, item.workerId)

export function weekdays(start, end) {
  const from = utcDate(start)
  const to = utcDate(end)
  if (!from || !to || from > to) return 0
  const count = (to - from) / 86400000 + 1
  let result = Math.floor(count / 7) * 5
  for (let index = 0; index < count % 7; index += 1) {
    const day = (from.getUTCDay() + index) % 7
    if (day >= 1 && day <= 5) result += 1
  }
  return result
}

export function vacationBalance(state, worker, year = new Date().getFullYear()) {
  const allowance = number(worker?.annualVacationDays)
  if (allowance === null || !worker?.id) return { allowance: null, used: null, available: null }
  const start = year + '-01-01'
  const end = year + '-12-31'
  let used = 0
  for (const request of list(state.timeOffRequests)) {
    if (request.workerId !== worker.id || request.status !== 'approved' || request.type !== 'vacation' ||
        !utcDate(request.startDate) || !utcDate(request.endDate)) continue
    const first = request.startDate > start ? request.startDate : start
    const last = request.endDate < end ? request.endDate : end
    const count = weekdays(first, last)
    used += request.duration === 'half_day' && count === 1 ? 0.5 : count
  }
  return { allowance, used, available: allowance - used }
}
