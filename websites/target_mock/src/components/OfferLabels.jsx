import { dateText, list, money } from '../utils/read.js'
import { memberOfferState, offerWindow, validOffer } from '../domain/circle.js'
import { ShopLink, Status } from './ui.jsx'

export function offerPath(offer) {
  return `/circle/dashboard?${offer.kind === 'bonus' ? 'view=bonuses&' : ''}offer=${encodeURIComponent(offer.id)}`
}

export function offerBenefit(offer) {
  if (typeof offer.value !== 'number') return 'Target Circle offer'
  switch (offer.valueType) {
    case 'percent': return `${offer.value}% off`
    case 'fixed': return `${money(offer.value)} off`
    case 'reward': return `Earn ${money(offer.value)}`
    default: return 'Target Circle offer'
  }
}

export function OfferStatus({ offer, state }) {
  const saved = memberOfferState(state, offer.id)
  const window = offerWindow(offer)
  if (saved?.status === 'redeemed') return <Status>Redeemed</Status>
  if (window === 'expired') return <Status tone="warning">Expired</Status>
  if (window === 'upcoming') return <Status>Starts {dateText(offer.startsAt)}</Status>
  if (window !== 'open' || !validOffer(offer)) return <Status>Offer unavailable</Status>
  if (offer.kind === 'deal') return <Status tone="circle">Automatically applied when eligible</Status>
  if (saved?.status === 'active') return <Status tone="success">{offer.kind === 'bonus' ? 'Activated' : 'Applied to eligible items'}</Status>
  if (saved?.status === 'saved') return <Status tone="circle">Saved</Status>
  return null
}

export function OfferTerms({ offer }) {
  const methods = list(offer.fulfillment).map((type) => type === 'pickup' ? 'Order Pickup' : type === 'shipping' ? 'Shipping' : null).filter(Boolean)
  return <ul className="offer-terms small muted">
    {methods.length > 0 && <li>{methods.join(' and ')}</li>}
    {offer.minSpendCents > 0 && <li>{money(offer.minSpendCents)} minimum spend on eligible merchandise</li>}
    {offer.maxUnits > 0 && <li>Limit {offer.maxUnits} {offer.maxUnits === 1 ? 'unit' : 'units'}</li>}
    {offer.expiresAt && <li>Ends {dateText(offer.expiresAt)}</li>}
  </ul>
}

export function ProductOffers({ offers, state }) {
  if (!offers.length) return null
  return <section className="offer-callout stack">
    <strong>Target Circle</strong>
    {offers.map((offer) => <div key={offer.id} className="offer-preview">
      <ShopLink to={offerPath(offer)}>{offer.title || offerBenefit(offer)}</ShopLink>
      <OfferStatus offer={offer} state={state} />
    </div>)}
  </section>
}
