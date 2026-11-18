import { displayCell, parseCell } from './cells.js'
import { byId, changedBy, columnsOf, idFor, isBlank, rowsOf, sameValue, updateSheet } from './sheets.js'
import { positionRows, writeRows } from './rows.js'

export const allowsContains = column => ['text', 'dropdown', 'contact'].includes(column?.type)

export function parseFilter(state, sheet, draft) {
  const column = byId(columnsOf(sheet), draft.columnId)
  if (!column) throw new Error('Choose a column.')
  if (draft.operator === 'isBlank') return { columnId: column.id, operator: draft.operator }
  if (draft.operator === 'contains' && allowsContains(column)) {
    if (!String(draft.value ?? '').trim()) throw new Error('Enter a value to match.')
    return { columnId: column.id, operator: draft.operator, value: String(draft.value).trim() }
  }
  if (draft.operator !== 'equals') throw new Error('Choose a filter operator.')
  const value = parseCell(column, draft.value, { users: state.users, rows: rowsOf(state, sheet.id) })
  if (isBlank(value)) throw new Error('Enter a value, or select Is blank.')
  return { columnId: column.id, operator: draft.operator, value }
}

export function visibleRows(state, sheet, filter) {
  const rows = rowsOf(state, sheet.id)
  const column = byId(columnsOf(sheet), filter?.columnId)
  if (!column) return rows
  return rows.filter(row => {
    const value = row.cells?.[column.id]
    if (filter.operator === 'isBlank') return isBlank(value)
    if (filter.operator === 'contains') return displayCell(column, value, state.users, rows).toLowerCase().includes(String(filter.value).toLowerCase())
    if (column.type === 'text' && !isBlank(value)) return String(value).toLowerCase() === String(filter.value).toLowerCase()
    return sameValue(value, filter.value)
  })
}

export function sortRows(state, sheet, column, direction) {
  const rows = rowsOf(state, sheet.id)
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
  const sorted = [...rows].sort((left, right) => {
    const a = left.cells?.[column.id]
    const b = right.cells?.[column.id]
    if (isBlank(a) || isBlank(b)) return Number(isBlank(a)) - Number(isBlank(b))
    const comparison = typeof a === typeof b && (typeof a === 'number' || typeof a === 'boolean') ? a - b :
      collator.compare(displayCell(column, a, state.users, rows), displayCell(column, b, state.users, rows))
    return comparison * direction
  })
  const update = changedBy(state)
  const positioned = positionRows(sorted, update)
  const changed = positioned.filter((row, index) => row !== sorted[index])
  return changed.length ? writeRows(state, sheet.id, changed, update) : state
}

export function saveNamedFilter(state, sheet, draft, name) {
  const parsed = parseFilter(state, sheet, draft)
  const saved = { ...parsed, id: idFor('flt'), name: name.trim() }
  return updateSheet(state, sheet.id, current => {
    if (!saved.name) throw new Error('Enter a filter name.')
    if ((current.savedFilters ?? []).some(item => item.name?.toLowerCase() === saved.name.toLowerCase())) throw new Error('A filter with this name already exists.')
    return { ...current, savedFilters: [...(current.savedFilters ?? []), saved] }
  })
}

export function changeNamedFilter(state, sheet, id, name) {
  return updateSheet(state, sheet.id, current => {
    const filters = current.savedFilters ?? []
    const filter = byId(filters, id)
    if (!filter) throw new Error('The saved filter is unavailable.')
    if (name == null) return { ...current, savedFilters: filters.filter(item => item.id !== id) }
    const title = name.trim()
    if (!title) throw new Error('Enter a filter name.')
    if (filters.some(item => item.id !== id && item.name?.toLowerCase() === title.toLowerCase())) throw new Error('A filter with this name already exists.')
    return filter.name === title ? current : { ...current, savedFilters: filters.map(item => item.id === id ? { ...item, name: title } : item) }
  })
}
