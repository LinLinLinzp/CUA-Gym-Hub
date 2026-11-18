export const array = (value) => Array.isArray(value) ? value : []
export const records = (value) => array(value).filter((item) => item && typeof item === 'object')
export const text = (value) => typeof value === 'string' ? value : ''
export const lower = (value) => text(value).toLowerCase()
export const findRecord = (value, id) => id == null ? undefined : records(value).find((item) => item.id === id)
export const replaceRecord = (value, record) => array(value).map((item) => item?.id === record.id ? record : item)
export const createId = (kind) => `${kind}-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
export const isActive = (record) => record.status == null || record.status === 'active'
export const editMetadata = ({ actorId, now }) => ({ updatedBy: actorId, updatedAt: now })
export const newMetadata = (change) => ({ createdBy: change.actorId, createdAt: change.now, ...editMetadata(change) })

export const statuses = {
  draft: 'Draft', scheduled: 'Scheduled', pending_approval: 'Pending approval',
  rejected: 'Rejected', published: 'Published', canceled: 'Canceled', pending: 'Pending', approved: 'Approved',
}
export const networks = { instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', x: 'X' }
export const feedTypes = { my_posts: 'My Posts', mentions: 'Mentions', keyword_search: 'Keyword search' }

export function profileName(profile) {
  if (!profile) return 'Unavailable profile'
  return [text(profile.name), networks[profile.network]].filter(Boolean).join(' · ') || 'Unnamed profile'
}

export function initials(name) {
  return text(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'
}
