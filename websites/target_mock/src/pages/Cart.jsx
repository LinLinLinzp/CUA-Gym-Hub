import { useState } from 'react'
import { Truck, Store } from 'lucide-react'
import { useStore } from '../store.jsx'
import { byId, list, money } from '../utils/read.js'
import { changeCart } from '../domain/cart.js'
import { lineIssue, lineItem, positiveInt, validCents } from '../domain/inventory.js'
import { priceCart } from '../domain/pricing.js'
import { Empty, PageHeading, ShopLink, useFeedback } from '../components/ui.jsx'
import { useStorePicker } from '../components/StorePicker.jsx'
import ProductImage from '../components/ProductImage.jsx'
import CartOffers from '../components/CartOffers.jsx'
import PriceSummary from '../components/PriceSummary.jsx'

function CartRow({ line }) {
  const { state, transact } = useStore()
  const { notify } = useFeedback()
  const pickStore = useStorePicker()
  const [quantity, setQuantity] = useState(String(line.quantity ?? ''))
  const [error, setError] = useState('')
  const items = list(state.cart?.items)
  const { product, variant } = lineItem(state, line)
  const title = product?.title || line.title || 'Unavailable item'
  const method = line.fulfillment
  const store = byId(state.stores, line.storeId)
  const issue = lineIssue(state, line, items)
  const price = variant?.priceCents ?? line.unitPriceCents
  const productLink = product?.id ? `/p/${encodeURIComponent(product.id)}` : null

  function mutate(action, fields = {}) {
    const result = transact((world) => changeCart(world, { id: line.id, action, ...fields }))
    setError(result.error || '')
    if (result.state) {
      const message = {
        quantity_change: 'Quantity updated.', fulfillment_change: 'Fulfillment updated.', remove: 'Item removed from your cart.',
        save_for_later: 'Item saved for later.',
      }[action]
      notify(message)
    }
    return result
  }

  function choosePickup() {
    pickStore({
      currentStoreId: method === 'pickup' ? line.storeId : undefined,
      onSelect: (storeId) => mutate('fulfillment_change', { fulfillment: 'pickup', storeId }),
      isAvailable: (world, storeId) => {
        const current = byId(world.cart?.items, line.id)
        if (!current) return false
        const replacement = { ...current, storeId, fulfillment: 'pickup' }
        return !lineIssue(world, replacement, list(world.cart?.items).map((item) => item.id === current.id ? replacement : item))
      },
    })
  }

  return <article className="cart-row">
    <ProductImage product={product || { title }} variant={variant} />
    <div className="cart-row-main stack">
      <h3>{productLink ? <ShopLink to={productLink}>{title}</ShopLink> : title}</h3>
      {(variant?.label || line.variantLabel) && <p className="small muted">{variant?.label || line.variantLabel}</p>}
      {issue && <p className="error small">{issue}</p>}
      <form className="quantity-form" onSubmit={(event) => {
        event.preventDefault()
        mutate('quantity_change', { quantity: Number(quantity) })
      }}>
        <label className="field">Quantity<input type="number" min="1" aria-label={`Quantity for ${title}`} value={quantity} onChange={(event) => { setQuantity(event.target.value); setError('') }} /></label>
        <button type="submit" className="button secondary" disabled={!product || !variant || !positiveInt(Number(quantity)) || Number(quantity) === line.quantity}>Update</button>
      </form>
      <div className="cluster cart-row-actions">
        <button className="text-button" onClick={() => mutate('save_for_later')}>Save for later</button>
        <button className="text-button" onClick={() => mutate('remove')}>Remove</button>
      </div>
      {error && <p className="small error" role="alert">{error}</p>}
    </div>
    <div className="cart-row-options stack">
      <p><strong>{validCents(price) ? money(price) : 'Price unavailable'}</strong>{line.quantity > 1 && <span className="small muted"> each</span>}</p>
      <label className="field">Fulfillment<select value={method || ''} aria-label={`Fulfillment for ${title}`} disabled={!product || !variant}
        onChange={(event) => {
          if (event.target.value === 'shipping') mutate('fulfillment_change', { fulfillment: 'shipping' })
          else choosePickup()
        }}>
        {!['shipping', 'pickup'].includes(method) && <option value={method || ''}>Choose method</option>}
        <option value="shipping" disabled={!variant?.shippingAvailable}>Shipping</option><option value="pickup">Order Pickup</option>
      </select></label>
      {method === 'pickup' && <div><p className="small">{store?.name ? `Target ${store.name}` : 'Pickup store unavailable'}</p>
        <button className="text-button" onClick={choosePickup} disabled={!product || !variant}>Change pickup store</button></div>}
    </div>
  </article>
}

