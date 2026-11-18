import React, { useState } from 'react'
import { Check, Minus, Plus, Search, ShoppingBag } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AccountLink, detailPath, Empty, ErrorText, Page, Photo, PriceSummary, SlotChoices, useAccountNavigate } from '../components.jsx'
import { assemblyItems, assemblySlots, changeCart, checkout, checkoutTotals, deliveryFee, reviewCart } from '../data/mutations.js'
import { useAccount } from '../store.jsx'
import { byId, list, money, moneyValue, orderLabel, serviceSlots, slotText } from '../utils/account.js'

export function Catalog() {
  const { state, commit, announce } = useAccount()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const products = list(state.products)
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].sort()
  const query = search.trim().toLowerCase()
  const matches = products.filter((product) => {
    const fields = [product.name, product.articleNumber].map((value) => String(value ?? '').toLowerCase())
    return (!category || category === product.category) && fields.some((value) => value.includes(query))
  })

  function add(product) {
    const result = commit((current) => changeCart(current, 'add', product.id))
    setError(result.error || '')
    if (!result.error) announce((product.name || 'Item') + ' added to your cart.')
  }

  return <Page title="Products" description="Browse home furnishings and add items to your cart."
    action={<AccountLink className="button secondary" to="/cart"><ShoppingBag size={17} /> View cart</AccountLink>}>
    <div className="card filters">
      <label className="field grow">Search products<span className="search-field"><Search size={18} aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product name or article number" />
      </span></label>
      <label className="field">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="">All categories</option>{categories.map((name) => <option key={name}>{name}</option>)}
      </select></label>
    </div>
    <ErrorText error={error} />
    {matches.length ? <>
      <p className="results">{matches.length} {matches.length === 1 ? 'product' : 'products'}</p>
      <div className="product-grid">{matches.map((product) => {
        const quantity = list(state.cart?.lines).find((line) => line.productId === product.id)?.quantity ?? 0
        const out = product.stock != null && product.stock <= 0
        const limit = product.stock != null && quantity >= product.stock
        const available = !!product.id && moneyValue(product.unitPrice) && !limit
        const name = product.name || 'Product ' + (product.articleNumber || product.id || '')
        return <article className="card product" key={product.id}>
          <Photo imageKey={product.imageKey} category={product.category} />
          <div className="product-copy">
            <p className="product-meta">{[product.category, product.articleNumber].filter(Boolean).join(' · ')}</p>
            <h2>{name}</h2><p className="muted">{[product.description, product.variant].filter(Boolean).join(', ')}</p>
            <div className="product-bottom"><strong>{money(product.unitPrice)}</strong>
              <button className="button secondary small" disabled={!available} type="button"
                aria-label={available ? 'Add ' + name + ' to cart' : undefined} onClick={() => add(product)}>
                {available && <Plus size={16} aria-hidden="true" />}{available ? 'Add to cart' : out ? 'Out of stock' : limit ? 'Stock limit' : 'Unavailable'}
              </button>
            </div>
          </div>
        </article>
      })}</div>
    </> : <Empty title={products.length ? 'No matching products' : 'No products available'}>
      {products.length ? 'Try a different search or category.' : 'Your catalog is currently empty.'}
    </Empty>}
  </Page>
}

