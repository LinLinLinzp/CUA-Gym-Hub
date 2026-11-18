export const byId = (rows, id) => id == null ? undefined : rows.find(record => record?.id === id)
export const active = record => Boolean(record && (record.status == null || record.status === 'active'))
export const direct = channel => ['D', 'G'].includes(channel.type)
export const userName = user => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Unknown user'
export const teamMember = (state, teamId, userId = state.currentUserId) => state.teamMembers.find(row =>
  row?.teamId === teamId && row.userId === userId && active(row))
export const members = (state, channelId) => state.channelMembers.filter(row => row?.channelId === channelId && active(row))
export const member = (state, channelId, userId = state.currentUserId) => members(state, channelId).find(row => row.userId === userId)

export function canView(state, channel) {
  if (!channel || !byId(state.users, state.currentUserId)) return false
  if (member(state, channel.id)) return true
  return channel.type === 'O' && active(channel) && Boolean(teamMember(state, channel.teamId))
}

export const canPost = (state, channel) => canView(state, channel) && active(channel) && !channel.readOnly && Boolean(member(state, channel.id))
export function canManage(state, channel) {
  if (!canView(state, channel)) return false
  const own = member(state, channel.id)
  return Boolean(own && (own.role === 'channel_admin' || teamMember(state, channel.teamId)?.role === 'team_admin'))
}

export const byTime = (a, b) => String(a?.createdAt ?? '').localeCompare(String(b?.createdAt ?? '')) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
export const channelPosts = (state, id) => state.posts.filter(row => row?.channelId === id).sort(byTime)
export const replies = (state, root) => root ? channelPosts(state, root.channelId).filter(row => row.rootId === root.id) : []
export const rootPost = (state, post) => post?.rootId ? state.posts.find(row => row?.id === post.rootId && row.channelId === post.channelId && !row.rootId) : post
export const ownThread = (state, id) => state.threadMemberships.find(row => row?.threadId === id && row.userId === state.currentUserId)
export const ownDraft = (state, channelId, rootId = null) => state.drafts.find(row => row?.userId === state.currentUserId && row.channelId === channelId && (row.rootId ?? null) === rootId)
export const ownPrefs = state => state.preferences.find(row => row?.userId === state.currentUserId)
export const ownSave = (state, postId) => state.savedPosts.find(row => row?.postId === postId && row.userId === state.currentUserId && active(row))
export const activePins = (state, channelId) => state.pins.filter(row => row?.channelId === channelId && active(row) &&
  state.posts.some(post => post?.id === row.postId && post.channelId === channelId && !post.deletedAt))
  .sort((a, b) => String(b.pinnedAt ?? '').localeCompare(String(a.pinnedAt ?? '')))

export function availableUsers(state, teamId) {
  return state.users.filter(user => user && teamMember(state, teamId, user.id)).sort((a, b) => userName(a).localeCompare(userName(b)))
}

export function channelName(state, channel) {
  if (!channel) return 'Unknown channel'
  if (!direct(channel)) return channel.displayName || channel.name || 'Unnamed channel'
  const people = members(state, channel.id).filter(row => row.userId !== state.currentUserId)
    .map(row => byId(state.users, row.userId)).filter(Boolean)
  return people.length ? people.map(userName).join(', ') : channel.displayName || channel.name || 'Direct message'
}

export function unreadPosts(posts, cursorId, time, omitUserId) {
  const cursor = posts.findIndex(post => post.id === cursorId && !post.deletedAt)
  return (cursor < 0 ? posts.filter(post => !time || (post.createdAt ?? '') > time) : posts.slice(cursor + 1))
    .filter(post => !post.deletedAt && (!omitUserId || post.userId !== omitUserId))
}

export function mentions(state, channel, message) {
  const names = new Set(Array.from((message ?? '').matchAll(/(?:^|[^\w@.])@([\w.-]*[\w-])/g), match => match[1].toLowerCase()))
  return availableUsers(state, channel.teamId).filter(user => user.id !== state.currentUserId && active(user) &&
    names.has(String(user.username ?? '').toLowerCase()) && (channel.type === 'O' || member(state, channel.id, user.id)))
    .map(user => user.id)
}

export function localAsset(url) {
  return typeof url === 'string' && /^\/(?:files|fixtures|avatars)\/[a-zA-Z0-9._/-]+$/.test(url) &&
    !url.split('/').some(part => part === '.' || part === '..') ? url : null
}
