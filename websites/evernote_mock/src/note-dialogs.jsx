import { useState } from 'react'
import { activeNote, activeTask, createNotebook, fold, idFor, list, notebookName, noteRecord, noteTitle,
  readWorld, replaceRecord, tagsOf, taskRecord, text, trashed, updated } from './model.js'
import { noteUrl, useWorkspace } from './navigation.jsx'
import { Confirm, NotebookNameDialog } from './notebooks.jsx'
import { Dialog } from './ui.jsx'

function MoveDialog({ note }) {
  const { world, mutate, setDialog, notice } = useWorkspace()
  const [query, setQuery] = useState('')
  const choices = world.books.filter((book) => book.id !== note.notebookId && fold(notebookName(book)).includes(fold(query)))
  const cancel = () => setDialog(null)
  return <Dialog title="Move to notebook" onClose={cancel}>
    <p>{noteTitle(note)}</p>
    <label className="editor-field"><span>Find a notebook</span><input type="search" data-initial-focus value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="picker" aria-label="Destination notebooks">{choices.length ? choices.map((book) =>
      <button key={book.id} onClick={() => {
        const changed = mutate((state, stamp) => {
          const current = readWorld(state)
          const target = current.noteById.get(note.id)
          if (!activeNote(target) || target.notebookId === book.id || !current.bookById.has(book.id)) return state
          return { ...state, notes: replaceRecord(state.notes, note.id, { notebookId: book.id, ...updated(stamp) }) }
        })
        cancel()
        if (changed) notice('Note moved to ' + notebookName(book))
      }}>{notebookName(book)}</button>) : <p>No other matching notebooks.</p>}</div>
    <div className="dialog-actions"><button onClick={cancel}>Cancel</button></div>
  </Dialog>
}

function TagDialog({ note }) {
  const { world, mutate, setDialog, notice } = useWorkspace()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const close = () => setDialog(null)
  const add = (value) => {
    const tag = value.trim()
    if (!tag) { setError('Enter a tag.'); return }
    if (tagsOf(note).some((label) => fold(label) === fold(tag))) { setError('This note already has that tag.'); return }
    const changed = mutate((state, stamp) => {
      const current = readWorld(state).noteById.get(note.id)
      if (!activeNote(current)) return state
      const tags = tagsOf(current)
      if (tags.some((label) => fold(label) === fold(tag))) return state
      return { ...state, notes: replaceRecord(state.notes, note.id, { tags: [...tags, tag], ...updated(stamp) }) }
    })
    close()
    if (changed) notice('Tag added')
  }
  const suggestions = world.tagChoices.filter((label) => fold(label).includes(fold(value)) &&
    !tagsOf(note).some((tag) => fold(tag) === fold(label)))
  return <Dialog title="Add tag" onClose={close}>
    <form onSubmit={(event) => { event.preventDefault(); add(value) }}>
      <label className="editor-field"><span>Tag</span><input data-initial-focus value={value} onChange={(event) => {
        setValue(event.target.value)
        setError('')
      }} /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      {suggestions.length > 0 && <div className="picker" aria-label="Existing tags">{suggestions.map((tag) =>
        <button type="button" key={fold(tag)} onClick={() => add(tag)}>{tag}</button>)}</div>}
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Add tag</button></div>
    </form>
  </Dialog>
}

export function NoteDialog({ kind, id }) {
  const { world, route, mutate, go, setDialog, notice } = useWorkspace()
  const close = () => setDialog(null)
  const note = world.noteById.get(id)
  if (kind === 'notebook-for-note') {
    return <NotebookNameDialog title="Create a notebook for your note" submitLabel="Create notebook and note" onSubmit={(name) => {
      const bookId = idFor('nb')
      const noteId = idFor('note')
      mutate((state, stamp) => ({
        ...createNotebook(state, bookId, name, stamp),
        notes: [...list(state.notes), noteRecord(noteId, bookId, '', stamp)],
      }))
      close()
      go(noteUrl(noteId), { state: { focusTitle: noteId } })
    }}><p>Your note needs a notebook.</p></NotebookNameDialog>
  }
  if (!note) return null
  if (kind === 'add-tag') return <TagDialog note={note} />
  if (kind === 'move-note') return <MoveDialog note={note} />
  if (kind === 'duplicate-note') {
    const destination = world.bookById.get(note.notebookId) || world.defaultBook
    const duplicate = (newName) => {
      const copyId = idFor('note')
      const bookId = destination?.id || idFor('nb')
      const changed = mutate((state, stamp) => {
        const current = readWorld(state).noteById.get(id)
        if (!activeNote(current)) return state
        const next = newName ? createNotebook(state, bookId, newName, stamp) : state
        const copy = noteRecord(copyId, bookId, noteTitle(current) + ' (copy)', stamp, {
          content: text(current.content), tags: [...tagsOf(current)], sourceNoteId: id,
        })
        const tasks = list(next.tasks)
        const copies = tasks.filter((task) => task?.noteId === id && activeTask(task)).map((task) => ({
          ...taskRecord(idFor('task'), copyId, {
            title: text(task.title), description: text(task.description), dueDate: task.dueDate ?? null, flagged: Boolean(task.flagged),
          }, stamp),
          status: task.status || 'open', completedAt: task.completedAt ?? null, completedBy: task.completedBy ?? null, sourceTaskId: task.id,
        }))
        return { ...next, notes: [...list(next.notes), copy], tasks: [...tasks, ...copies] }
      })
      close()
      if (changed) { go(noteUrl(copyId, route.collection)); notice('Note duplicated') }
    }
    return destination ? <Confirm title="Duplicate note?" label="Duplicate" onConfirm={() => duplicate()} danger={false}>
      <p>Create a copy of <strong>{noteTitle(note)}</strong> and its tasks in {notebookName(destination)}.</p>
    </Confirm> : <NotebookNameDialog title="Create a notebook for the copy" submitLabel="Duplicate note" onSubmit={duplicate} />
  }
  if (kind === 'trash-note') {
    return <Confirm title="Move note to Trash?" label="Move to Trash" onConfirm={() => {
      const changed = mutate((state, stamp) => activeNote(readWorld(state).noteById.get(id)) ?
        { ...state, notes: replaceRecord(state.notes, id, trashed(stamp)) } : state)
      close()
      if (changed) {
        if (route.note?.id === id) go(route.collection, { replace: true })
        notice('Note moved to Trash')
      }
    }}><p><strong>{noteTitle(note)}</strong> and its tasks will be hidden from active views.</p></Confirm>
  }
  const destination = world.bookById.get(note.notebookId) || world.defaultBook
  const restore = (newName) => {
    const bookId = destination?.id || idFor('nb')
    const changed = mutate((state, stamp) => {
      if (readWorld(state).noteById.get(id)?.status !== 'trashed') return state
      const next = newName ? createNotebook(state, bookId, newName, stamp) : state
      return { ...next, notes: replaceRecord(next.notes, id, {
        status: 'active', notebookId: bookId, trashedAt: null, trashedBy: null, ...updated(stamp),
      }) }
    })
    close()
    if (changed) { go(noteUrl(id), { replace: true }); notice('Note restored') }
  }
  return destination ? <Confirm title="Restore note?" label="Restore note" danger={false} onConfirm={() => restore()}>
    <p>Restore <strong>{noteTitle(note)}</strong> to {notebookName(destination)}.</p>
  </Confirm> : <NotebookNameDialog title="Create a notebook to restore this note" submitLabel="Restore note" onSubmit={restore} />
}