function CartItem({ item }) {
  const { commit, announce } = useAccount()
  const [quantity, setQuantity] = useState(String(item.quantity ?? ''))
  const [error, setError] = useState('')
  const name = item.product?.name || 'Unavailable product'

  function change(type, value) {
    const result = commit((current) => changeCart(current, type, item.id, value))
    setError(result.error || '')
    if (!result.error && type === 'set_quantity') {
      setQuantity(String(value))
      if (value !== item.quantity) announce('Quantity updated for ' + name + '.')
    }
    if (!result.error && type === 'remove') announce(name + ' removed from your cart.')
  }

  return <article className="cart-item">
    <Photo imageKey={item.product?.imageKey} category={item.product?.category} className="cart-photo" />
    <div className="cart-item-copy"><h3>{name}</h3>
      <p className="muted">{[item.product?.description, item.product?.articleNumber].filter(Boolean).join(' · ') || item.productId}</p>
      <p>{money(item.unitPrice)} each</p>
      {item.product && <form className="quantity-form" noValidate onSubmit={(event) => { event.preventDefault(); change('set_quantity', Number(quantity)) }}>
        <div className="stepper">
          <button type="button" aria-label={'Decrease quantity for ' + name} disabled={item.quantity <= 1}
            onClick={() => change('set_quantity', item.quantity - 1)}><Minus size={16} /></button>
          <input aria-label={'Quantity for ' + name} type="number" min="1" step="1" max={item.product.stock}
            value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <button type="button" aria-label={'Increase quantity for ' + name}
            disabled={item.product.stock != null && item.quantity >= item.product.stock}
            onClick={() => change('set_quantity', Number(item.quantity) + 1)}><Plus size={16} /></button>
        </div>
        <button type="submit" className="text-button" aria-label={'Update quantity for ' + name}>Update</button>
      </form>}
      <button className="text-button" type="button" aria-label={'Remove ' + name} onClick={() => change('remove')}>Remove</button>
      <ErrorText error={error} />
    </div>
    <strong className="cart-line-total">{money(item.lineAmount)}</strong>
  </article>
}

export function Cart() {
  const { state } = useAccount()
  const review = reviewCart(state)
  return <Page title="Your cart" description="Review your items before arranging delivery."
    action={<AccountLink to="/products" className="button secondary">Browse products</AccountLink>}>
    {!review.items.length ? <Empty title="Your cart is empty" action={<AccountLink className="button primary" to="/products">Browse products</AccountLink>}>
      Add something from Products to get started.
    </Empty> : <div className="split">
      <div className="card rows">{review.items.map((item) => <CartItem key={item.id} item={item} />)}</div>
      <PriceSummary entries={[]} totalLabel="Subtotal" total={review.subtotal}>
        <p className="muted">Delivery and tax are calculated at checkout.</p>
        {review.error ? <ErrorText error={review.error} /> : <AccountLink className="button primary full" to="/checkout">Continue to checkout</AccountLink>}
      </PriceSummary>
    </div>}
  </Page>
}

const addressFields = [
  ['line1', 'Street address', 'address-line1'], ['line2', 'Apartment or suite (optional)', 'address-line2'],
  ['city', 'City', 'address-level2'], ['region', 'State', 'address-level1'], ['postalCode', 'ZIP code', 'postal-code'],
]

export function AssemblySelection({ choices, quantities, setQuantities, slots, slotId, setSlotId, consent, setConsent }) {
  return <div className="assembly-selection">
    <fieldset>
      <legend>Items to assemble</legend>
      <div className="choice-lines">
        {choices.map((line) => <label className="choice-line" key={line.id}>
          <span><strong>{line.name || 'Order item'}</strong><small>{money(line.assemblyUnitPrice)} each · {line.remaining} available</small></span>
          <input aria-label={'Assembly quantity for ' + (line.name || line.id)} type="number" min="0"
            max={line.remaining} step="1" value={quantities[line.id] ?? 0}
            onChange={(event) => setQuantities({ ...quantities, [line.id]: event.target.value })} />
        </label>)}
      </div>
    </fieldset>
    <SlotChoices legend="Assembly window" name="assembly-slot" slots={slots} value={slotId} onChange={setSlotId}
      empty="Choose a delivery window with time left for assembly." />
    <label className="check"><input type="checkbox" checked={consent}
      onChange={(event) => setConsent(event.target.checked)} />I agree to the assembly service and the price shown.</label>
  </div>
}

function CheckoutConfirmation({ order, bookings }) {
  const services = list(bookings).filter((booking) => booking.orderId === order.id)
  return <Page title="Order confirmed" description={'Order ' + orderLabel(order)} back={['/orders', 'Purchases']}>
    <div className="card panel confirmation">
      <span className="tile-icon"><Check size={24} aria-hidden="true" /></span>
      <h2>Your order has been placed</h2>
      <p className="muted">Find your items and scheduled services below.</p>
      <AccountLink className="button primary" to={detailPath('orders', order.id)}>View order</AccountLink>
      <div className="actions">{services.map((booking) => <AccountLink key={booking.id}
        className="button secondary" title={slotText(booking.slot)} to={detailPath('services', booking.id)}>
        {booking.type === 'assembly' ? 'View assembly' : 'View delivery'}
      </AccountLink>)}</div>
    </div>
  </Page>
}

