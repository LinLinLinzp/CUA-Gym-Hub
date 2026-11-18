import { active, availableUsers, byId, canManage, canPost, canView, channelPosts, direct, member, members, teamMember, unreadPosts } from './selectors.js'
import { log, makeId, newChannel, newMember, stamp, upsert } from './records.js'

export const builtins = {
  favorites: ['Favorites', 0],
  channels: ['Channels', 1],
  direct_messages: ['Direct Messages', 2],
}

export const isDefault = channel => channel.isDefault || channel.name === 'town-square'
export const canManageMembers = (state, channel) => canManage(state, channel) && active(channel) && !direct(channel)
export const defaultCategory = channel => direct(channel) ? 'direct_messages' : 'channels'
export const slugify = value => value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')

export function validateName(state, teamId, displayName, name, ignoreId) {
  if (displayName.trim().length < 2 || displayName.trim().length > 64) return 'Enter a name between 2 and 64 characters.'
  if (!/^[a-z0-9_-]+$/.test(name)) return 'Use lowercase letters, numbers, hyphens, or underscores in the URL.'
  if (state.channels.some(row => row?.teamId === teamId && row.name === name && row.id !== ignoreId)) return 'That channel URL is already in use.'
  return ''
}

const requireCondition = (condition, error) => {
  if (!condition) throw new Error(error)
}

export function placeChannel(state, channel, target, time, beforeId) {
  const own = row => row?.userId === state.currentUserId && row.teamId === channel.teamId
  let destination = state.sidebarCategories.find(row => own(row) && (row.id === target || row.type === target && target !== 'custom'))
  if (!destination && builtins[target]) {
    const [name, order] = builtins[target]
    destination = { id: makeId('cat'), userId: state.currentUserId, teamId: channel.teamId,
      name, order, type: target, channelIds: [], collapsed: false, ...stamp(time) }
  }

  const categories = state.sidebarCategories.map(row => {
    if (!own(row) || row.id === destination?.id || !row.channelIds?.includes(channel.id)) return row
    return { ...row, channelIds: row.channelIds.filter(id => id !== channel.id), updatedAt: time }
  })
  const changed = categories.some((row, index) => row !== state.sidebarCategories[index])
  if (!destination) return changed ? categories : state.sidebarCategories
  const previous = destination.channelIds ?? []
  const ids = (destination.channelIds ?? []).filter(id => id !== channel.id)
  const start = ids.indexOf(beforeId)
  ids.splice(start < 0 ? ids.length : start, 0, channel.id)
  if (ids.length === previous.length && ids.every((id, index) => id === previous[index])) return changed ? categories : state.sidebarCategories
  return upsert(categories, { ...destination, channelIds: ids, updatedAt: time })
}

function grant(state, channelId, userId, time, role) {
  const prior = state.channelMembers.find(row => row?.channelId === channelId && row.userId === userId)
  const initial = prior ?? newMember({ id: makeId('cm'), channelId, userId, actor: state.currentUserId, time, role })
  return upsert(state.channelMembers, { ...initial, addedBy: state.currentUserId, joinedAt: time, leftAt: null, status: 'active', updatedAt: time })
}

export function createChannel(state, teamId, values, id, time) {
  requireCondition(byId(state.users, state.currentUserId) && teamMember(state, teamId), 'Team membership is required.')
  if (values.type !== 'O' && values.type !== 'P') return state
  const displayName = values.displayName.trim()
  const name = values.name.trim()
  const error = validateName(state, teamId, displayName, name)
  requireCondition(!error, error)
  const channel = newChannel({ id, teamId, name, displayName, type: values.type, purpose: values.purpose.trim(), createdBy: state.currentUserId, time })
  return log({ ...state, channels: [...state.channels, channel],
    channelMembers: grant(state, id, state.currentUserId, time, 'channel_admin'),
    sidebarCategories: placeChannel(state, channel, 'channels', time),
  }, time, 'channel.create', 'channel', id, id, [], { type: channel.type, name })
}

