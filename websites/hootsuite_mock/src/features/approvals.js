import { editMetadata, findRecord, replaceRecord, text } from '../utils/records.js'

export function canDecide(state, approval, actorId) {
  const post = findRecord(state.posts, approval?.postId)
  return Boolean(actorId && approval?.id && approval.status === 'pending' && actorId === approval.reviewerId
    && post?.id && post.status === 'pending_approval')
}

export function decideRequest(state, change, id, status, note) {
  const approval = findRecord(state.approvals, id)
  if (!canDecide(state, approval, change.actorId)) return 'This request is no longer available for your review.'
  const post = findRecord(state.posts, approval.postId)
  const decisionNote = text(note).trim()
  if (status === 'rejected' && !decisionNote) return 'Enter a reason for rejection.'
  if (status === 'approved' && !(Date.parse(post.scheduledAt) > Date.parse(change.now))) {
    return 'Approval requires a scheduled time in the future. You can return the post to its author for revision.'
  }
  return {
    ...state,
    approvals: replaceRecord(state.approvals, {
      ...approval, status, decisionNote: decisionNote || null, decidedBy: change.actorId, decidedAt: change.now,
    }),
    posts: replaceRecord(state.posts, {
      ...post, status: status === 'approved' ? 'scheduled' : 'rejected', ...editMetadata(change),
    }),
  }
}
