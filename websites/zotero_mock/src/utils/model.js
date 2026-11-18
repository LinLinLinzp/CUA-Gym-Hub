export const itemTypes = {
  journalArticle: 'Journal article', book: 'Book', report: 'Report', webpage: 'Web page',
}

export const records = (value) => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : []
export const values = (value) => Array.isArray(value) ? value : []
export const active = (record) => !record.status || record.status === 'active'
export const writable = (library) => Boolean(library && active(library) && ['owner', 'editor'].includes(library.role))
export const yearOf = (item) => String(item.date ?? '').match(/^\d{4}/)?.[0] ?? ''
export const creatorName = (creator) => creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(' ')
export const creatorsOf = (item) => records(item.creators).map(creatorName).filter(Boolean).join(', ')
export const publicationOf = (item) => item.publicationTitle || item.publisher || ''
export const newId = (type) => type + '_' + (
  crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
)
export const byName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))

export function dateLabel(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
    : '—'
}

export function descendantIds(collections, rootId) {
  const children = new Map()
  for (const collection of collections) {
    if (!children.has(collection.parentId)) children.set(collection.parentId, [])
    children.get(collection.parentId).push(collection.id)
  }
  const found = new Set()
  const pending = [rootId]
  while (pending.length) {
    const id = pending.pop()
    if (found.has(id)) continue
    found.add(id)
    for (const child of children.get(id) ?? []) pending.push(child)
  }
  return found
}

function parentChainValid(byId, parentId, movingId) {
  const visited = new Set([movingId])
  while (parentId) {
    if (visited.has(parentId) || !byId.has(parentId)) return false
    visited.add(parentId)
    parentId = byId.get(parentId).parentId
  }
  return true
}

export function validParent(collections, parentId, movingId) {
  return parentChainValid(new Map(collections.map((collection) => [collection.id, collection])), parentId, movingId)
}

export function collectionTree(collections) {
  const byId = new Map(collections.map((collection) => [collection.id, collection]))
  const roots = []
  const children = new Map()
  for (const collection of collections) {
    const parent = byId.get(collection.parentId)
    if (!parent || !parentChainValid(byId, parent.id, collection.id)) {
      roots.push(collection)
      continue
    }
    if (!children.has(parent.id)) children.set(parent.id, [])
    children.get(parent.id).push(collection)
  }
  return { roots, children }
}
