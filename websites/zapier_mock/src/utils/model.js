export const items = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const byId = (list, id) => items(list).find((entry) => entry.id === id)
export const person = (state, id) => byId(state.users, id)?.name || 'Unknown owner'
export const appName = (state, id) => byId(state.apps, id)?.name || (id ? 'Unavailable app' : 'Unconfigured')
export const eventFor = (state, step) => byId(byId(state.apps, step?.appId)?.events, step?.eventId)
export const statusOf = (zap) => zap.status || (zap.enabled ? 'on' : isPublished(zap) ? 'off' : 'draft')
export const isPublished = (zap) => Number(zap.version) > 0 || items(zap.publishedSteps).length > 0
export const idFor = (prefix) => prefix + '_' + crypto.randomUUID()
export const actor = (state) => state.workspace?.currentUserId || 'usr_avery'
export const timestamp = () => new Date().toISOString()
export const editMeta = (state, at = timestamp()) => ({ updatedAt: at, updatedBy: actor(state) })
export const createMeta = (state, at = timestamp()) => ({ ...editMeta(state, at), createdAt: at, createdBy: actor(state) })
export const replace = (list, record) => items(list).map((entry) => entry.id === record.id ? record : entry)
export const includesText = (query, ...values) => values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query.trim().toLowerCase()))
export const timeValue = (value) => Date.parse(value) || 0
export const newest = (list, key) => [...list].sort((a, b) => timeValue(b[key]) - timeValue(a[key]))
export const labels = { on: 'On', off: 'Off', draft: 'Draft', success: 'Success', errored: 'Errored', filtered: 'Filtered', on_hold: 'On hold', skipped: 'Skipped', active: 'Active', expired: 'Expired' }

const formatDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const formatTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
export function dateLabel(value, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  const date = new Date(value)
  return formatDate.format(date) + (time ? ' · ' + formatTime.format(date) + ' UTC' : '')
}
export const relevantSteps = (zap) => items(zap.draftSteps).length ? items(zap.draftSteps) : items(zap.publishedSteps)
export const stepsUsing = (steps, connectionId) => items(steps).some((step) => step.connectionId === connectionId)
export const connectedZaps = (state, connectionId) => items(state.zaps).filter((zap) => stepsUsing(zap.draftSteps, connectionId) || stepsUsing(zap.publishedSteps, connectionId))
