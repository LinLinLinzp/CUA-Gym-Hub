import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ClipboardList, Heart, House, MessageSquare } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { lookup, makeId, owned, replace, sortNewest, useStore } from './store'
import { Empty, Field, homeAddress, homePlace, label, matching, Missing, money, PageTitle, SiteLink, Status, TextLink } from './ui'
import { OfferForm, TourForm } from './transactions'
import { Compose } from './messages'

const localPhotos = new Set(Object.keys(import.meta.glob('/public/homes/*.webp')).map(path => path.replace('/public', '')))
const galleryPhotos = photo => {
  if (!localPhotos.has(photo)) return []
  const alternate = photo.replace(/-(01|02)\.webp$/, (_, index) => index === '01' ? '-02.webp' : '-01.webp')
  return alternate !== photo && localPhotos.has(alternate) ? [photo, alternate] : [photo]
}
const priceOrder = row => row.home?.price ?? Number.POSITIVE_INFINITY

function useSaved(homeId) {
  const { state, commit } = useStore()
  const { id: actorId } = state.account
  const getRecord = world => world.savedHomes.find(row => row.actorId === actorId && row.homeId === homeId)
  const saved = getRecord(state)?.status === 'saved'
  function toggle() {
    commit((world, now) => {
      const record = getRecord(world)
      if (record?.status === 'saved') return { ...world, savedHomes: replace(world.savedHomes, { ...record, status: 'removed', removedAt: now, updatedAt: now }) }
      if (record) {
        const next = { ...record, status: 'saved', updatedAt: now }
        delete next.removedAt
        return { ...world, savedHomes: replace(world.savedHomes, next) }
      }
      if (!lookup(world.homes, homeId)) return world
      return { ...world, savedHomes: [...world.savedHomes, {
        id: makeId('saved'), homeId, actorId, status: 'saved', createdAt: now, updatedAt: now,
      }] }
    }, saved ? 'Removed from saved homes.' : 'Home saved to your shortlist.')
  }
  return { saved, toggle }
}

function SaveButton({ home, homeId }) {
  const { saved, toggle } = useSaved(homeId)
  if (!home && !saved) return null
  const address = homeAddress(home)
  return <button type="button" className="heart" onClick={toggle} aria-pressed={saved}
    aria-label={saved ? 'Remove ' + address + ' from saved homes' : 'Save ' + address}>
    <Heart size={21} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
  </button>
}

function HomePhoto({ photo, address, eager }) {
  const [failed, setFailed] = useState(null)
  return localPhotos.has(photo) && photo !== failed
    ? <img src={photo} alt={'Exterior of ' + address} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(photo)} />
    : <div className="photo-fallback"><House size={34} aria-hidden="true" /><span>Photo unavailable</span></div>
}

function Facts({ home }) {
  const facts = [[home.beds, 'beds'], [home.baths, 'baths'], [home.sqft, 'sq ft']].filter(([value]) => typeof value === 'number')
  return facts.length > 0 && <div className="property-facts">
    {facts.map(([value, unit]) => <span key={unit}><strong>{value.toLocaleString('en-US')}</strong> {unit}</span>)}
  </div>
}

export function PropertyCard({ home, homeId = home?.id }) {
  const to = '/homes/' + encodeURIComponent(homeId ?? '')
  return <article className="property-card">
    <div className="card-image">
      <HomePhoto photo={home?.photo} address={homeAddress(home)} />
      {home?.status && <div className="card-status"><Status value={home.status} /></div>}
      <SaveButton home={home} homeId={homeId} />
    </div>
    <div className="card-content">
      {home && <div className="property-price">{money(home.price)}</div>}
      <h3>{home ? <SiteLink to={to}>{homeAddress(home)}</SiteLink> : homeAddress(null)}</h3>
      {homePlace(home) && <p>{homePlace(home)}</p>}
      {home && <Facts home={home} />}
    </div>
  </article>
}

const choices = ['active', 'pending', 'sold']
const propertyTypes = ['house', 'townhouse', 'condo']

export function Browse() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState('')
  const [type, setType] = useState('')
  const homes = state.homes.filter(home => matching(query, home.address, home.city, home.zip, home.neighborhood) &&
    (!status || status === home.status) && (!type || type === home.propertyType) &&
    (!price || (typeof home.price === 'number' && home.price <= Number(price))) &&
    (!beds || home.beds >= Number(beds)))
  const clear = () => { setQuery(''); setStatus(''); setPrice(''); setBeds(''); setType('') }
  return <>
    <PageTitle title="Browse homes">Explore listings by address or neighborhood.</PageTitle>
    <div className="filter-panel browse-filters">
      <Field label="Search listings" id="browse-search"><input id="browse-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Address, city, ZIP, or neighborhood" /></Field>
      <Field label="Status" id="browse-status"><select id="browse-status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Any status</option>{choices.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      <Field label="Max price" id="browse-price"><select id="browse-price" value={price} onChange={e => setPrice(e.target.value)}><option value="">Any price</option>{[500000, 650000, 750000, 900000, 1000000, 1250000].map(value => <option key={value} value={value}>{money(value)}</option>)}</select></Field>
      <Field label="Beds" id="browse-beds"><select id="browse-beds" value={beds} onChange={e => setBeds(e.target.value)}><option value="">Any beds</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}+</option>)}</select></Field>
      <Field label="Property type" id="browse-type"><select id="browse-type" value={type} onChange={e => setType(e.target.value)}><option value="">Any type</option>{propertyTypes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      {(query || status || price || beds || type) && <button type="button" className="secondary" onClick={clear}>Clear filters</button>}
    </div>
    <p className="result-count" aria-live="polite">{homes.length} {homes.length === 1 ? 'listing' : 'listings'}</p>
    {homes.length ? <div className="property-grid">{homes.map(home => <PropertyCard key={home.id} home={home} />)}</div>
      : <Empty title={state.homes.length ? 'No matching homes' : 'No listings available'}>{state.homes.length ? 'Try another search or adjust your filters.' : 'Listings will appear here when they are available.'}</Empty>}
  </>
}

