import { actor, collection, READ, tagsOf, today, validDate, WANT } from './model.js'

const records = (state, key) => Array.isArray(state[key]) ? state[key] : []
const belongsTo = (row, userId) => row?.userId === userId
const forBook = (row, userId, bookId) => belongsTo(row, userId) && row.bookId === bookId
const stamp = () => new Date().toISOString()

function put(rows, existing, fields, now) {
  if (existing) return rows.map(row => row === existing ? { ...row, ...fields, updatedAt: now } : row)
  return [...rows, { id: crypto.randomUUID(), ...fields, createdAt: now, updatedAt: now }]
}

function updateEntry(rows, userId, bookId, changes, now) {
  const entry = rows.find(row => forBook(row, userId, bookId))
  const statusShelfId = changes.statusShelfId ?? entry?.statusShelfId ?? WANT
  const customShelfIds = tagsOf(entry)
  let nextTags = customShelfIds
  if (changes.addTag && !customShelfIds.includes(changes.addTag)) nextTags = [...customShelfIds, changes.addTag]
  if (changes.removeTag && customShelfIds.includes(changes.removeTag)) nextTags = customShelfIds.filter(id => id !== changes.removeTag)
  if (changes.removeTag && !entry) return rows
  if (entry && statusShelfId === entry.statusShelfId && nextTags === customShelfIds) return rows
  return put(rows, entry, { userId, bookId, statusShelfId, customShelfIds: nextTags }, now)
}

export function changeShelving(state, bookIds, changes) {
  const original = records(state, 'shelfEntries')
  const now = stamp()
  const shelfEntries = bookIds.reduce((rows, bookId) => updateEntry(rows, actor(state), bookId, changes, now), original)
  return shelfEntries === original ? state : { ...state, shelfEntries }
}

export function removeLibraryBook(state, bookId) {
  const userId = actor(state)
  const keep = row => !forBook(row, userId, bookId)
  const shelfEntries = records(state, 'shelfEntries').filter(keep)
  if (shelfEntries.length === records(state, 'shelfEntries').length) return state
  return {
    ...state,
    shelfEntries,
    reviews: records(state, 'reviews').filter(keep),
    readingLogs: records(state, 'readingLogs').filter(keep),
  }
}

export function saveShelf(state, id, input) {
  const userId = actor(state)
  const name = input.trim()
  const shelves = records(state, 'shelves')
  const existing = id && shelves.find(row => belongsTo(row, userId) && row.id === id && row.kind === 'custom')
  if (id && !existing) throw new Error('This shelf could not be found.')
  if (!name) throw new Error('Enter a shelf name.')
  if (shelves.some(row => belongsTo(row, userId) && row !== existing && row.name?.trim().toLowerCase() === name.toLowerCase()) ||
    ['all books', 'read', 'currently reading', 'want to read'].includes(name.toLowerCase())) {
    throw new Error('A shelf with this name already exists.')
  }
  if (existing?.name === name) return state
  return { ...state, shelves: put(shelves, existing, { userId, name, kind: 'custom' }, stamp()) }
}

export function deleteShelf(state, id) {
  const userId = actor(state)
  const shelves = records(state, 'shelves')
  const shelf = shelves.find(row => belongsTo(row, userId) && row.id === id && row.kind === 'custom')
  if (!shelf) return state
  const now = stamp()
  return {
    ...state,
    shelves: shelves.filter(row => row !== shelf),
    shelfEntries: records(state, 'shelfEntries').map(entry => {
      if (!belongsTo(entry, userId) || !tagsOf(entry).includes(id)) return entry
      return { ...entry, customShelfIds: tagsOf(entry).filter(tag => tag !== id), updatedAt: now }
    }),
  }
}

export function saveReview(state, bookId, rating, input, containsSpoilers) {
  const body = input.trim()
  if (!body && !rating) throw new Error('Add a star rating or write a review.')
  const userId = actor(state)
  const rows = records(state, 'reviews')
  const review = rows.find(row => forBook(row, userId, bookId))
  if (review && review.rating === rating && (review.body || '') === body && Boolean(review.containsSpoilers) === containsSpoilers) return state
  return { ...state, reviews: put(rows, review, { userId, bookId, rating, body, containsSpoilers }, stamp()) }
}

function removeRecord(state, key, id) {
  const rows = records(state, key)
  const next = rows.filter(row => !belongsTo(row, actor(state)) || row.id !== id)
  return next.length === rows.length ? state : { ...state, [key]: next }
}

export const deleteReview = (state, id) => removeRecord(state, 'reviews', id)
export const deleteFinish = (state, id) => removeRecord(state, 'readingLogs', id)

export function saveGoal(state, year, input) {
  const goalBooks = Number(input)
  if (!Number.isInteger(goalBooks) || goalBooks < 1 || goalBooks > 999) throw new Error('Enter a whole number from 1 to 999.')
  const userId = actor(state)
  const rows = records(state, 'challenges')
  const goal = rows.find(row => belongsTo(row, userId) && row.year === year)
  if (goal?.goalBooks === goalBooks) return state
  return { ...state, challenges: put(rows, goal, { userId, year, goalBooks }, stamp()) }
}

export function saveFinish(state, bookId, id, finishedOn) {
  const userId = actor(state)
  const rows = records(state, 'readingLogs')
  const log = id && rows.find(row => forBook(row, userId, bookId) && row.id === id)
  if (id && !log) throw new Error('This finish could not be found.')
  if (!log && !collection(state, 'books').some(book => book.id === bookId)) throw new Error('Choose a book from the catalog.')
  if (!validDate(finishedOn) || finishedOn > today()) throw new Error('Enter a valid date on or before today.')
  if (rows.some(row => row !== log && forBook(row, userId, bookId) && row.finishedOn === finishedOn)) {
    throw new Error('This book already has a finish on that date.')
  }
  if (log?.finishedOn === finishedOn) return state
  const now = stamp()
  return {
    ...state,
    readingLogs: put(rows, log, { userId, bookId, finishedOn }, now),
    shelfEntries: updateEntry(records(state, 'shelfEntries'), userId, bookId, { statusShelfId: READ }, now),
  }
}

