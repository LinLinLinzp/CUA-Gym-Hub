import {
  active, byId, canPost, canView, channelPosts, member, mentions, ownDraft, ownPrefs, ownThread, replies, rootPost, unreadPosts,
} from './selectors.js'
import { log, makeId, newPost, newThreadMember, preferenceDefaults, stamp, upsert } from './records.js'

function destination(state, channelId, rootId) {
  const channel = byId(state.channels, channelId)
  if (!canPost(state, channel)) return null
  const root = rootId ? byId(state.posts, rootId) : null
  if (rootId && (!root || root.rootId || root.channelId !== channelId)) return null
  return channel
}

function nextDraft(state, channelId, rootId, message, fileIds, time) {
  const prior = ownDraft(state, channelId, rootId)
  if (!message && !fileIds.length) return prior ? state.drafts.filter(row => row.id !== prior.id) : state.drafts
  const draft = prior ?? { id: makeId('draft'), userId: state.currentUserId, channelId, rootId, ...stamp(time) }
  return upsert(state.drafts, { ...draft, message, fileIds, updatedAt: time })
}

export function writeDraft(state, channelId, rootId, message, time) {
  if (!destination(state, channelId, rootId)) return state
  const prior = ownDraft(state, channelId, rootId)
  if ((prior?.message ?? '') === message) return state
  return { ...state, drafts: nextDraft(state, channelId, rootId, message, prior?.fileIds ?? [], time) }
}

function threadRecord(state, root, time) {
  const prior = byId(state.threads, root.id)
  const rows = replies(state, root).filter(row => !row.deletedAt)
  return { id: root.id, rootPostId: root.id, channelId: root.channelId,
    createdAt: prior?.createdAt ?? time, updatedAt: time, replyCount: rows.length,
    lastReplyAt: rows.at(-1)?.createdAt ?? null, participantIds: [...new Set([!root.deletedAt && root.userId, ...rows.map(row => row.userId)].filter(Boolean))] }
}

function followRecord(state, threadId, userId, following, time, readPost) {
  const prior = ownThread({ ...state, currentUserId: userId }, threadId)
    ?? newThreadMember({ id: makeId('tmbr'), userId, threadId, time })
  return { ...prior, following, followedAt: following ? prior.followedAt ?? time : null,
    unfollowedAt: following ? null : time, updatedAt: time,
    ...(readPost ? { lastReadAt: time, lastReadPostId: readPost.id } : {}) }
}

export function sendPost(state, channelId, rootId, options, time) {
  const channel = destination(state, channelId, rootId)
  if (!channel) return state
  const draft = ownDraft(state, channelId, rootId)
  const source = options.forwardedPostId ? byId(state.posts, options.forwardedPostId) : null
  if (options.forwardedPostId && (!source || source.deletedAt || !canView(state, byId(state.channels, source.channelId)))) return state
  const message = String(options.message ?? (source ? '' : draft?.message ?? '')).trim()
  const fileIds = source ? [] : [...new Set(draft?.fileIds ?? [])].filter(id => {
    const file = byId(state.files, id)
    return file?.status === 'staged' && file.channelId === channelId && file.uploadedBy === state.currentUserId
  })
  if (!message && !fileIds.length && !source) return state
  const mentionedUserIds = mentions(state, channel, message)
  const post = newPost({ id: makeId('post'), channelId, userId: state.currentUserId, rootId, message, fileIds, mentionedUserIds, time })
  if (source) post.forwardedPostId = source.id
  const root = rootId ? byId(state.posts, rootId) : post
  let next = { ...state, posts: [...state.posts, post],
    drafts: draft && !source ? state.drafts.filter(row => row?.id !== draft.id) : state.drafts,
    files: fileIds.length ? state.files.map(file => file && fileIds.includes(file.id) ? { ...file, postId: post.id, status: 'posted', updatedAt: time } : file) : state.files,
  }

  const participants = rootId ? [state.currentUserId, ...mentionedUserIds] : mentionedUserIds
  if (participants.length) {
    next.threads = upsert(state.threads, threadRecord(next, root, time))
    next.threadMemberships = participants.reduce((rows, userId) => upsert(rows, followRecord(next, root.id, userId,
      true, time, userId === state.currentUserId ? post : null)), state.threadMemberships)
  }
  if (!rootId || options.inChannel) {
    const own = member(state, channelId)
    const newest = channelPosts(next, channelId).filter(row => !row.deletedAt).at(-1)
    next.channelMembers = upsert(state.channelMembers, { ...own, lastViewedAt: time, lastReadPostId: newest?.id ?? post.id, updatedAt: time })
  }
  const action = source ? 'post.forward' : rootId ? 'thread.reply' : 'post.create'
  return log(next, time, action, 'post', post.id, channelId, [rootId, source?.id, ...fileIds, ...mentionedUserIds].filter(Boolean),
    { rootId, fileIds, mentionedUserIds, ...(source ? { forwardedPostId: source.id } : {}) })
}

