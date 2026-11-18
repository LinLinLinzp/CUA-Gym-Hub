import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { dateLabel, isFuture, matchesTitle, recent, titleName } from './catalog.js'
import { useAccount } from './store.jsx'
import { Poster, SearchField, TitleMeta, Visibility, titleCount } from './ui.jsx'

export function Dialog({ title, close, children }) {
  const node = useRef(null)
  const opener = useRef(null)
  useEffect(() => {
    const dialog = node.current
    opener.current = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener.current?.isConnected) opener.current.focus()
    }
  }, [])
  return <dialog ref={node} className="dialog" aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2>
      <button type="button" className="button icon-button" onClick={close} aria-label="Close dialog"><X size={19} /></button>
    </div>
    {children}
  </dialog>
}

export function RatingDialog({ titleId, ratingId, close }) {
  const { titleById, ratingByTitle, ratings, dispatch } = useAccount()
  const title = titleById.get(titleId)
  const rating = ratingId ? ratings.find((row) => row.id === ratingId) : ratingByTitle.get(titleId)
  const [value, setValue] = useState(rating?.value ?? null)
  const canRate = title && !isFuture(title)
  function save(event) {
    event.preventDefault()
    if (!canRate || !Number.isInteger(value)) return
    dispatch({ type: 'rating.set', titleId, membershipId: ratingId, value })
    close()
  }

  return <Dialog title={rating ? 'Edit your rating' : 'Rate title'} close={close}>
    <p className="dialog-intro">{titleName(title)}</p>
    <form onSubmit={save}>
      {canRate && <fieldset className="rating-field">
        <legend>Your rating out of 10</legend>
        <div className="score-picker">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <label className="score-option" key={number}>
            <input type="radio" name="score" value={number} checked={value === number} onChange={() => setValue(number)} />
            <span>{number}</span>
          </label>)}
        </div>
      </fieldset>}
      {!canRate && <p className="meta">{title ? 'Ratings open on the release date.' : 'This title is unavailable in the catalog.'}</p>}
      <div className="dialog-actions">
        {rating && <button type="button" className="button danger separate" onClick={() => {
          dispatch({ type: 'rating.remove', titleId, membershipId: rating.id }); close()
        }}>Remove rating</button>}
        <button type="button" className="button" onClick={close}>Cancel</button>
        {canRate && <button className="button primary" disabled={!Number.isInteger(value)} type="submit">Save rating</button>}
      </div>
    </form>
  </Dialog>
}

export function ListForm({ list, close, onCreate }) {
  const { dispatch } = useAccount()
  const [name, setName] = useState(list?.name ?? '')
  const [description, setDescription] = useState(list?.description ?? '')
  const [visibility, setVisibility] = useState(list?.visibility ?? 'private')
  const [error, setError] = useState('')
  const nameInput = useRef(null)

  function save(event) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a list name.')
      nameInput.current.focus()
      return
    }
    const id = dispatch({ type: list ? 'list.edit' : 'list.create', listId: list?.id, name, description, visibility })
    close()
    if (id && !list) onCreate(id)
  }

  return <Dialog title={list ? 'Edit list details' : 'Create a list'} close={close}>
    <form className="stack" onSubmit={save} noValidate>
      <label className="field"><span>List name</span>
        <input ref={nameInput} value={name} onChange={(event) => { setName(event.target.value); setError('') }}
          maxLength={255} required aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined} />
        {error && <span id="name-error" className="error" role="alert">{error}</span>}
      </label>
      <label className="field"><span>Description <small>(optional)</small></span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={10000} />
      </label>
      <Visibility value={visibility} onChange={setVisibility} />
      <div className="dialog-actions"><button type="button" className="button" onClick={close}>Cancel</button>
        <button className="button primary" type="submit">{list ? 'Save details' : 'Create list'}</button>
      </div>
    </form>
  </Dialog>
}

