import { Tag } from 'lucide-react'
import { matchesOffer, memberOfferState, validOffer } from '../domain/circle.js'
import { list, money } from '../utils/read.js'
import { OfferStatus, offerBenefit, offerPath } from './OfferLabels.jsx'
import { ShopLink, Status } from './ui.jsx'

export default function CartOffers({ price, state }) {
  if (!price.lines.length || !state.guest?.circleMember) return null
  const discounts = new Map()
  for (const entry of price.lines) {
    for (const discount of entry.offerDiscounts) discounts.set(discount.offerId, (discounts.get(discount.offerId) || 0) + discount.amountCents)
  }
  const offers = list(state.offers).filter((offer) => price.lines.some((entry) => matchesOffer(offer, entry.product, entry.line.fulfillment)) ||
    (validOffer(offer) && memberOfferState(state, offer.id)?.status === 'active'))
  if (!offers.length) return null
  return <section className="panel stack">
    <div className="section-heading"><h2 className="cluster"><Tag size={22} /> Target Circle</h2><ShopLink to="/circle/dashboard">View offers</ShopLink></div>
    <ul className="cart-offer-list">
      {offers.map((offer) => {
        const amount = discounts.get(offer.id)
        const reward = price.reward?.offer.id === offer.id
        return <li key={offer.id}>
          <ShopLink to={offerPath(offer)}>{offer.title || offerBenefit(offer)}</ShopLink>
          {amount ? <Status tone="circle">{money(amount)} savings</Status> : reward ?
            <Status tone="success">{money(price.reward.amount)} reward at checkout</Status> :
            <><OfferStatus offer={offer} state={state} /><span className="small muted">No savings on this cart</span></>}
        </li>
      })}
    </ul>
  </section>
}
