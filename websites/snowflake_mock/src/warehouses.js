import { activity, changesBetween, list, revokeGrants, updateRecord } from './model.js'

export function warehouseLifecycle(state, tx, warehouse, status) {
  const next = { status, activeClusters: status === 'STARTED' ? warehouse.minClusters ?? 1 : 0, running: 0, queued: 0 }
  const type = status === 'STARTED' ? 'warehouse.resumed' : 'warehouse.suspended'
  return activity(updateRecord(state, 'warehouses', warehouse.id, { ...next, updatedAt: tx.createdAt }), tx, type, warehouse, changesBetween(warehouse, next))
}

export function dropWarehouse(state, tx, warehouse) {
  const worksheets = list(state.worksheets)
  const clearedWorksheetIds = worksheets.filter(item => item.context?.warehouseId === warehouse.id).map(item => item.id)
  const grants = list(state.grants).filter(grant => grant.kind === 'WAREHOUSE_PRIVILEGE' && grant.targetId === warehouse.id && grant.status === 'ACTIVE')
  const next = revokeGrants({
    ...state,
    warehouses: list(state.warehouses).filter(item => item.id !== warehouse.id),
    worksheets: worksheets.map(item => item.context?.warehouseId === warehouse.id ? {
      ...item, context: { ...item.context, warehouseId: null }, updatedAt: tx.createdAt,
    } : item),
  }, tx, grants)
  return activity(next, tx, 'warehouse.dropped', warehouse, {}, { clearedWorksheetIds, revokedGrantIds: grants.map(grant => grant.id) })
}
