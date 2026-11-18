export const items = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []
export const queryMatch = (query, ...values) => values.join(' ').toLowerCase().includes(query.trim().toLowerCase())
export const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(number(value))
export const shortNumber = (value) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number(value))
export const actor = (state) => state.account?.id || 'creator_mara_ellis'
export const initials = (name) => (name || 'Creator').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
export const handle = (value) => value ? `@${value.replace(/^@/, '')}` : ''
export const dateKey = (value) => typeof value === 'string' ? value : ''
export const audienceNames = { public: 'Everyone', friends: 'Friends', private: 'Only you' }
export const accountMetrics = { views: 'Post views', profileViews: 'Profile views', likes: 'Likes', comments: 'Comments', shares: 'Shares', netFollowers: 'Net followers' }
export const postMetrics = { views: 'Views', likes: 'Likes', comments: 'Comments', shares: 'Shares' }
export const postDate = (post) => post.status === 'scheduled' ? post.scheduledAt || post.createdAt : post.publishedAt || post.createdAt
export const activeDraft = (draft) => !draft.status || draft.status === 'draft'
export const visibleComment = (comment) => comment.status !== 'deleted'
export const isAudienceComment = (comment, creatorId) => visibleComment(comment) && !comment.parentCommentId && (comment.actorId == null || comment.actorId !== creatorId)

export function dateLabel(value, options = {}) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options }).format(date)
}

export function localUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const url = URL.parse(value, window.location.origin)
  if (!url || url.origin !== window.location.origin || url.protocol !== window.location.protocol || url.pathname.startsWith('//')) return undefined
  return url.pathname + url.search + url.hash
}

export function creatorReplies(comments, creatorId) {
  const replies = new Map()
  for (const comment of comments) {
    if (!visibleComment(comment) || !comment.parentCommentId || comment.actorId !== creatorId) continue
    const thread = replies.get(comment.parentCommentId) || []
    thread.push(comment)
    replies.set(comment.parentCommentId, thread)
  }
  return replies
}

export const newId = (prefix) => `${prefix}_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
