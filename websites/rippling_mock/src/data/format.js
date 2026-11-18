export const rows = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (collection, id) => rows(collection).find((record) => record.id === id)
export const label = (value) => value ? String(value).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : '—'
export const person = (state, id) => id ? byId(state.employees, id)?.name || id : '—'
export const activePeople = (state) => rows(state.employees).filter(({ status }) => status === 'active')
export const actorId = (state) => state.actor?.id || 'acct_maya'
export const newId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`
export const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
}

export const date = (value) => isDate(value) ? new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(value + 'T00:00:00Z')) : '—'

export const stamp = (value) => date(typeof value === 'string' ? value.slice(0, 10) : null)
export const money = (value) => Number.isFinite(value) ? new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format(value) : '—'
export const hours = (value) => Number.isFinite(value) ? `${value} h` : '—'

export function weekdayHours(start, end) {
  if (!isDate(start) || !isDate(end) || end < start) return 0
  const first = new Date(start + 'T00:00:00Z')
  const days = (Date.parse(end + 'T00:00:00Z') - +first) / 86400000 + 1
  const weeks = Math.floor(days / 7)
  let weekdays = weeks * 5
  for (let day = 0; day < days % 7; day += 1) {
    const weekday = (first.getUTCDay() + day) % 7
    if (weekday > 0 && weekday < 6) weekdays += 1
  }
  return weekdays * 8
}

export const payrollFields = ['gross', 'taxes', 'deductions', 'net']
export const cents = (amount) => Math.round(Number(amount) * 100)
export const totalsFor = (items) => Object.fromEntries(payrollFields.map((key) => [
  key, items.reduce((sum, item) => sum + cents(item[key]), 0) / 100,
]))
