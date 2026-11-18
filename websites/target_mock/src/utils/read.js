export const list = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (records, id) => id != null && Array.isArray(records) ? records.find((record) => record?.id === id) : undefined
export const money = (cents) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format((cents ?? 0) / 100)
export const addressText = (address) => [address?.line1, address?.city, [address?.region, address?.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
export const dateValue = (value) => value ? new Date(value).getTime() : NaN
export function dateText(value, options = { dateStyle: 'medium' }) {
  if (!Number.isFinite(dateValue(value))) return 'Date unavailable'
  const date = new Date(value)
  try { return date.toLocaleString('en-US', options) }
  catch { return date.toLocaleString('en-US', { ...options, timeZone: 'UTC' }) }
}
