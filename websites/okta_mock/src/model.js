export const userStatuses = ['ACTIVE', 'STAGED', 'SUSPENDED', 'DEACTIVATED']
export const groupSources = ['OKTA', 'DIRECTORY']
export const appStatuses = ['ACTIVE', 'INACTIVE']
const labels = { OKTA: 'Okta', DIRECTORY: 'Directory' }

export function label(value) {
  return labels[value] || (value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : '—')
}

export function personName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') ||
    person.name || person.username || person.email || 'Unnamed person'
}

export function matches(query, ...values) {
  return values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
}

export function recordPath(base, id) {
  return base + '/' + encodeURIComponent(id)
}

export const active = record => record.status === 'ACTIVE'

export function accessFor(state, userId, appId) {
  const groups = new Set(state.groupMemberships.filter(row => row.userId === userId && active(row)).map(row => row.groupId))
  return state.appAssignments.filter(row => row.appId === appId && active(row) &&
    ((row.principalType === 'USER' && row.principalId === userId) ||
      (row.principalType === 'GROUP' && groups.has(row.principalId))))
}
