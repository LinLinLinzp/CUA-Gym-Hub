import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { active, byName, creatorName, creatorsOf, itemTypes, newId, records, values, writable } from '../utils/model.js'
import { Dialog, FormActions, Tile } from './ui.jsx'

const metadata = {
  publicationTitle: 'Publication', publisher: 'Publisher', place: 'Place',
  volume: 'Volume', issue: 'Issue', pages: 'Pages', DOI: 'DOI', ISBN: 'ISBN', url: 'URL',
}
const typeFields = {
  journalArticle: ['publicationTitle', 'volume', 'issue', 'pages', 'DOI', 'url'],
  book: ['publisher', 'place', 'ISBN', 'url'],
  report: ['publisher', 'place', 'pages', 'DOI', 'url'],
  webpage: ['publicationTitle', 'url'],
}
const person = () => ({ creatorType: 'author', firstName: '', lastName: '' })

function CreatorEditor({ creators, setCreators }) {
  function update(index, change) {
    setCreators(creators.map((creator, i) => index === i ? { ...creator, ...change } : creator))
  }
  return <fieldset className="creators-field">
    <legend>Creators <span className="optional">(optional)</span></legend>
    {creators.map((creator, index) => <div className="creator-fields" key={index}>
      <label>Role<select aria-label="Role" value={creator.creatorType || 'author'} onChange={(event) => update(index, { creatorType: event.target.value })}>
        <option value="author">Author</option><option value="editor">Editor</option><option value="translator">Translator</option>
        {!['author', 'editor', 'translator', undefined, ''].includes(creator.creatorType) && <option>{creator.creatorType}</option>}
      </select></label>
      <label>Creator type<select aria-label="Creator type" value={Object.hasOwn(creator, 'name') ? 'organization' : 'person'} onChange={(event) => {
        const next = event.target.value === 'organization'
          ? { creatorType: creator.creatorType, name: creatorName(creator) }
          : { creatorType: creator.creatorType, firstName: '', lastName: creator.name ?? '' }
        setCreators(creators.map((entry, i) => i === index ? next : entry))
      }}><option value="person">Person</option><option value="organization">Organization</option></select></label>
      {Object.hasOwn(creator, 'name')
        ? <label className="creator-org">Organization<input value={creator.name ?? ''} onChange={(event) => update(index, { name: event.target.value })} /></label>
        : <>
          <label>First name<input value={creator.firstName ?? ''} onChange={(event) => update(index, { firstName: event.target.value })} /></label>
          <label>Last name<input value={creator.lastName ?? ''} onChange={(event) => update(index, { lastName: event.target.value })} /></label>
        </>}
      <button type="button" className="icon-button" aria-label={'Remove creator ' + (index + 1)} onClick={() => setCreators(creators.filter((_, i) => i !== index))}>×</button>
    </div>)}
    <button className="small" type="button" onClick={() => setCreators([...creators, person()])}>＋ Add creator</button>
  </fieldset>
}

function cleanCreators(creators) {
  return creators.map((creator) => {
    const creatorType = creator.creatorType || 'author'
    return Object.hasOwn(creator, 'name')
      ? { creatorType, name: String(creator.name ?? '').trim() }
      : { creatorType, firstName: String(creator.firstName ?? '').trim(), lastName: String(creator.lastName ?? '').trim() }
  }).filter((creator) => creator.name || creator.firstName || creator.lastName)
}

