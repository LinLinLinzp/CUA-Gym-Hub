import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Truck } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { updateCart } from '../data/cart.js'
import { activeLines, allowedModes, array, cartStore, cartTotals, find, modeNames, productTitle, quantityLimit } from '../data/model.js'
import { Back, ButtonLink, Empty, Feedback, Field, Photo, Totals, encoded, money } from '../components/UI.jsx'
import { SiteLink } from '../utils/navigation.jsx'
import { PickupPanel } from './Pickup.jsx'

function CartLine({ line }) {
  const { state, commit } = useStore()
  const [feedback, setFeedback] = useState(null)
  const product = find(state.catalog, line.productId)
  const title = productTitle(product)
  const isSaved = line.status === 'saved'
  const qty = Number(line.quantity) || 0
  const store = cartStore(state)
  const limit = quantityLimit(product, line.fulfillmentMode, store)
  const switchMode = allowedModes.find(mode => mode !== line.fulfillmentMode && quantityLimit(product, mode, store) > 0)
  const change = (type, options = {}) => {
    const result = commit(updateCart, { type, lineId: line.id, ...options })
    setFeedback(result.error || null)
  }
  return <article className="cart-line">
    <Photo path={product?.imagePath} />
    <div className="stack small-gap cart-line-body">
      <h3>{product ? <SiteLink to={`/item/${encoded(product.id)}`}>{title}</SiteLink> : title}</h3>
      <p className="muted small">{[product?.variant, product?.seller && `Sold by ${product.seller}`].filter(Boolean).join(' · ')}</p>
      <p>{Number.isFinite(product?.price) ? `${money(product.price)} each` : 'Price unavailable'}</p>
      {qty > limit && <p className="small unavailable">{limit ? `Only ${limit} available` : 'Unavailable for this fulfillment option'}</p>}
      <div className="actions">
        {isSaved ? <>
          <span className="small">{qty} · {modeNames[line.fulfillmentMode] || 'Fulfillment unavailable'}</span>
          <button className="button secondary" onClick={() => change('restored')}>Move to cart</button>
        </> : <>
          <div className="quantity" aria-label={`Quantity for ${title}`}>
            <button type="button" aria-label={`Decrease quantity for ${title}`} disabled={qty <= 1 || !limit} onClick={() => change('quantity_changed', { quantity: Math.min(qty - 1, limit) })}><Minus size={16} /></button>
            <span>{qty}</span>
            <button type="button" aria-label={`Increase quantity for ${title}`} disabled={qty >= limit} onClick={() => change('quantity_changed', { quantity: qty + 1 })}><Plus size={16} /></button>
          </div>
          {switchMode && <Field label="Fulfillment" className="cart-mode"><select value={line.fulfillmentMode} onChange={event => change('fulfillment_changed', { mode: event.target.value })}>
            <option value={line.fulfillmentMode}>{modeNames[line.fulfillmentMode] || 'Choose fulfillment'}</option>
            <option value={switchMode}>{modeNames[switchMode]}</option>
          </select></Field>}
          <button className="text-button" onClick={() => change('saved')}>Save for later</button>
        </>}
        <button className="text-button" onClick={() => change('removed')}>Remove</button>
      </div>
      <Feedback>{feedback}</Feedback>
    </div>
    <strong className="line-total">{Number.isFinite(product?.price) ? money(Math.round(product.price * 100) * qty / 100) : '—'}</strong>
  </article>
}

export function CartPage() {
  const { state } = useStore()
  const allActive = activeLines(state.cart)
  const groups = allowedModes.map(mode => [mode, activeLines(state.cart, mode)]).filter(([, lines]) => lines.length)
  const other = allActive.filter(line => !allowedModes.includes(line.fulfillmentMode))
  const saved = array(state.cart?.lines).filter(line => line.status === 'saved')
  const count = allActive.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  return <div className="stack">
    <Back to="/search">Continue shopping</Back>
    <h1>Cart <span className="subheading">({count} {count === 1 ? 'item' : 'items'})</span></h1>
    {allActive.length ? <div className="summary-layout">
      <div className="stack">
        {groups.map(([mode, lines]) => {
          const Icon = mode === 'pickup' ? ShoppingBag : Truck
          return <section className="panel stack" key={mode} aria-label={modeNames[mode]}>
            <h2 className="with-icon"><Icon size={22} aria-hidden="true" />{modeNames[mode]}</h2>
            {mode === 'pickup' && <PickupPanel back="cart" />}
            <div className="line-list">{lines.map((line, index) => <CartLine key={line.id ?? index} line={line} />)}</div>
          </section>
        })}
        {other.length > 0 && <section className="panel stack"><h2>Fulfillment unavailable</h2><div className="line-list">{other.map((line, index) => <CartLine key={line.id ?? index} line={line} />)}</div></section>}
      </div>
      <aside className="stack">
        {groups.map(([mode]) => <section className="panel summary stack" key={mode}>
          <h2>{modeNames[mode]} summary</h2>
          <Totals totals={cartTotals(state, mode)} />
          <ButtonLink to={`/checkout?mode=${mode}`}>Checkout for {mode}</ButtonLink>
        </section>)}
      </aside>
    </div> : <Empty title="Your cart is empty" to="/search" action="Start shopping">Add items for pickup or shipping.</Empty>}
    {!groups.some(([mode]) => mode === 'pickup') && state.cart?.pickupReservationId && <PickupPanel back="cart" />}
    <section className="panel stack" aria-label="Saved for later">
      <h2>Saved for later ({saved.length})</h2>
      {saved.length ? <div className="line-list">{saved.map((line, index) => <CartLine key={line.id ?? index} line={line} />)}</div> : <p className="muted">Items you save for later will appear here.</p>}
    </section>
  </div>
}
