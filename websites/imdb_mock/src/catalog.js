export const records = (rows) => Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : []
export const owned = (rows, userId) => records(rows).filter((row) => row.userId === userId)
export const genresOf = (title) => Array.isArray(title?.genres) ? title.genres.filter((genre) => typeof genre === 'string') : []
export const typeNames = { movie: 'Movie', tvSeries: 'TV series', short: 'Short', tvEpisode: 'TV episode' }
export const titleName = (title) => title?.name || 'Unavailable title'
export const textOrder = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { sensitivity: 'base' })
export const matchesTitle = (title, query) => {
  const search = query.trim().toLowerCase()
  return !search || titleName(title).toLowerCase().includes(search) || String(title?.id).toLowerCase() === search
}

const position = (row) => Number.isInteger(row.position) && row.position > 0 ? row.position : Infinity
export const ordered = (rows) => [...rows].sort((a, b) => position(a) - position(b) || textOrder(a.id, b.id))
export const recent = (a, b) => textOrder(b.updatedAt || b.createdAt, a.updatedAt || a.createdAt) || textOrder(a.id, b.id)
export const isFuture = (title) => {
  const now = new Date()
  const release = typeof title?.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(title.releaseDate)
    ? Date.parse(title.releaseDate) : NaN
  if (Number.isFinite(release)) return release > now.getTime()
  return Number.isFinite(title?.year) && title.year > now.getUTCFullYear()
}
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const dateLabel = (value) => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Date unavailable'
export const scoreLabel = (value) => Number.isFinite(value) ? value.toFixed(1) : 'Unavailable'