export function Saved() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const saved = owned(state.savedHomes, state.account.id).filter(row => row.status === 'saved')
  const results = saved.map(row => ({ ...row, home: lookup(state.homes, row.homeId) }))
    .filter(({ home }) => matching(query, homeAddress(home), homePlace(home), home?.zip))
    .sort((a, b) => (sort === 'recent' || priceOrder(a) === priceOrder(b)) ? sortNewest('updatedAt')(a, b)
      : (sort === 'low' ? priceOrder(a) - priceOrder(b) : priceOrder(b) - priceOrder(a)))
  return <>
    <PageTitle title="Saved homes" action={<SiteLink to="/homes" className="secondary">Browse homes</SiteLink>}>Compare the homes on your shortlist.</PageTitle>
    <div className="filter-panel compact-filters">
      <Field label="Search saved homes" id="saved-search"><input id="saved-search" type="search" placeholder="Search by address" value={query} onChange={e => setQuery(e.target.value)} /></Field>
      <Field label="Sort by" id="saved-sort"><select id="saved-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently saved</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></Field>
    </div>
    <p className="result-count" aria-live="polite">{results.length} {results.length === 1 ? 'saved home' : 'saved homes'}</p>
    {results.length ? <div className="property-grid">{results.map(row => <PropertyCard key={row.id} home={row.home} homeId={row.homeId} />)}</div>
      : <Empty title={saved.length ? 'No matching saves' : 'Your shortlist is empty'} action={saved.length ? null : <TextLink to="/homes">Browse homes</TextLink>}>{saved.length ? 'Try another address.' : 'Use the heart on any listing to save it here.'}</Empty>}
  </>
}

function Gallery({ home }) {
  const photos = galleryPhotos(home.photo)
  const [index, setIndex] = useState(0)
  const move = step => setIndex(current => (current + step + photos.length) % photos.length)
  return <div className="gallery" onKeyDown={event => {
    if (photos.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }}>
    <HomePhoto photo={photos[index]} address={homeAddress(home)} eager />
    {photos.length > 1 && <div className="gallery-controls" aria-label="Listing photo controls">
      <button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Previous photo"><ArrowLeft size={18} /></button>
      <span role="status">{index + 1} / {photos.length}</span>
      <button type="button" className="icon-button" onClick={() => move(1)} aria-label="Next photo"><ArrowRight size={18} /></button>
    </div>}
    <SaveButton home={home} homeId={home.id} />
  </div>
}

export function Listing() {
  const { homeId } = useParams()
  const { state } = useStore()
  const [dialog, setDialog] = useState('')
  const home = lookup(state.homes, homeId)
  if (!home) return <Missing title="Listing unavailable" to="/homes" link="Browse homes" />

  const agent = lookup(state.agents, home.agentId)
  const close = () => setDialog('')
  return <>
    <SiteLink to="/homes" className="back-link"><ArrowLeft size={16} /> Browse homes</SiteLink>
    <PageTitle title={homeAddress(home)} action={home.status && <Status value={home.status} />}>{[homePlace(home), home.zip].filter(Boolean).join(' ')}</PageTitle>
    <Gallery key={home.id} home={home} />
    <div className="listing-layout">
      <section className="listing-summary">
        <div className="listing-price">{money(home.price)}</div><Facts home={home} />
        <h2>About this home</h2><p>{home.description || 'A description is unavailable for this listing.'}</p>
        {home.propertyType && <p className="muted">{label(home.propertyType)}</p>}
      </section>
      <aside className="listing-actions">
        <h2>Interested in this home?</h2>
        {agent && <p>{agent.displayName || 'Redfin agent'} · {agent.title || 'Redfin Agent'}</p>}
        {home.status !== 'sold' && <>
          <button className="primary" onClick={() => setDialog('tour')}><CalendarDays size={17} /> Schedule a tour</button>
          <button className="secondary" onClick={() => setDialog('offer')}><ClipboardList size={17} /> Start an offer</button>
        </>}
        {state.agents.length > 0 && <button className="secondary" onClick={() => setDialog('message')}><MessageSquare size={17} /> Ask an agent</button>}
      </aside>
    </div>
    {dialog === 'tour' && <TourForm homeId={home.id} onClose={close} />}
    {dialog === 'offer' && <OfferForm homeId={home.id} onClose={close} />}
    {dialog === 'message' && <Compose homeId={home.id} agentId={agent?.id} onClose={close} />}
  </>
}
