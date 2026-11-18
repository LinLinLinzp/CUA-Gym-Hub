import React, { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CreditCard, MapPin, MessageCircle, ShoppingBag, Truck } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LocalLink, pathFor, useAction, useLocalNavigate, useStore } from './store.jsx'
import { getSessionId } from './utils/dataManager.js'
import { byId, cents, changeCart, checkoutGroups, configuration, list, money, owned, purchase, returnPolicy, sum } from './model.js'
import { Art, ButtonLink, Choose, Empty, ErrorNote, FavoriteButton, Field, Heading, ListingGrid, Missing, ShopCard, Totals, artist, matches } from './ui.jsx'

const draftKey = () => 'etsy:buy-now:' + (getSessionId() || '_default')
const getDraft = () => {
  try { return JSON.parse(sessionStorage.getItem(draftKey())) }
  catch { return null }
}
const catalogKeys = ['q', 'category', 'max', 'sort', 'view']
const browseParams = (params) => new URLSearchParams(catalogKeys.flatMap((key) => params.get(key) ? [[key, params.get(key)]] : []))
const queryString = (params) => params.size ? '?' + params.toString() : ''

export function Marketplace() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const navigate = useLocalNavigate()
  const context = browseParams(params)
  const q = context.get('q') || ''
  const category = context.get('category') || ''
  const max = context.get('max') || ''
  const sort = context.get('sort') || 'featured'
  const view = context.get('view') || 'items'
  const listings = list(state.listings)
  const categories = [...new Set(listings.map((listing) => listing.category).filter(Boolean))].sort()
  const results = listings.filter((listing) => matches(q, listing.title, artist(state, listing.shopId), listing.category, ...list(listing.tags))
    && (!category || listing.category === category) && (!max || Number(listing.price) <= Number(max)))
  if (sort === 'low') results.sort((a, b) => a.price - b.price)
  if (sort === 'high') results.sort((a, b) => b.price - a.price)
  if (sort === 'recent') results.sort((a, b) => String(b.createdAt || '').localeCompare(a.createdAt || ''))
  const shops = list(state.shops).filter((shop) => matches(q, shop.name, shop.location))
  const update = (key, value) => {
    const next = browseParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    navigate('/search' + queryString(next))
  }
  return <>
    <Heading title={q ? 'Results for “' + q + '”' : 'Browse marketplace'}>Explore handmade goods and independent shops.</Heading>
    <div className="tabs" aria-label="Marketplace results">
      <button aria-pressed={view !== 'shops'} onClick={() => update('view', '')}>Items</button>
      <button aria-pressed={view === 'shops'} onClick={() => update('view', 'shops')}>Shops</button>
    </div>
    {view !== 'shops' && <div className="panel filter-bar">
      <Field label="Category"><Choose value={category} placeholder="All categories" options={Object.fromEntries(categories.map((name) => [name, name]))} onChange={(e) => update('category', e.target.value)} /></Field>
      <Field label="Price"><Choose value={max} placeholder="Any price" options={{ 20: '$20 and under', 35: '$35 and under', 50: '$50 and under', 100: '$100 and under' }} onChange={(e) => update('max', e.target.value)} /></Field>
      <Field label="Sort by"><Choose value={sort} placeholder="" options={{ featured: 'Featured', low: 'Price: low to high', high: 'Price: high to low', recent: 'Newest' }} onChange={(e) => update('sort', e.target.value)} /></Field>
      <button className="button secondary" onClick={() => navigate('/search' + (q ? '?q=' + encodeURIComponent(q) : ''))}>Clear filters</button>
    </div>}
    <p className="result-count">{view === 'shops' ? shops.length + ' shops' : results.length + ' items'}</p>
    {view === 'shops' ? (shops.length ? <div className="stack">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} context={queryString(context)} />)}</div> : <Empty title="No matching shops" />)
      : results.length ? <ListingGrid listings={results} context={queryString(context)} /> : <Empty title="No matching items"><p>Try another search or clear your filters.</p></Empty>}
  </>
}

