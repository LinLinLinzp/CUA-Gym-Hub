export const labelType = (type) => type === 'communication' ? 'Communication site' : 'Team site'
export const normalize = (text) => String(text ?? '').trim().toLowerCase()
export const idFor = (type) => type + '-' + crypto.randomUUID()
export const sitePath = (siteId) => '/sites/' + encodeURIComponent(siteId)
export const contentsPath = (siteId) => sitePath(siteId) + '/contents'
export const listPath = (siteId, listId) => sitePath(siteId) + '/lists/' + encodeURIComponent(listId)
export const libraryPath = (siteId, libraryId, folderId) => sitePath(siteId) + '/libraries/' + encodeURIComponent(libraryId) +
  (folderId ? '/folders/' + encodeURIComponent(folderId) : '')
export const sameName = (records, name, exceptId) => records.some((record) => record.id !== exceptId && normalize(record.name) === normalize(name))
export const formatDate = (value) => {
  if (!value || Number.isNaN(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}
export const initials = (value) => value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export const formatSize = (size) => Number.isFinite(size) ? (size < 1024 ? size + ' B' : (size / 1024).toFixed(1) + ' KB') : '—'

export function descendants(entries, rootIds) {
  const result = new Set(rootIds)
  const children = new Map()
  for (const entry of entries) {
    const siblings = children.get(entry.parentId) ?? []
    siblings.push(entry.id)
    children.set(entry.parentId, siblings)
  }
  for (const id of result) {
    for (const child of children.get(id) ?? []) result.add(child)
  }
  return result
}

export function folderTrail(entries, id) {
  const byId = new Map(entries.filter((entry) => entry.kind === 'folder').map((entry) => [entry.id, entry]))
  const seen = new Set()
  const trail = []
  while (id != null) {
    const entry = byId.get(id)
    if (!entry || seen.has(id)) return null
    seen.add(id)
    trail.push(entry)
    id = entry.parentId
  }
  return trail.reverse()
}