export function DeleteList({ list, close, onDelete }) {
  const { dispatch } = useAccount()
  const name = list.name || 'Untitled list'
  return <Dialog title="Delete list" close={close}>
    <p>Delete <strong>{name}</strong> and all of its title memberships?</p>
    <div className="dialog-actions">
      <button type="button" className="button" onClick={close}>Cancel</button>
      <button type="button" className="button destructive" onClick={() => {
        const id = dispatch({ type: 'list.delete', listId: list.id })
        close()
        if (id) onDelete()
      }}>Delete list</button>
    </div>
  </Dialog>
}

export function TitlePicker({ list, close }) {
  const { titles, listItems, dispatch } = useAccount()
  const [query, setQuery] = useState('')
  const items = listItems.get(list.id) || []
  const included = new Set(items.map((row) => row.titleId))
  const matches = titles.filter((title) => matchesTitle(title, query))
  const [notice, setNotice] = useState('')
  return <Dialog title="Add titles" close={close}>
    <p className="dialog-intro">{list.name || 'Untitled list'}</p>
    <SearchField label="Find a title" value={query} onChange={setQuery} placeholder="Title or catalog ID" />
    <p className="picker-count" aria-live="polite">{titleCount(matches.length)}{notice && ' · ' + notice}</p>
    <ul className="picker-list">{matches.map((title) => <li key={title.id}>
      <Poster title={title} /><div className="row-copy"><strong>{titleName(title)}</strong><TitleMeta title={title} /></div>
      <button type="button" className={'button' + (included.has(title.id) ? ' selected' : '')} disabled={included.has(title.id)}
        aria-label={(included.has(title.id) ? 'Added ' : 'Add ') + titleName(title)} onClick={() => {
          if (dispatch({ type: 'list.item.add', listId: list.id, titleId: title.id })) setNotice(titleName(title) + ' added')
        }}>{included.has(title.id) ? <><Check size={15} />Added</> : <><Plus size={15} />Add</>}</button>
    </li>)}</ul>
    {matches.length === 0 && <p className="meta">No matching titles.</p>}
    <div className="dialog-actions"><button type="button" className="button primary" onClick={close}>Done</button></div>
  </Dialog>
}

export function ListPicker({ titleId, close, create }) {
  const { lists, listItems, titleById, dispatch } = useAccount()
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const matches = [...lists].sort(recent).filter((list) => (list.name || '').toLowerCase().includes(query.trim().toLowerCase()))
  return <Dialog title="Add to list" close={close}>
    <p className="dialog-intro">{titleName(titleById.get(titleId))}</p>
    {lists.length > 0 && <SearchField label="Find a list" value={query} onChange={setQuery} placeholder="List name" />}
    <p className="sr-only" aria-live="polite">{notice}</p>
    <ul className="picker-list">{matches.map((list) => {
      const items = listItems.get(list.id) || []
      const included = items.some((row) => row.titleId === titleId)
      const name = list.name || 'Untitled list'
      return <li key={list.id}><div className="row-copy"><strong>{name}</strong>
        <span className="meta">{titleCount(items.length)} · Updated {dateLabel(list.updatedAt)}</span></div>
        <button type="button" className={'button' + (included ? ' selected' : '')} disabled={included}
          aria-label={(included ? 'Added to ' : 'Add to ') + name} onClick={() => {
            if (dispatch({ type: 'list.item.add', listId: list.id, titleId })) setNotice('Added to ' + name)
          }}>{included ? <><Check size={15} />Added</> : <><Plus size={15} />Add</>}</button></li>
    })}</ul>
    {matches.length === 0 && <p className="meta">{lists.length ? 'No matching lists.' : 'You have no title lists yet.'}</p>}
    <div className="dialog-actions">
      <button type="button" className="button separate" onClick={create}><Plus size={16} />Create list</button>
      <button type="button" className="button primary" onClick={close}>Done</button>
    </div>
  </Dialog>
}
