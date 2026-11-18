import { actionContext, newId, replace } from './transactions.js'
import { addMonths } from '../utils/dates.js'
import { hasArticleBody } from '../utils/articleHtml.js'
import { array } from '../utils/format.js'

export const policyLabels = {
  everyone: 'Everyone', subscribers: 'Subscribers', paid: 'Paid subscribers', founding: 'Founding members', disabled: 'No one',
}
const policies = {
  everyone: ['everyone', 'subscribers', 'paid', 'disabled'],
  free: ['subscribers', 'disabled'],
  paid: ['paid', 'disabled'],
  founding: ['founding', 'disabled'],
}

export const policiesFor = audience => policies[audience] || policies.everyone

export function postSettings(post) {
  const audience = Object.hasOwn(policies, post?.audience) ? post.audience : 'everyone'
  const allowed = policiesFor(audience)
  return {
    audience, commentPolicy: allowed.includes(post?.commentPolicy) ? post.commentPolicy : allowed[0],
    tags: array(post?.tags), sendByEmailAndApp: post?.sendByEmailAndApp !== false,
  }
}

export function withAudience(settings, audience) {
  return postSettings({ ...settings, audience })
}

function uniqueSlug(title, id) {
  const stem = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 84).replace(/-$/, '')
  return `${stem || 'untitled'}-${id.slice(5)}`
}

export function savePost(state, id, fields, action = actionContext(state)) {
  const post = id ? state.posts.find(item => item.id === id && item.status !== 'deleted') : null
  if (id && !post) return null
  if (post?.status === 'scheduled' && articleContentIssue({ ...post, ...fields })) return null
  if (!post) {
    const newPostId = newId('post')
    const draft = {
      id: newPostId, publicationId: action.publicationId, authorId: action.actorId, slug: uniqueSlug(fields.title, newPostId),
      ...fields, status: 'draft', ...action.created, ...action.updated,
      publishedAt: null, scheduledAt: null, deliveryAt: null, deletedAt: null, metrics: null, duplicatedFromId: null,
    }
    return { ...state, posts: [...state.posts, draft], events: [...state.events, action.event('post.created', draft.id, { postId: draft.id, status: draft.status })] }
  }
  const changedFields = Object.keys(fields).filter(key => JSON.stringify(post[key]) !== JSON.stringify(fields[key]))
  if (!changedFields.length) return null
  return {
    ...state, posts: replace(state.posts, { ...post, ...fields, ...action.updated }),
    events: [...state.events, action.event('post.updated', post.id, { postId: post.id, changedFields })],
  }
}

export function articleContentIssue(post) {
  return !post?.title?.trim() || !hasArticleBody(post?.bodyHtml) ? 'Add a title and article body.' : ''
}

export function reviewIssue(post, scheduledAt, now = new Date()) {
  const issue = articleContentIssue(post)
  if (issue) return issue
  if (scheduledAt !== null) {
    const target = new Date(scheduledAt)
    if (!scheduledAt || !(target > now)) return 'Choose a date and time in the future.'
    if (target > addMonths(now, 3, false)) return 'Choose a date no more than three months away.'
  }
  return ''
}

export function releasePost(state, id, settings, scheduledAt, edits) {
  const post = state.posts.find(item => item.id === id && ['draft', 'scheduled'].includes(item.status))
  const action = actionContext(state)
  const candidate = { ...post, ...edits }
  if (!post || reviewIssue(candidate, scheduledAt, action.now)) return null
  const updated = edits ? savePost(state, id, edits, action) : null
  const base = updated ?? state
  const scheduled = scheduledAt !== null
  const publishedAt = scheduled ? post.publishedAt : action.createdAt
  const deliveryAt = scheduled ? post.deliveryAt : settings.sendByEmailAndApp ? publishedAt : null
  const next = {
    ...candidate, ...settings, status: scheduled ? 'scheduled' : 'published',
    scheduledAt: scheduled ? new Date(scheduledAt).toISOString() : null,
    ...(scheduled ? {} : { publishedAt, deliveryAt }), ...action.updated,
  }
  if (scheduled && post.status === 'scheduled' && next.scheduledAt === post.scheduledAt
      && Object.keys(settings).every(key => JSON.stringify(settings[key]) === JSON.stringify(candidate[key]))) return updated
  const details = scheduled
    ? { postId: post.id, previousScheduledAt: post.scheduledAt ?? null, scheduledAt: next.scheduledAt, audience: next.audience }
    : { postId: post.id, previousStatus: post.status, publishedAt, audience: next.audience, deliveryAt }
  return {
    ...base, posts: replace(base.posts, next),
    events: [...base.events, action.event(scheduled ? 'post.scheduled' : 'post.published', post.id, details)],
  }
}

export function unschedulePost(state, id) {
  const post = state.posts.find(item => item.id === id && item.status === 'scheduled')
  if (!post) return null
  const action = actionContext(state)
  return {
    ...state, posts: replace(state.posts, { ...post, status: 'draft', scheduledAt: null, ...action.updated }),
    events: [...state.events, action.event('post.unscheduled', post.id, { postId: post.id, previousScheduledAt: post.scheduledAt ?? null })],
  }
}

export function duplicatePost(state, id) {
  const post = state.posts.find(item => item.id === id && item.status !== 'deleted')
  if (!post) return null
  const action = actionContext(state)
  const postId = newId('post')
  const title = `Copy of ${post.title || 'Untitled'}`
  const copy = {
    id: postId, publicationId: post.publicationId ?? action.publicationId, authorId: action.actorId, title,
    slug: uniqueSlug(title, postId), subtitle: post.subtitle || '', bodyHtml: post.bodyHtml || '',
    ...(post.thumbnailPath ? { thumbnailPath: post.thumbnailPath } : {}), ...postSettings(post),
    status: 'draft', ...action.created, ...action.updated,
    publishedAt: null, scheduledAt: null, deliveryAt: null, deletedAt: null, metrics: null, duplicatedFromId: post.id,
  }
  return { ...state, posts: [...state.posts, copy], events: [...state.events, action.event('post.duplicated', postId, { postId, sourcePostId: post.id })] }
}

export function deletePost(state, id) {
  const post = state.posts.find(item => item.id === id && item.status !== 'deleted')
  if (!post) return null
  const action = actionContext(state)
  return {
    ...state, posts: replace(state.posts, { ...post, status: 'deleted', deletedAt: action.createdAt, ...action.updated }),
    events: [...state.events, action.event('post.deleted', post.id, { postId: post.id, previousStatus: post.status })],
  }
}
