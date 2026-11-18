import { byId, canView, channelName, userName } from './selectors.js'

function dateBound(value, after) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(value + 'T00:00:00.000Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return null
  return after ? time + 86400000 : time
}

export function parseSearch(query) {
  const terms = []
  const filters = []
  const lexer = /(?:([^\s:"]+):)?(?:"([^"]*)"|([^\s"]+))/gy
  let offset = 0
  while (offset < query.length) {
    if (/\s/.test(query[offset])) { offset++; continue }
    lexer.lastIndex = offset
    const match = lexer.exec(query)
    if (!match || query[lexer.lastIndex] && !/\s/.test(query[lexer.lastIndex])) {
      return { error: 'Place double quotes around complete search phrases.' }
    }
    offset = lexer.lastIndex
    const [, modifier, phrase, word] = match
    const value = (phrase ?? word).trim().toLowerCase()
    const key = modifier?.toLowerCase()
    if (!key) {
      if (/^(?:in|from|before|after):$/.test(value)) return { error: 'Enter a value for ' + value }
      if (value) terms.push(value)
      continue
    }
    if (!['in', 'from', 'before', 'after'].includes(key)) return { error: 'Unsupported filter: ' + key + ':' }
    if (!value) return { error: 'Enter a value for ' + key + ':' }
    if (key === 'before' || key === 'after') {
      const time = dateBound(value, key === 'after')
      if (time === null) return { error: 'Enter a valid date in YYYY-MM-DD format.' }
      filters.push({ key, value: time })
    } else filters.push({ key, value: value.replace(/^[@#]/, '') })
  }
  return { terms, filters, error: '' }
}

export function matchesSearch(state, team, post, search, content) {
  const channel = byId(state.channels, post.channelId)
  if (post.deletedAt || channel?.teamId !== team.id || !canView(state, channel)) return false
  if (!search.terms.every(term => String(content ?? '').toLowerCase().includes(term))) return false

  return search.filters.every(({ key, value }) => {
    if (key === 'in') return [channel.id, channel.name, channelName(state, channel)].some(item => String(item ?? '').toLowerCase() === value)
    if (key === 'from') {
      const author = byId(state.users, post.userId)
      return [post.userId, author?.username, userName(author)].some(item => String(item ?? '').toLowerCase() === value)
    }
    const time = Date.parse(post.createdAt ?? '')
    return key === 'before' ? time < value : time >= value
  })
}