function SavedRow({ line }) {
  const { state, transact } = useStore()
  const { notify } = useFeedback()
  const [error, setError] = useState('')
  const { product, variant } = lineItem(state, line)
  const title = product?.title || line.title || 'Unavailable item'
  const unitPrice = variant?.priceCents ?? line.unitPriceCents

  function mutate(action) {
    const result = transact((world) => changeCart(world, { id: line.id, action, saved: true }))
    setError(result.error || '')
    if (result.state) notify(action === 'remove' ? 'Saved item removed.' : 'Item moved to your cart.')
  }

  return <article className="cart-row">
    <ProductImage product={product || { title }} variant={variant} />
    <div className="stack cart-row-main">
      <h3>{product?.id ? <ShopLink to={`/p/${encodeURIComponent(product.id)}`}>{title}</ShopLink> : title}</h3>
      <p className="small muted">{variant?.label || line.variantLabel || 'Standard'} · Quantity {line.quantity ?? 'unavailable'}</p>
      <p>{validCents(unitPrice) ? money(unitPrice) : 'Price unavailable'} {line.quantity > 1 && ' each'}</p>
      {!variant && <p className="small error">This item or option is no longer available.</p>}
      <div className="cluster cart-row-actions">
        <button className="button secondary" onClick={() => mutate('move_to_cart')} disabled={!variant}>Move to cart</button>
        <button className="text-button" onClick={() => mutate('remove')}>Remove</button>
      </div>
      {error && <p className="small error" role="alert">{error}</p>}
    </div>
  </article>
}

export function Cart() {
  const { state } = useStore()
  const items = list(state.cart?.items)
  const savedItems = list(state.cart?.savedItems)
  const shipping = items.filter((line) => line.fulfillment === 'shipping')
  const pickupIds = [...new Set(items.filter((line) => line.fulfillment === 'pickup').map((line) => line.storeId ?? null))]
  const other = items.filter((line) => !['shipping', 'pickup'].includes(line.fulfillment))
  const count = items.reduce((total, item) => total + (positiveInt(item.quantity) ? item.quantity : 0), 0)
  const price = priceCart(state)
  const invalid = price.lines.some((entry) => entry.issue)
  const groups = [
    ...(shipping.length ? [{ id: 'shipping', title: 'Shipping', lines: shipping }] : []),
    ...pickupIds.map((id) => ({ id: `pickup-${id}`, title: 'Order Pickup', store: byId(state.stores, id), lines: items.filter((line) => line.fulfillment === 'pickup' && (line.storeId ?? null) === id) })),
    ...(other.length ? [{ id: 'other', title: 'Choose fulfillment', lines: other }] : []),
  ]
  return <>
    <PageHeading title="Cart"><p className="muted">{count} {count === 1 ? 'item' : 'items'}</p></PageHeading>
    <div className="review-layout">
      <div className="stack">
        {groups.map((group) => <section className="panel cart-group" key={group.id}>
          <div className="cart-group-heading"><h2>{group.id === 'shipping' ? <Truck size={24} /> : <Store size={24} />}{group.title}</h2>
            {group.title === 'Order Pickup' && <p className="muted">{group.store ? `Target ${group.store.name || 'store'}` : 'Pickup store unavailable'}</p>}</div>
          {group.lines.map((line) => <CartRow line={line} key={`${line.id}-${line.quantity}`} />)}
        </section>)}
        {!items.length && <Empty title="Your cart is empty" to="/s?q=" action="Continue shopping">Find something you like and add it to your cart.</Empty>}
        <CartOffers price={price} state={state} />
        {savedItems.length > 0 && <section className="panel cart-group">
          <div className="cart-group-heading"><h2>Saved for later</h2><p className="muted">{savedItems.length} {savedItems.length === 1 ? 'item' : 'items'}</p></div>
          {savedItems.map((line) => <SavedRow key={line.id} line={line} />)}
        </section>}
      </div>
      <PriceSummary price={price}>
        {invalid && <p className="error small">Resolve the availability issues in your cart before checkout.</p>}
        {items.length > 0 && !invalid ? <ShopLink className="button primary" to="/checkout">Continue to checkout</ShopLink> :
          <button type="button" className="button primary" disabled>Continue to checkout</button>}
      </PriceSummary>
    </div>
  </>
}
