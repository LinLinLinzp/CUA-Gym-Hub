export const list = value => Array.isArray(value) ? value : []
export const byId = (items, id) => id == null ? undefined : list(items).find(item => item?.id === id)
export const label = (items, id) => byId(items, id)?.name ?? (id ? 'Historical reference' : '—')
export const identifier = value => value.trim().toUpperCase()
export const validIdentifier = value => /^[A-Z_][A-Z0-9_$]*$/.test(value)
export const uid = prefix => prefix + '_' + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
export const sizeNames = { XSMALL: 'X-Small', SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', XLARGE: 'X-Large' }
export const stateNames = { STARTED: 'Started', SUSPENDED: 'Suspended', SYSTEM: 'System', CUSTOM: 'Custom', ACTIVE: 'Active', REVOKED: 'Revoked', SUCCEEDED: 'Succeeded', FAILED: 'Failed' }
export const filterText = (query, ...fields) => fields.some(field => String(field ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const byName = (a, b) => String(a.name ?? a.title ?? '').localeCompare(String(b.name ?? b.title ?? ''))
export const byRecent = (a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? ''))
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(value) {
  const date = new Date(value || NaN)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

export function transactionInfo(state) {
  return {
    createdAt: new Date().toISOString(),
    actorUserId: byId(state.users, state.account?.activeUserId)?.id ?? null,
    actorRoleId: byId(state.roles, state.account?.activeRoleId)?.id ?? null,
  }
}

export function activity(state, tx, type, subject, changes = {}, relatedIds = {}) {
  const entityType = type.split('.')[0]
  const event = { id: uid('evt'), type, entityType, entityId: subject.id, entityLabel: subject.name ?? subject.title ?? subject.id, ...tx, changes, relatedIds }
  return { ...state, activity: [...list(state.activity), event] }
}

export function changesBetween(before, after) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => (before[key] ?? null) !== (value ?? null))
    .map(([key, value]) => [key, { from: before[key] ?? null, to: value ?? null }]))
}

export function updateRecord(state, collection, id, fields) {
  return { ...state, [collection]: list(state[collection]).map(item => item.id === id ? { ...item, ...fields } : item) }
}

export function revokeGrants(state, tx, grants) {
  const ids = new Set(grants.map(grant => grant.id))
  const next = {
    ...state,
    grants: list(state.grants).map(grant => ids.has(grant.id) ? {
      ...grant, status: 'REVOKED', revokedAt: tx.createdAt, revokedByUserId: tx.actorUserId,
    } : grant),
  }
  return grants.reduce((result, grant) => activity(result, tx, 'grant.revoked', grant,
    { status: { from: 'ACTIVE', to: 'REVOKED' } }, { roleId: grant.roleId, targetId: grant.targetId }), next)
}
