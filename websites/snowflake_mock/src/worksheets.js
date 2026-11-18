import { activity, byId, changesBetween, list, uid, updateRecord } from './model.js'
import { contextSnapshot, executeSql } from './sql.js'
import { warehouseLifecycle } from './warehouses.js'

export const contextKeys = ['roleId', 'warehouseId', 'databaseId', 'schemaId']

export function worksheetDraft(item) {
  return { title: item.title ?? '', sql: item.sql ?? '', context: Object.fromEntries(contextKeys.map(key => [key, item.context?.[key] ?? null])) }
}

export function defaultContext(state) {
  const usable = items => list(items).find(item => item.id)
  const database = usable(state.catalog)
  return {
    roleId: byId(state.roles, state.account?.activeRoleId)?.id ?? usable(state.roles)?.id ?? null,
    warehouseId: usable(state.warehouses)?.id ?? null,
    databaseId: database?.id ?? null, schemaId: usable(database?.schemas)?.id ?? null,
  }
}

export function worksheetChanges(item, draft) {
  const changes = changesBetween(item, { title: draft.title, sql: draft.sql })
  for (const [key, value] of Object.entries(changesBetween(item.context ?? {}, draft.context))) {
    changes['context.' + key] = value
  }
  return changes
}

export function saveWorksheet(state, tx, item, draft) {
  const changes = worksheetChanges(worksheetDraft(item), draft)
  if (!Object.keys(changes).length) return state
  return activity(updateRecord(state, 'worksheets', item.id, {
    ...draft, context: { ...item.context, ...draft.context }, updatedAt: tx.createdAt,
  }), tx, 'worksheet.updated', { ...item, title: draft.title }, changes)
}

export function runWorksheet(state, tx, item, draft, sql) {
  let next = saveWorksheet(state, tx, item, draft)
  const context = contextSnapshot(state.catalog, state.roles, state.warehouses, draft.context)
  const { columns, rows, error, resumeWarehouse } = executeSql(sql, state, draft.context, context)
  if (resumeWarehouse) next = warehouseLifecycle(next, tx, byId(state.warehouses, draft.context.warehouseId), 'STARTED')
  const run = {
    id: uid('run'), worksheetId: item.id, worksheetTitle: draft.title, sql, context,
    status: error ? 'FAILED' : 'SUCCEEDED', rowCount: rows.length, durationMs: error ? 5 : 18,
    columns, rows, error, actorUserId: tx.actorUserId, createdAt: tx.createdAt,
  }
  next = { ...next, queryRuns: [...list(next.queryRuns), run] }
  return activity(next, tx, 'worksheet.query_ran', { ...item, title: draft.title }, {}, { queryRunId: run.id })
}
