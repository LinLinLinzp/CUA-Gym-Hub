import { evaluateApprovals } from './approvals.js'
import { parseCell } from './cells.js'
import { recalculateSchedule } from './schedule.js'
import { byId, cancelRequests, changedBy, columnsOf, createdWith, deletedWith, idFor, isActive, replace, rowsOf, sameValue, updateSheet } from './sheets.js'

export function writeRows(state, sheetId, changedRows, update, addedRow) {
  const replacements = new Map(changedRows.map(row => [row.id, row]))
  const rows = (state.rows ?? []).map(row => replacements.get(row.id) ?? row)
  if (addedRow) rows.push(addedRow)
  return { ...updateSheet(state, sheetId, sheet => ({ ...sheet }), update), rows }
}

export function positionRows(rows, update) {
  return rows.map((row, index) => row.position === index + 1 ? row : { ...row, position: index + 1, ...update })
}

function getSheet(state, sheetId) {
  const sheet = byId(state.sheets, sheetId)
  if (!isActive(sheet)) throw new Error('This sheet is unavailable.')
  return sheet
}

export function insertRow(state, sheetId, options = {}) {
  const sheet = getSheet(state, sheetId)
  const { id = idFor('row'), referenceId, placement = 'bottom', cells = {}, formSubmissionId, update = changedBy(state) } = options
  const current = rowsOf(state, sheetId)
  const ref = current.findIndex(row => row.id === referenceId)
  if (referenceId && ref < 0) throw new Error('The selected row is unavailable.')
  const position = referenceId ? ref + Number(placement === 'below') : placement === 'top' ? 0 : current.length
  const row = { id, sheetId, cells, source: formSubmissionId ? 'form' : 'grid', status: 'active', ...createdWith(update) }
  if (formSubmissionId) row.formSubmissionId = formSubmissionId
  const arranged = positionRows([...current.slice(0, position), row, ...current.slice(position)], update)
  const settings = sheet.projectSettings
  let scheduled = arranged[position]
  if (affectsSchedule(settings, Object.keys(cells))) {
    scheduled = byId(recalculateSchedule(settings, arranged, { rowId: id }), id)
  }
  const result = evaluateApprovals(state, sheet, scheduled, 'rowAdded', [], update)
  const next = writeRows(state, sheetId, arranged, update, result.row)
  return { ...next, approvalRequests: result.approvalRequests }
}

export function removeRows(state, sheetId, rowIds) {
  const sheet = getSheet(state, sheetId)
  const current = rowsOf(state, sheetId)
  const deleted = current.filter(row => rowIds.includes(row.id))
  if (!deleted.length) return state
  const remaining = current.filter(row => !rowIds.includes(row.id))
  if (sheet.projectSettings?.dependenciesEnabled) {
    const column = sheet.projectSettings.predecessorsColumnId
    if (remaining.some(row => Array.isArray(row.cells?.[column]) && row.cells[column].some(item => rowIds.includes(item?.rowId)))) {
      throw new Error('Remove the predecessor links from the remaining tasks before deleting these rows.')
    }
  }
  const update = changedBy(state)
  const next = writeRows(state, sheetId, deleted.map(row => ({ ...row, ...deletedWith(update) })), update)
  return { ...next, approvalRequests: cancelRequests(state.approvalRequests, request => request.sheetId === sheetId && rowIds.includes(request.rowId), update) }
}

function affectsSchedule(settings, ids) {
  if (!settings?.startColumnId || !settings?.endColumnId) return false
  const mapped = [settings.startColumnId, settings.endColumnId]
  if (settings.dependenciesEnabled) mapped.push(settings.durationColumnId, settings.predecessorsColumnId)
  return ids.some(id => mapped.includes(id))
}

export function editCells(state, sheetId, rowId, edits, options = {}) {
  const sheet = getSheet(state, sheetId)
  const rows = rowsOf(state, sheetId)
  const row = byId(rows, rowId)
  if (!row) throw new Error('This row is unavailable.')
  const cells = { ...row.cells }
  const directIds = []
  for (const [columnId, raw] of Object.entries(edits)) {
    const column = byId(columnsOf(sheet), columnId)
    if (!column) throw new Error('This column is unavailable.')
    const value = parseCell(column, raw, { users: state.users, rows })
    if (sameValue(value, cells[columnId])) continue
    if ((state.approvalRequests ?? []).some(request => request.sheetId === sheetId && request.rowId === rowId && request.responseColumnId === columnId && request.status === 'pending')) {
      throw new Error('This cell is waiting for an approval decision.')
    }
    if (column.type === 'predecessor' && value?.some(item => item.rowId === rowId)) throw new Error('A task cannot depend on itself.')
    cells[columnId] = value
    directIds.push(columnId)
  }
  if (!directIds.length) return state
  const update = changedBy(state)
  const edited = { ...row, cells }
  const proposed = rows.map(item => item.id === rowId ? edited : item)
  const settings = sheet.projectSettings
  const scheduled = affectsSchedule(settings, directIds)
    ? recalculateSchedule(settings, proposed, { rowId, directIds, ...options })
    : proposed
  const finalRow = byId(scheduled, rowId)
  const actual = directIds.filter(id => !sameValue(row.cells?.[id], finalRow.cells?.[id]))
  const result = evaluateApprovals(state, sheet, finalRow, 'rowChanged', actual, update)
  const changedRows = scheduled.map(item => item.id === rowId ? result.row : item)
    .filter((item, index) => item !== rows[index] && JSON.stringify(item.cells ?? {}) !== JSON.stringify(rows[index].cells ?? {}))
    .map(item => ({ ...item, ...update }))
  if (!changedRows.length) return state
  return { ...writeRows(state, sheetId, changedRows, update), approvalRequests: result.approvalRequests }
}

export function changeColumn(state, sheetId, change) {
  return updateSheet(state, sheetId, sheet => {
    const columns = columnsOf(sheet)
    const title = change.title?.trim()
    if (change.action !== 'move') {
      if (!title) throw new Error('Enter a column name.')
      if (columns.some(column => column.id !== change.id && column.title?.toLowerCase() === title.toLowerCase())) throw new Error('A column with this name already exists.')
    }
    if (change.action === 'add') {
      const options = change.type === 'dropdown' ? [...new Set(change.options.split(/\n/).map(option => option.trim()).filter(Boolean))] : undefined
      if (options && !options.length) throw new Error('Enter at least one dropdown option.')
      const column = { id: idFor('col'), title, type: change.type, ...(options ? { options } : {}), ...(!columns.length && change.type === 'text' ? { primary: true } : {}) }
      if (!columns.length && change.type !== 'text') throw new Error('The first column must be a text column.')
      return { ...sheet, columns: [...columns, column] }
    }
    const index = columns.findIndex(column => column.id === change.id)
    if (index < 0) throw new Error('This column is unavailable.')
    const column = columns[index]
    if (change.action === 'rename') return title === column.title ? sheet : { ...sheet, columns: replace(columns, { ...column, title }) }
    const target = index + change.offset
    if (target < 0 || target >= columns.length) return sheet
    const ordered = [...columns]
    ordered.splice(index, 1)
    ordered.splice(target, 0, column)
    return { ...sheet, columns: ordered }
  })
}
