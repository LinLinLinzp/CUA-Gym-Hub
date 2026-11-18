import { useLayoutEffect, useRef, useState } from 'react'
import { activeNote, countLabel, dateLabel, fold, idFor, isDate, list, noteRecord, notebookName, noteOrder,
  noteTitle, readWorld, replaceRecord, tagsOf, text, updated } from './model.js'
import { notebookUrl, noteUrl, useWorkspace, WorkspaceLink } from './navigation.jsx'
import { Empty, Heading, Menu, Sheet, Symbol } from './ui.jsx'

export function NoteActions({ note, iconOnly }) {
  const { flushEditor, setDialog } = useWorkspace()
  const open = (kind) => {
    flushEditor()
    setDialog({ kind, id: note.id })
  }
  return <Menu label="Note actions" iconOnly={iconOnly}>
    <button onClick={() => open('move-note')}>Move to notebook</button>
    <button onClick={() => open('duplicate-note')}>Duplicate</button>
    <button className="danger" onClick={() => open('trash-note')}>Move to Trash</button>
  </Menu>
}

function NoteCard({ note, trash }) {
  const { route, world } = useWorkspace()
  const notebook = world.bookById.get(note.notebookId)
  const timestamp = trash ? note.trashedAt || note.updatedAt : note.updatedAt || note.createdAt
  return <article className="card">
    <div className="meta card-meta">
      {notebook ? <WorkspaceLink to={notebookUrl(notebook.id)}>{notebookName(notebook)}</WorkspaceLink> : <span>No notebook</span>}
      {isDate(timestamp) && <time dateTime={timestamp}>{dateLabel(timestamp)}</time>}
    </div>
    <h2><WorkspaceLink className="card-title" to={noteUrl(note.id, route.collection)}>{noteTitle(note)}</WorkspaceLink></h2>
    {text(note.content).trim() && <p className="excerpt">{note.content}</p>}
    {tagsOf(note).length > 0 && <div className="chips">{tagsOf(note).map((tag, index) =>
      <span className="chip" key={index}>{tag}</span>)}</div>}
    {!trash && <NoteActions note={note} iconOnly />}
  </article>
}

const sortByDate = (field) => (a, b) => {
  const timestamp = (note) => isDate(note[field]) ? new Date(note[field]).getTime() : -Infinity
  return timestamp(b) - timestamp(a) || noteOrder(a, b)
}

