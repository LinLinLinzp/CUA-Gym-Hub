export const APPROVAL_OPTIONS = ['Submitted', 'Approved', 'Declined']
export const WEEKDAYS = [1, 2, 3, 4, 5]
export const idFor = prefix => prefix + '_' + crypto.randomUUID()
export const isActive = record => record && record.status !== 'deleted'
export const isBlank = value => value == null || value === '' || Array.isArray(value) && !value.length
export const sameValue = (left, right) => isBlank(left) && isBlank(right) || JSON.stringify(left) === JSON.stringify(right)
export const sheetPath = sheet => '/sheets/' + encodeURIComponent(sheet.id)
export const byId = (items, id) => (items ?? []).find(item => item.id === id)
export const columnsOf = sheet => sheet?.columns ?? []
export const primaryOf = sheet => columnsOf(sheet).find(column => column.primary) || columnsOf(sheet)[0]
export const replace = (items, record) => (items ?? []).map(item => item.id === record.id ? record : item)
export const rowsOf = (state, sheetId) => (state.rows ?? []).filter(row => row.sheetId === sheetId && isActive(row))
  .sort((left, right) => (left.position ?? 0) - (right.position ?? 0) || left.id.localeCompare(right.id))

export function changedBy(state, fallback = 'anonymous') {
  return { updatedAt: new Date().toISOString(), updatedBy: state.currentUserId || fallback }
}

export function createdWith(update) {
  return { ...update, createdAt: update.updatedAt, createdBy: update.updatedBy }
}

export function deletedWith(update) {
  return { ...update, status: 'deleted', deletedAt: update.updatedAt, deletedBy: update.updatedBy }
}

export function cancelRequests(requests, predicate, update) {
  return (requests ?? []).map(request => request.status === 'pending' && predicate(request)
    ? { ...request, status: 'canceled', canceledAt: update.updatedAt, canceledBy: update.updatedBy } : request)
}

export const projectColumns = [
  { id: 'col_task', title: 'Task Name', type: 'text', primary: true },
  { id: 'col_status', title: 'Status', type: 'dropdown', options: ['Not Started', 'In Progress', 'Complete', 'Blocked'] },
  { id: 'col_assigned', title: 'Assigned To', type: 'contact' },
  { id: 'col_start', title: 'Start Date', type: 'date' },
  { id: 'col_finish', title: 'End Date', type: 'date' },
  { id: 'col_duration', title: 'Duration', type: 'duration' },
  { id: 'col_predecessors', title: 'Predecessors', type: 'predecessor' },
  { id: 'col_percent', title: '% Complete', type: 'percent' },
]

export const projectDefaults = {
  startColumnId: 'col_start', endColumnId: 'col_finish', percentColumnId: 'col_percent',
  durationColumnId: 'col_duration', predecessorsColumnId: 'col_predecessors',
  dependenciesEnabled: false, workingWeekdays: WEEKDAYS, holidays: [],
}

export function createSheet(state, { id, name, workspaceId, preset }) {
  if (!name.trim()) throw new Error('Enter a sheet name.')
  if (!byId(state.workspaces, workspaceId)) throw new Error('Choose a workspace.')
  const update = changedBy(state)
  const project = preset === 'project'
  const sheet = {
    id, workspaceId, ownerId: update.updatedBy, name: name.trim(), status: 'active',
    columns: project ? projectColumns : [{ id: 'col_primary', title: 'Primary Column', type: 'text', primary: true }],
    ...(project ? { projectSettings: projectDefaults } : {}), ...createdWith(update),
  }
  return { ...state, sheets: [...(state.sheets ?? []), sheet] }
}

export function updateSheet(state, sheetId, apply, update = changedBy(state)) {
  const current = byId(state.sheets, sheetId)
  if (!isActive(current)) throw new Error('This sheet is unavailable.')
  const next = apply(current)
  if (next === current) return state
  return { ...state, sheets: replace(state.sheets, { ...next, ...update }) }
}

export function renameSheet(state, sheetId, name) {
  if (!name.trim()) throw new Error('Enter a sheet name.')
  return updateSheet(state, sheetId, sheet => sheet.name === name.trim() ? sheet : { ...sheet, name: name.trim() })
}

export function deleteSheet(state, sheetId) {
  const update = changedBy(state)
  const next = updateSheet(state, sheetId, sheet => ({ ...sheet, ...deletedWith(update) }), update)
  return {
    ...next,
    preferences: { ...state.preferences, favoriteSheetIds: (state.preferences?.favoriteSheetIds ?? []).filter(id => id !== sheetId) },
    approvalRequests: cancelRequests(state.approvalRequests, request => request.sheetId === sheetId, update),
  }
}