export function Listing() {
  const { listingId } = useParams()
  const { state } = useStore()
  const listing = byId(state.listings, listingId)
  return listing ? <ListingDetail key={listingId} listing={listing} />
    : <Missing title="Listing unavailable" to="/search" label="Browse marketplace" />
}
function ListingDetail({ listing }) {
  const { state, commit, notify } = useStore()
  const [params] = useSearchParams()
  const context = queryString(browseParams(params))
  const navigate = useLocalNavigate()
  const { run, error } = useAction()
  const [variants, setVariants] = useState({})
  const [personalization, setPersonalization] = useState('')
  const [quantity, setQuantity] = useState('1')
  const shop = byId(state.shops, listing.shopId)
  const sold = !(Number(listing.stock) > 0)
  const submit = (mode) => run(() => {
    const draft = configuration(listing, Number(quantity), variants, personalization)
    if (mode === 'buy') {
      sessionStorage.setItem(draftKey(), JSON.stringify(draft))
      navigate('/checkout?mode=buy-now' + (context ? '&' + context.slice(1) : ''))
    } else {
      commit((current, at) => changeCart(current, { draft }, at))
      notify('Added to cart.')
    }
  })
  return <>
    <LocalLink className="back-link" to={'/search' + context}><ArrowLeft size={17} /> Back to marketplace</LocalLink>
    <div className="listing-detail">
      <Art src={listing.image} alt={listing.title || 'Listing artwork'} />
      <section className="panel product-panel">
        {shop ? <LocalLink className="text-link" to={pathFor('shop', shop.id) + context}>{shop.name}</LocalLink> : <small>Independent shop</small>}
        <h1>{listing.title || 'Untitled listing'}</h1>
        <div className="listing-price">{money(listing.price, listing.currency)}</div>
        <p>{listing.description || 'Contact the shop for item details.'}</p>
        {!sold && shop && <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); submit('cart') }}>
          {list(listing.variants).map((group) => <Field key={group.id} label={group.name || 'Option'}>
            <Choose value={variants[group.id] || ''} options={Object.fromEntries(list(group.options).map((option) => [option.id, option.label || option.id]))}
              onChange={(e) => setVariants({ ...variants, [group.id]: e.target.value })} required />
          </Field>)}
          {listing.personalization && <Field label={listing.personalization.required ? 'Personalization (required)' : 'Personalization (optional)'} hint={listing.personalization.prompt}>
            <input value={personalization} onChange={(e) => setPersonalization(e.target.value)} maxLength={listing.personalization.maxLength ?? 200} required={listing.personalization.required} />
          </Field>}
          <Field label="Quantity" hint={listing.stock + ' available'}><input type="number" value={quantity} min="1" max={listing.stock} onChange={(e) => setQuantity(e.target.value)} required /></Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="actions"><button className="button" type="submit">Add to cart</button><button className="button secondary" type="button" onClick={() => submit('buy')}>Buy it now</button></div>
        </form>}
        {(sold || !shop) && <p className="callout">{sold ? 'Sold out' : 'This shop is currently unavailable.'}</p>}
        <div className="actions listing-actions"><FavoriteButton id={listing.id} />
          {shop && <ButtonLink secondary to={'/messages?listing=' + encodeURIComponent(listing.id)}><MessageCircle size={17} /> Message seller</ButtonLink>}
        </div>
        <div className="shipping-note"><Truck size={20} aria-hidden="true" /><div><strong>Shipping and returns</strong>
          <p>{money(listing.shippingPrice, listing.currency)} shipping{listing.deliveryDays?.length === 2 ? ' · ' + listing.deliveryDays.join('–') + ' days' : ''}</p>
          <p>{returnPolicy(listing.returnPolicy)}</p></div></div>
      </section>
    </div>
  </>
}

