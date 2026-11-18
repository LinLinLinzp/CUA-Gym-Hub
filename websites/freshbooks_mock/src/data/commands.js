export const newId = prefix => prefix + '_' + crypto.randomUUID()
export const actor = state => state.currentUserId || 'usr_maya'
export const stamp = (state, row = {}, at = new Date().toISOString()) => ({
  createdAt: row.createdAt || at, createdBy: row.createdBy || actor(state), updatedAt: at, updatedBy: actor(state),
})
export function upsert(rows, record) {
  return rows.some(row => row.id === record.id) ? rows.map(row => row.id === record.id ? record : row) : [...rows, record]
}
export function event(state, action, entityType, entityId, relatedIds = [], delivery) {
  return {
    ...state, activityEvents: [...state.activityEvents, {
      id: newId('evt'), action, actorId: actor(state), createdAt: new Date().toISOString(),
      entityType, entityId, relatedIds: [...new Set(relatedIds.filter(Boolean))],
      ...(delivery ? { delivery } : {}),
    }],
  }
}
export function requireThat(condition, message) {
  if (!condition) throw new Error(message)
}