export function joinChannel(state, channelId, time) {
  const channel = byId(state.channels, channelId)
  if (!canView(state, channel) || channel.type !== 'O' || !active(channel) || member(state, channelId)) return state
  const channelMembers = grant(state, channelId, state.currentUserId, time)
  const joined = channelMembers.find(row => row.channelId === channelId && row.userId === state.currentUserId)
  return log({ ...state, channelMembers, sidebarCategories: placeChannel(state, channel, joined.isFavorite ? 'favorites' : 'channels', time) },
    time, 'channel.join', 'channelMember', joined.id, channelId, [state.currentUserId], { status: 'active' })
}

export function updateChannel(state, channelId, values, time) {
  const channel = byId(state.channels, channelId)
  if (!canManage(state, channel) || !active(channel) || direct(channel)) return state
  let fields = values
  if ('name' in values) {
    const name = values.name.trim()
    const displayName = values.displayName.trim()
    const error = validateName(state, channel.teamId, displayName, name, channelId)
    requireCondition(!error, error)
    fields = { name, displayName }
  }
  const changedFields = Object.keys(fields).filter(key => fields[key] !== (channel[key] ?? ''))
  if (!changedFields.length) return state
  const edited = { ...channel, ...fields, updatedAt: time }
  return log({ ...state, channels: upsert(state.channels, edited) }, time, 'channel.update', 'channel', channelId, channelId, [], { changedFields })
}

export function addMembers(state, channelId, userIds, time) {
  const channel = byId(state.channels, channelId)
  if (!canManageMembers(state, channel)) return state
  const allowed = new Set(availableUsers(state, channel.teamId).filter(active).map(user => user.id))
  const selected = [...new Set(userIds)].filter(userId => allowed.has(userId) && !member(state, channelId, userId))
  if (!selected.length) return state
  let next = state
  for (const userId of selected) next = { ...next, channelMembers: grant(next, channelId, userId, time) }
  return log(next, time, 'channel.member_add', 'channel', channelId, channelId, selected, { userIds: selected })
}

export function makeChannelAdmin(state, channelId, userId, time) {
  const channel = byId(state.channels, channelId)
  if (!canManageMembers(state, channel) || userId === state.currentUserId || !active(byId(state.users, userId))) return state
  const target = member(state, channelId, userId)
  if (!target || target.role === 'channel_admin') return state
  const role = 'channel_admin'
  return log({ ...state, channelMembers: upsert(state.channelMembers, { ...target, role, updatedAt: time }) },
    time, 'channel.member_role_update', 'channelMember', target.id, channelId, [userId], { userId, role })
}

export function isLastChannelAdmin(state, channelId, membership) {
  return membership?.role === 'channel_admin' && !members(state, channelId).some(row => row !== membership && row.role === 'channel_admin')
}

export function removeMember(state, channelId, userId, time) {
  const channel = byId(state.channels, channelId)
  const leaving = userId === state.currentUserId
  const selected = member(state, channelId, userId)
  const person = byId(state.users, userId)
  if (!selected || !canView(state, channel) || !active(channel) || direct(channel) || (!leaving && !canManage(state, channel))) return state
  requireCondition(!isDefault(channel) || person?.isGuest, 'Members cannot leave Town Square.')
  requireCondition(!isLastChannelAdmin(state, channelId, selected), 'Make another member a channel admin from Channel members before removing the last admin.')
  return log({ ...state,
    channelMembers: upsert(state.channelMembers, { ...selected, status: 'left', leftAt: time, updatedAt: time }),
    sidebarCategories: leaving ? placeChannel(state, channel, null, time) : state.sidebarCategories,
  }, time, leaving ? 'channel.leave' : 'channel.member_remove', 'channelMember', selected.id, channelId, [userId], { userId })
}

