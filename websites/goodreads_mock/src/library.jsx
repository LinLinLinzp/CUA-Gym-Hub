import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReader } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { authorName, bookName, displayDate, matchesBook, READ, SYSTEM_SHELVES, tagsOf } from './model.js'
import { changeShelving } from './actions.js'
import { bookPath, Cover, Empty, Heading, Icon, SiteLink } from './ui.jsx'
import { ShelfControl, ShelfDeletion, ShelfEditor, shelfName } from './shelves.jsx'

const libraryPath = id => id ? `/my-books?shelf=${encodeURIComponent(id)}` : '/my-books'

function ShelfBar({ selected, onRename, onDelete }) {
  const { shelves, entries } = useReader()
  const counts = new Map()
  for (const entry of entries) {
    for (const id of new Set([entry.statusShelfId, ...tagsOf(entry)])) counts.set(id, (counts.get(id) || 0) + 1)
  }
  const customSelected = shelves.find(shelf => shelf.id === selected)
  return <nav className="shelf-bar" aria-label="Bookshelves">
    <div className="shelf-tabs">
      {[{ id: '', name: 'All Books' }, ...SYSTEM_SHELVES].map(shelf =>
        <SiteLink key={shelf.id} to={libraryPath(shelf.id)} aria-current={selected === shelf.id ? 'page' : undefined}>
          {shelf.name} <span className="count">{shelf.id ? counts.get(shelf.id) || 0 : entries.length}</span>
        </SiteLink>)}
    </div>
    <details className="custom-shelves" open={customSelected ? true : undefined}>
      <summary>Custom shelves <span className="count">{shelves.length}</span><Icon name="chevron" /></summary>
      {shelves.length ? <ul className="custom-grid">{shelves.map(shelf =>
        <li key={shelf.id}>
          <SiteLink to={libraryPath(shelf.id)} aria-current={selected === shelf.id ? 'page' : undefined}>
            {shelfName(shelf)} <span className="count">{counts.get(shelf.id) || 0}</span>
          </SiteLink>
          <details className="shelf-tools" onBlur={event => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
          }}>
            <summary className="icon-button" aria-label={`Manage ${shelfName(shelf)}`}><Icon name="more" /></summary>
            <div className="popover">
              <button className="text-button" onClick={() => onRename(shelf)}>Rename</button>
              <button className="text-button destructive" onClick={() => onDelete(shelf)}>Delete</button>
            </div>
          </details>
        </li>)}</ul> : <p className="muted custom-empty">You haven’t created a custom shelf yet.</p>}
    </details>
  </nav>
}

function BookCard({ book, bookId, latest, onAddDate, selection }) {
  return <article className="book-card">
    <SiteLink to={bookPath(bookId)} className="card-cover-link" tabIndex={-1} aria-hidden="true"><Cover book={book} /></SiteLink>
    {selection && <label className="card-select"><input type="checkbox" checked={selection.checked} onChange={selection.toggle} />
      <span className="sr-only">Select {bookName(book)}</span>
    </label>}
    <div className="card-body">
      <h3><SiteLink to={bookPath(bookId)}>{bookName(book)}</SiteLink></h3>
      <p className="muted">{authorName(book)}</p>
      <div className="card-actions">
        <ShelfControl bookId={bookId} />
        {onAddDate && <button className="text-button date-action" aria-label={latest ? `Manage dates read for ${bookName(book)}` : undefined} onClick={onAddDate}>
          <Icon name="calendar" />{latest ? displayDate(latest) : 'Add date read'}
        </button>}
      </div>
    </div>
  </article>
}

export function Library({ onDate }) {
  const { bookById, entries, shelves, logsByBook } = useReader()
  const navigate = useNavigate()
  const [queryParams] = useSearchParams()
  const requested = queryParams.get('shelf') || ''
  const activeShelf = [...SYSTEM_SHELVES, ...shelves].find(shelf => shelf.id === requested)
  const selected = activeShelf?.id || ''
  return <ShelfLibrary key={selected} {...{ bookById, entries, shelves, logsByBook, selected, activeShelf, onDate }}
    missing={Boolean(requested && !activeShelf)} onDeleted={id => {
      if (id === selected) navigate(withSid(libraryPath()), { replace: true })
    }} />
}

