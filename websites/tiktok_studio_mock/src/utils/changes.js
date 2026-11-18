import { activeDraft, actor, items, newId } from './view.js'

export const metadata = (state, timestamp) => ({ updatedAt: timestamp, updatedById: actor(state) })

export function updateRecord(state, collection, id, eligible, fields) {
  const records = state[collection]
  const target = items(records).find((record) => record.id === id && eligible(record))
  if (!target) return state
  const updated = { ...target, ...fields }
  return { ...state, [collection]: records.map((record) => record === target ? updated : record) }
}

export function saveDraft(state, draft, fields, timestamp) {
  const edit = { ...fields, ...metadata(state, timestamp) }
  if (draft) return updateRecord(state, 'drafts', draft.id, activeDraft, { ...edit, status: 'draft' })
  const record = {
    id: newId('draft'), ...edit, status: 'draft', actorId: actor(state),
    createdAt: timestamp, postId: null, convertedAt: null, discardedAt: null,
  }
  return { ...state, drafts: [...(state.drafts || []), record] }
}

export function publishPost(state, draft, fields, timestamp, scheduledAt) {
  const post = {
    id: newId('post'), ...fields, ...metadata(state, timestamp), actorId: actor(state), createdAt: timestamp,
    status: scheduledAt ? 'scheduled' : 'published', publishedAt: scheduledAt ? null : timestamp,
    scheduledAt, deletedAt: null, sourceDraftId: draft?.id || null,
    metrics: { views: 0, likes: 0, comments: 0, shares: 0 },
  }
  if (draft) {
    const converted = updateRecord(state, 'drafts', draft.id, activeDraft, {
      ...fields, ...metadata(state, timestamp), status: 'converted', postId: post.id, convertedAt: timestamp,
    })
    if (converted === state) return state
    return { ...converted, posts: [...(converted.posts || []), post] }
  }
  return { ...state, posts: [...(state.posts || []), post] }
}
