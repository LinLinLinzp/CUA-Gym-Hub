import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { activeCollections, actor, append, businessName, collectionName, compareCreated, displayDate, find, matches, newId, saved, stamp, update } from '../model.js'
import { useWorld } from '../store.jsx'
import { BusinessLink, Confirm, Dialog, Empty, Field, Heading, Row, SiteLink, Status, subPath } from '../ui.jsx'

const defaultName = 'Want to go'
const normalized = name => String(name || '').trim().toLowerCase()
const defaultCollection = collections => collections.find(item => normalized(item.name) === normalized(defaultName))
const createCollection = (world, name, time) => ({
  id: newId('col'), userId: world.currentUserId, name, status: 'active', createdAt: time,
})

function CollectionFields({ onCreate, onCancel }) {
  const { mutate } = useWorld()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a collection name.')
    let created
    if (mutate(world => {
      if (!actor(world) || activeCollections(world).some(item => normalized(item.name) === normalized(trimmed))) return
      created = createCollection(world, trimmed, stamp())
      return append(world, 'collections', created)
    }, 'Collection created.')) onCreate(created)
    else setError('A collection with that name already exists.')
  }

  return <form className="stack" onSubmit={submit} noValidate>
    <Field label="Collection name" name="collection-name" error={error}>
      <input value={name} onChange={event => { setName(event.target.value); setError('') }} maxLength={80} />
    </Field>
    <div className="form-actions"><button type="button" onClick={onCancel}>Cancel</button>
      <button type="submit" className="primary">Create collection</button></div>
  </form>
}

export function SavePlace({ business, close }) {
  const { world, mutate } = useWorld()
  const collections = activeCollections(world)
  const [selected, setSelected] = useState(defaultCollection(collections)?.id || collections[0]?.id || '')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const memberships = saved(world).filter(item => item.businessId === business.id)
  const alreadySaved = memberships.some(item => item.collectionId === selected)

  function submit(event) {
    event.preventDefault()
    if (mutate(current => {
      if (!actor(current) || !find(current, 'businesses', business.id)) return
      const available = activeCollections(current)
      const time = stamp()
      const collection = selected ? available.find(item => item.id === selected) : defaultCollection(available)
      if (!collection && (selected || available.length)) return
      if (collection && saved(current).some(item => item.businessId === business.id && item.collectionId === collection.id)) return
      const destination = collection || createCollection(current, defaultName, time)
      const next = collection ? current : append(current, 'collections', destination)
      return append(next, 'bookmarks', {
        id: newId('bm'), userId: current.currentUserId, businessId: business.id, collectionId: destination.id,
        status: 'saved', createdAt: time,
      })
    }, 'Place saved.')) close()
    else setError('This place is already saved there, or the collection is unavailable.')
  }

  return <Dialog title={creating ? 'Create collection' : 'Save to a collection'} close={close}>
    <p>{businessName(business)}</p>
    {creating ? <CollectionFields onCancel={() => setCreating(false)} onCreate={collection => {
      setSelected(collection.id); setError(''); setCreating(false)
    }} /> : <form className="stack" onSubmit={submit}>
      {collections.length ? <Field label="Collection" name="save-collection" error={error}>
        <select value={selected} onChange={event => { setSelected(event.target.value); setError('') }}>
          {collections.map(item => <option key={item.id} value={item.id}>{collectionName(item)}{memberships.some(bookmark => bookmark.collectionId === item.id) ? ' (saved)' : ''}</option>)}
        </select>
      </Field> : <p>Save this place to Want to go, or create a collection with your own name.</p>}
      {!collections.length && error && <p className="inline-error" role="alert">{error}</p>}
      {alreadySaved && <p><Status value="Saved" /> <span className="metadata">This place is already in this collection.</span></p>}
      <div className="form-actions">
        <button type="button" onClick={() => setCreating(true)}>Create collection</button>
        <button type="submit" className="primary" disabled={alreadySaved}>{collections.length ? 'Save place' : 'Save to Want to go'}</button>
      </div>
    </form>}
  </Dialog>
}

