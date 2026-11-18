export const SYSTEM_SHELVES = [
  { id: 'shelf-read', name: 'Read' },
  { id: 'shelf-reading', name: 'Currently Reading' },
  { id: 'shelf-want', name: 'Want to Read' },
]
export const [READ, READING, WANT] = SYSTEM_SHELVES.map(shelf => shelf.id)

export const collection = (state, key) => Array.isArray(state[key]) ? state[key].filter(Boolean) : []
export const actor = state => state.account?.userId || 'user-mara'
const own = (state, key) => collection(state, key).filter(record => record.userId === actor(state))

export function readerView(state) {
  const users = new Map(collection(state, 'users').map(user => [user.id, user]))
  const books = collection(state, 'books')
  const logs = own(state, 'readingLogs')
  const logsByBook = new Map()
  for (const log of logs) {
    const list = logsByBook.get(log.bookId) || []
    list.push(log)
    logsByBook.set(log.bookId, list)
  }
  for (const list of logsByBook.values()) list.sort(byLatestFinish)
  const entries = own(state, 'shelfEntries')
  const reviews = collection(state, 'reviews')
  return {
    users,
    user: users.get(actor(state)),
    books,
    bookById: new Map(books.map(book => [book.id, book])),
    shelves: own(state, 'shelves').filter(shelf => shelf.kind === 'custom' && !SYSTEM_SHELVES.some(system => system.id === shelf.id)),
    entries,
    entryByBook: new Map(entries.map(entry => [entry.bookId, entry])),
    reviews: reviews.filter(review => review.userId === actor(state)),
    communityReviews: reviews.filter(review => review.userId !== actor(state)),
    challenges: own(state, 'challenges'),
    logs,
    logsByBook,
  }
}

export const bookName = book => book?.title?.trim() || 'Unknown book'
export const authorName = book => book?.author?.trim() || 'Unknown author'
export const tagsOf = entry => Array.isArray(entry?.customShelfIds) ? entry.customShelfIds : []
export const byLatestFinish = (a, b) => (b.finishedOn || '').localeCompare(a.finishedOn || '')
export const matchesBook = (book, query) => !query.trim() ||
  `${bookName(book)} ${authorName(book)}`.toLowerCase().includes(query.trim().toLowerCase())

export function today() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(value => String(value).padStart(2, '0')).join('-')
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function displayDate(value) {
  if (!validDate(value)) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

