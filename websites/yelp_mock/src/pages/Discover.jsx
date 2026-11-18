import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { actor, businessName, dated, displayDate, find, matches, policyFor, published, records, saved, services } from '../model.js'
import { useWorld } from '../store.jsx'
import { Empty, Field, Heading, Row, SiteLink, Status, Thumbnail, bizPath } from '../ui.jsx'
import { ReviewEditor } from './Reviews.jsx'
import { SavePlace } from './Bookmarks.jsx'
import { QuoteForm } from './Quotes.jsx'
import { ReservationForm } from './Reservations.jsx'

const ratingText = value => typeof value === 'number' && value >= 1 && value <= 5 ? `★ ${value.toFixed(1)}` : ''

function ListingMetadata({ business }) {
  return <p className="metadata">
    {[business.category, business.neighborhood || business.city, ratingText(business.rating),
      Number.isInteger(business.priceLevel) && business.priceLevel > 0 && business.priceLevel <= 4 ? '$'.repeat(business.priceLevel) : null,
    ].filter(Boolean).join(' · ')}
  </p>
}

function Capabilities({ business }) {
  const bookable = policyFor(business)
  const quotes = services(business).length > 0
  return (bookable || quotes) && <div className="tags">
    {bookable && <Status value="Reservations" tone="neutral" />}
    {quotes && <Status value="Quotes available" tone="neutral" />}
  </div>
}

function Discovery({ initialCapability }) {
  const { world } = useWorld()
  const [term, setTerm] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [capability, setCapability] = useState(initialCapability)
  const businesses = records(world, 'businesses')
  const categories = [...new Set(businesses.map(item => item.category).filter(item => typeof item === 'string' && item.trim()))].sort()
  const results = businesses.filter(item =>
    matches(term, item.name, item.category, item.description) && matches(location, item.city, item.neighborhood) &&
    (!category || item.category === category) && (capability !== 'bookable' || policyFor(item)) &&
    (capability !== 'quotes' || services(item).length),
  )

  function reset() {
    setTerm('')
    setLocation('')
    setCategory('')
    setCapability('')
  }

  return <>
    <Heading title="Discover businesses">Search for a place to visit, a table to book, or a local service.</Heading>
    <div className="panel filters">
      <Field label="Search businesses" name="business-search"><input type="search" placeholder="Name, category, or keyword" value={term} onChange={event => setTerm(event.target.value)} /></Field>
      <Field label="City or neighborhood" name="business-location"><input type="search" placeholder="e.g. Sellwood" value={location} onChange={event => setLocation(event.target.value)} /></Field>
      <Field label="Category" name="business-category"><select value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">All categories</option>
        {categories.map(value => <option key={value}>{value}</option>)}
      </select></Field>
      <Field label="Availability" name="business-capability"><select value={capability} onChange={event => setCapability(event.target.value)}>
        <option value="">Any business</option><option value="bookable">Bookable</option><option value="quotes">Accepts quote requests</option>
      </select></Field>
      <button type="button" onClick={reset}>Reset filters</button>
    </div>
    <div className="list-toolbar"><p className="metadata" role="status">{results.length} {results.length === 1 ? 'business' : 'businesses'}</p></div>
    {results.length ? <div className="record-list">{results.map(business => <Listing key={business.id} business={business} />)}</div> :
      <Empty title="No businesses found">Try a different search or reset your filters.</Empty>}
  </>
}

function Listing({ business }) {
  return <Row business={business} title={<SiteLink to={bizPath(business.id)}>{businessName(business)}</SiteLink>}>
    <ListingMetadata business={business} /><Capabilities business={business} />
  </Row>
}

export function Discover() {
  const [query] = useSearchParams()
  const available = query.get('available')
  const initialCapability = ['bookable', 'quotes'].includes(available) ? available : ''
  return <Discovery key={initialCapability} initialCapability={initialCapability} />
}

function BusinessProfile({ business }) {
  const { world } = useWorld()
  const [dialog, setDialog] = useState('')
  const user = actor(world)
  const reviews = records(world, 'reviews').filter(review => review.businessId === business.id && review.status === 'published').sort(dated)
  const ownReview = published(world).find(review => review.businessId === business.id)
  const isSaved = saved(world).some(item => item.businessId === business.id)
  const canQuote = services(business).length > 0
  const canBook = Boolean(policyFor(business))
  const related = typeof business.category === 'string' && business.category.trim()
    ? records(world, 'businesses').filter(item => item.id !== business.id && item.category === business.category).slice(0, 3)
    : []
  const close = () => setDialog('')

  return <>
    <Heading title={businessName(business)} back={{ to: '/discover', label: 'Discover businesses' }}>
      {[business.category, business.neighborhood, business.city].filter(Boolean).join(' · ') || 'Business profile'}
    </Heading>
    <div className="business-grid">
      <div className="stack">
        <section className="panel stack">
          <Thumbnail business={business} large />
          {business.description && <p>{business.description}</p>}
          <ListingMetadata business={business} />
          <p className="metadata">{business.address || [business.neighborhood, business.city].filter(Boolean).join(', ') || 'Location unavailable'}</p>
        </section>
        <section aria-labelledby="business-reviews">
          <h2 id="business-reviews">Published reviews</h2>
          {reviews.length ? <div className="record-list section-list">{reviews.map(review => <Row key={review.id} icon="reviews"
            title={find(world, 'users', review.userId)?.displayName || 'Yelp reviewer'}>
            <p className="metadata">{[ratingText(review.rating), displayDate(review.createdAt)].filter(Boolean).join(' · ')}</p>
            <p className="review-text">{review.text || 'Review text unavailable'}</p>
          </Row>)}</div> : <div className="panel section-list"><p>No published reviews yet.</p></div>}
        </section>
      </div>
      <aside className="panel action-panel">
        <h2>Plan your visit</h2>
        {user ? <div className="action-list">
          <button type="button" className="primary" onClick={() => setDialog('save')}>{isSaved ? 'Saved · View collections' : 'Save'}</button>
          <button type="button" onClick={() => setDialog('review')}>Write a review</button>
          {canQuote && <button type="button" onClick={() => setDialog('quote')}>Request a quote</button>}
          {canBook && <button type="button" onClick={() => setDialog('reservation')}>Find a table</button>}
        </div> : <p className="metadata">Account actions are unavailable.</p>}
      </aside>
    </div>
    {related.length > 0 && <section className="overview-section" aria-labelledby="related-businesses">
      <h2 id="related-businesses">Related businesses</h2>
      <div className="record-list">{related.map(item => <Listing key={item.id} business={item} />)}</div>
    </section>}
    {dialog === 'review' && <ReviewEditor business={business} review={ownReview} close={close} />}
    {dialog === 'save' && <SavePlace business={business} close={close} />}
    {dialog === 'quote' && <QuoteForm business={business} close={close} />}
    {dialog === 'reservation' && <ReservationForm business={business} close={close} />}
  </>
}

export function Business() {
  const { businessId } = useParams()
  const { world } = useWorld()
  const business = find(world, 'businesses', businessId)
  return business ? <BusinessProfile key={businessId} business={business} /> :
    <Empty title="Business unavailable" to="/discover" label="Discover businesses">This listing could not be found.</Empty>
}
