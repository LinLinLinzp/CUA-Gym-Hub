import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Gift, Tag, TicketPercent } from 'lucide-react'
import { useStore } from '../store.jsx'
import { categoryOptions } from '../components/Header.jsx'
import { Empty, PageHeading, ShopLink, useFeedback } from '../components/ui.jsx'
import { OfferStatus, OfferTerms, offerBenefit } from '../components/OfferLabels.jsx'
import { changeOfferState, memberOfferState, offerWindow, validOffer } from '../domain/circle.js'
import { list } from '../utils/read.js'

function OfferCard({ offer, focused }) {
  const { state, transact } = useStore()
  const { notify } = useFeedback()
  const [error, setError] = useState('')
  const saved = memberOfferState(state, offer.id)
  const member = state.guest?.circleMember
  const manual = ['coupon', 'bonus'].includes(offer.kind)
  const available = member && manual && validOffer(offer) && offerWindow(offer) === 'open' && saved?.status !== 'redeemed'
  const Icon = offer.kind === 'bonus' ? Gift : offer.kind === 'coupon' ? TicketPercent : Tag

  function update(status) {
    const result = transact((world) => changeOfferState(world, { offerId: offer.id, status }))
    setError(result.error || '')
    if (result.row) notify(status === 'removed' ? 'Offer removed.' : status === 'saved' ? 'Offer saved.' : 'Offer activated.')
  }

  return <article className={`panel offer-card stack ${focused ? 'offer-focused' : ''}`}>
    <div className="offer-benefit"><Icon size={22} /><span>{offerBenefit(offer)}</span></div>
    <h2>{offer.title || 'Target Circle offer'}</h2>
    <OfferStatus offer={offer} state={state} />
    {offer.terms && <p className="small">{offer.terms}</p>}
    <OfferTerms offer={offer} />
    {manual && <div className="cluster">
      {available && !['active', 'saved'].includes(saved?.status) && <button className="button secondary" onClick={() => update('saved')}>Save</button>}
      {available && saved?.status !== 'active' && <button className="button primary" onClick={() => update('active')}>{offer.kind === 'bonus' ? 'Activate' : 'Apply'}</button>}
      {member && ['saved', 'active'].includes(saved?.status) && <button className="text-button" onClick={() => update('removed')}>Remove</button>}
    </div>}
    {error && <p className="error small" role="alert">{error}</p>}
  </article>
}

const views = [['deals', 'Deals'], ['bonuses', 'Bonuses'], ['saved', 'View saved']]

export function Circle() {
  const { state } = useStore()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const focusId = params.get('offer')
  const current = params.get('view') || 'deals'
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('')
  const categories = categoryOptions(state.products)
  const products = list(state.products)
  const scopedIds = new Set(products.filter((product) => product.categoryId === category).map((product) => product.id))
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const offers = list(state.offers).filter((offer) => {
    const tracked = memberOfferState(state, offer.id)
    const viewMatches = current === 'saved' ? ['saved', 'active', 'redeemed'].includes(tracked?.status) : current === 'bonuses' ? offer.kind === 'bonus' : offer.kind !== 'bonus'
    const matches = [offer.title, offer.terms, offerBenefit(offer)].filter(Boolean).join(' ').toLowerCase()
    return viewMatches && words.every((word) => matches.includes(word)) &&
      (!category || list(offer.categoryIds).includes(category) || list(offer.productIds).some((id) => scopedIds.has(id)))
  })
  if (focusId) offers.sort((first, second) => Number(second.id === focusId) - Number(first.id === focusId))
  return <>
    <div className="circle-header panel">
      <span className="hero-store-icon"><Tag size={23} /></span>
      <PageHeading title="Target Circle"><p>{state.guest?.circleMember && state.guest?.firstName ? `Welcome, ${state.guest.firstName}. ` : ''}Shop member deals and earn rewards on eligible purchases.</p></PageHeading>
    </div>
    <nav className="section-tabs" aria-label="Target Circle offers">
      {views.map(([view, label]) => <ShopLink to={view === 'deals' ? '/circle/dashboard' : `/circle/dashboard?view=${view}`} key={view} aria-current={current === view ? 'page' : undefined}>{label}</ShopLink>)}
    </nav>
    <div className="circle-tools cluster">
      <label className="field">Search offers<input type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search deals and bonuses" /></label>
      <label className="field">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">All categories</option>{categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select></label>
    </div>
    {offers.length ? <div className="offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} focused={offer.id === focusId} />)}</div> :
      <Empty title={current === 'saved' ? 'No saved offers found' : 'No offers found'}>Try a different search or category.</Empty>}
  </>
}
