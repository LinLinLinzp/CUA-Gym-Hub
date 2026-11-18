import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, CreditCard } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { activeLines, allowedModes, array, cartTotals, find, modeNames, productTitle } from '../data/model.js'
import { orderNumber, orderPath, placeOrder, reviewCheckout } from '../data/orders.js'
import { Address, Back, ButtonLink, Empty, Feedback, Field, Photo, Totals, money } from '../components/UI.jsx'
import { useSiteNavigate } from '../utils/navigation.jsx'
import { PickupPanel } from './Pickup.jsx'

export function Payment({ summary }) {
  return summary?.brand && summary?.last4 ? <p className="with-icon"><CreditCard size={20} aria-hidden="true" />{summary.brand} •••• {summary.last4}</p> : <p className="muted">No saved payment method</p>
}

export function PersonFields({ value, onChange, required = false }) {
  return <div className="field-row">
    <Field label="Pickup person’s name"><input autoComplete="off" required={required} value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} /></Field>
    <Field label="Pickup person’s email"><input type="email" autoComplete="off" required={required} value={value.email} onChange={event => onChange({ ...value, email: event.target.value })} /></Field>
  </div>
}

export function CheckoutPage() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const chosenMode = params.get('mode')
  const mode = allowedModes.includes(chosenMode) ? chosenMode : allowedModes.find(option => activeLines(state.cart, option).length)
  if (!mode || !activeLines(state.cart, mode).length) {
    return <div className="stack"><h1>Checkout</h1><Empty title="This checkout is empty" to="/cart" action="Back to cart">Choose a group with items in your cart.</Empty></div>
  }
  return <CheckoutForm key={mode} mode={mode} />
}

function CheckoutForm({ mode }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const addresses = array(state.profile?.addresses)
  const [addressId, setAddressId] = useState(addresses[0]?.id || '')
  const [alternate, setAlternate] = useState(false)
  const [person, setPerson] = useState({ name: '', email: '' })
  const [error, setError] = useState('')
  const review = reviewCheckout(state, mode)
  const address = find(addresses, addressId)
  return <div className="stack">
    <Back to="/cart">Back to cart</Back>
    <h1>{modeNames[mode]} checkout</h1>
    <form className="summary-layout" onSubmit={event => {
      event.preventDefault()
      const result = commit(placeOrder, { mode, addressId, pickupPerson: alternate ? person : null })
      setError(result.error || '')
      if (result.order) navigate(`${orderPath(result.order)}/confirmation`, { replace: true })
    }}>
      <div className="stack">
        <section className="panel stack">
          <h2>{mode === 'pickup' ? 'Pickup details' : 'Shipping address'}</h2>
          {mode === 'pickup' ? <>
            <PickupPanel back="checkout" />
            <label className="check-field"><input type="checkbox" checked={alternate} onChange={event => setAlternate(event.target.checked)} /> Add an alternate pickup person</label>
            {alternate && <PersonFields value={person} onChange={setPerson} required />}
          </> : <>
            {addresses.length > 0 && <Field label="Saved address"><select value={addressId} onChange={event => setAddressId(event.target.value)}>
              {addresses.map(item => <option value={item.id} key={item.id}>{item.label || item.line1 || 'Saved address'}</option>)}
            </select></Field>}
            <Address address={address} />
          </>}
        </section>
        <section className="panel stack"><h2>Payment</h2><Payment summary={state.profile?.paymentSummary} /></section>
        <section className="panel stack">
          <h2>Review items</h2>
          <div className="line-list">{review.lines.map((line, index) => {
            const product = review.products.get(line.productId)
            return <article className="order-line" key={line.id ?? index}>
              <Photo path={product?.imagePath} />
              <div><h3>{productTitle(product)}</h3><p className="small muted">Quantity {line.quantity ?? '—'}{product?.variant ? ` · ${product.variant}` : ''}</p></div>
              <strong>{Number.isFinite(product?.price) ? money(product.price * (Number(line.quantity) || 0)) : '—'}</strong>
            </article>
          })}</div>
        </section>
      </div>
      <aside className="panel summary stack">
        <h2>Order summary</h2>
        <Totals totals={cartTotals(state, mode)} />
        <Feedback>{error || review.error}</Feedback>
        <button className="button primary" disabled={Boolean(review.error)}>Place order</button>
      </aside>
    </form>
  </div>
}

export function ConfirmationPage({ record: order }) {
  return <article className="panel confirmation stack">
    <CheckCircle2 size={44} aria-hidden="true" />
    <h1>Order placed</h1>
    <p>Order number <strong>{orderNumber(order)}</strong></p>
    {order.fulfillmentMode && <p>{modeNames[order.fulfillmentMode] || 'Order'} · {money(order.totals?.total)}</p>}
    <div className="actions"><ButtonLink to={orderPath(order)}>View details</ButtonLink><ButtonLink kind="secondary" to="/">Continue shopping</ButtonLink></div>
  </article>
}
