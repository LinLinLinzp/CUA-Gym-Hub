export const types = { case: 'Cases', statute: 'Statutes', secondary: 'Secondary sources' }
export const jurisdictions = {
  'federal-9th': 'Ninth Circuit', 'federal-2nd': 'Second Circuit', 'federal-7th': 'Seventh Circuit',
  california: 'California', 'new-york': 'New York', delaware: 'Delaware',
}
export function jurisdictionOptions(documents, selected) {
  const codes = new Set(documents.map((doc) => doc?.jurisdiction))
  codes.add(selected)
  const extra = [...codes].filter((code) => code && !Object.hasOwn(jurisdictions, code)).sort()
  return { ...jurisdictions, ...Object.fromEntries(extra.map((code) => [code, code])) }
}
export const treatments = { followed: 'Followed', distinguished: 'Distinguished', criticized: 'Criticized', cited: 'Cited' }
export const signals = { positive: 'Positive treatment', caution: 'Caution', negative: 'Negative treatment', neutral: 'Neutral treatment' }
export const frequencies = { daily: 'Daily', business_daily: 'Business days', weekly: 'Weekly', monthly: 'Monthly', as_available: 'As available' }
export const array = (value) => Array.isArray(value) ? value.filter((record) => record != null) : []
export const byId = (rows, id) => id == null || !Array.isArray(rows) ? undefined : rows.find((row) => row?.id === id)
export const norm = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
export const includes = (text, query) => norm(text).includes(norm(query))
export const dateText = (value) => {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
    : 'Date unavailable'
}
export const newest = (a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
export const docPath = (id) => `/research/documents/${encodeURIComponent(id)}`
export const folderPath = (id) => `/folders/${encodeURIComponent(id)}`
export const reportPath = (id) => `/citations/${encodeURIComponent(id)}`
export const alertPath = (id) => `/alerts/${encodeURIComponent(id)}`
export const nameOf = (row, field = 'title') => row?.[field] || 'Untitled'
export const patchRows = (rows, changes) => array(rows).map((row) => changes.get(row.id) || row)
export const filterSnapshot = (source = {}) => Object.fromEntries(
  ['contentType', 'jurisdiction'].filter((key) => source?.[key]).map((key) => [key, source[key]]),
)
export const filterLabel = (filters) => [
  types[filters?.contentType] || filters?.contentType, jurisdictions[filters?.jurisdiction] || filters?.jurisdiction,
].filter(Boolean).join(' · ')
export function researchPath(query, filters, sort) {
  const params = new URLSearchParams()
  if (query?.trim()) params.set('q', query.trim())
  for (const [key, value] of Object.entries(filterSnapshot(filters))) params.set(key, value)
  if (sort && sort !== 'relevance') params.set('sort', sort)
  return `/research${params.size ? `?${params}` : ''}`
}
export function folderTrail(folders, id) {
  const trail = []
  const seen = new Set()
  while (id != null) {
    if (seen.has(id)) return null
    seen.add(id)
    const folder = byId(folders, id)
    if (!folder) return null
    trail.unshift(folder)
    id = folder.parentId
  }
  return trail
}
export function activeFolder(folders, id) {
  const trail = folderTrail(folders, id)
  return !!trail?.length && trail.every((row) => row.status !== 'archived')
}
export const folderLabel = (folders, id) => folderTrail(folders, id)?.map((row) => nameOf(row, 'name')).join(' / ') || 'Unavailable folder'
export function validateFolder(folders, name, parentId, exclude) {
  if (!name.trim()) return 'Enter a folder name.'
  if (parentId != null && !activeFolder(folders, parentId)) return 'Choose an available parent folder.'
  if (folders.some((row) => row.id !== exclude && row.status !== 'archived'
    && (row.parentId ?? null) === parentId && norm(row.name) === norm(name))) return 'An active folder with that name already exists here.'
  return ''
}
export function duplicateItem(items, candidate, folderId, excluded) {
  return items.some((row) => {
    if (row.id === excluded || row.folderId !== folderId || row.status === 'removed' || row.kind !== candidate.kind) return false
    if (row.kind === 'search') return norm(row.query) === norm(candidate.query)
      && JSON.stringify(filterSnapshot(row.filters)) === JSON.stringify(filterSnapshot(candidate.filters))
    if (row.documentId !== candidate.documentId) return false
    return row.kind !== 'citation' || (row.format === candidate.format && !!row.includeLink === !!candidate.includeLink)
  })
}
export const reportable = (doc, refs) => !!doc && doc.type === 'case'
  && (!!doc.signal || array(refs).some((row) => row.documentId === doc.id))
export const expired = (alert) => /^\d{4}-\d{2}-\d{2}$/.test(alert.expiresOn || '')
  && alert.expiresOn < new Date().toISOString().slice(0, 10)
export const alertStatus = (alert) => expired(alert) && alert.status !== 'deleted' ? 'expired' : alert.status || 'active'
export const sourceText = (alert, documents) => alert.type === 'shepards'
  ? byId(documents, alert.source?.documentId)?.title || 'Unavailable authority'
  : alert.source?.query || 'Search query unavailable'
export const titleCase = (value) => value?.replace(/^./, (character) => character.toUpperCase()) || ''
