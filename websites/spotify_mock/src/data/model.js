export const accountId = (state) => state.account?.userId
export const lookup = (records, id) => records.find((record) => record.id === id)
export const label = (record, fallback = 'Untitled') => record?.title || record?.name || fallback
export const route = (type, id) => `/${type === 'user' ? 'profile' : type}/${encodeURIComponent(id)}`
export const artistNames = (state, track) => (track?.artistIds || [])
  .map((id) => lookup(state.artists, id)?.name).filter(Boolean).join(', ')
export const matches = (query, ...parts) => parts.filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
export const duration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export const isActive = (playlist) => Boolean(playlist && (playlist.status ?? 'active') === 'active')
export const isOwner = (state, playlist) => Boolean(isActive(playlist) && accountId(state) && playlist.ownerId === accountId(state))
export const members = (state, playlist) => state.playlistCollaborators.filter(
  (member) => member.playlistId === playlist?.id && member.status === 'active',
)
export const isEditor = (state, playlist) => Boolean(isActive(playlist) && playlist.collaborative && accountId(state) &&
  members(state, playlist).some((member) => member.userId === accountId(state) && member.role === 'editor'))
export const canEdit = (state, playlist) => isOwner(state, playlist) || isEditor(state, playlist)
export const canRead = (state, playlist) => isActive(playlist) &&
  (playlist.visibility === 'public' || canEdit(state, playlist))
export const canSavePlaylist = (state, playlist) => Boolean(isActive(playlist) && !isOwner(state, playlist) && playlist.visibility === 'public')

export const orderedItems = (state, playlistId) => state.playlistItems.filter(
  (item) => item.playlistId === playlistId && (item.status ?? 'active') === 'active',
).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.id).localeCompare(String(b.id)))
export const savedEntry = (state, type, id) => state.libraryEntries.find(
  (entry) => entry.userId === accountId(state) && entry.targetType === type && entry.targetId === id && entry.status === 'saved',
)
export const followEntry = (state, type, id) => state.follows.find(
  (entry) => entry.followerId === accountId(state) && entry.targetType === type && entry.targetId === id && entry.status === 'following',
)

export function inviteStatus(state, invite, now = new Date()) {
  if (!invite) return 'missing'
  if (invite.status === 'revoked') return 'revoked'
  if (invite.status === 'accepted') return 'used'
  const playlist = lookup(state.playlists, invite.playlistId)
  if (invite.status !== 'pending' || !isActive(playlist) || !playlist.collaborative) return 'unavailable'
  if (invite.recipientId && invite.recipientId !== accountId(state)) return 'restricted'
  if (!(Date.parse(invite.expiresAt) > now.getTime())) return 'expired'
  if (!accountId(state) || isOwner(state, playlist) || isEditor(state, playlist)) return 'member'
  return 'joinable'
}