export function Bookmarks() {
  const { world } = useWorld()
  const [creating, setCreating] = useState(false)
  const collections = activeCollections(world)
  const entries = saved(world)
  const close = () => setCreating(false)
  return <>
    <Heading title="Bookmarks" actions={actor(world) && <button type="button" className="primary" onClick={() => setCreating(true)}>Create collection</button>}>
      Keep track of the local places you want to try or visit again.
    </Heading>
    {collections.length ? <div className="record-list">{collections.map(collection => {
      const count = entries.filter(item => item.collectionId === collection.id).length
      const to = subPath('bookmarks', collection.id)
      return <Row key={collection.id} icon="bookmarks"
        title={<SiteLink to={to}>{collectionName(collection)}</SiteLink>}
        actions={<SiteLink to={to} className="button" aria-label={`Open ${collectionName(collection)}`}>Open collection</SiteLink>}>
        <p className="metadata">{count} saved {count === 1 ? 'place' : 'places'}</p>
      </Row>
    })}</div> : <Empty title="No collections yet" to="/discover" label="Discover businesses">Create a collection or save a place from its business page.</Empty>}
    {creating && <Dialog title="Create collection" close={close}><CollectionFields onCancel={close} onCreate={close} /></Dialog>}
  </>
}

function CollectionList({ collection }) {
  const { world, mutate } = useWorld()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const [removal, setRemoval] = useState(null)
  const bookmarks = saved(world).filter(item => item.collectionId === collection.id)
  const results = bookmarks.map(item => ({ item, business: find(world, 'businesses', item.businessId) }))
    .filter(({ business }) => matches(search, businessName(business), business?.category, business?.neighborhood))
    .sort((a, b) => sort === 'name' ? businessName(a.business).localeCompare(businessName(b.business)) || a.item.id.localeCompare(b.item.id)
      : compareCreated(a.item, b.item))

  function remove() {
    if (mutate(current => {
      if (!actor(current) || !activeCollections(current).some(item => item.id === collection.id) ||
          !saved(current).some(item => item.id === removal.item.id && item.collectionId === collection.id)) return
      const time = stamp()
      return update(current, 'bookmarks', removal.item.id, { status: 'removed', removedAt: time, updatedAt: time })
    }, 'Bookmark removed.')) setRemoval(null)
  }

  return <>
    <Heading title={collectionName(collection)} back={{ to: '/account/bookmarks', label: 'All collections' }}>
      {bookmarks.length} saved {bookmarks.length === 1 ? 'place' : 'places'}
    </Heading>
    <div className="list-toolbar">
      <Field label="Search this collection" name="collection-search">
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} />
      </Field>
      {bookmarks.length > 0 && <Field label="Sort saved places" name="bookmark-sort">
        <select value={sort} onChange={event => setSort(event.target.value)}>
          <option value="recent">Recently saved</option><option value="name">Business name</option>
        </select>
      </Field>}
    </div>
    {results.length ? <div className="record-list">{results.map(({ item, business }) =>
      <Row key={item.id} business={business} title={<BusinessLink business={business} />}
        actions={actor(world) && <button type="button" className="danger" onClick={() => setRemoval({ item, business })}>Remove bookmark</button>}>
        <p className="metadata">{[business?.category, business?.neighborhood, `Saved ${displayDate(item.createdAt)}`].filter(Boolean).join(' · ')}</p>
      </Row>)}</div> : bookmarks.length ? <Empty title="No matching places">Try a different search.</Empty> :
      <Empty title="This collection is empty" to="/discover" label="Discover businesses">Save a business to see it here.</Empty>}
    {removal && <Confirm title="Remove bookmark?" label="Remove bookmark" onConfirm={remove} close={() => setRemoval(null)}>
      Remove {businessName(removal.business)} from {collectionName(collection)}?
    </Confirm>}
  </>
}

export function Collection() {
  const { world } = useWorld()
  const { collectionId } = useParams()
  const collection = activeCollections(world).find(item => item.id === collectionId)
  return collection ? <CollectionList key={collectionId} collection={collection} /> :
    <Empty title="Collection unavailable" to="/account/bookmarks" label="All collections">This collection could not be found.</Empty>
}