export function Shop() {
  const { shopId } = useParams()
  const { state } = useStore()
  const [params] = useSearchParams()
  const shop = byId(state.shops, shopId)
  const items = list(state.listings).filter((listing) => listing.shopId === shopId && Number(listing.stock) > 0)
  if (!shop) return <Missing title="Shop unavailable" to="/search" label="Browse marketplace" />
  const context = queryString(browseParams(params))
  return <>
    <LocalLink to={'/search' + context} className="back-link"><ArrowLeft size={17} /> Back to marketplace</LocalLink>
    <section className="panel shop-profile">
      <Art src={shop.image} /><div><h1>{shop.name || 'Independent shop'}</h1>
        <p>{[shop.ownerName, shop.location, Number(shop.rating) > 0 && Number(shop.rating).toFixed(1) + ' stars'].filter(Boolean).join(' · ')}</p>
        {shop.description && <p>{shop.description}</p>}
        <div className="actions"><FavoriteButton type="shop" id={shop.id} />
          <ButtonLink secondary to={'/messages?shop=' + encodeURIComponent(shop.id)}><MessageCircle size={17} /> Contact shop</ButtonLink></div>
      </div>
    </section>
    <div className="section-heading"><h2>Available items</h2></div>
    {items.length ? <ListingGrid listings={items} context={context} /> : <Empty title="No available items" />}
  </>
}

function CartRow({ line }) {
  const { state, commit, notify } = useStore()
  const { run, error } = useAction()
  const product = byId(state.listings, line.listingId)
  const [edited, setEdited] = useState(null)
  const quantity = edited ?? line.quantity ?? ''
  const update = (value) => run(() => {
    commit((current, at) => changeCart(current, { id: line.id, quantity: value }, at))
    setEdited(null)
    notify(value ? 'Cart quantity updated.' : 'Item removed from cart.')
  })
  return <div className="cart-row">
    <Art src={product?.image} />
    <div><LocalLink className="product-title" to={pathFor('listing', line.listingId)}>{product?.title || 'Unavailable item'}</LocalLink>
      {list(line.variants).length > 0 && <small>{line.variants.map((option) => option.label || option.optionId).join(', ')}</small>}
      {line.personalization && <small>Personalization: {line.personalization}</small>}
      <strong>{money(cents(product?.price ?? line.unitPrice) * (Number(line.quantity) || 0) / 100, line.currency)}</strong>
      <form className="actions quantity-form" onSubmit={(event) => { event.preventDefault(); update(Number(quantity)) }}>
        <Field label="Quantity"><input type="number" min="1" required value={quantity} onChange={(event) => setEdited(event.target.value)} /></Field>
        <button className="button secondary">Update</button><button className="plain" type="button" onClick={() => update(0)}>Remove</button>
      </form>
      <ErrorNote>{error}</ErrorNote>
    </div>
  </div>
}

function review(state, lines) {
  try { return { groups: checkoutGroups(state, lines) } }
  catch (error) { return { groups: [], error: error.message } }
}
function Summary({ groups, error, children }) {
  return <aside className="panel summary"><h2>Order summary</h2>
    {groups.map((group) => <div className="summary-shop" key={group.shop.id}><strong>{group.shop.name || 'Shop'}</strong>
      {group.items.map((line, i) => <div key={line.id || i}><span>{line.quantity} × {money(line.unitPrice, line.currency)}</span><span>{money(cents(line.unitPrice) * line.quantity / 100, line.currency)}</span></div>)}
    </div>)}
    {groups.length > 0 && <Totals subtotal={sum(groups, 'subtotal')} shipping={sum(groups, 'shipping')} tax={0} total={sum(groups, 'total')} currency={groups[0].currency} />}
    <ErrorNote>{error}</ErrorNote>{children}
  </aside>
}
export function Cart() {
  const { state } = useStore()
  const lines = owned(state.cartItems, state.buyer)
  const checked = review(state, lines)
  return <>
    <Heading title="Cart" action={<ButtonLink secondary to="/search">Continue shopping</ButtonLink>} />
    {!lines.length ? <Empty title="Your cart is empty"><ButtonLink to="/search">Browse marketplace</ButtonLink></Empty>
      : <div className="split checkout-grid"><div className="stack">
        {[...new Set(lines.map((line) => line.shopId))].map((shopId) => <section className="panel" key={shopId || 'unknown'}>
          <h2>{artist(state, shopId)}</h2>{lines.filter((line) => line.shopId === shopId).map((line) => <CartRow key={line.id} line={line} />)}
        </section>)}
      </div><Summary {...checked}>{!checked.error && <ButtonLink to="/checkout">Proceed to checkout <ArrowRight size={16} /></ButtonLink>}</Summary></div>}
  </>
}

