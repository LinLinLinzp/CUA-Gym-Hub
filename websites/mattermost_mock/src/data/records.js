export const stamp = createdAt => ({ createdAt, updatedAt: createdAt })
export function makeId(type) {
  const crypto = globalThis.crypto
  const uuid = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
  return type + '-' + uuid
}
export const upsert = (rows, record) => rows.some(row => row?.id === record.id)
  ? rows.map(row => row?.id === record.id ? record : row) : [...rows, record]

export function newChannel({ id, teamId, name, displayName, type, purpose = '', createdBy, time }) {
  return { id, teamId, name, displayName, type, purpose, header: '', status: 'active', isDefault: false,
    createdBy, archivedBy: null, archivedAt: null, ...stamp(time) }
}

export function newMember({ id, channelId, userId, actor, time, role = 'channel_user' }) {
  return { id, channelId, userId, role, status: 'active', addedBy: actor, joinedAt: time, leftAt: null,
    isFavorite: false, muted: false, lastViewedAt: null, lastReadPostId: null, ...stamp(time) }
}

export function newPost({ id, channelId, userId, rootId = null, message = '', fileIds = [], mentionedUserIds = [], time }) {
  return { id, channelId, userId, rootId, message, fileIds, mentionedUserIds, isPinned: false,
    editedAt: null, deletedAt: null, deletedBy: null, ...stamp(time) }
}

export function newThreadMember({ id, userId, threadId, time }) {
  return { id, threadId, userId, following: false, followedAt: null, unfollowedAt: null, lastReadAt: null,
    lastReadPostId: null, ...stamp(time) }
}

export const preferenceDefaults = { theme: 'denim', clockFormat: '12h', messageDisplay: 'comfortable',
  desktopNotifications: 'mentions', presence: 'online', customStatus: '' }

export function log(state, time, action, entityType, entityId, channelId = null, relatedIds = [], details = {}) {
  return { ...state, activityLog: [...state.activityLog, {
    id: makeId('evt'), action, actorId: state.currentUserId, entityType, entityId, channelId, relatedIds, details, createdAt: time,
  }] }
}
