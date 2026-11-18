import {
  accountId, canEdit, canSavePlaylist, inviteStatus, isOwner, lookup, orderedItems,
} from './model.js'

const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`
const update = (records, id, fields) => records.map((record) => record.id === id ? { ...record, ...fields } : record)
const upsert = (records, existing, fields, prefix, createdAt) => existing
  ? update(records, existing.id, fields)
  : [...records, { id: newId(prefix), ...fields, createdAt }]
const closeAccess = (state, playlistId, stamp) => ({
  playlistCollaborators: state.playlistCollaborators.map((member) =>
    member.playlistId === playlistId && member.status === 'active' ? { ...member, ...stamp, status: 'removed' } : member),
  playlistInvites: state.playlistInvites.map((invite) =>
    invite.playlistId === playlistId && invite.status === 'pending' ? { ...invite, ...stamp, status: 'revoked' } : invite),
})

function playlistDetails(state, action, playlist, now, actor, stamp) {
  if (action.type !== 'createPlaylist' && !isOwner(state, playlist)) return null
  if (action.type === 'deletePlaylist') {
    return {
      ...state, ...closeAccess(state, playlist.id, stamp),
      playlists: update(state.playlists, playlist.id, { status: 'deleted', collaborative: false, deletedAt: now, deletedBy: actor, updatedAt: now }),
      libraryEntries: state.libraryEntries.map((entry) =>
        entry.targetType === 'playlist' && entry.targetId === playlist.id && entry.status === 'saved'
          ? { ...entry, ...stamp, status: 'removed' } : entry),
    }
  }
  const name = action.name.trim()
  if (!name) return null
  const fields = {
    name, description: action.description.trim(),
    visibility: !playlist?.collaborative && action.visibility === 'public' ? 'public' : 'private',
    ...(action.artKey ? { artKey: action.artKey } : {}),
  }
  if (action.type === 'createPlaylist') {
    if (lookup(state.playlists, action.playlistId)) return null
    const record = { id: action.playlistId, ownerId: actor, ...fields, status: 'active', collaborative: false, createdAt: now, updatedAt: now }
    return { ...state, playlists: [...state.playlists, record] }
  }
  if (Object.entries(fields).every(([key, value]) => (playlist[key] ?? (key === 'description' ? '' : undefined)) === value)) return null
  return { ...state, playlists: update(state.playlists, playlist.id, { ...fields, updatedAt: now }) }
}

function editTracks(state, action, playlist, now, actor, stamp) {
  if (!canEdit(state, playlist)) return null
  const items = orderedItems(state, playlist.id)
  let playlistItems = state.playlistItems
  if (action.type === 'addTrack') {
    if (!lookup(state.tracks, action.trackId) || items.some((item) => item.trackId === action.trackId)) return null
    const position = items.length ? (items.at(-1).position ?? 0) + 1 : 0
    playlistItems = [...playlistItems, {
      id: newId('item'), playlistId: playlist.id, trackId: action.trackId, position,
      status: 'active', addedBy: actor, createdAt: now, ...stamp,
    }]
  } else {
    const index = items.findIndex((item) => item.id === action.itemId)
    if (index < 0) return null
    const [item] = items.splice(index, 1)
    if (action.type === 'removeTrack') {
      playlistItems = update(playlistItems, item.id, { ...stamp, status: 'removed', removedAt: now })
    } else {
      const destination = action.targetItemId == null ? index + action.delta : orderedItems(state, playlist.id)
        .findIndex((entry) => entry.id === action.targetItemId)
      if (destination < 0 || destination > items.length || destination === index) return null
      items.splice(destination, 0, item)
    }
    const positions = new Map(items.map(({ id }, position) => [id, position]))
    playlistItems = playlistItems.map((entry) => positions.has(entry.id) && positions.get(entry.id) !== entry.position
      ? { ...entry, ...stamp, position: positions.get(entry.id) } : entry)
  }
  return { ...state, playlistItems, playlists: update(state.playlists, playlist.id, { updatedAt: now }) }
}

function setLibrary(state, action, now, actor, stamp) {
  const { targetType, targetId, status } = action
  const records = { track: state.tracks, album: state.albums, playlist: state.playlists }[targetType]
  if (!records || !['saved', 'removed'].includes(status)) return null
  const target = lookup(records, targetId)
  if (!target || (targetType === 'playlist' && !canSavePlaylist(state, target))) return null
  const existing = state.libraryEntries.find((entry) =>
    entry.userId === actor && entry.targetType === targetType && entry.targetId === targetId)
  if (existing?.status === status || (!existing && status === 'removed')) return null
  const libraryEntries = upsert(state.libraryEntries, existing, { userId: actor, targetType, targetId, status, ...stamp }, 'library', now)
  return { ...state, libraryEntries }
}

function setFollow(state, action, now, actor) {
  const { targetType, targetId, status } = action
  const records = { artist: state.artists, user: state.users }[targetType]
  if (!records || !['following', 'unfollowed'].includes(status) || !lookup(records, targetId) ||
      (targetType === 'user' && targetId === actor)) return null
  const existing = state.follows.find((entry) =>
    entry.followerId === actor && entry.targetType === targetType && entry.targetId === targetId)
  if (existing?.status === status || (!existing && status === 'unfollowed')) return null
  const follows = upsert(state.follows, existing, { followerId: actor, targetType, targetId, status, updatedAt: now }, 'follow', now)
  return { ...state, follows }
}

function collaboration(state, action, playlist, now, actor, stamp) {
  const invite = lookup(state.playlistInvites, action.inviteId)
  if (action.type === 'joinPlaylist') {
    if (inviteStatus(state, invite, new Date(now)) !== 'joinable' || invite.playlistId !== playlist?.id) return null
    const previous = state.playlistCollaborators.find((member) => member.playlistId === playlist.id && member.userId === actor)
    return {
      ...state,
      playlists: update(state.playlists, playlist.id, { updatedAt: now }),
      playlistInvites: update(state.playlistInvites, invite.id, { ...stamp, status: 'accepted', acceptedBy: actor, acceptedAt: now }),
      playlistCollaborators: upsert(state.playlistCollaborators, previous, {
        ...stamp, playlistId: playlist.id, userId: actor, role: 'editor', inviteId: invite.id, status: 'active',
      }, 'member', now),
    }
  }
  if (!isOwner(state, playlist)) return null
  if (action.type === 'enableCollaboration') {
    if (playlist.collaborative) return null
    return { ...state, playlists: update(state.playlists, playlist.id, { collaborative: true, visibility: 'private', updatedAt: now }) }
  }
  if (!playlist.collaborative) return null
  switch (action.type) {
    case 'disableCollaboration':
      return {
        ...state, ...closeAccess(state, playlist.id, stamp),
        playlists: update(state.playlists, playlist.id, { collaborative: false, visibility: 'private', updatedAt: now }),
      }
    case 'createInvite': {
      if (action.recipientId && (action.recipientId === actor || !lookup(state.users, action.recipientId) ||
          state.playlistCollaborators.some((member) =>
            member.playlistId === playlist.id && member.userId === action.recipientId && member.status === 'active'))) return null
      const record = {
        id: newId('invite'), token: crypto.randomUUID(), playlistId: playlist.id, invitedBy: actor,
        ...(action.recipientId ? { recipientId: action.recipientId } : {}),
        status: 'pending', createdAt: now, expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(), ...stamp,
      }
      return { ...state, playlistInvites: [...state.playlistInvites, record] }
    }
    case 'revokeInvite':
      if (invite?.playlistId !== playlist.id || invite.status !== 'pending') return null
      return { ...state, playlistInvites: update(state.playlistInvites, invite.id, { ...stamp, status: 'revoked' }) }
    case 'removeMember': {
      const member = lookup(state.playlistCollaborators, action.memberId)
      if (member?.playlistId !== playlist.id || member.status !== 'active' || member.userId === actor) return null
      return {
        ...state, playlists: update(state.playlists, playlist.id, { updatedAt: now }),
        playlistCollaborators: update(state.playlistCollaborators, member.id, { ...stamp, status: 'removed' }),
      }
    }
    default: return null
  }
}

export function applyAction(state, action) {
  const actor = accountId(state)
  if (!actor) return null
  const now = new Date().toISOString()
  const stamp = { updatedAt: now, updatedBy: actor }
  const playlist = lookup(state.playlists, action.playlistId)
  switch (action.type) {
    case 'createPlaylist':
    case 'editPlaylist':
    case 'deletePlaylist':
      return playlistDetails(state, action, playlist, now, actor, stamp)
    case 'addTrack':
    case 'removeTrack':
    case 'moveTrack':
      return editTracks(state, action, playlist, now, actor, stamp)
    case 'setLibrary': return setLibrary(state, action, now, actor, stamp)
    case 'setFollow': return setFollow(state, action, now, actor)
    default: return collaboration(state, action, playlist, now, actor, stamp)
  }
}


