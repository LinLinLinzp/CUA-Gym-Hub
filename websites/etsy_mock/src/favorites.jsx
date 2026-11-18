import React, { useState } from 'react'
import { ArrowLeft, Folder, Lock, Plus } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LocalLink, pathFor, useAction, useLocalNavigate, useStore } from './store.jsx'
import { byId, human, newest, owned, saveCollection, savePrivacy, setMembership } from './model.js'
import { Art, ButtonLink, Choose, Empty, ErrorNote, Field, Heading, ListingGrid, Missing, ShopCard, matches } from './ui.jsx'

const visibilityOptions = { private: 'Private', public: 'Public' }
const savedListings = (state) => newest(owned(state.favorites, state.buyer)).filter((row) => row.targetType === 'listing')
  .map((row) => byId(state.listings, row.targetId)).filter(Boolean)
const membersFor = (state, id) => owned(state.collectionItems, state.buyer).filter((row) => row.collectionId === id)

function CollectionForm({ collection }) {
  const { state, commit, notify } = useStore()
  const { run, error } = useAction()
  const navigate = useLocalNavigate()
  const [name, setName] = useState(collection?.name || '')
  const [visibility, setVisibility] = useState(collection?.visibility || 'private')
  const memberIds = membersFor(state, collection?.id).map((member) => member.listingId)
  const [selected, setSelected] = useState(memberIds)
  const options = [...new Set([...savedListings(state).map((listing) => listing.id), ...memberIds])]
  const [query, setQuery] = useState('')
  return <form className="panel stack readable" noValidate onSubmit={(event) => {
    event.preventDefault()
    run(() => {
      const result = commit((current, at) => saveCollection(current, { id: collection?.id, name, visibility, listingIds: selected }, at))
      notify(collection ? 'Collection updated.' : 'Collection created.')
      navigate(pathFor('favorites/collections', result.collectionId), { replace: true })
    })
  }}>
    <h2>{collection ? 'Edit collection' : 'Create collection'}</h2>
    <Field label="Collection name"><input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="Visibility"><Choose placeholder="" options={visibilityOptions} value={visibility} onChange={(event) => setVisibility(event.target.value)} /></Field>
    <fieldset className="affected"><legend>Choose saved items</legend>
      {options.length ? <>
        <Field label="Filter saved items"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
        <div className="member-picker">{options.filter((id) => matches(query, byId(state.listings, id)?.title || 'Unavailable listing')).map((id) =>
          <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={(event) => setSelected(
            event.target.checked ? [...selected, id] : selected.filter((old) => old !== id)
          )} />{byId(state.listings, id)?.title || 'Unavailable listing'}</label>)}</div>
      </> : <p>Save an item to add it to this collection.</p>}
    </fieldset>
    <ErrorNote>{error}</ErrorNote>
    <div className="actions"><button className="button">{collection ? 'Save collection' : 'Create collection'}</button>
      <ButtonLink secondary to={collection ? pathFor('favorites/collections', collection.id) : '/favorites?tab=collections'}>Cancel</ButtonLink></div>
  </form>
}

function Privacy() {
  const { state, commit, notify } = useStore()
  const { run, error } = useAction()
  const [items, setItems] = useState(state.buyer.favoriteItemsVisibility || 'private')
  const [shops, setShops] = useState(state.buyer.favoriteShopsVisibility || 'private')
  return <form className="panel stack readable" onSubmit={(event) => {
    event.preventDefault()
    run(() => {
      commit((current, at) => savePrivacy(current, { favoriteItemsVisibility: items, favoriteShopsVisibility: shops }, at))
      notify('Favorites privacy saved.')
    })
  }}>
    <h2>Favorites privacy</h2>
    <Field label="Saved items visibility"><Choose options={visibilityOptions} placeholder="" value={items} onChange={(event) => setItems(event.target.value)} /></Field>
    <Field label="Followed shops visibility"><Choose options={visibilityOptions} placeholder="" value={shops} onChange={(event) => setShops(event.target.value)} /></Field>
    <ErrorNote>{error}</ErrorNote>
    <div className="actions"><button className="button">Save privacy</button><ButtonLink secondary to="/favorites">Cancel</ButtonLink></div>
  </form>
}

