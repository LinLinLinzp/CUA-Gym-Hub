import React, { useRef, useState } from 'react'
import { useReader } from './store.jsx'
import { changeShelving, deleteShelf, removeLibraryBook, saveShelf } from './actions.js'
import { bookName, SYSTEM_SHELVES, tagsOf } from './model.js'
import { DialogActions, FieldError, Icon, Modal } from './ui.jsx'

export const shelfName = shelf => shelf.name?.trim() || 'Untitled shelf'

export function ShelfControl({ bookId }) {
  const { bookById, shelves, entryByBook, commit } = useReader()
  const details = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const entry = entryByBook.get(bookId)
  const status = SYSTEM_SHELVES.find(shelf => shelf.id === entry?.statusShelfId)
  const name = bookName(bookById.get(bookId))
  const tags = tagsOf(entry)
  const close = () => { details.current.open = false }
  return <>
    <details className="shelf-control" ref={details} onToggle={event => setExpanded(event.currentTarget.open)} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
    }} onKeyDown={event => {
      if (event.key === 'Escape' && details.current.open) {
        close()
        details.current.querySelector('summary').focus()
      }
    }}>
      <summary className="button secondary" aria-label={`Shelf for ${name}${status ? `, ${status.name}` : ''}`}>
        <Icon name="book" /> <span>{status?.name || 'Shelf'}</span><Icon name="chevron" />
      </summary>
      {expanded && <div className="popover shelf-menu">
        <fieldset>
          <legend>Reading status</legend>
          {SYSTEM_SHELVES.map(option => <label key={option.id} className="check-option">
            <input type="radio" name={`status-${bookId}`} checked={status?.id === option.id}
              onChange={() => commit(state => changeShelving(state, [bookId], { statusShelfId: option.id }), `Moved to ${option.name}.`)} />
            {option.name}
          </label>)}
        </fieldset>
        {shelves.length > 0 && <fieldset className="custom-options">
          <legend>Custom shelves</legend>
          {shelves.map(shelf => <label key={shelf.id} className="check-option">
            <input type="checkbox" checked={tags.includes(shelf.id)} onChange={event => {
              const change = event.target.checked ? { addTag: shelf.id } : { removeTag: shelf.id }
              commit(state => changeShelving(state, [bookId], change), 'Custom shelves updated.')
            }} />
            {shelfName(shelf)}
          </label>)}
        </fieldset>}
        {entry && <button className="text-button destructive" onClick={() => setConfirm(true)}>Remove from My Books</button>}
      </div>}
    </details>
    {confirm && <Confirmation title="Remove from My Books?" submit="Remove book" onClose={() => setConfirm(false)}
      onConfirm={() => commit(state => removeLibraryBook(state, bookId), 'Book removed from My Books.')}>
      This removes <strong>{name}</strong> from your shelves and deletes your review and all your dates read for this book.
      Any of those finishes counted toward a reading challenge will be removed from its total.
    </Confirmation>}
  </>
}

export function Confirmation({ title, submit, onClose, onConfirm, children }) {
  const [error, setError] = useState(null)
  return <Modal title={title} onClose={onClose}>
    <p>{children}</p>
    <form onSubmit={event => {
      event.preventDefault()
      const problem = onConfirm()
      if (problem) setError(problem)
      else onClose()
    }}>
      <FieldError id="confirm-error">{error}</FieldError>
      <DialogActions onClose={onClose} submit={submit} destructive />
    </form>
  </Modal>
}

export function ShelfEditor({ shelf, onClose }) {
  const { commit } = useReader()
  const [name, setName] = useState(shelf?.name || '')
  const [error, setError] = useState(null)
  return <Modal title={shelf ? 'Rename shelf' : 'New shelf'} onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault()
      const problem = commit(state => saveShelf(state, shelf?.id, name), shelf ? 'Shelf renamed.' : 'Shelf created.')
      if (problem) setError(problem)
      else onClose()
    }}>
      <div className="field">
        <label htmlFor="shelf-name">Shelf name</label>
        <input id="shelf-name" data-initial-focus value={name} onChange={event => { setName(event.target.value); setError(null) }}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'shelf-name-error' : undefined} />
        <FieldError id="shelf-name-error">{error}</FieldError>
      </div>
      <DialogActions onClose={onClose} submit={shelf ? 'Save name' : 'Create shelf'} />
    </form>
  </Modal>
}

export function ShelfDeletion({ shelf, onClose, onDeleted }) {
  const { commit } = useReader()
  return <Confirmation title="Delete custom shelf?" submit="Delete shelf" onClose={onClose} onConfirm={() => {
    const problem = commit(state => deleteShelf(state, shelf.id), 'Shelf deleted.')
    if (!problem) onDeleted()
    return problem
  }}>
    Deleting <strong>{shelfName(shelf)}</strong> removes its tag from your books. Those books stay in My Books.
  </Confirmation>
}

