export const articlePath = article => '/wiki/' + encodeURIComponent(article.slug)

export function contributorName(state, id, fallback = 'Unknown contributor') {
  const person = state.contributors.find(item => item.id === id)
  return person?.username || person?.displayName || fallback
}

function timestamp(item) {
  const time = Date.parse(item.createdAt ?? '')
  return Number.isFinite(time) ? time : -Infinity
}

export const newestFirst = (a, b) => timestamp(b) - timestamp(a) || String(a.id).localeCompare(String(b.id))
export const oldestFirst = (a, b) => timestamp(a) - timestamp(b) || String(a.id).localeCompare(String(b.id))
export const published = item => !item.status || item.status === 'published'
export const posted = item => !item.status || item.status === 'posted'
export const newId = prefix => prefix + '-' + crypto.randomUUID()
export const bytes = text => new TextEncoder().encode(text).length

const dates = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const days = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })

export function dateLabel(value, dayOnly = false) {
  const date = new Date(value ?? '')
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return dayOnly ? days.format(date) : dates.format(date) + ' UTC'
}

export const activeWatches = state => state.watchlist.filter(item =>
  Boolean(state.account?.id) && item.actorId === state.account.id && (!item.status || item.status === 'active'))
export const isWatched = (state, articleId) => activeWatches(state).some(item => item.articleId === articleId)

export function removeWatches(state, ids, createdAt = new Date().toISOString()) {
  const removed = activeWatches(state).filter(item => ids.has(item.id))
  if (!removed.length) return state
  const removedRecords = new Set(removed)
  return {
    ...state,
    watchlist: state.watchlist.filter(item => !removedRecords.has(item)),
    watchlistEvents: [...state.watchlistEvents, ...removed.map(item => watchEvent(item, 'unwatch', createdAt))],
  }
}

export function changeArticleWatch(state, articleId, watch, createdAt = new Date().toISOString()) {
  const actorId = state.account?.id
  if (!actorId || !state.articles.some(item => item.id === articleId) || watch === isWatched(state, articleId)) return state
  if (!watch) {
    return removeWatches(state, new Set(activeWatches(state).filter(item => item.articleId === articleId).map(item => item.id)), createdAt)
  }
  const item = { id: newId('watch'), articleId, actorId, createdAt, status: 'active' }
  return {
    ...state,
    watchlist: [...state.watchlist, item],
    watchlistEvents: [...state.watchlistEvents, watchEvent(item, 'watch', createdAt)],
  }
}

function watchEvent(item, action, createdAt) {
  return { id: newId('watch-event'), watchId: item.id, articleId: item.articleId, actorId: item.actorId, createdAt, action, status: 'completed' }
}