export function setArchived(state, channelId, archived, time) {
  const channel = byId(state.channels, channelId)
  if (!canManage(state, channel) || direct(channel) || isDefault(channel) || archived === !active(channel)) return state
  if (!archived && teamMember(state, channel.teamId)?.role !== 'team_admin') return state
  const next = { ...channel, status: archived ? 'archived' : 'active', archivedAt: archived ? time : null,
    archivedBy: archived ? state.currentUserId : null, updatedAt: time }
  return log({ ...state, channels: upsert(state.channels, next) }, time, archived ? 'channel.archive' : 'channel.restore',
    'channel', channelId, channelId, [], { status: next.status })
}

export function startConversation(state, teamId, userIds, time, id) {
  if (!teamMember(state, teamId)) return { next: state, channel: null }
  const selected = [...new Set(userIds)].filter(userId => userId !== state.currentUserId)
  requireCondition(selected.length > 0 && selected.length <= 7, 'Select up to seven other people or create a private channel.')
  const allowed = new Set(availableUsers(state, teamId).filter(active).map(user => user.id))
  requireCondition(selected.every(userId => allowed.has(userId)), 'A selected account is unavailable.')
  const participantIds = [state.currentUserId, ...selected].sort()
  const existing = state.channels.find(row => row?.teamId === teamId && direct(row) && active(row) && canView(state, row) &&
    members(state, row.id).map(item => item.userId).sort().join(',') === participantIds.join(','))
  if (existing) return { next: state, channel: existing }

  const type = selected.length === 1 ? 'D' : 'G'
  const channel = newChannel({ id, teamId, name: id, displayName: type === 'D' ? 'Direct message' : 'Group message',
    type, createdBy: state.currentUserId, time })
  const participants = participantIds.map(userId => newMember({ id: makeId('cm'), channelId: id, userId, actor: state.currentUserId, time }))
  const next = log({ ...state, channels: [...state.channels, channel], channelMembers: [...state.channelMembers, ...participants],
    sidebarCategories: placeChannel(state, channel, 'direct_messages', time),
  }, time, 'conversation.create', 'channel', id, id, participantIds, { type })
  return { next, channel }
}

export function channelPreference(state, channelId, key, time) {
  const channel = byId(state.channels, channelId)
  const row = member(state, channelId)
  if (!row || !canView(state, channel) || !active(channel)) return state
  const value = !row[key]
  const action = key === 'muted' ? (value ? 'mute' : 'unmute') : (value ? 'favorite' : 'unfavorite')
  const sidebarCategories = key === 'isFavorite' ? placeChannel(state, channel, value ? 'favorites' : defaultCategory(channel), time) : state.sidebarCategories
  return log({ ...state, channelMembers: upsert(state.channelMembers, { ...row, [key]: value, updatedAt: time }), sidebarCategories },
    time, 'channel.' + action, 'channelMember', row.id, channelId, [], { [key]: value })
}

export function updateChannelRead(state, channelId, time, unreadFrom) {
  const channel = byId(state.channels, channelId)
  const row = member(state, channelId)
  if (!row || !canView(state, channel) || !active(channel)) return state
  const posts = channelPosts(state, channelId)
  const visible = posts.filter(post => !post.deletedAt)
  const unread = unreadFrom !== undefined
  if (!unread && !unreadPosts(posts, row.lastReadPostId, row.lastViewedAt).length) return state
  const index = unreadFrom === null ? visible.length - 1 : visible.findIndex(post => post.id === unreadFrom)
  if (unread && index < 0) return state
  const cursor = unread ? visible[index - 1] : visible.at(-1)
  const lastReadPostId = cursor?.id ?? null
  const lastViewedAt = unread ? cursor?.createdAt ?? null : time
  if (row.lastReadPostId === lastReadPostId && row.lastViewedAt === lastViewedAt) return state
  return log({ ...state, channelMembers: upsert(state.channelMembers, { ...row, lastReadPostId, lastViewedAt, updatedAt: time }) },
    time, unread ? 'channel.unread' : 'channel.read', 'channelMember', row.id, channelId, cursor ? [cursor.id] : [], { lastReadPostId })
}