export function editPost(state, postId, value, time) {
  const post = byId(state.posts, postId)
  const channel = byId(state.channels, post?.channelId)
  if (!post || post.deletedAt || post.userId !== state.currentUserId || !canPost(state, channel)) return state
  const message = value.trim()
  if (!message && !post.fileIds?.length && !post.forwardedPostId) throw new Error('Enter a message before saving.')
  if (message === (post.message ?? '')) return state
  const mentionedUserIds = mentions(state, channel, message)
  return log({ ...state, posts: upsert(state.posts, { ...post, message, mentionedUserIds, editedAt: time, updatedAt: time }) },
    time, 'post.edit', 'post', postId, channel.id, mentionedUserIds, { mentionedUserIds })
}

export function deletePost(state, postId, time) {
  const post = byId(state.posts, postId)
  const channel = byId(state.channels, post?.channelId)
  if (!post || post.deletedAt || post.userId !== state.currentUserId || !canPost(state, channel)) return state
  let next = { ...state, posts: upsert(state.posts, { ...post, isPinned: false, deletedAt: time, deletedBy: state.currentUserId, updatedAt: time }),
    pins: state.pins.map(row => row?.postId === postId && active(row) ? {
      ...row, status: 'removed', unpinnedBy: state.currentUserId, unpinnedAt: time, updatedAt: time,
    } : row),
    files: state.files.map(file => file?.postId === postId && file.status === 'posted' ? { ...file, status: 'deleted', updatedAt: time } : file),
  }
  const root = post.rootId && rootPost(state, post)
  if (root) next.threads = upsert(state.threads, threadRecord(next, root, time))
  else if (byId(state.threads, postId)) next.threads = upsert(state.threads, threadRecord(next, { ...post, deletedAt: time }, time))
  return log(next, time, 'post.delete', 'post', postId, channel.id, [post.rootId, ...(post.fileIds ?? [])].filter(Boolean))
}

export function setFollowing(state, rootId, following, time) {
  const root = byId(state.posts, rootId)
  const channel = byId(state.channels, root?.channelId)
  if (!root || root.rootId || !canView(state, channel) || !member(state, channel.id)) return state
  const prior = ownThread(state, rootId)
  if (Boolean(prior?.following) === following) return state
  const row = followRecord(state, rootId, state.currentUserId, following, time)
  const threads = byId(state.threads, rootId) ? state.threads : upsert(state.threads, threadRecord(state, root, time))
  return log({ ...state, threads, threadMemberships: upsert(state.threadMemberships, row) }, time,
    following ? 'thread.follow' : 'thread.unfollow', 'thread', rootId, channel.id, [row.id], { following })
}

export function markThreadsRead(state, teamId, rootId, time) {
  const read = []
  const threadMemberships = state.threadMemberships.map(row => {
    if (!row?.following || row.userId !== state.currentUserId || (rootId && row.threadId !== rootId)) return row
    const root = byId(state.posts, row.threadId)
    const channel = byId(state.channels, root?.channelId)
    if (!root || root.rootId || channel?.teamId !== teamId || !canView(state, channel) || !member(state, channel.id)) return row
    const posts = replies(state, root)
    if (!unreadPosts(posts, row.lastReadPostId, row.lastReadAt, state.currentUserId).length) return row
    const lastReadPostId = posts.filter(post => !post.deletedAt).at(-1)?.id ?? root.id
    read.push({ root, lastReadPostId })
    return { ...row, lastReadPostId, lastReadAt: time, updatedAt: time }
  })
  if (!read.length) return state
  return log({ ...state, threadMemberships }, time, rootId ? 'thread.read' : 'thread.read_all',
    rootId ? 'thread' : 'team', rootId ?? teamId, rootId ? read[0].root.channelId : null,
    read.map(item => item.root.id), { threadIds: read.map(item => item.root.id) })
}

