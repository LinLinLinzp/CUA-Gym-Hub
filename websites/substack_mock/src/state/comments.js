import { accessFor, relevantGrant } from './access.js'
import { postSettings } from './posts.js'
import { actionContext, newId, replace } from './transactions.js'
import { sortTime } from '../utils/format.js'

export const isPublisher = state => state.currentUserId === state.publication.ownerId
  || state.users.some(user => user.id === state.currentUserId && user.role === 'owner')

function readerAccess(state) {
  const now = new Date()
  const subscriber = state.subscribers.find(row => row.userId === state.currentUserId && row.status === 'active')
  return subscriber ? {
    ...accessFor(subscriber, relevantGrant(state.compSubscriptions, subscriber.id, now), now),
    subscriber: true,
  } : { subscriber: false, paid: false, founding: false }
}

export function canRead(state, post) {
  if (isPublisher(state)) return true
  const audience = postSettings(post).audience
  if (audience === 'everyone') return true
  const access = readerAccess(state)
  if (audience === 'founding') return access.founding
  if (audience === 'paid') return access.paid
  return access.subscriber
}

export function canComment(state, post) {
  if (post?.status !== 'published' || state.publication.commentsEnabled === false || !state.currentUserId) return false
  const policy = postSettings(post).commentPolicy
  if (policy === 'disabled' || !canRead(state, post)) return false
  if (isPublisher(state) || policy === 'everyone') return true
  const access = readerAccess(state)
  if (policy === 'founding') return access.founding
  if (policy === 'paid') return access.paid
  return access.subscriber
}

export function createComment(state, postId, parentId, message) {
  const post = state.posts.find(item => item.id === postId && item.status === 'published')
  const body = message.trim()
  if (!body || !canComment(state, post)) return null
  if (parentId && !state.comments.some(comment => comment.id === parentId && comment.postId === postId && comment.status === 'visible')) return null
  const action = actionContext(state)
  const comment = {
    id: newId('cmt'), publicationId: action.publicationId, postId, parentId: parentId || null, authorId: action.actorId,
    body, status: 'visible', reviewStatus: 'none', createdAt: action.createdAt, updatedAt: action.createdAt,
  }
  const details = { postId, commentId: comment.id, parentId: comment.parentId }
  return { ...state, comments: [...state.comments, comment], events: [...state.events, action.event('comment.created', comment.id, details)] }
}

export function buildThread(comments) {
  const byId = new Map(comments.map(comment => [comment.id, comment]))
  const parents = new Map()
  for (const comment of comments) {
    if (!byId.has(comment.parentId)) continue
    const seen = new Set([comment.id])
    let ancestor = byId.get(comment.parentId)
    while (ancestor && !seen.has(ancestor.id)) {
      seen.add(ancestor.id)
      ancestor = byId.get(ancestor.parentId)
    }
    if (!ancestor) parents.set(comment.id, comment.parentId)
  }
  const included = new Set()
  for (const comment of comments) {
    if (comment.status !== 'visible') continue
    for (let id = comment.id; id && !included.has(id); id = parents.get(id)) included.add(id)
  }
  const roots = []
  const replies = new Map()
  for (const comment of comments) {
    if (!included.has(comment.id)) continue
    const parentId = parents.get(comment.id)
    if (parentId) {
      if (!replies.has(parentId)) replies.set(parentId, [])
      replies.get(parentId).push(comment)
    } else roots.push(comment)
  }
  roots.sort((left, right) => {
    const aPin = left.status === 'visible' && !left.parentId && left.pinnedAt
    const bPin = right.status === 'visible' && !right.parentId && right.pinnedAt
    return Number(Boolean(bPin)) - Number(Boolean(aPin)) || (aPin && bPin ? sortTime('pinnedAt')(left, right) : sortTime('createdAt')(left, right))
  })
  for (const branch of replies.values()) branch.sort(sortTime('createdAt', true))
  return { roots, replies }
}

export function moderateComment(state, commentId, command) {
  if (!isPublisher(state)) return null
  const comment = state.comments.find(item => item.id === commentId)
  if (!comment) return null
  const { event, createdAt, actorId } = actionContext(state)
  const details = { postId: comment.postId, commentId }
  const reviewed = { moderatedAt: createdAt, moderatedById: actorId }
  let edits
  if (command === 'pinned' || command === 'unpinned') {
    const pin = command === 'pinned'
    if (comment.status !== 'visible' || comment.parentId || Boolean(comment.pinnedAt) === pin) return null
    edits = { pinnedAt: pin ? createdAt : null, pinnedById: pin ? actorId : null }
  } else if (command === 'removed') {
    if (comment.status === 'removed') return null
    const reviewStatus = comment.reviewStatus === 'reported' ? 'removed' : comment.reviewStatus || 'none'
    edits = { status: 'removed', pinnedAt: null, pinnedById: null, reviewStatus, ...reviewed }
    Object.assign(details, { previousStatus: comment.status, reviewStatus })
  } else if (command === 'approved') {
    if (comment.reviewStatus !== 'reported') return null
    edits = { reviewStatus: 'approved', ...reviewed }
    details.reviewStatus = 'approved'
  } else if (command === 'unhidden') {
    if (comment.status !== 'hidden') return null
    edits = { status: 'visible', ...reviewed }
    details.previousStatus = 'hidden'
  } else return null
  const next = { ...comment, ...edits, updatedAt: createdAt }
  return { ...state, comments: replace(state.comments, next), events: [...state.events, event(`comment.${command}`, comment.id, details)] }
}

export function setPublicationComments(state, commentsEnabled) {
  if (!isPublisher(state) || (state.publication.commentsEnabled !== false) === commentsEnabled) return null
  const action = actionContext(state)
  return {
    ...state, publication: { ...state.publication, commentsEnabled, ...action.updated },
    events: [...state.events, action.event('publication.commentsChanged', action.publicationId, { commentsEnabled })],
  }
}
