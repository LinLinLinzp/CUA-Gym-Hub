export const list = (value) => Array.isArray(value) ? value : []
export const find = (value, id) => list(value).find((record) => record.id === id)
export const newest = (value) => [...list(value)].reverse().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
export const uid = (prefix) => prefix + '-' + crypto.randomUUID()
export const active = (status) => status === 'running' || status === 'queued'
export const pathFor = (nb) => (nb.folder ?? '/').replace(/\/$/, '') + '/' + (nb.name ?? 'Untitled')
export const routeId = (id) => encodeURIComponent(id)
export const person = (state, id) => find(state.users, id)?.name ?? (id === state.currentUser?.id ? state.currentUser?.name : null) ?? 'Unknown user'
export const titleCase = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'
export const matches = (value, query) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())

export function dateLabel(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date) : '—'
}

export function stamp(context) {
  return { updatedBy: context.actorId, updatedAt: context.createdAt }
}

export function created(context) {
  return { ownerId: context.actorId, createdBy: context.actorId, createdAt: context.createdAt, ...stamp(context) }
}

export function replace(collection, record) {
  return list(collection).map((item) => item.id === record.id ? record : item)
}

export function activity(state, context, entityType, record, action, changes = {}, relatedId = null) {
  return [...list(state.activity), { id: uid('act'), ...context, entityType, entityId: record.id,
    entityName: record.name ?? 'Untitled', action, changes, relatedId }]
}

export function changeRecord(state, collection, record, updates, context, entityType, action, changes = updates) {
  return { ...state,
    [collection]: replace(state[collection], { ...record, ...updates, ...stamp(context) }),
    activity: activity(state, context, entityType, { ...record, ...updates }, action, changes),
  }
}

export const actionLabel = (type, action) => ({
  created: 'Created', renamed: 'Renamed', language_changed: 'Changed default language',
  cells_saved: 'Saved cells', cell_added: 'Added a cell', cell_removed: 'Removed a cell',
  cell_moved: 'Moved a cell', attached: 'Attached compute', detached: 'Detached compute',
  run_started: 'Ran ' + (type === 'job' ? 'job' : 'notebook'), run_canceled: 'Canceled run',
  settings_updated: 'Updated settings', tasks_updated: 'Updated tasks',
  schedule_saved: 'Saved schedule', schedule_paused: 'Paused schedule', schedule_resumed: 'Resumed schedule',
  schedule_removed: 'Removed schedule', deleted: 'Deleted', duplicated: 'Duplicated',
  started: 'Started', restarted: 'Restarted', terminated: 'Terminated', updated: 'Updated configuration',
})[action] ?? titleCase(action)