export function setPin(state, postId, pin, time) {
  const post = byId(state.posts, postId)
  const channel = byId(state.channels, post?.channelId)
  if (!post || post.deletedAt || !canPost(state, channel)) return state
  const prior = state.pins.find(row => row?.channelId === channel.id && row.postId === postId)
  if (active(prior) === pin) return state
  const event = pin ? { status: 'active', pinnedAt: time, pinnedBy: state.currentUserId, unpinnedAt: null, unpinnedBy: null }
    : { status: 'removed', unpinnedAt: time, unpinnedBy: state.currentUserId }
  const row = { ...(prior ?? { id: makeId('pin'), channelId: channel.id, postId, ...stamp(time) }), ...event, updatedAt: time }
  return log({ ...state, posts: upsert(state.posts, { ...post, isPinned: pin, updatedAt: time }), pins: upsert(state.pins, row) },
    time, pin ? 'pin.add' : 'pin.remove', 'pin', row.id, channel.id, [postId], { postId, status: row.status })
}

export function stageFile(state, channelId, rootId, uploaded, time) {
  if (!destination(state, channelId, rootId) || !/^\/files\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(uploaded.url)) return state
  const draft = ownDraft(state, channelId, rootId)
  const fileIds = draft?.fileIds ?? []
  if (fileIds.length >= 10 || state.files.some(file => file?.url === uploaded.url)) return state
  const { name } = uploaded
  const file = { id: makeId('file'), channelId, postId: null, uploadedBy: state.currentUserId, name,
    storedName: uploaded.stored_name, size: uploaded.size, mimeType: uploaded.content_type, status: 'staged',
    extension: name.includes('.') ? name.split('.').at(-1).toLowerCase() : '', url: uploaded.url, ...stamp(time) }
  return log({ ...state, files: [...state.files, file],
    drafts: nextDraft(state, channelId, rootId, draft?.message ?? '', [...fileIds, file.id], time),
  }, time, 'file.upload', 'file', file.id, channelId, rootId ? [rootId] : [], { name, size: file.size, rootId })
}

export function cancelFile(state, channelId, rootId, fileId, time) {
  const draft = ownDraft(state, channelId, rootId)
  const file = byId(state.files, fileId)
  if (!destination(state, channelId, rootId) || !draft?.fileIds?.includes(fileId) || file?.status !== 'staged' ||
    file.uploadedBy !== state.currentUserId || file.channelId !== channelId) return state
  return log({ ...state, files: upsert(state.files, { ...file, status: 'cancelled', updatedAt: time }),
    drafts: nextDraft(state, channelId, rootId, draft.message ?? '', draft.fileIds.filter(id => id !== fileId), time),
  }, time, 'file.cancel', 'file', fileId, channelId, rootId ? [rootId] : [], { status: 'cancelled', rootId })
}

export function toggleReaction(state, postId, emojiName, time) {
  const post = byId(state.posts, postId)
  const channel = byId(state.channels, post?.channelId)
  if (!post || post.deletedAt || !canPost(state, channel)) return state
  const userId = state.currentUserId
  const prior = state.reactions.find(row => row?.postId === postId && row.userId === userId && row.emojiName === emojiName)
  const status = active(prior) ? 'removed' : 'active'
  const row = { ...(prior ?? { id: makeId('reaction'), postId, userId, emojiName, ...stamp(time) }), status, updatedAt: time }
  return log({ ...state, reactions: upsert(state.reactions, row) }, time,
    status === 'active' ? 'reaction.add' : 'reaction.remove', 'reaction', row.id, channel.id, [postId], { emojiName, status })
}

export function toggleSave(state, postId, time) {
  const post = byId(state.posts, postId)
  const channel = byId(state.channels, post?.channelId)
  if (!post || post.deletedAt || !canView(state, channel)) return state
  const userId = state.currentUserId
  const prior = state.savedPosts.find(row => row?.postId === postId && row.userId === userId)
  const status = active(prior) ? 'removed' : 'active'
  const row = { ...(prior ?? { id: makeId('save'), postId, userId, ...stamp(time) }), status, updatedAt: time }
  return log({ ...state, savedPosts: upsert(state.savedPosts, row) }, time,
    status === 'active' ? 'saved.add' : 'saved.remove', 'savedPost', row.id, channel.id, [postId], { status })
}

export function savePreferences(state, values, time) {
  const user = byId(state.users, state.currentUserId)
  if (!user) return state
  const prior = ownPrefs(state)
  const defaults = { ...preferenceDefaults, presence: user.presence ?? preferenceDefaults.presence }
  const changedFields = Object.keys(values).filter(key => values[key] !== (prior?.[key] ?? defaults[key]))
  if (!changedFields.length) return state
  const row = { id: makeId('pref'), userId: user.id, ...defaults, ...stamp(time), ...prior, ...values, updatedAt: time }
  return log({ ...state, preferences: upsert(state.preferences, row) }, time,
    'preferences.update', 'preference', row.id, null, [], { changedFields })
}
