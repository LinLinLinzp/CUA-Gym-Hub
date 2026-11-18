import { useState } from 'react'
import { activeNote, countLabel, createNotebook, deleted, fold, idFor, list, notebookName, readWorld,
  replaceRecord, setPreferences, trashed, updated, validateNotebookName } from './model.js'
import { notebookUrl, useWorkspace, WorkspaceLink } from './navigation.jsx'
import { Dialog, Empty, Heading, Menu, Symbol } from './ui.jsx'

const accents = ['#668272', '#ad8351', '#809277', '#9c7471', '#6c8890', '#a39361']

export function NewNotebookButton() {
  const { setDialog } = useWorkspace()
  return <button onClick={() => setDialog({ kind: 'new-notebook' })}><Symbol name="add" /> New notebook</button>
}

export function Notebooks() {
  const { world } = useWorkspace()
  const [query, setQuery] = useState('')
  const visible = world.books.filter((book) => fold(notebookName(book)).includes(fold(query)))
  return <>
    <Heading title="Notebooks" count={countLabel(visible.length, 'notebook')}>
      <input type="search" aria-label="Find notebooks" placeholder="Find notebooks" value={query} onChange={(event) => setQuery(event.target.value)} />
    </Heading>
    {visible.length ? <div className="grid">{visible.map((book, index) =>
      <article className="card notebook-card" style={{ '--accent': accents[index % accents.length] }} key={book.id}>
        <h2><WorkspaceLink className="card-title" to={notebookUrl(book.id)}>{notebookName(book)}</WorkspaceLink></h2>
        <div className="meta">{countLabel(world.noteCounts.get(book.id) || 0, 'note')}</div>
        {world.defaultBook?.id === book.id && <div className="chips"><span className="chip">Default</span></div>}
      </article>)}</div> :
      <Empty title={fold(query) ? 'No matching notebooks' : 'No notebooks yet'} symbol="notebooks">
        {fold(query) ? <button onClick={() => setQuery('')}>Clear search</button> : <NewNotebookButton />}
      </Empty>}
  </>
}

export function NotebookActions({ book }) {
  const { setDialog, world, mutate, notice } = useWorkspace()
  const isDefault = world.defaultBook?.id === book.id
  return <Menu label="Notebook actions">
    <button onClick={() => setDialog({ kind: 'rename-notebook', id: book.id })}>Rename</button>
    <button disabled={isDefault && world.defaultBook.id === world.configuredNotebookId} onClick={() => {
      if (mutate((state, stamp) => {
        if (state.preferences?.defaultNotebookId === book.id) return state
        return { ...state, preferences: setPreferences(state, { defaultNotebookId: book.id }, stamp) }
      })) notice('Default notebook updated')
    }}>Set as default</button>
    <button className="danger" onClick={() => setDialog({ kind: isDefault ? 'protect-notebook' : 'delete-notebook', id: book.id })}>Delete notebook</button>
  </Menu>
}

export function NotebookNameDialog({ title, label = 'Notebook name', initial = '', excludeId, submitLabel, onSubmit, children }) {
  const { world, setDialog } = useWorkspace()
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  const cancel = () => setDialog(null)
  return <Dialog title={title} onClose={cancel}>
    {children}
    <form onSubmit={(event) => {
      event.preventDefault()
      const failure = validateNotebookName(name, world.books, excludeId)
      if (failure) { setError(failure); return }
      onSubmit(name.trim())
    }}>
      <label className="editor-field"><span>{label}</span><input data-initial-focus value={name}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined}
        onChange={(event) => { setName(event.target.value); setError('') }} /></label>
      {error && <p id="name-error" className="field-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={cancel}>Cancel</button><button className="primary">{submitLabel}</button></div>
    </form>
  </Dialog>
}

export function Confirm({ title, label, onConfirm, children, danger = true }) {
  const { setDialog } = useWorkspace()
  const cancel = () => setDialog(null)
  return <Dialog title={title} onClose={cancel}>
    {children}
    <div className="dialog-actions">
      <button data-initial-focus onClick={cancel}>Cancel</button>
      <button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{label}</button>
    </div>
  </Dialog>
}

export function NotebookDialog({ kind, id }) {
  const { world, mutate, go, setDialog, notice } = useWorkspace()
  const book = world.bookById.get(id)
  const close = () => setDialog(null)
  if (kind === 'new-notebook') {
    return <NotebookNameDialog title="New notebook" submitLabel="Create notebook" onSubmit={(name) => {
      const newId = idFor('nb')
      mutate((state, stamp) => createNotebook(state, newId, name, stamp))
      close()
      go(notebookUrl(newId))
      notice('Notebook created')
    }} />
  }
  if (!book) return null
  if (kind === 'rename-notebook') {
    return <NotebookNameDialog title="Rename notebook" submitLabel="Save name" excludeId={id} initial={notebookName(book)} onSubmit={(name) => {
      const changed = mutate((state, stamp) => book.name === name ? state : {
        ...state, notebooks: replaceRecord(state.notebooks, id, { name, ...updated(stamp) }),
      })
      close()
      if (changed) notice('Notebook renamed')
    }} />
  }
  if (kind === 'protect-notebook') {
    const alternatives = world.books.filter((candidate) => candidate.id !== id)
    return <Dialog title="Choose another default notebook" onClose={close}>
      <p>{notebookName(book)} is the default notebook. Choose a different default before deleting it.</p>
      {alternatives.length ? <div className="picker" aria-label="Other notebooks">{alternatives.map((candidate) =>
        <button key={candidate.id} onClick={() => {
          mutate((state, stamp) => ({ ...state, preferences: setPreferences(state, { defaultNotebookId: candidate.id }, stamp) }))
          close()
          notice('Default notebook updated')
        }}>{notebookName(candidate)}</button>)}</div> : <p>Create another notebook to use as your default.</p>}
      <div className="dialog-actions">
        <button data-initial-focus onClick={close}>Cancel</button>
        {!alternatives.length && <button className="primary" onClick={() => setDialog({ kind: 'new-notebook' })}>New notebook</button>}
      </div>
    </Dialog>
  }
  const count = world.noteCounts.get(id) || 0
  return <Confirm title="Delete notebook?" label="Delete notebook" onConfirm={() => {
    const changed = mutate((state, stamp) => {
      const current = readWorld(state)
      if (!current.bookById.has(id) || current.defaultBook?.id === id) return state
      return {
        ...state,
        notebooks: replaceRecord(state.notebooks, id, deleted(stamp)),
        notes: list(state.notes).map((note) => note?.notebookId === id && activeNote(note) ? { ...note, ...trashed(stamp) } : note),
      }
    })
    close()
    if (changed) { go('/notebooks'); notice('Notebook deleted') }
  }}><p><strong>{notebookName(book)}</strong> will be deleted and {countLabel(count, 'active note')} will move to Trash.</p></Confirm>
}
