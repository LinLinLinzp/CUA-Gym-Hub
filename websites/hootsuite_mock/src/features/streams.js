import { array, editMetadata, findRecord, isActive, lower, newMetadata, records, replaceRecord, text } from '../utils/records.js'

const positionOf = (item) => Number.isInteger(item.position) && item.position >= 0 ? item.position : Infinity
export const orderedActive = (input) => records(input).filter(isActive).sort((a, b) => positionOf(a) - positionOf(b))
export const boardStreams = (state, boardId) => orderedActive(state.streams).filter((stream) => stream.boardId === boardId)
export const compatibleTypes = (profile) => !profile ? [] : profile.network === 'x' ? ['my_posts', 'mentions', 'keyword_search'] : ['my_posts']

function nextPosition(items) {
  return items.reduce((highest, item) => Math.max(highest, Number.isFinite(positionOf(item)) ? item.position : -1), -1) + 1
}

function activeRecord(input, id) {
  const item = findRecord(input, id)
  return item && isActive(item) ? item : undefined
}

function removed(item, change) {
  return { ...item, status: 'removed', removedBy: change.actorId, removedAt: change.now, ...editMetadata(change) }
}

export function saveBoard(state, change, { boardId, newId, name }) {
  const board = activeRecord(state.streamBoards, boardId)
  if (boardId && !board) return 'This board is unavailable.'
  name = text(name).trim()
  if (!name) return 'Enter a board name.'
  const active = orderedActive(state.streamBoards)
  if (active.some((item) => item.id !== boardId && lower(item.name).trim() === lower(name))) return 'An active board already has that name.'
  const updated = board
    ? { ...board, name, ...editMetadata(change) }
    : { id: newId, name, position: nextPosition(active), status: 'active', ...newMetadata(change), removedBy: null, removedAt: null }
  return { ...state, streamBoards: board ? replaceRecord(state.streamBoards, updated) : [...array(state.streamBoards), updated] }
}

export function removeBoard(state, change, boardId) {
  const board = activeRecord(state.streamBoards, boardId)
  if (!board) return 'This board is unavailable.'
  return {
    ...state,
    streamBoards: replaceRecord(state.streamBoards, removed(board, change)),
    streams: array(state.streams).map((item) => item?.boardId === boardId && isActive(item) ? removed(item, change) : item),
  }
}

export function saveStream(state, change, { streamId, newId, boardId, name, profileId, type, query }) {
  const stream = activeRecord(state.streams, streamId)
  if (streamId && !stream) return 'This stream is unavailable.'
  if (!activeRecord(state.streamBoards, stream?.boardId ?? boardId)) return 'Choose an active board.'
  const profile = findRecord(state.profiles, profileId)
  name = text(name).trim()
  query = type === 'keyword_search' ? text(query).trim() : null
  if (!name) return 'Enter a stream title.'
  if (!profile) return 'Choose a connected profile.'
  if (!compatibleTypes(profile).includes(type)) return 'Choose a stream type supported by this profile.'
  if (type === 'keyword_search' && !query) return 'Enter a keyword or phrase.'
  const fields = { name, profileId, type, query }
  const updated = stream
    ? { ...stream, ...fields, ...editMetadata(change) }
    : { id: newId, boardId, ...fields, status: 'active', position: nextPosition(boardStreams(state, boardId)),
      ...newMetadata(change), removedBy: null, removedAt: null }
  return { ...state, streams: stream ? replaceRecord(state.streams, updated) : [...array(state.streams), updated] }
}


function updatePositions(input, updates) {
  const byRecord = new Map(updates.map(([source, update]) => [source, update]))
  return array(input).map((item) => byRecord.get(item) || item)
}

function positionUpdates(ordered, boardId, change) {
  return ordered.flatMap((item, position) => item.position === position && item.boardId === boardId
    ? [] : [[item, { ...item, boardId, position, ...editMetadata(change) }]])
}

export function changeStreamOrder(state, change, streamId, operation, destination) {
  const stream = activeRecord(state.streams, streamId)
  if (!stream || !activeRecord(state.streamBoards, stream.boardId)) return 'This stream is unavailable.'
  const source = boardStreams(state, stream.boardId)
  const remaining = source.filter((item) => item !== stream)
  let updates
  if (operation === 'remove') {
    updates = [...positionUpdates(remaining, stream.boardId, change), [stream, removed(stream, change)]]
  } else if (operation === 'move') {
    if (destination === stream.boardId || !activeRecord(state.streamBoards, destination)) return 'Choose another active board.'
    const target = [...boardStreams(state, destination), stream]
    updates = [...positionUpdates(remaining, stream.boardId, change), ...positionUpdates(target, destination, change)]
  } else {
    const next = source.indexOf(stream) + (operation === 'left' ? -1 : 1)
    if (next < 0 || next >= source.length) return 'This stream is already at the edge of the board.'
    remaining.splice(next, 0, stream)
    updates = positionUpdates(remaining, stream.boardId, change)
  }
  return { ...state, streams: updatePositions(state.streams, updates) }
}

export function feedFor(items, stream, profile, search) {
  if (!profile || !compatibleTypes(profile).includes(stream.type)) return []
  const keyword = lower(stream.query).trim()
  const query = lower(search).trim()
  return records(items).filter((item) => {
    if (item.profileId !== stream.profileId) return false
    const content = [item.body, item.authorHandle]
    if (stream.type === 'my_posts' && item.kind !== 'owned') return false
    if (stream.type === 'mentions' && item.kind !== 'mention') return false
    if (stream.type === 'keyword_search' && (!keyword || !content.some((field) => lower(field).includes(keyword)))) return false
    return !query || [...content, item.authorName].some((field) => lower(field).includes(query))
  }).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
}
