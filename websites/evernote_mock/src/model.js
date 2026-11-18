export const APP = 'evernote'
export const list = (value) => Array.isArray(value) ? value : []
export const text = (value) => typeof value === 'string' ? value : ''
export const fold = (value) => text(value).trim().toLowerCase()
export const activeNotebook = (record) => record && (!record.status || record.status === 'active')
export const activeNote = (record) => record && (!record.status || record.status === 'active')
export const activeTask = (record) => record && (!record.status || record.status === 'open' || record.status === 'completed')
export const notebookName = (record) => text(record?.name).trim() || 'Untitled notebook'
export const noteTitle = (record) => text(record?.title).trim() || 'Untitled note'
export const taskTitle = (record) => text(record?.title).trim() || 'Untitled task'
export const tagsOf = (note) => list(note?.tags).filter((tag) => fold(tag))
export const idFor = (prefix) => prefix + '_' + Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(36)).join('_')
export const byName = (a, b) => notebookName(a).localeCompare(notebookName(b)) || String(a.id).localeCompare(String(b.id))
export const countLabel = (count, noun) => count + ' ' + noun + (count === 1 ? '' : 's')
export const isDate = (value) => Boolean(text(value) && Number.isFinite(new Date(value).getTime()))
export const dateLabel = (value) => isDate(value) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : ''
export const dateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return ''
  const date = new Date(value + 'T00:00:00')
  return isDate(date.toString()) && localDay(date) === value ? value : ''
}
export function localDay(date = new Date()) {
  return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export const dueLabel = (value) => dateOnly(value) ? dateLabel(value + 'T00:00:00') : 'No due date'
export const noteOrder = (a, b) => noteTitle(a).localeCompare(noteTitle(b)) || String(a.id).localeCompare(String(b.id))

export function readWorld(state) {
  const notebooks = list(state.notebooks).filter(Boolean)
  const notes = list(state.notes).filter(Boolean)
  const tasks = list(state.tasks).filter(Boolean)
  const preferences = state.preferences || {}
  const books = notebooks.filter(activeNotebook).sort(byName)
  const liveNotes = notes.filter(activeNote)
  const bookById = new Map(books.map((book) => [book.id, book]))
  const noteById = new Map(notes.map((note) => [note.id, note]))
  const noteCounts = new Map()
  const tagNames = new Map()
  for (const note of liveNotes) {
    noteCounts.set(note.notebookId, (noteCounts.get(note.notebookId) || 0) + 1)
    for (const tag of tagsOf(note)) if (!tagNames.has(fold(tag))) tagNames.set(fold(tag), tag)
  }
  const tagChoices = [...tagNames.values()].sort((a, b) => a.localeCompare(b))
  const visibleTasks = tasks.filter((task) => activeTask(task) &&
    (!noteById.has(task.noteId) || activeNote(noteById.get(task.noteId))))
  const defaultBook = bookById.get(preferences.defaultNotebookId) || books[0]
  const preferredNote = noteById.get(preferences.defaultTaskNoteId)
  const taskNote = activeNote(preferredNote) ? preferredNote : undefined
  const fallbackTaskNote = defaultBook && liveNotes.find((note) =>
    note.notebookId === defaultBook.id && fold(note.title) === 'things to do')
  return { notebooks, notes, tasks, books, liveNotes, bookById, noteById, noteCounts, tagChoices,
    visibleTasks, defaultBook, taskNote, fallbackTaskNote, user: state.user || {},
    configuredNotebookId: preferences.defaultNotebookId }
}

export const stampFor = (state) => ({ actor: state.user?.id || 'usr_maya', now: new Date().toISOString() })
export const updated = ({ actor, now }) => ({ updatedBy: actor, updatedAt: now })
export const created = (stamp) => ({ createdBy: stamp.actor, createdAt: stamp.now, ...updated(stamp) })
export const replaceRecord = (records, id, newFields) => list(records).map((record) =>
  record?.id === id ? { ...record, ...newFields } : record)
export const setPreferences = (state, changes, stamp) => ({ ...state.preferences, ...changes, ...updated(stamp) })
export const notebookRecord = (id, name, stamp) => ({
  id, name, status: 'active', ...created(stamp), deletedAt: null, deletedBy: null,
})
export const noteRecord = (id, notebookId, title, stamp, fields = {}) => ({
  id, notebookId, title, content: '', tags: [], status: 'active', ...created(stamp),
  trashedAt: null, trashedBy: null, ...fields,
})
export const taskRecord = (id, noteId, fields, stamp) => ({
  id, noteId, title: fields.title, description: fields.description, dueDate: fields.dueDate, flagged: fields.flagged,
  status: 'open', completedAt: null, completedBy: null, deletedAt: null, deletedBy: null, ...created(stamp),
})
export const trashed = (stamp) => ({
  status: 'trashed', trashedAt: stamp.now, trashedBy: stamp.actor, ...updated(stamp),
})
export const deleted = (stamp) => ({
  status: 'deleted', deletedAt: stamp.now, deletedBy: stamp.actor, ...updated(stamp),
})
export function createNotebook(state, id, name, stamp, world = readWorld(state)) {
  return {
    ...state, notebooks: [...list(state.notebooks), notebookRecord(id, name, stamp)],
    preferences: world.defaultBook ? state.preferences : setPreferences(state, { defaultNotebookId: id }, stamp),
  }
}
export function validateNotebookName(name, books, excludeId) {
  if (!fold(name)) return 'Enter a notebook name.'
  if (books.some((book) => book.id !== excludeId && fold(book.name) === fold(name))) return 'An active notebook already has that name.'
  return ''
}