export function Favorites() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const tab = params.get('tab') || 'items'
  const mode = params.get('mode')
  const shops = newest(owned(state.favorites, state.buyer)).filter((row) => row.targetType === 'shop')
    .map((row) => byId(state.shops, row.targetId)).filter(Boolean)
  const listings = savedListings(state).filter((row) => matches(query, row.title, row.category, byId(state.shops, row.shopId)?.name))
  const collections = newest(owned(state.collections, state.buyer), 'createdAt')
  return <>
    <Heading title="Favorites" action={<ButtonLink secondary to="/favorites?mode=privacy"><Lock size={17} /> Privacy settings</ButtonLink>}>Saved items, followed shops, and collections.</Heading>
    <nav className="tabs" aria-label="Favorites">
      {[['items', 'Items'], ['shops', 'Shops'], ['collections', 'Collections']].map(([key, label]) => (
        <LocalLink key={key} to={key === 'items' ? '/favorites' : '/favorites?tab=' + key} aria-current={tab === key && mode !== 'privacy' ? 'page' : undefined}>{label}</LocalLink>
      ))}
    </nav>
    {mode === 'privacy' ? <Privacy /> : tab === 'shops' ? (
      shops.length ? <div className="stack">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div> : <Empty title="No followed shops" />
    ) : tab === 'collections' ? <>
      {mode === 'create' ? <CollectionForm /> : <>
        <div className="section-heading"><h2>Your collections</h2><ButtonLink to="/favorites?tab=collections&mode=create"><Plus size={17} /> Create collection</ButtonLink></div>
        {collections.length ? <div className="collection-grid">{collections.map((entry) => {
          const members = membersFor(state, entry.id)
          const first = byId(state.listings, members[0]?.listingId)
          return <LocalLink className="panel collection-card" key={entry.id} to={pathFor('favorites/collections', entry.id)}>
            <Art src={first?.image} /><div><h2><Folder size={18} /> {entry.name || 'Untitled collection'}</h2><small>{human(entry.visibility)} · {members.length} items</small></div></LocalLink>
        })}</div> : <Empty title="No collections yet" />}
      </>}
    </> : <>
      <div className="panel filter-bar favorites-filter"><Field label="Search saved items"><input type="search" placeholder="Search your favorites" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></div>
      {listings.length ? <ListingGrid listings={listings} /> : <Empty title={query ? 'No matching saved items' : 'No saved items yet'}>
        {!query && <ButtonLink to="/search" secondary>Browse marketplace</ButtonLink>}
      </Empty>}
    </>}
  </>
}

export function Collection() {
  const { collectionId } = useParams()
  const [params] = useSearchParams()
  const { state, commit, notify } = useStore()
  const { run, error } = useAction()
  const collection = byId(owned(state.collections, state.buyer), collectionId)
  if (!collection) return <Missing title="Collection unavailable" to="/favorites?tab=collections" label="Back to collections" />
  const editing = params.get('mode') === 'edit'
  const memberships = membersFor(state, collectionId)
  const listings = memberships.map((member) => byId(state.listings, member.listingId)).filter(Boolean)
  const remove = (id) => run(() => {
    commit((current, at) => setMembership(current, collectionId, id, false, at))
    notify('Item removed from collection.')
  })
  return <>
    <LocalLink className="back-link" to="/favorites?tab=collections"><ArrowLeft size={17} /> Back to collections</LocalLink>
    <Heading title={collection.name || 'Untitled collection'}
      action={!editing && <ButtonLink secondary to={pathFor('favorites/collections', collectionId) + '?mode=edit'}>Edit collection</ButtonLink>}>
      {human(collection.visibility)} · {memberships.length} items
    </Heading>
    {editing ? <CollectionForm key={collectionId} collection={collection} /> : <>
      <ErrorNote>{error}</ErrorNote>
      {listings.length ? <ListingGrid listings={listings}
        extra={(listing) => <button type="button" className="plain" onClick={() => remove(listing.id)}>Remove from collection</button>} />
        : <Empty title="No available items in this collection"><ButtonLink secondary to={pathFor('favorites/collections', collectionId) + '?mode=edit'}>Choose saved items</ButtonLink></Empty>}
    </>}
  </>
}
