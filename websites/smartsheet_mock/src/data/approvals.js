import { parseCell } from './cells.js'
import { APPROVAL_OPTIONS, byId, changedBy, columnsOf, createdWith, idFor, isActive, replace, rowsOf, sameValue, updateSheet } from './sheets.js'

export const responseColumn = column => column?.type === 'dropdown' && APPROVAL_OPTIONS.every(option => (column.options ?? []).includes(option))

function availableResponse(state, workflow) {
  if (workflow.status === 'paused') return
  if ((state.approvalWorkflows ?? []).some(item => item.id !== workflow.id && item.sheetId === workflow.sheetId &&
    item.status === 'active' && item.responseColumnId === workflow.responseColumnId)) {
    throw new Error('An active workflow already uses this response column. Choose a different column or pause the other workflow.')
  }
}

export function saveWorkflow(state, sheetId, workflowId, draft) {
  const sheet = byId(state.sheets, sheetId)
  const previous = byId(state.approvalWorkflows, workflowId)
  if (!isActive(sheet) || previous && previous.sheetId !== sheetId) throw new Error('This workflow is unavailable.')
  const name = draft.name?.trim()
  if (!name) throw new Error('Enter a workflow name.')
  if (!byId(state.users, draft.approverId)) throw new Error('Choose an approver.')
  let columns = columnsOf(sheet)
  let response = byId(columns, draft.responseColumnId)
  if (draft.responseColumnId === '$new') {
    let title = 'Approval Status'
    let suffix = 2
    while (columns.some(column => column.title?.toLowerCase() === title.toLowerCase())) title = 'Approval Status ' + suffix++
    response = { id: idFor('col'), title, type: 'dropdown', options: APPROVAL_OPTIONS }
    columns = [...columns, response]
  }
  if (!responseColumn(response)) throw new Error('Choose a dropdown with Submitted, Approved, and Declined, or create a standard response column.')
  const event = draft.event === 'rowChanged' ? 'rowChanged' : 'rowAdded'
  const watched = byId(columns, draft.watchColumnId)
  if (event === 'rowChanged' && (!watched || watched.id === response.id)) throw new Error('Choose a watched column other than the response column.')
  let condition
  if (draft.conditionColumnId) {
    const column = byId(columns, draft.conditionColumnId)
    if (!column) throw new Error('Choose a condition column.')
    const value = parseCell(column, draft.conditionValue, { users: state.users, rows: rowsOf(state, sheetId) })
    condition = { columnId: column.id, operator: 'equals', value }
  }
  const update = changedBy(state)
  const status = draft.status === 'paused' ? 'paused' : 'active'
  const record = {
    id: workflowId, sheetId, name, status, trigger: { event, ...(event === 'rowChanged' ? { columnId: watched.id } : {}) },
    ...(condition ? { condition } : {}), approverId: draft.approverId, responseColumnId: response.id,
    subject: draft.subject?.trim() || name, message: draft.message?.trim() ?? '',
    ...(previous ? { createdAt: previous.createdAt ?? update.updatedAt, createdBy: previous.createdBy ?? update.updatedBy, ...update } : createdWith(update)),
  }
  availableResponse(state, record)
  const next = columns !== sheet.columns ? updateSheet(state, sheetId, current => ({ ...current, columns }), update) : state
  return { ...next, approvalWorkflows: previous ? replace(state.approvalWorkflows, record) : [...(state.approvalWorkflows ?? []), record] }
}

export function toggleWorkflow(state, sheetId, id) {
  const sheet = byId(state.sheets, sheetId)
  const rule = byId(state.approvalWorkflows, id)
  if (!isActive(sheet) || rule?.sheetId !== sheetId) throw new Error('This workflow is unavailable.')
  const next = { ...rule, status: rule.status === 'paused' ? 'active' : 'paused', ...changedBy(state) }
  if (next.status === 'active') {
    if (!responseColumn(byId(columnsOf(sheet), next.responseColumnId))) throw new Error('Edit the workflow to choose a valid response column.')
    availableResponse(state, next)
  }
  return { ...state, approvalWorkflows: replace(state.approvalWorkflows, next) }
}

export function evaluateApprovals(state, sheet, row, event, directIds, update) {
  const requests = state.approvalRequests ?? []
  const added = []
  const cells = { ...row.cells }
  for (const rule of state.approvalWorkflows ?? []) {
    if (rule.sheetId !== sheet.id || rule.status !== 'active' || rule.trigger?.event !== event || !rule.approverId) continue
    if (event === 'rowChanged' && (!directIds.includes(rule.trigger.columnId) || rule.trigger.columnId === rule.responseColumnId)) continue
    if (!responseColumn(byId(columnsOf(sheet), rule.responseColumnId))) continue
    if (rule.condition && (!byId(columnsOf(sheet), rule.condition.columnId) || !sameValue(row.cells?.[rule.condition.columnId], rule.condition.value))) continue
    const hasRequest = request => request.sheetId === sheet.id && request.rowId === row.id &&
      (request.workflowId === rule.id || request.status === 'pending' && request.responseColumnId === rule.responseColumnId)
    if (requests.some(hasRequest) || added.some(hasRequest)) continue
    added.push({
      id: idFor('apr'), workflowId: rule.id, sheetId: sheet.id, rowId: row.id,
      approverId: rule.approverId, requestedBy: update.updatedBy, responseColumnId: rule.responseColumnId,
      subject: rule.subject || rule.name || 'Approval request', message: rule.message ?? '',
      status: 'pending', createdAt: update.updatedAt,
    })
    cells[rule.responseColumnId] = 'Submitted'
  }
  return added.length ? { row: { ...row, cells }, approvalRequests: [...requests, ...added] } : { row, approvalRequests: requests }
}

export function markRead(state, id) {
  const request = byId(state.approvalRequests, id)
  if (!request || !state.currentUserId || request.approverId !== state.currentUserId || request.readAt || request.status === 'canceled') return state
  return { ...state, approvalRequests: replace(state.approvalRequests, { ...request, readAt: new Date().toISOString(), readBy: state.currentUserId }) }
}

export function canRespond(state, request) {
  if (!request || request.status !== 'pending' || !state.currentUserId || request.approverId !== state.currentUserId) return false
  const sheet = byId(state.sheets, request.sheetId)
  const row = byId(state.rows, request.rowId)
  return isActive(sheet) && isActive(row) && row.sheetId === sheet.id && responseColumn(byId(columnsOf(sheet), request.responseColumnId))
}

export function respondToRequest(state, id, decision, note) {
  const request = byId(state.approvalRequests, id)
  if (!canRespond(state, request) || !['approved', 'declined'].includes(decision)) return state
  const row = byId(state.rows, request.rowId)
  const update = changedBy(state)
  const status = decision === 'approved' ? 'Approved' : 'Declined'
  const next = updateSheet(state, request.sheetId, sheet => ({ ...sheet }), update)
  return {
    ...next,
    rows: replace(state.rows, { ...row, cells: { ...row.cells, [request.responseColumnId]: status }, ...update }),
    approvalRequests: replace(state.approvalRequests, {
      ...request, status: decision, respondedAt: update.updatedAt, respondedBy: update.updatedBy, responseNote: note?.trim() ?? '',
      ...(request.readAt ? {} : { readAt: update.updatedAt, readBy: update.updatedBy }),
    }),
  }
}
