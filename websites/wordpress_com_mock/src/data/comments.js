import { contentFor, rows } from '../utils/display.js'
import { appendActivity, created, difference, error, event, unchanged, updated } from './records.js'

export const activeComment = (status) => status === 'pending' || status === 'approved'
export const moderationLabels = {
  approve: 'Approve', unapprove: 'Unapprove', spam: 'Spam', unspam: 'Not Spam',
  trash: 'Trash', restore: 'Restore', delete: 'Delete permanently',
}

const allowed = {
  pending: ['approve', 'spam', 'trash'],
  approved: ['unapprove', 'spam', 'trash'],
  spam: ['unspam', 'delete'],
  trash: ['restore', 'delete'],
}
export const commentActions = (status) => allowed[status] || []
const actionEvent = {
  approve: 'comment_approved', unapprove: 'comment_unapproved',
  spam: 'comment_spammed', unspam: 'comment_unspammed',
  trash: 'comment_trashed', restore: 'comment_restored', delete: 'comment_deleted',
}

const sameThread = (left, right) => left.contentType === right.contentType && left.contentId === right.contentId

export function moderateComments(state, stamp, ids, action) {
  const comments = rows(state.comments)
  const selected = new Set(ids)
  const targets = comments.filter((comment) => selected.has(comment.id) && commentActions(comment.status).includes(action))
  if (!targets.length) return error('None of the selected comments can use this action.')
  const affected = new Set(targets.map((row) => row.id))
  const events = []
  let next
  if (action === 'delete') {
    const byId = new Map(comments.map((comment) => [comment.id, comment]))
    const reparented = new Map()
    const nearestSurvivor = (comment) => {
      const seen = new Set([comment.id])
      let parent = byId.get(comment.parentId)
      while (parent && sameThread(comment, parent) && !seen.has(parent.id)) {
        if (!affected.has(parent.id)) return parent.id
        seen.add(parent.id)
        parent = byId.get(parent.parentId)
      }
      return null
    }
    next = comments.filter((comment) => !affected.has(comment.id)).map((comment) => {
      if (!affected.has(comment.parentId)) return comment
      const replies = reparented.get(comment.parentId) || []
      replies.push(comment.id)
      reparented.set(comment.parentId, replies)
      return { ...comment, parentId: nearestSurvivor(comment), ...updated(stamp) }
    })
    events.push(...targets.map((comment) => event(actionEvent.delete, 'comment', comment, stamp, { relatedIds: reparented.get(comment.id) || [] })))
  } else {
    const recover = action === 'restore' || action === 'unspam'
    next = comments.map((comment) => {
      if (!affected.has(comment.id)) return comment
      const status = recover
        ? (activeComment(comment.priorStatus) ? comment.priorStatus : 'pending')
        : ({ approve: 'approved', unapprove: 'pending', spam: 'spam', trash: 'trash' })[action]
      const priorStatus = action === 'spam' || action === 'trash' ? comment.status : null
      events.push(event(actionEvent[action], 'comment', comment, stamp, { toStatus: status }))
      return { ...comment, status, priorStatus, ...updated(stamp) }
    })
  }
  const count = targets.length
  const skipped = selected.size - count
  return {
    next: { ...state, comments: next, activity: appendActivity(state, events) },
    message: (count === 1 ? '1 comment' : count + ' comments') + (action === 'delete' ? ' permanently deleted.' : ' updated.') +
      (skipped ? ' ' + skipped + ' skipped.' : ''),
  }
}

export function visibleComments(state, type, id) {
  if (!contentFor(state, type, id)) return []
  const comments = rows(state.comments).filter((comment) => comment.contentType === type && comment.contentId === id)
  const byId = new Set(comments.map((comment) => comment.id))
  const children = new Map()
  const order = [...comments].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  for (const comment of order) {
    if (comment.status !== 'approved') continue
    const parentId = byId.has(comment.parentId) ? comment.parentId : null
    const group = children.get(parentId) || []
    group.push(comment)
    children.set(parentId, group)
  }
  const visible = []
  const stack = (children.get(null) || []).map((comment) => ({ comment, depth: 0 })).reverse()
  while (stack.length) {
    const entry = stack.pop()
    visible.push(entry)
    for (const comment of [...(children.get(entry.comment.id) || [])].reverse()) stack.push({ comment, depth: entry.depth + 1 })
  }
  return visible
}

export function replyToComment(state, stamp, parentId, value, approval = false) {
  const body = value.trim()
  if (!body) return error('Enter a reply.', 'body')
  const comments = rows(state.comments)
  const parent = comments.find((comment) => comment.id === parentId)
  if (!parent || parent.status !== (approval ? 'pending' : 'approved')) return error('This comment is no longer available for that reply.')
  if (!contentFor(state, parent.contentType, parent.contentId)) return error('The original content is unavailable.')
  const user = rows(state.users).find((person) => person.id === stamp.actor)
  const reply = {
    ...created('comment', stamp), contentType: parent.contentType, contentId: parent.contentId,
    parentId, authorId: stamp.actor, authorName: user?.name || 'Signed-in user', authorEmail: user?.email ?? '',
    body, status: 'approved', priorStatus: null,
  }
  const batch = approval ? comments.map((comment) => comment === parent ? { ...parent, status: 'approved', priorStatus: null, ...updated(stamp) } : comment) : comments
  const events = approval ? [event('comment_approved', 'comment', parent, stamp, { toStatus: 'approved' })] : []
  events.push(event('comment_replied', 'comment', reply, stamp, { fromStatus: null, toStatus: 'approved', relatedIds: [parentId] }))
  return {
    next: { ...state, comments: [...batch, reply], activity: appendActivity(state, events) },
    message: approval ? 'Comment approved and reply posted.' : 'Reply posted.',
  }
}

export function editComment(state, stamp, id, changes) {
  const comments = rows(state.comments)
  const comment = comments.find((row) => row.id === id)
  if (!comment) return error('This comment is no longer available.')
  const patch = difference(comment, Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value.trim()])))
  if (!Object.keys(patch).length) return unchanged
  if (patch.body === '') return error('Enter a comment.', 'body')
  if (patch.authorName === '') return error('Enter an author name.', 'authorName')
  if (patch.authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.authorEmail)) return error('Enter a valid email address.', 'authorEmail')
  const activity = event('comment_edited', 'comment', comment, stamp, { toStatus: comment.status ?? null })
  return {
    next: { ...state, comments: comments.map((row) => row === comment ? { ...row, ...patch, ...updated(stamp) } : row), activity: appendActivity(state, [activity]) },
    message: 'Comment updated.',
  }
}