export function Checkout() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const confirmation = params.get('confirmed')
  const order = confirmation && byId(state.orders, confirmation)
  if (confirmation) return order ? <CheckoutConfirmation order={order} bookings={state.bookings} />
    : <Page title="Order unavailable"><Empty title="We couldn’t find that order" action={<AccountLink to="/orders">Back to purchases</AccountLink>} /></Page>
  return <CheckoutForm />
}

function CheckoutForm() {
  const { state, commit } = useAccount()
  const navigate = useAccountNavigate()
  const [address, setAddress] = useState(() => Object.fromEntries(addressFields.map(([key]) => [key, state.profile?.address?.[key] || ''])))
  const [deliverySlot, setDeliverySlot] = useState('')
  const [assembly, setAssembly] = useState(false)
  const [quantities, setQuantities] = useState({})
  const [assemblySlot, setAssemblySlot] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const review = reviewCart(state)
  const slots = serviceSlots('delivery')
  const chosenDelivery = byId(slots, deliverySlot)
  const eligible = review.items.filter((item) => moneyValue(item.product?.assemblyUnitPrice)).map((item) => ({
    id: item.id, name: item.product.name, remaining: item.quantity, assemblyUnitPrice: item.product.assemblyUnitPrice,
  }))
  const selection = assemblyItems(eligible, quantities)
  const totals = checkoutTotals(review.subtotal, assembly ? selection.amount : 0)

  function submit(event) {
    event.preventDefault()
    const cleaned = Object.fromEntries(Object.entries(address).map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value))
    const result = commit((current) => checkout(current, {
      address: { ...cleaned, country: 'US' }, deliverySlot, assembly, quantities, assemblySlot, consent,
    }))
    setError(result.error || '')
    if (result.order) navigate('/checkout?confirmed=' + encodeURIComponent(result.order.id), { replace: true })
  }

  if (review.error) return <Page title="Checkout" back={['/cart', 'Back to cart']}>
    <Empty title="Your cart needs attention" action={<AccountLink className="button primary" to="/cart">Review cart</AccountLink>}>
      {review.error}
    </Empty>
  </Page>
  return <Page title="Checkout" description="Choose when your order arrives and review your total." back={['/cart', 'Back to cart']}>
    <form className="split" onSubmit={submit} noValidate>
      <div className="stack">
        <section className="card panel"><h2>Delivery address</h2>
          <div className="address-grid">{addressFields.map(([key, label, autoComplete]) => <label key={key}
            className={'field ' + (key.startsWith('line') ? 'span' : '')}>{label}
            <input autoComplete={autoComplete} inputMode={key === 'postalCode' ? 'numeric' : undefined}
              required={key !== 'line2'} value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} />
          </label>)}</div>
        </section>
        <section className="card panel"><h2>Schedule delivery</h2>
          <SlotChoices legend="Available delivery windows" name="delivery-slot" slots={slots} value={deliverySlot}
            onChange={(id) => { setDeliverySlot(id); setAssemblySlot('') }} fee={deliveryFee} />
        </section>
        <section className="card panel"><h2>Assembly</h2>
          {eligible.length ? <>
            <label className="check"><input type="checkbox" checked={assembly}
              onChange={(event) => setAssembly(event.target.checked)} />Add assembly for eligible items</label>
            {assembly && <AssemblySelection choices={eligible} quantities={quantities} setQuantities={setQuantities}
              slots={assemblySlots(Date.parse(chosenDelivery?.endsAt))} slotId={assemblySlot} setSlotId={setAssemblySlot}
              consent={consent} setConsent={setConsent} />}
          </> : <p className="muted">The items in your cart do not need assembly.</p>}
        </section>
      </div>
      <PriceSummary entries={[['Merchandise', totals.subtotal], ['Delivery', totals.delivery], ['Assembly', totals.assembly], ['Tax', totals.tax]]}
        totalLabel="Order total" total={totals.total}>
        <ul className="summary-items">{review.items.map((item) => <li key={item.id}>
          <span>{item.product.name || item.productId} × {item.quantity}</span><span>{money(item.lineAmount)}</span>
        </li>)}</ul>
        <ErrorText error={error} />
        <button className="button primary full" type="submit">Confirm order</button>
      </PriceSummary>
    </form>
  </Page>
}