export function categoryCommand(state, teamId, operation, time, { category, name, channelId, beforeId }) {
  if (!teamMember(state, teamId)) return state
  const own = state.sidebarCategories.find(row => category?.id != null && row?.id === category.id && row.userId === state.currentUserId && row.teamId === teamId)
  const trimmed = name?.trim()
  const identity = { userId: state.currentUserId, teamId }
  let sidebarCategories = state.sidebarCategories
  let channelMembers = state.channelMembers
  let target = own
  if (operation === 'create' || operation === 'rename') {
    requireCondition(trimmed && trimmed.length <= 64, 'Enter a category name between 1 and 64 characters.')
    if (operation === 'rename' && (own?.type !== 'custom' || own.name === trimmed)) return state
    target = own ?? { id: makeId('cat'), ...identity, type: 'custom', channelIds: [], collapsed: false,
      order: Math.max(2, ...sidebarCategories.filter(row => row?.userId === identity.userId && row.teamId === teamId).map(row => row.order ?? 0)) + 1, ...stamp(time) }
    sidebarCategories = upsert(sidebarCategories, { ...target, name: trimmed, updatedAt: time })
  } else if (operation === 'collapse') {
    if (!own && !builtins[category.type]) return state
    target = own ?? { id: makeId('cat'), ...identity, type: category.type, name: builtins[category.type][0],
      order: builtins[category.type][1], channelIds: [], collapsed: false, ...stamp(time) }
    sidebarCategories = upsert(sidebarCategories, { ...target, collapsed: !target.collapsed, updatedAt: time })
  } else if (operation === 'delete' && own?.type === 'custom') {
    sidebarCategories = sidebarCategories.filter(row => row !== own)
    for (const id of own.channelIds ?? []) {
      const channel = byId(state.channels, id)
      if (channel) sidebarCategories = placeChannel({ ...state, sidebarCategories }, channel, defaultCategory(channel), time)
    }
  } else if (operation === 'move') {
    const channel = byId(state.channels, channelId)
    const membership = member(state, channelId)
    if (!channel || !membership || channel.teamId !== teamId || channelId === beforeId || (!own && !builtins[category.type])) return state
    const isFavorite = category.type === 'favorites'
    sidebarCategories = placeChannel(state, channel, own?.id ?? category.type, time, beforeId)
    if (Boolean(membership.isFavorite) !== isFavorite) channelMembers = upsert(channelMembers, { ...membership, isFavorite, updatedAt: time })
    if (sidebarCategories === state.sidebarCategories && channelMembers === state.channelMembers) return state
    target = sidebarCategories.find(row => row?.teamId === teamId && row.userId === state.currentUserId && row.channelIds?.includes(channelId))
  } else return state
  return log({ ...state, sidebarCategories, channelMembers }, time, 'category.update', 'sidebarCategory', target.id, channelId ?? null,
    channelId ? [channelId] : [], { operation, ...(operation === 'delete' ? { removedId: target.id } : {}) })
}

export function updateBookmark(state, channelId, time, values, bookmarkId) {
  const channel = byId(state.channels, channelId)
  if (!canPost(state, channel)) return state
  const prior = byId(channel.bookmarks ?? [], bookmarkId)
  let bookmark = prior
  if (values) {
    const label = values.label.trim()
    const url = values.url.trim()
    requireCondition(label && /^https?:\/\/[^\s]+$/i.test(url), 'Enter a label and a valid http or https URL.')
    if (prior?.label === label && prior.url === url) return state
    bookmark = { ...(prior ?? { id: makeId('bookmark'), createdBy: state.currentUserId, ...stamp(time) }), label, url, updatedAt: time }
  }
  if (!bookmark) return state
  const bookmarks = values ? upsert(channel.bookmarks ?? [], bookmark) : channel.bookmarks.filter(row => row.id !== bookmarkId)
  return log({ ...state, channels: upsert(state.channels, { ...channel, bookmarks, updatedAt: time }) }, time,
    'bookmark.update', 'channel', channelId, channelId, [bookmark.id], { operation: values ? prior ? 'edit' : 'add' : 'delete', bookmarkId: bookmark.id })
}
