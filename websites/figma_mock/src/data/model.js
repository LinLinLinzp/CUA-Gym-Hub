export const records = (state, key) => Array.isArray(state[key]) ? state[key].filter(Boolean) : []
export const find = (state, key, id) => id ? records(state, key).find((item) => item.id === id) : undefined
export const actorId = (state) => state.account?.currentUserId || null
export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase()
export const clean = (value) => String(value ?? '').trim()
export const active = (file) => Boolean(file && file.status !== 'trashed')
export const activeFolder = (folder) => Boolean(folder && folder.status !== 'archived')
export const owns = (state, file) => Boolean(actorId(state) && file?.ownerId === actorId(state))
export const matches = (value, query) => String(value ?? '').toLowerCase().includes(query)
export const fileName = (file) => file?.name || 'Untitled design'
export const pageName = (page) => page?.name || 'Untitled page'
export const personName = (state, id) => find(state, 'users', id)?.name || 'Workspace member'
export const filePath = (file, page, thread, layer) => {
  const query = new URLSearchParams()
  if (page) query.set('page', page)
  if (thread) query.set('thread', thread)
  if (layer) query.set('layer', layer)
  return '/design/' + encodeURIComponent(file) + (query.size ? '?' + query : '')
}
export const folderPath = (folder) => '/folders/' + encodeURIComponent(folder)
export const byId = (a, b) => String(a.id ?? '').localeCompare(String(b.id ?? ''))
export const byPosition = (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0) || byId(a, b)
export const byTime = (a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) || byId(a, b)
export const roleLabel = (role) => role === 'edit' ? 'Can edit' : 'Can view'
export const geometryOf = (layer) => {
  const { x, y, width, height } = layer?.geometry ?? {}
  return {
    x: Number.isFinite(x) ? x : 80,
    y: Number.isFinite(y) ? y : 80,
    width: Number.isFinite(width) && width > 0 ? width : 180,
    height: Number.isFinite(height) && height > 0 ? height : 70,
  }
}

export function roleFor(state, file) {
  if (!active(file) || !actorId(state)) return null
  if (owns(state, file)) return 'owner'
  const id = actorId(state)
  const email = normalizeEmail(find(state, 'users', id)?.email)
  const roles = records(state, 'fileAccess')
    .filter((grant) => grant.fileId === file.id && grant.status === 'active' &&
      (grant.userId === id || (!grant.userId && email && normalizeEmail(grant.email) === email)))
    .map((grant) => grant.role)
  if (file.linkAccess?.audience === 'anyone') roles.push(file.linkAccess.role)
  if (roles.includes('edit')) return 'edit'
  return roles.includes('view') ? 'view' : null
}

export const editable = (state, file) => ['owner', 'edit'].includes(roleFor(state, file))

export function destination(state, file) {
  if (!file?.folderId) return 'Drafts'
  const folder = find(state, 'folders', file.folderId)
  return activeFolder(folder) ? (folder.name || 'Untitled folder') : 'Unavailable folder'
}

export function relativeDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Date unavailable'
  const days = Math.floor((new Date() - date) / 86400000)
  if (days < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return days + ' days ago'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const mainFor = (state, component) => {
  const layer = find(state, 'layers', component?.mainLayerId)
  const page = find(state, 'pages', component?.pageId)
  return layer && page && page.fileId === component.fileId &&
    layer.fileId === page.fileId && layer.pageId === page.id ? layer : undefined
}

export function availableComponent(state, component, file) {
  return Boolean(component && file && mainFor(state, component) && (
    component.fileId === file.id ||
    (component.status === 'published' && roleFor(state, find(state, 'files', component.fileId)))
  ))
}