function ShelfLibrary({ bookById, entries, shelves, logsByBook, selected, activeShelf, onDate, missing, onDeleted }) {
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('added')
  const [dialog, setDialog] = useState(null)
  const visible = useMemo(() => {
    const latest = id => logsByBook.get(id)?.[0]?.finishedOn || ''
    const title = entry => bookName(bookById.get(entry.bookId))
    const comparators = {
      title: (a, b) => title(a).localeCompare(title(b)),
      added: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      read: (a, b) => latest(b.bookId).localeCompare(latest(a.bookId)),
    }
    return entries.filter(entry => (
      (!selected || entry.statusShelfId === selected || tagsOf(entry).includes(selected)) &&
      matchesBook(bookById.get(entry.bookId), filter)
    )).sort((a, b) => comparators[sort](a, b) || title(a).localeCompare(title(b)))
  }, [bookById, entries, filter, logsByBook, selected, sort])
  const close = () => setDialog(null)
  return <>
    <Heading title={activeShelf ? shelfName(activeShelf) : 'My Books'}>
      <button className="button" onClick={() => setDialog({ type: 'create' })}><Icon name="plus" /> New shelf</button>
    </Heading>
    <ShelfBar selected={selected} onRename={shelf => setDialog({ type: 'rename', shelf })} onDelete={shelf => setDialog({ type: 'delete', shelf })} />
    {missing && <p className="banner" role="status">That shelf couldn’t be found. Showing All Books.</p>}
    <div className="library-controls">
      <div className="library-filter">
        <label className="sr-only" htmlFor="library-filter">Search My Books</label>
        <Icon name="search" />
        <input id="library-filter" type="search" placeholder="Filter by title or author" value={filter} onChange={event => setFilter(event.target.value)} />
      </div>
      <div className="library-sort">
        <label htmlFor="library-sort">Sort by</label>
        <select id="library-sort" value={sort} onChange={event => setSort(event.target.value)}>
          <option value="added">Recently added</option><option value="title">Title</option><option value="read">Date read</option>
        </select>
      </div>
    </div>
    <LibraryGrid entries={visible} {...{ bookById, shelves, logsByBook, onDate }} />
    {dialog?.type === 'create' && <ShelfEditor onClose={close} />}
    {dialog?.type === 'rename' && <ShelfEditor shelf={dialog.shelf} onClose={close} />}
    {dialog?.type === 'delete' && <ShelfDeletion shelf={dialog.shelf} onClose={close} onDeleted={() => onDeleted(dialog.shelf.id)} />}
  </>
}

const bookCount = count => `${count} ${count === 1 ? 'book' : 'books'}`

function LibraryGrid({ entries, bookById, logsByBook, shelves, onDate }) {
  const { commit } = useReader()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [tag, setTag] = useState('')
  const [operation, setOperation] = useState('addTag')
  const visibleIds = entries.map(entry => entry.bookId)
  const visibleSet = new Set(visibleIds)
  const checkedIds = selected.filter(id => visibleSet.has(id))
  const checkedSet = new Set(checkedIds)
  const tagExists = shelves.some(shelf => shelf.id === tag)
  const toggle = id => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])
  return <>
    <div className="results-heading">
      <p className="results-count" role="status">{bookCount(entries.length)}</p>
      {shelves.length > 0 && entries.length > 0 && <button className="text-button" aria-pressed={selectMode} onClick={() => {
        setSelectMode(!selectMode)
        setSelected([])
      }}>{selectMode ? 'Cancel selection' : 'Select books'}</button>}
    </div>
    {selectMode && shelves.length > 0 && entries.length > 0 &&
      <form className="bulk-toolbar" onSubmit={event => {
        event.preventDefault()
        const problem = commit(state => changeShelving(state, checkedIds, { [operation]: tag }), 'Selected books updated.')
        if (!problem) { setSelected([]); setSelectMode(false) }
      }}>
        <label className="check-option"><input type="checkbox" checked={checkedIds.length === entries.length}
          onChange={event => setSelected(event.target.checked ? visibleIds : [])} /> Select all visible</label>
        <span>{checkedIds.length} selected</span>
        <label className="sr-only" htmlFor="bulk-operation">Shelf action</label>
        <select id="bulk-operation" value={operation} onChange={event => setOperation(event.target.value)}>
          <option value="addTag">Add to shelf</option><option value="removeTag">Remove from shelf</option>
        </select>
        <label className="sr-only" htmlFor="bulk-shelf">Custom shelf</label>
        <select id="bulk-shelf" value={tagExists ? tag : ''} onChange={event => setTag(event.target.value)}>
          <option value="">Choose a shelf</option>
          {shelves.map(shelf => <option key={shelf.id} value={shelf.id}>{shelfName(shelf)}</option>)}
        </select>
        <button className="button" disabled={!checkedIds.length || !tagExists}>Apply to selected</button>
      </form>}
    {entries.length ? <div className="book-grid">{entries.map(entry => {
      const { bookId } = entry
      const book = bookById.get(bookId)
      const logs = logsByBook.get(bookId)
      return <BookCard key={entry.id} {...{ book, bookId }} latest={logs?.[0]?.finishedOn}
        selection={selectMode ? { checked: checkedSet.has(bookId), toggle: () => toggle(bookId) } : null}
        onAddDate={logs || (book && entry.statusShelfId === READ) ? () => onDate({ bookId, manage: Boolean(logs) }) : undefined} />
    })}</div>
      : <Empty title="No books here"><p>Try another search or find a book in the catalog.</p></Empty>}
  </>
}

export function Catalog({ query }) {
  const { books } = useReader()
  const results = books.filter(book => matchesBook(book, query))
  return <>
    <Heading title="Catalog search" description={query ? `Results for “${query}”` : 'Browse books and authors.'} />
    <p className="results-count" role="status">{bookCount(results.length)}</p>
    {results.length ? <div className="book-grid">{results.map(book => <BookCard key={book.id} book={book} bookId={book.id} />)}</div>
      : <Empty title="No books found"><p>Try another title or author.</p></Empty>}
  </>
}

