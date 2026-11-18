import { activity, byId, label, list, revokeGrants, uid } from './model.js'

export const grantKinds = {
  ROLE_TO_USER: 'Direct user', ROLE_TO_ROLE: 'Parent role', WAREHOUSE_PRIVILEGE: 'Warehouse privilege',
}
export const privileges = ['USAGE', 'OPERATE', 'MONITOR']

export function activeGrants(state) {
  return list(state.grants).filter(grant => grant.status === 'ACTIVE')
}

export function grantTarget(state, kind, id) {
  if (kind === 'ROLE_TO_USER') return byId(state.users, id)
  if (kind === 'ROLE_TO_ROLE') return byId(state.roles, id)
  if (kind === 'WAREHOUSE_PRIVILEGE') return byId(state.warehouses, id)
}

export function grantDirection(state, grant) {
  const role = label(state.roles, grant.roleId)
  const target = grantTarget(state, grant.kind, grant.targetId)
  const name = target?.name ?? target?.displayName ?? (grant.targetId ? 'Historical reference' : '—')
  return grant.kind === 'WAREHOUSE_PRIVILEGE' ? (grant.privilege ?? 'Privilege') + ' on ' + name + ' granted to ' + role : role + ' granted to ' + name
}

function createsCycle(grants, roleId, parentId) {
  const parents = new Map()
  for (const grant of grants) {
    if (grant.kind === 'ROLE_TO_ROLE') {
      const current = parents.get(grant.roleId) ?? []
      current.push(grant.targetId)
      parents.set(grant.roleId, current)
    }
  }
  const visited = new Set()
  const queue = [parentId]
  while (queue.length) {
    const role = queue.pop()
    if (role === roleId) return true
    if (visited.has(role)) continue
    visited.add(role)
    for (const parent of parents.get(role) ?? []) queue.push(parent)
  }
  return false
}

export function validateGrant(state, grant) {
  if (!grantTarget(state, grant.kind, grant.targetId)) return 'Choose an available target.'
  if (grant.kind === 'WAREHOUSE_PRIVILEGE' && !privileges.includes(grant.privilege)) return 'Choose a warehouse privilege.'
  const grants = activeGrants(state)
  if (grants.some(item => item.kind === grant.kind && item.roleId === grant.roleId && item.targetId === grant.targetId &&
    (item.privilege ?? null) === grant.privilege)) return 'This grant is already active.'
  if (grant.kind === 'ROLE_TO_ROLE' && createsCycle(grants, grant.roleId, grant.targetId)) return 'This grant would create a role cycle. Choose a different parent role.'
  return ''
}

export function createGrant(state, tx, fields) {
  const grant = {
    ...fields, id: uid('grant'), status: 'ACTIVE', grantedByUserId: tx.actorUserId, grantedByRoleId: tx.actorRoleId,
    createdAt: tx.createdAt, revokedAt: null, revokedByUserId: null,
  }
  return activity({ ...state, grants: [...list(state.grants), grant] },
    tx, 'grant.created', { ...grant, name: grantDirection(state, grant) }, {}, { roleId: grant.roleId, targetId: grant.targetId })
}

export function dropRole(state, tx, role) {
  const id = role.id
  const grants = activeGrants(state).filter(grant => grant.roleId === id || (grant.kind === 'ROLE_TO_ROLE' && grant.targetId === id))
  const warehouses = list(state.warehouses)
  const worksheets = list(state.worksheets)
  const roles = list(state.roles)
  const users = list(state.users)
  const clearOwnership = item => item.ownerRoleId === id ? { ...item, ownerRoleId: null, updatedAt: tx.createdAt } : item
  const next = revokeGrants({
    ...state,
    account: state.account?.activeRoleId === id ? { ...state.account, activeRoleId: null } : state.account,
    warehouses: warehouses.map(clearOwnership),
    roles: roles.filter(item => item.id !== id).map(clearOwnership),
    users: users.map(item => item.defaultRoleId === id ? { ...item, defaultRoleId: null } : item),
    worksheets: worksheets.map(item => item.context?.roleId === id ? {
      ...item, context: { ...item.context, roleId: null }, updatedAt: tx.createdAt,
    } : item),
  }, tx, grants)
  return activity(next, tx, 'role.dropped', role, {}, {
    revokedGrantIds: grants.map(grant => grant.id),
    clearedWorksheetIds: worksheets.filter(item => item.context?.roleId === id).map(item => item.id),
    clearedUserIds: users.filter(item => item.defaultRoleId === id).map(item => item.id),
    clearedWarehouseIds: warehouses.filter(item => item.ownerRoleId === id).map(item => item.id),
    clearedRoleIds: roles.filter(item => item.id !== id && item.ownerRoleId === id).map(item => item.id),
  })
}
