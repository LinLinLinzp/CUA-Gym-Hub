export const rows = (state, key) => Array.isArray(state?.[key]) ? state[key] : []
export const emailKey = (email) => String(email ?? '').trim().toLowerCase()
export const actorOf = (state) => rows(state, 'users').find((user) => user.id === state.currentUserId)
export const userOf = (state, id) => rows(state, 'users').find((user) => user.id === id)
export const isActive = (doc) => Boolean(doc && (!doc.status || doc.status === 'active'))
export const permissionLabels = {
  edit: 'Can edit',
  review: 'Can review',
  view: 'Can view',
  viewNoDownload: 'Can’t download',
}
export const scopeLabels = {
  anyone: 'Anyone',
  organization: 'People in the organization',
  existingAccess: 'People with existing access',
  specificPeople: 'People you choose',
}
const roles = ['viewNoDownload', 'view', 'review', 'edit', 'owner']
export const stronger = (a, b) => roles[Math.max(roles.indexOf(a), roles.indexOf(b))] ?? null
export const canEdit = (role) => role === 'owner' || role === 'edit'
export const canReview = (role) => canEdit(role) || role === 'review'

function grantMatches(grant, user) {
  return grant.userId === user.id || Boolean(emailKey(user.email) && emailKey(grant.email) === emailKey(user.email))
}

export function directRole(state, doc, user = actorOf(state)) {
  if (!isActive(doc) || !user) return null
  if (doc.ownerId === user.id) return 'owner'
  return rows(state, 'shareGrants').reduce((role, grant) => {
    const matches = grant.documentId === doc.id && grant.status === 'active' && grantMatches(grant, user)
    return matches ? stronger(role, grant.permission) : role
  }, null)
}

export function redeemedRole(state, doc, link) {
  if (!isActive(doc) || link?.status !== 'active') return null
  const actor = actorOf(state)
  const direct = directRole(state, doc, actor)
  switch (link.scope) {
    case 'anyone': return stronger(direct, link.permission)
    case 'existingAccess': return direct
    case 'organization':
      return actor?.organizationId && actor.organizationId === link.organizationId ? stronger(direct, link.permission) : null
    case 'specificPeople':
      return actor && emailKey(actor.email) && (link.recipientEmails ?? []).some((email) => emailKey(email) === emailKey(actor.email))
        ? stronger(direct, link.permission) : null
    default: return null
  }
}
