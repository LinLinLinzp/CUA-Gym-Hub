import { allocateInternal, list, note, requireFields, requireValue, transaction, validDate } from './ledger.js'
import { resolveRoute } from './routes.js'
import { find, records, rows } from './model.js'

export function savePreferences(state, draft) {
  return transaction(state, (env) => {
    const values = {
      defaultLocationId: draft.defaultLocationId || null,
      salesOrderDefaultStatus: draft.salesOrderDefaultStatus || 'Pending Approval',
      purchaseOrderSupervisorApprovalDefault: !!draft.purchaseOrderSupervisorApprovalDefault,
      creditLimitHandling: draft.creditLimitHandling || 'Warn',
      allowNegativeInventory: !!draft.allowNegativeInventory,
      showConfirmationBanners: !!draft.showConfirmationBanners,
      listRowsPerPage: Number(draft.listRowsPerPage),
    }
    requireValue(Number.isInteger(values.listRowsPerPage) && values.listRowsPerPage >= 1 && values.listRowsPerPage <= 200, 'Rows per page must be between 1 and 200.')
    const changes = Object.entries(values).filter(([key, value]) => draft[key] !== undefined && state.preferences?.[key] !== value)
    if (!changes.length) return null
    env.state.preferences = { ...state.preferences, ...Object.fromEntries(changes) }
    for (const [key, value] of changes) note(env, 'preferences', env.actor, 'Change', key, state.preferences?.[key], value)
    return env.state.preferences
  })
}

export function saveShortcut(state, draft) {
  return transaction(state, (env) => {
    const label = draft.label?.trim()
    const path = draft.path?.trim()
    requireFields({ Label: label, 'Record URL': path })
    requireValue(/^\/(?![\/\\])/.test(path), 'Enter a workspace path beginning with /.')
    const url = new URL(path, 'https://acme.app.netsuite.com')
    requireValue(url.origin === 'https://acme.app.netsuite.com' && resolveRoute(url.pathname, url.search).page !== 'missing', 'Enter a URL for a supported workspace page.')
    url.searchParams.delete('sid')
    const next = { id: uniqueId(env.state, 'shortcuts', 'short'), label, path: url.pathname + url.search + url.hash,
      createdAt: env.now, createdById: env.actor }
    list(env.state, 'shortcuts').push(next)
    note(env, 'shortcut', next.id, 'Create', 'Path', null, next.path)
    return next
  })
}

function uniqueId(state, key, prefix) {
  const value = `${prefix}_${Date.now().toString(36)}`
  let next = 1
  while (find(state, key, `${value}_${next}`)) next++
  return `${value}_${next}`
}

export function removeShortcut(state, id) {
  return transaction(state, (env) => {
    const current = find(state, 'shortcuts', id)
    requireValue(current, 'This shortcut is no longer available.')
    env.state.shortcuts = rows(state, 'shortcuts').filter((entry) => entry.id !== id)
    note(env, 'shortcut', id, 'Delete', 'Path', current.path, null)
    return current
  })
}

export function saveNote(state, draft) {
  return transaction(state, (env) => {
    const title = draft.title?.trim()
    const memo = draft.memo?.trim()
    const config = records[draft.recordCode]
    const target = config && find(state, config.key, draft.recordId)
    requireFields({ Title: title, Memo: memo, Record: target })
    const record = {
      id: uniqueId(env.state, 'userNotes', 'note'), recordType: config.type, recordId: target.id, title, memo,
      noteType: draft.noteType || 'Note', direction: draft.direction || 'Incoming', authorId: env.actor, createdAt: env.now,
    }
    list(env.state, 'userNotes').push(record)
    note(env, 'userNote', record.id, 'Create', 'Title', null, title)
    return record
  })
}

export function saveTask(state, draft) {
  return transaction(state, (env) => {
    const title = draft.title?.trim()
    const employee = find(state, 'employees', draft.assignedToId)
    requireFields({ Title: title, 'Assigned To': employee })
    requireValue((!draft.startDate || validDate(draft.startDate)) && (!draft.dueDate || validDate(draft.dueDate)) &&
      (!draft.startDate || !draft.dueDate || draft.startDate <= draft.dueDate), 'Enter a due date on or after the start date.')
    const current = draft.id && find(env.state, 'tasks', draft.id)
    requireValue(!draft.id || current, 'This task is no longer available.')
    const data = {
      title, assignedToId: employee.id, priority: draft.priority || 'Medium', status: draft.status || 'Not Started',
      startDate: draft.startDate || null, dueDate: draft.dueDate || null, companyId: draft.companyId || null,
      transactionId: draft.transactionId || null, message: draft.message || '',
    }
    if (current) {
      note(env, 'task', current.id, 'Edit', 'Status', current.status, data.status)
      return Object.assign(current, data, { lastModifiedById: env.actor, lastModifiedAt: env.now })
    }
    const record = { ...allocateInternal(env.state, 'task'), ...data, createdById: env.actor, createdAt: env.now }
    list(env.state, 'tasks').push(record)
    note(env, 'task', record.id, 'Create', 'Title', null, title)
    return record
  })
}