export function ItemForm({ libraryId, item, collection, close, onCreated }) {
  const { commit, announce } = useStore()
  const [draft, setDraft] = useState(() => ({
    ...Object.fromEntries(Object.keys(metadata).map((key) => [key, item?.[key] ?? ''])),
    title: item?.title ?? '', itemType: Object.hasOwn(itemTypes, item?.itemType) ? item.itemType : 'journalArticle',
    date: item?.date ?? '', abstractNote: item?.abstractNote ?? '', tags: values(item?.tags).join(', '),
  }))
  const [creators, setCreators] = useState(() => item ? records(item.creators) : [person()])
  const [error, setError] = useState(null)
  const update = (name, value) => {
    setDraft((previous) => ({ ...previous, [name]: value }))
    if (error?.field === name) setError(null)
  }
  function submit(event) {
    event.preventDefault()
    const title = draft.title.trim()
    const date = String(draft.date).trim()
    let issue = !title ? { field: 'title', text: 'Enter a reference title.' } : null
    if (!issue && date) {
      const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date)
      const iso = (date + (date.length === 4 ? '-01-01' : date.length === 7 ? '-01' : ''))
      const parsed = new Date(iso)
      if (!match || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== iso) {
        issue = { field: 'date', text: 'Enter a valid date as YYYY, YYYY-MM, or YYYY-MM-DD.' }
      }
    }
    if (issue) {
      setError(issue)
      event.currentTarget.elements[issue.field].focus()
      return
    }
    const cleaned = Object.fromEntries(Object.keys(metadata).map((key) => [
      key, typeFields[draft.itemType].includes(key) || item?.itemType === draft.itemType ? String(draft[key]).trim() : '',
    ]))
    const id = item?.id ?? newId('item')
    const changed = commit((state, audit, createdAt) => {
      if (!writable(records(state.libraries).find((entry) => entry.id === libraryId))) return state
      const items = records(state.items)
      const fields = {
        ...cleaned, title, date, itemType: draft.itemType, creators: cleanCreators(creators),
        tags: [...new Set(draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean))],
        abstractNote: draft.abstractNote.trim(), ...audit,
      }
      if (item) {
        if (!items.some((entry) => entry.id === id && entry.libraryId === libraryId && active(entry))) return state
        return { ...state, items: items.map((entry) => entry.id === id && entry.libraryId === libraryId ? { ...entry, ...fields } : entry) }
      }
      const filed = collection && records(state.collections).some((entry) => entry.id === collection.id && entry.libraryId === libraryId && active(entry))
      return { ...state, items: [...items, {
        id, libraryId, collectionIds: filed ? [collection.id] : [], status: 'active', trashedAt: null, createdAt, ...fields,
      }] }
    })
    if (!changed) {
      setError({ text: 'This reference is no longer editable.' })
      return
    }
    close()
    if (!item) onCreated(id)
    announce({ text: item ? 'Reference updated.' : 'Reference added.' })
  }
  const input = (name, placeholder) => <input name={name} value={draft[name]} placeholder={placeholder}
    aria-invalid={error?.field === name} aria-describedby={error?.field === name ? 'item-error' : undefined}
    onChange={(event) => update(name, event.target.value)} required={name === 'title'} data-initial-focus={name === 'title' || undefined} />

  return <Dialog title={item ? 'Edit reference' : 'New item'} close={close} wide>
    <form className="form" onSubmit={submit} noValidate>
      {!item && collection && <p className="muted">Filing in {collection.name}.</p>}
      <label>Title{input('title')}</label>
      {error?.field === 'title' && <p id="item-error" className="field-error" role="alert">{error.text}</p>}
      <div className="form-grid">
        <label>Item type<select aria-label="Item type" value={draft.itemType} onChange={(event) => update('itemType', event.target.value)}>
          {Object.entries(itemTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Date {input('date', 'YYYY or YYYY-MM-DD')}</label>
      </div>
      {error?.field === 'date' && <p id="item-error" className="field-error" role="alert">{error.text}</p>}
      <CreatorEditor creators={creators} setCreators={setCreators} />
      <div className="form-grid">{typeFields[draft.itemType].map((key) => <label key={key}>{key === 'publicationTitle' && draft.itemType === 'webpage' ? 'Website title' : metadata[key]}{input(key)}</label>)}</div>
      <label>Tags {input('tags', 'Separate tags with commas')}</label>
      <label>Abstract<textarea rows={3} value={draft.abstractNote} onChange={(event) => update('abstractNote', event.target.value)} /></label>
      {error && !error.field && <p className="field-error" role="alert">{error.text}</p>}
      <FormActions close={close} submit={item ? 'Save changes' : 'Add item'} />
    </form>
  </Dialog>
}

export function ItemDetails({ item, collections, library, currentCollection, close, onAction }) {
  const closeButton = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  const memberships = collections.filter((collection) => values(item.collectionIds).includes(collection.id))
  const editable = writable(library)
  const trashed = item.status === 'trashed'
  return <aside className="drawer" aria-label="Reference details" onKeyDown={(event) => {
    if (event.key === 'Escape') close()
  }}>
    <div className="drawer-head"><h2>Reference details</h2><button ref={closeButton} className="icon-button" aria-label="Close details" onClick={close}>×</button></div>
    <div className="drawer-body">
      <div className="detail-type"><Tile type={item.itemType} />{itemTypes[item.itemType] ?? 'Reference'}</div>
      <h3>{item.title || 'Untitled reference'}</h3>
      <p className="muted">{creatorsOf(item) || 'No creators listed'}</p>
      {trashed && <p className="warning">In Trash</p>}
      <div className="detail-actions">
        {!trashed && <button className="primary" onClick={() => onAction('cite')}>Cite</button>}
        {!trashed && editable && <button onClick={() => onAction('editItem')}>Edit</button>}
        {trashed && editable && <button className="primary" onClick={() => onAction('restore')}>Restore</button>}
      </div>
      <dl className="metadata">
        {Object.entries({ date: 'Date', ...metadata }).filter(([key]) => item[key]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{item[key]}</dd></div>)}
      </dl>
      {item.abstractNote && <section><h4>Abstract</h4><p>{item.abstractNote}</p></section>}
      {values(item.tags).length > 0 && <section><h4>Tags</h4><div className="tags">{values(item.tags).map((tag, index) => <span key={index}>{tag}</span>)}</div></section>}
      <section><h4>Collections</h4>
        {memberships.length ? <ul className="detail-collections">{memberships.map((collection) => <li key={collection.id}>{collection.name}</li>)}</ul> : <p className="muted">Unfiled</p>}
        {!trashed && editable && <div className="detail-actions">
          <button className="small" onClick={() => onAction('membership')}>Add to Collection</button>
          {currentCollection && values(item.collectionIds).includes(currentCollection.id) && <button className="small" onClick={() => onAction('removeMembership')}>Remove from Collection</button>}
        </div>}
      </section>
      {!trashed && editable && <button className="text-danger" onClick={() => onAction('trash')}>Move to Trash</button>}
    </div>
  </aside>
}

export function CopyItemsForm({ items, libraryId, destinations, close }) {
  const { commit, announce } = useStore()
  const [destinationId, setDestinationId] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const selected = new Set(items.map((item) => item.id))
    let copied = 0
    const changed = commit((state, audit, createdAt) => {
      const destination = records(state.libraries).find((library) => library.id === destinationId)
      if (!writable(destination) || destination.kind !== 'group' || destinationId === libraryId) return state
      const all = records(state.items)
      const copies = all.filter((item) => item.libraryId === libraryId && active(item) && selected.has(item.id)).map((item) => ({
        ...item, id: newId('item'), sourceItemId: item.id, libraryId: destinationId, collectionIds: [],
        status: 'active', trashedAt: null, createdAt, ...audit,
      }))
      copied = copies.length
      return copied > 0 ? { ...state, items: [...all, ...copies] } : state
    })
    if (!changed) {
      setError('The destination or selected references are no longer available.')
      return
    }
    close()
    announce({ text: copied + (copied === 1 ? ' reference copied.' : ' references copied.') })
  }

  return <Dialog title="Copy to Group Library" close={close}>
    <form className="form" onSubmit={submit}>
      <p>Copy {items.length === 1 ? 'the selected reference' : items.length + ' selected references'} to another library. The copies will appear in Unfiled.</p>
      <label>Destination library<select data-initial-focus aria-label="Destination library" value={destinationId} required
        onChange={(event) => { setDestinationId(event.target.value); setError('') }}>
        <option value="" disabled>Choose a group library</option>
        {[...destinations].sort(byName).map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}
      </select></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!destinationId}>Copy references</button></div>
    </form>
  </Dialog>
}