export function Checkout() {
  const { state, commit, notify } = useStore()
  const [params] = useSearchParams()
  const navigate = useLocalNavigate()
  const { run, error } = useAction()
  const submitted = useRef(false)
  const buyNow = params.get('mode') === 'buy-now'
  const context = queryString(browseParams(params))
  const draft = buyNow ? getDraft() : null
  const lines = buyNow ? (draft ? [draft] : []) : owned(state.cartItems, state.buyer)
  const checked = review(state, lines)
  const addresses = list(state.buyer.addresses)
  const payments = list(state.buyer.paymentMethods)
  const [addressId, setAddress] = useState(byId(addresses, state.buyer.defaultAddressId)?.id || addresses[0]?.id || '')
  const [paymentId, setPayment] = useState(byId(payments, state.buyer.defaultPaymentMethodId)?.id || payments[0]?.id || '')
  const address = byId(addresses, addressId)
  const payment = byId(payments, paymentId)
  const submit = (event) => {
    event.preventDefault()
    if (submitted.current || checked.error || (buyNow && !draft)) return
    submitted.current = true
    const result = run(() => commit((current, at) => purchase(current, { draft, addressId, paymentId }, at)))
    if (!result) { submitted.current = false; return }
    if (buyNow) sessionStorage.removeItem(draftKey())
    notify(result.orderIds.length === 1 ? 'Order placed.' : result.orderIds.length + ' orders placed.')
    navigate(result.orderIds.length === 1 ? pathFor('purchases', result.orderIds[0]) : '/purchases', { replace: true })
  }
  return <>
    <LocalLink className="back-link" to={buyNow ? (draft ? pathFor('listing', draft.listingId) : '/search') + context : '/cart'}><ArrowLeft size={17} /> {buyNow ? 'Back to shopping' : 'Back to cart'}</LocalLink>
    <Heading title="Checkout" />
    {!lines.length ? <Empty title={buyNow ? 'Select an item to buy' : 'Your cart is empty'}><ButtonLink to={buyNow ? '/search' : '/cart'} secondary>{buyNow ? 'Browse marketplace' : 'Back to cart'}</ButtonLink></Empty>
      : <form className="split checkout-grid" onSubmit={submit}>
        <div className="stack">
          <section className="panel stack"><h2><MapPin size={20} /> Shipping address</h2>
            {addresses.length ? <Field label="Saved address"><Choose options={Object.fromEntries(addresses.map((row) => [row.id, [row.name, row.line1].filter(Boolean).join(' · ')]))}
              value={addressId} onChange={(event) => setAddress(event.target.value)} required /></Field> : <p>No saved shipping address is available.</p>}
            {address && <p>{[address.line2, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(', ')}</p>}
          </section>
          <section className="panel stack"><h2><CreditCard size={20} /> Payment</h2>
            {payments.length ? <Field label="Saved payment method"><Choose options={Object.fromEntries(payments.map((row) => [row.id, (row.brand || 'Card') + ' ending in ' + (row.last4 || '••••')]))}
              value={paymentId} onChange={(event) => setPayment(event.target.value)} required /></Field> : <p>No saved payment method is available.</p>}
          </section>
          {checked.groups.length > 0 && <section className="panel stack"><h2><ShoppingBag size={20} /> Review your items</h2>
            {checked.groups.map((group) => <div key={group.shop.id}><strong>{group.shop.name}</strong><small>Estimated delivery in {group.delivery.join('–')} days</small>
              {group.items.map((line, i) => <p key={line.id || i}>{line.quantity} × {byId(state.listings, line.listingId)?.title}
                {line.variants.length > 0 && ' · ' + line.variants.map((option) => option.label).join(', ')}{line.personalization && ' · ' + line.personalization}</p>)}</div>)}
          </section>}
        </div><Summary {...checked}><ErrorNote>{error}</ErrorNote><button className="button" disabled={Boolean(checked.error) || !address || !payment}>Place your order</button></Summary>
      </form>}
  </>
}
