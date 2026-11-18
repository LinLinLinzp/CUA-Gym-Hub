import { records } from './ui'

export function findRecord(collection, id) {
  return id ? records(collection).find(row => String(row.id) === String(id)) : undefined
}

export const canManage = stay => Boolean(stay?.id && stay.status === 'upcoming')
export const canRequestService = stay => Boolean(stay?.id && ['upcoming', 'in_progress'].includes(stay.status))
export const linkedFolios = (data, stayId) => stayId ? records(data.folios).filter(folio => folio.stayId === stayId) : []
export const availableFolios = (data, stayId) => linkedFolios(data, stayId).filter(folio => folio.id && folio.status === 'available')

export function localDay(clock = new Date()) {
  return [clock.getFullYear(), String(clock.getMonth() + 1).padStart(2, '0'), String(clock.getDate()).padStart(2, '0')].join('-')
}

export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
}

export function daysAgo(days, clock = new Date()) {
  const cutoff = new Date(clock)
  cutoff.setDate(cutoff.getDate() - days)
  return localDay(cutoff)
}

export const creditWindow = 'Allow 10 business days after checkout for points to post. Submit claims within one year of checkout.'

export function creditIssue(data, stay, today = localDay()) {
  if (!stay?.id || stay.status !== 'completed') return 'Choose a completed stay.'
  if (records(data.pointsActivity).some(row => row.type === 'stay' && row.stayId === stay.id)) return 'Points have already posted for this stay.'
  if (records(data.requests).some(row => row.type === 'missing_stay_credit' && row.stayId === stay.id && ['submitted', 'in_review'].includes(row.status))) return 'A missing stay credit request is already open for this stay.'
  if (!validDay(stay.checkOut)) return 'This stay needs a checkout date to qualify.'
  const cutoff = new Date(today + 'T00:00:00Z')
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1)
  if (stay.checkOut < cutoff.toISOString().slice(0, 10)) return 'The checkout date is outside the one-year claim period.'
  const posted = new Date(stay.checkOut + 'T00:00:00Z')
  let weekdays = 0
  while (weekdays < 10) {
    posted.setUTCDate(posted.getUTCDate() + 1)
    if (posted.getUTCDay() !== 0 && posted.getUTCDay() !== 6) weekdays++
  }
  return posted.toISOString().slice(0, 10) > today ? 'Points are still within the posting window.' : ''
}

export function replaceRecord(collection, oldRecord, newRecord) {
  return collection.map(row => row === oldRecord ? newRecord : row)
}

export function actionId(prefix) {
  // getRandomValues is available when Harbor serves the app over plain HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  const uuid = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
  return prefix + '-' + uuid
}
export const positiveInteger = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0
export const rowsWith = (collection, row) => [...(Array.isArray(collection) ? collection : []), row]
