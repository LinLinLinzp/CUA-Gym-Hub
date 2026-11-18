import { byId, isBlank } from './sheets.js'

export const columnTypes = [
  ['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['dropdown', 'Dropdown'],
  ['contact', 'Contact'], ['checkbox', 'Checkbox'], ['percent', 'Percentage'],
  ['duration', 'Duration'], ['predecessor', 'Predecessor'],
]

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value
}

export function predecessorText(value, rows) {
  if (!Array.isArray(value)) return ''
  return value.filter(item => item?.rowId).map(item => {
    const index = rows.findIndex(row => row.id === item.rowId)
    const lag = item.lagDays ? (item.lagDays > 0 ? '+' : '') + item.lagDays + 'd' : ''
    return index < 0 ? item.rowId + ' FS' + lag : (index + 1) + 'FS' + lag
  }).join(', ')
}

function parsePredecessors(raw, rows) {
  if (!Array.isArray(raw) && typeof raw !== 'string') throw new Error('Enter one or more predecessor row numbers.')
  const seen = new Set()
  const items = Array.isArray(raw) ? raw : raw.split(',').map(input => {
    const text = input.trim()
    const match = text.match(/^(\d+)(?:\s*FS)?(?:\s*([+-]\d+)\s*d?)?$/i)
    if (match) return { rowId: rows[Number(match[1]) - 1]?.id, type: 'FS', lagDays: Number(match[2] || 0) }
    if (byId(rows, text)) return { rowId: text, type: 'FS', lagDays: 0 }
    const named = text.match(/^(.+?)\s+FS(?:\s*([+-]\d+)\s*d?)?$/i)
    return named && { rowId: named[1], type: 'FS', lagDays: Number(named[2] || 0) }
  })
  return items.map(item => {
    if (!item || item.type !== 'FS' || !Number.isSafeInteger(item.lagDays) || !byId(rows, item.rowId)) {
      throw new Error('Enter an active row number and optional Finish-to-Start lag, such as 2FS+1d.')
    }
    if (seen.has(item.rowId)) throw new Error('Each predecessor can appear only once.')
    seen.add(item.rowId)
    return { rowId: item.rowId, type: 'FS', lagDays: item.lagDays }
  })
}

export function parseCell(column, raw, { users = [], rows = [] } = {}) {
  if (isBlank(raw) || typeof raw === 'string' && !raw.trim()) return null
  switch (column.type) {
    case 'number':
    case 'duration':
    case 'percent': {
      if (!['number', 'string'].includes(typeof raw) || typeof raw === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/i.test(raw.trim())) throw new Error('Enter a valid number.')
      const value = Number(column.type === 'percent' ? String(raw).trim().replace(/%$/, '') : raw)
      if (!Number.isFinite(value)) throw new Error('Enter a valid number.')
      if (column.type === 'percent' && (value < 0 || value > 100)) throw new Error('Enter a percentage from 0 to 100.')
      if (column.type === 'duration' && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Enter a nonnegative whole number of days.')
      return value
    }
    case 'date':
      if (!isDate(raw)) throw new Error('Enter a valid date.')
      return raw
    case 'dropdown':
      if (!(column.options ?? []).includes(raw)) throw new Error('Choose an option from the list.')
      return raw
    case 'contact':
      if (!byId(users, raw)) throw new Error('Choose a contact from the list.')
      return raw
    case 'checkbox':
      if (typeof raw !== 'boolean') throw new Error('Choose Checked or Unchecked.')
      return raw
    case 'predecessor':
      return parsePredecessors(raw, rows)
    default:
      return String(raw)
  }
}

export function displayCell(column, value, users, rows) {
  if (isBlank(value)) return ''
  if (column.type === 'contact') return byId(users, value)?.name || String(value)
  if (column.type === 'predecessor') return predecessorText(value, rows)
  if (column.type === 'checkbox') return value ? 'Checked' : 'Unchecked'
  if (column.type === 'percent') return value + '%'
  if (column.type === 'duration') return value + (value === 1 ? ' day' : ' days')
  return String(value)
}
