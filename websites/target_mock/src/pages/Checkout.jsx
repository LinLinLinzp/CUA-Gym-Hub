import { useState } from 'react'
import { Store, Truck } from 'lucide-react'
import { useStore } from '../store.jsx'
import { addressText, byId, money } from '../utils/read.js'
import { checkoutIssue, placeOrder, validatePerson } from '../domain/checkout.js'
import { priceCart } from '../domain/pricing.js'
import { Empty, PageHeading, ShopLink, Status, useShopNavigate } from '../components/ui.jsx'
import { MaskedPayment, PersonFields } from '../components/OrderFields.jsx'
import PriceSummary from '../components/PriceSummary.jsx'
import ProductImage from '../components/ProductImage.jsx'

function ReviewLines({ entries }) {
  return <div className="checkout-lines">
    {entries.map(({ line, product, variant, quantity, paidCents, issue, discountCents }) => <article className="checkout-row" key={line.id}>
      <ProductImage product={product || { title: line.title }} variant={variant} />
      <div><h3>{product?.title || line.title || 'Unavailable item'}</h3><p className="small muted">Quantity {quantity || 'unavailable'}{(variant?.label || line.variantLabel) && ` · ${variant?.label || line.variantLabel}`}</p>
        {issue && <p className="error small">{issue}</p>}
        {discountCents > 0 && <p className="circle-text small">{money(discountCents)} Target Circle savings</p>}
      </div>
      <strong>{money(paidCents)}</strong>
    </article>)}
  </div>
}

export function Checkout() {
  const { state, transact } = useStore()
  const navigate = useShopNavigate()
  const [person, setPerson] = useState({ fullName: '', email: '' })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const price = priceCart(state)
  const shipping = price.lines.filter(({ line }) => line.fulfillment === 'shipping')
  const pickup = price.lines.filter(({ line }) => line.fulfillment === 'pickup')
  const other = price.lines.filter(({ line }) => !['shipping', 'pickup'].includes(line.fulfillment))
  const pickupStores = [...new Set(pickup.map(({ line }) => line.storeId))]
  const issue = checkoutIssue(state, price)

  if (!price.lines.length) return <><PageHeading title="Checkout" /><Empty title="Your cart is empty" to="/cart" action="View cart">Add items to your cart before checking out.</Empty></>

  function submit(event) {
    event.preventDefault()
    if (issue || submitting) return
    const checked = validatePerson(pickup.length ? person : null)
    if (checked.errors) { setErrors(checked.errors); return }
    setSubmitting(true)
    const result = transact((world) => placeOrder(world, checked.person))
    if (result.error) {
      setFailure(result.error)
      if (result.errors) setErrors(result.errors)
      setSubmitting(false)
      return
    }
    navigate(`/orders/${encodeURIComponent(result.order.id)}?placed=1`, { replace: true })
  }

  return <>
    <ShopLink className="breadcrumb" to="/cart">Back to cart</ShopLink>
    <PageHeading title="Checkout"><p className="muted">Review your items, fulfillment and payment.</p></PageHeading>
    <form className="review-layout" onSubmit={submit} noValidate>
      <div className="stack">
        {pickupStores.map((storeId) => {
          const store = byId(state.stores, storeId)
          const entries = pickup.filter(({ line }) => line.storeId === storeId)
          return <section className="panel stack" key={storeId || 'missing-store'}>
            <h2 className="cluster"><Store size={23} />Order Pickup</h2>
            <div><h3>{store?.name ? `Target ${store.name}` : 'Pickup store unavailable'}</h3><p className="muted">{addressText(store?.address) || 'Address unavailable'}</p></div>
            <Status tone={entries.some((entry) => entry.issue) ? 'warning' : 'success'}>{entries.some((entry) => entry.issue) ? 'Availability needs attention' : 'Available for pickup'}</Status>
            <ReviewLines entries={entries} />
          </section>
        })}
        {pickup.length > 0 && <section className="panel stack">
          <h2>Alternate pickup person</h2>
          <p className="muted">Optional. Add a name and email if someone else may pick up your order.</p>
          <PersonFields value={person} errors={errors} update={(key, value) => {
            setPerson({ ...person, [key]: value }); setErrors({ ...errors, [key]: '' }); setFailure('')
          }} />
        </section>}
        {shipping.length > 0 && <section className="panel stack">
          <h2 className="cluster"><Truck size={23} />Standard shipping</h2>
          <div><h3>{[state.guest?.firstName, state.guest?.lastName].filter(Boolean).join(' ') || 'Shipping address'}</h3>
            <p className="muted">{addressText(state.guest?.shippingAddress) || 'Address unavailable'}</p></div>
          <ReviewLines entries={shipping} />
        </section>}
        {other.length > 0 && <section className="panel stack"><h2>Fulfillment unavailable</h2><ReviewLines entries={other} /></section>}
        <section className="panel stack"><h2>Payment</h2><MaskedPayment payment={state.guest?.payment} /></section>
      </div>
      <PriceSummary price={price}>
        {(issue || failure) && <p className="small error" role="alert">{issue || failure}</p>}
        <button className="button primary" type="submit" disabled={Boolean(issue) || submitting}>{submitting ? 'Placing order…' : 'Place order'}</button>
      </PriceSummary>
    </form>
  </>
}
