import { array, createId, editMetadata, findRecord, lower, newMetadata, records, replaceRecord, text } from '../utils/records.js'
import { dateKey, timeKey, toInstant } from '../utils/dates.js'

export const postStatuses = ['scheduled', 'draft', 'pending_approval', 'rejected', 'published', 'canceled']
export const canEdit = (post) => post?.status === 'scheduled' || post?.status === 'draft'
export const hasOpenRequest = (state, postId) => records(state.approvals).some((item) => item.postId === postId && item.status === 'pending')

export function newestRequests(input) {
  return records(input).map((item, index) => ({ item, index })).sort((a, b) =>
    (Date.parse(b.item.createdAt) || 0) - (Date.parse(a.item.createdAt) || 0) || b.index - a.index,
  ).map(({ item }) => item)
}

export function canRevise(state, approval, actorId) {
  const post = findRecord(state.posts, approval?.postId)
  if (!actorId || !approval?.id || approval.status !== 'rejected'
    || !post?.id || post.status !== 'rejected' || post.createdBy !== actorId || hasOpenRequest(state, post.id)) return false
  return newestRequests(state.approvals).find((item) => item.postId === post.id && item.status === 'rejected')?.id === approval.id
}

export function matchesPost(post, filters) {
  return (!filters.profile || array(post?.profileIds).includes(filters.profile))
    && (!filters.status || post?.status === filters.status)
    && (!filters.query || lower(post?.body).includes(lower(filters.query.trim())))
}

export function submitPost(state, change, { mode, postId, previousRequestId, fields, zone, newPostId, requestId }) {
  const existing = findRecord(state.posts, postId)
  if (postId && !existing) return 'This post is unavailable.'
  if (previousRequestId) {
    const previous = findRecord(state.approvals, previousRequestId)
    if (mode !== 'review' || previous?.postId !== postId || !canRevise(state, previous, change.actorId)) {
      return 'This request can no longer be revised.'
    }
  } else if (existing && (!canEdit(existing) || hasOpenRequest(state, postId))) {
    return 'This post can no longer be edited.'
  }

  const body = text(fields.body).trim()
  if (mode !== 'reschedule' && !body) return 'Enter a caption.'
  if (mode !== 'reschedule' && fields.profileIds.some((id) => !findRecord(state.profiles, id))) {
    return 'Remove unavailable profiles before saving.'
  }
  if ((mode === 'schedule' || mode === 'review') && !fields.profileIds.length) return 'Select at least one connected profile.'
  if (mode === 'reschedule' && (!existing || existing.status !== 'scheduled')) return 'Only scheduled posts can be rescheduled.'

  const needsDate = mode !== 'draft'
  const hasDate = Boolean(fields.time)
  const original = existing?.scheduledAt
  const sameTime = original && fields.day === dateKey(original, zone) && fields.time === timeKey(original, zone)
  const scheduledAt = sameTime ? original : needsDate || hasDate ? toInstant(fields.day, fields.time, zone) : null
  if ((needsDate || hasDate) && !scheduledAt) return `Enter a valid date and time in ${zone}.`
  if (needsDate && Date.parse(scheduledAt) <= Date.parse(change.now)) return 'Choose a date and time in the future.'

  if (mode === 'review' && (fields.reviewerId === change.actorId || !findRecord(state.users, fields.reviewerId))) {
    return 'Choose a teammate as reviewer.'
  }
  const status = mode === 'review' ? 'pending_approval' : mode === 'draft' ? 'draft' : 'scheduled'
  const content = mode === 'reschedule' ? {} : { body, profileIds: fields.profileIds }
  const post = existing
    ? { ...existing, ...content, scheduledAt, status, ...editMetadata(change) }
    : { id: newPostId, ...content, scheduledAt, status, ...newMetadata(change) }
  const posts = existing ? replaceRecord(state.posts, post) : [...array(state.posts), post]
  if (mode !== 'review') return { ...state, posts }

  const approval = {
    id: requestId || createId('approval'), postId: post.id, reviewerId: fields.reviewerId, requestedBy: change.actorId,
    requestNote: text(fields.requestNote).trim(), status: 'pending', createdAt: change.now,
    previousRequestId: previousRequestId || null, decisionNote: null, decidedBy: null, decidedAt: null,
  }
  return { ...state, posts, approvals: [...array(state.approvals), approval] }
}

export function changeScheduledStatus(state, change, id, status) {
  const post = findRecord(state.posts, id)
  if (post?.status !== 'scheduled' || hasOpenRequest(state, id)) return 'This post is no longer scheduled.'
  const updated = { ...post, status, ...editMetadata(change) }
  if (status === 'draft') updated.scheduledAt = null
  return { ...state, posts: replaceRecord(state.posts, updated) }
}