export function Notes({ notebookActions }) {
  const { go, route, world } = useWorkspace()
  const [bookFilter, setBookFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState('updatedAt')
  const trash = route.section === 'trash'
  const search = route.section === 'search'
  const scopedBook = route.notebook
  const book = !scopedBook && world.bookById.get(bookFilter)
  const tag = world.tagChoices.find((tag) => fold(tag) === tagFilter)
  const query = fold(route.query)
  const clear = () => { setBookFilter(''); setTagFilter('') }
  const notes = (trash ? world.notes.filter((note) => note.status === 'trashed') : world.liveNotes)
    .filter((note) => {
      if (trash) return true
      if (scopedBook && note.notebookId !== scopedBook.id) return false
      if (book && note.notebookId !== book.id) return false
      const tags = tagsOf(note).map(fold)
      if (tag && !tags.includes(tagFilter)) return false
      if (!search) return true
      return Boolean(query) && [fold(note.title), fold(note.content), ...tags].some((part) => part.includes(query))
    }).sort(sort === 'title' ? noteOrder : sortByDate(trash ? 'trashedAt' : sort))
  const title = trash ? 'Trash' : search ? 'Search' : scopedBook ? notebookName(scopedBook) : 'Notes'
  return <>
    <Heading title={title} count={countLabel(notes.length, 'note')}
      back={scopedBook && <WorkspaceLink className="back-link" to="/notebooks">← All notebooks</WorkspaceLink>}>
      {!trash && <>
        {!scopedBook && <select aria-label="Filter by notebook" value={book?.id || ''} onChange={(event) => setBookFilter(event.target.value)}>
          <option value="">All notebooks</option>
          {world.books.map((book) => <option key={book.id} value={book.id}>{notebookName(book)}</option>)}
        </select>}
        <select aria-label="Filter by tag" value={tag ? tagFilter : ''} onChange={(event) => setTagFilter(event.target.value)}>
          <option value="">All tags</option>
          {world.tagChoices.map((tag) => <option key={fold(tag)} value={fold(tag)}>{tag}</option>)}
        </select>
        <select aria-label="Sort notes" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updatedAt">Last edited</option><option value="createdAt">Date created</option><option value="title">Title A–Z</option>
        </select>
        {notebookActions}
      </>}
    </Heading>
    {!trash && (book || tag || query) && <div className="controls filters" aria-label="Active note filters">
      {query && <button className="chip" onClick={() => go('/search?q=')} aria-label="Clear search query">{route.query} ×</button>}
      {book && <button className="chip" onClick={() => setBookFilter('')}>{notebookName(book)} ×</button>}
      {tag && <button className="chip" onClick={() => setTagFilter('')}>{tag} ×</button>}
      {(book || tag) && <button onClick={clear}>Clear filters</button>}
    </div>}
    {notes.length ? <div className="grid">{notes.map((note) => <NoteCard key={note.id} note={note} trash={trash} />)}</div> :
      <Empty title={trash ? 'Trash is empty' : search && !query ? 'Search your notes' : book || tag || search ? 'No matching notes' : 'No notes yet'}
        symbol={trash ? 'trash' : search ? 'search' : 'notes'}>
        {trash ? <WorkspaceLink className="button" to="/notes">Back to Notes</WorkspaceLink> :
          search ? <><p>{query ? 'Try another search or reset your filters.' : 'Enter a title, phrase, or tag in the search bar.'}</p>
            {query && <button onClick={() => { clear(); go('/search?q=') }}>Reset search</button>}</> :
            book || tag ? <button onClick={clear}>Reset filters</button> : <NewNoteButton scoped={scopedBook} />}
      </Empty>}
  </>
}

export function NewNoteButton({ scoped }) {
  const { route, world, mutate, go, setDialog } = useWorkspace()
  const create = () => {
    const notebook = scoped || route.notebook || world.defaultBook
    if (!notebook) { setDialog({ kind: 'notebook-for-note' }); return }
    const id = idFor('note')
    mutate((state, stamp) => ({
      ...state, notes: [...list(state.notes), noteRecord(id, notebook.id, '', stamp)],
    }))
    go(noteUrl(id, route.section === 'trash' || route.collection === '/notebooks' || route.section === 'tasks' ? '/notes' : route.collection),
      { state: { focusTitle: id } })
  }
  return <button className="primary" onClick={create}><Symbol name="add" /> New note</button>
}

export function NoteSheet({ note, focusTitle, renderTasks }) {
  const { route, world, go, mutate, editor, setDialog } = useWorkspace()
  const initial = { title: text(note.title), content: text(note.content) }
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(false)
  const draftRef = useRef(draft)
  const title = useRef(null)
  const closeControl = useRef(null)
  const status = useRef(initial)
  const trash = note.status === 'trashed'
  const notebook = world.bookById.get(note.notebookId)
  const flush = (showFeedback = true) => {
    const next = draftRef.current
    if (trash || (next.title === status.current.title && next.content === status.current.content)) return
    const committed = mutate((state, stamp) => {
      const current = readWorld(state).noteById.get(note.id)
      if (!activeNote(current)) return state
      return { ...state, notes: replaceRecord(state.notes, note.id, { ...next, ...updated(stamp) }) }
    })
    if (committed) {
      status.current = next
      if (showFeedback) setSaved(true)
    }
  }
  useLayoutEffect(() => {
    const previous = document.activeElement
    const saveBeforeLeaving = () => flush(false)
    if (!trash) editor.current = flush
    if (focusTitle && !trash) title.current?.focus()
    else closeControl.current?.focus()
    window.addEventListener('pagehide', saveBeforeLeaving)
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeaving)
      if (editor.current === flush) editor.current = null
      saveBeforeLeaving()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [note.id, trash])
  const change = (field, value) => {
    const next = { ...draftRef.current, [field]: value }
    draftRef.current = next
    setDraft(next)
    setSaved(false)
  }
  const close = () => go(route.collection, { replace: true })
  return <Sheet label={trash ? 'Trashed note' : 'Note editor'} onClose={close} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) flush()
  }}>
    <header className="sheet-header">
      <div className="controls">
        <button className="icon-button" ref={closeControl} aria-label="Close note" onClick={close}><Symbol name="close" /></button>
        {notebook ? <WorkspaceLink className="meta" to={notebookUrl(notebook.id)}>{notebookName(notebook)}</WorkspaceLink> : <span className="meta">No notebook</span>}
      </div>
      <div className="controls">
        {trash ? <button className="primary" onClick={() => setDialog({ kind: 'restore-note', id: note.id })}>Restore</button> : <>
          {saved && <span className="chip saved" role="status">Saved</span>}
          <NoteActions note={note} />
          <button className="primary" onClick={() => flush()}>Save</button>
        </>}
      </div>
    </header>
    <div className="sheet-body">
      {trash ? <><h2 className="read-title">{noteTitle(note)}</h2><p className="read-content">{text(note.content) || 'This note is empty.'}</p></> : <>
        <label className="editor-field"><span>Title</span><input ref={title} className="title-input" placeholder="Untitled note" value={draft.title}
          onChange={(event) => change('title', event.target.value)} /></label>
        <label className="editor-field"><span>Body</span><textarea aria-label="Body" className="note-content" placeholder="Write a note…" value={draft.content}
          onChange={(event) => change('content', event.target.value)} /></label>
      </>}
      <section className="note-section">
        <div className="section-line"><h2>Tags</h2>{!trash && <button onClick={() => {
          flush()
          setDialog({ kind: 'add-tag', id: note.id })
        }}>Add tag</button>}</div>
        <div className="chips">{tagsOf(note).map((tag, index) => trash ?
          <span key={index} className="chip">{tag}</span> :
          <button key={index} className="chip" aria-label={'Remove tag ' + tag} onClick={() => {
            flush()
            mutate((state, stamp) => {
              const current = readWorld(state).noteById.get(note.id)
              if (!activeNote(current)) return state
              return { ...state, notes: replaceRecord(state.notes, note.id, {
                tags: tagsOf(current).filter((label) => fold(label) !== fold(tag)), ...updated(stamp),
              }) }
            })
          }}>{tag} ×</button>)}</div>
      </section>
      {!trash && renderTasks?.(note)}
    </div>
  </Sheet>
}
