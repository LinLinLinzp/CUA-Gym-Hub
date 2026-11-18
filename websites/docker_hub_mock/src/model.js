export const active = record => record && (record.status == null || record.status === 'active')
export const current = (state, key) => (state[key] ?? []).filter(active)
export const byId = (state, key, id) => current(state, key).find(record => record.id === id)
export const label = namespace => namespace?.name || namespace?.slug || 'Unknown namespace'
export const qualified = (namespace, repository) => `${namespace?.slug || 'unknown'}/${repository.name}`
export const repoPath = (namespace, repository) =>
  `/repositories/${encodeURIComponent(namespace.slug)}/${encodeURIComponent(repository.name)}`
export const tagPath = (base, tag) => `${base}/tags/${encodeURIComponent(tag.name)}`
export const teamPath = team => `/teams/${encodeURIComponent(team.id)}`
export const platformName = platform => [platform?.os, platform?.architecture, platform?.variant].filter(Boolean).join('/')
export const dateText = value => value && !Number.isNaN(Date.parse(value))
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—'
export const numberText = value => typeof value === 'number' ? value.toLocaleString('en-US') : '—'
export const sizeText = value => typeof value === 'number' ? `${(value / 1048576).toFixed(1)} MB` : '—'
export const matches = (query, ...values) =>
  values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const newest = (a, b) => String(b.updatedAt ?? b.pushedAt ?? '').localeCompare(String(a.updatedAt ?? a.pushedAt ?? ''))
export const alphabetical = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))
export const permissionNames = { read_only: 'Read-only', read_write: 'Read & Write', admin: 'Admin' }
export const organizationUsers = (state, namespaceId) => {
  const ids = new Set(current(state, 'organizationMembers')
    .filter(member => member.namespaceId === namespaceId).map(member => member.userId))
  return current(state, 'users').filter(user => ids.has(user.id))
}

