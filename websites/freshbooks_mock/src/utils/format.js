export const currencies = ['USD', 'CAD', 'EUR']
export const today = () => new Date().toISOString().slice(0, 10)
export const dateKey = date => date.toISOString().slice(0, 10)
export const addDays = (date, days) => dateKey(new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000))
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && dateKey(new Date(value)) === value
export const dateLabel = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  validDate(value) ? new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(value)) : '—'
export const cents = value => Math.round((Number(value) + Number.EPSILON) * 100)
export const money = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD', currencyDisplay: 'code' }).format(Number(value) || 0)
export const hours = minutes => `${Math.floor((Number(minutes) || 0) / 60)}h ${String((Number(minutes) || 0) % 60).padStart(2, '0')}m`
export const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
export const visible = (record, visibility = 'active') => (record.visibility || 'active') === visibility
export const find = (rows, id) => rows.find(row => row.id === id)
export const nameOf = (rows, id, fallback = 'Unknown record') => id ? find(rows, id)?.name || fallback : '—'
export const matches = (query, ...values) => String(query || '').trim().toLowerCase().split(/\s+/).every(part =>
  values.some(value => String(value || '').toLowerCase().includes(part)))
export const invoiceStatus = (invoice, date = today()) => invoice.status !== 'draft' && invoice.amountDue > 0 && invoice.dueDate && invoice.dueDate < date ? 'overdue' : invoice.status || 'draft'
export const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to)
