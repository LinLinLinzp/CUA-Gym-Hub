import { money } from '../utils/read.js'

export default function PriceSummary({ price, title = 'Order summary', children }) {
  return <aside className="panel review-summary stack" aria-label={title}>
    <h2>{title}</h2>
    <dl className="money-list">
      <div><dt>Merchandise subtotal</dt><dd>{money(price.subtotalCents)}</dd></div>
      <div><dt>Shipping</dt><dd>{price.shippingCents ? money(price.shippingCents) : 'Free'}</dd></div>
      {price.discountCents > 0 && <div className="circle-text"><dt>Target Circle savings</dt><dd>−{money(price.discountCents)}</dd></div>}
      <div><dt>Estimated tax</dt><dd>{money(price.taxCents)}</dd></div>
      <div className="money-total"><dt>Estimated total</dt><dd>{money(price.totalCents)}</dd></div>
    </dl>
    {price.reward && <p className="small circle-text">Earn a {money(price.reward.amount)} Circle reward when you place this order.</p>}
    {children}
  </aside>
}
