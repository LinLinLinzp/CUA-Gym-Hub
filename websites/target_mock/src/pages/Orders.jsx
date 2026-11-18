import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight, MapPin, Store, Truck } from 'lucide-react'
import { useStore } from '../store.jsx'
import { addressText, byId, dateText, list, money } from '../utils/read.js'
import { lineItem, pickupStatus, pickupStock, validCents } from '../domain/inventory.js'
import { lineLabels, managePickup, orderLabels, pickupActions, pickupLabels, pickupLines } from '../domain/pickup.js'
import { canRefund, refundLine } from '../domain/refund.js'
import { Empty, PageHeading, ShopLink, Status, useFeedback } from '../components/ui.jsx'
import { MaskedPayment, PersonFields } from '../components/OrderFields.jsx'
import ProductImage from '../components/ProductImage.jsx'
import OrderReturns from '../components/OrderReturns.jsx'
import { PurchaseOptions } from './Shop.jsx'
import Barcode from '../components/Barcode.jsx'

export const orderPath = (order) => `/orders/${encodeURIComponent(order.id)}`
export const orderNumber = (order) => order.orderNumber || order.id

function StatusLabel({ value, labels }) {
  const [label, tone] = Object.hasOwn(labels, value) ? labels[value] : ['Status unavailable', 'neutral']
  return <Status tone={tone}>{label}</Status>
}

function PurchaseCard({ order, pickups }) {
  const items = list(order.items)
  return <article className="panel purchase-card">
    <div className="purchase-card-heading"><div><h2>Order #{orderNumber(order)}</h2><p className="small muted">{dateText(order.createdAt)} · {money(order.totalCents)}</p></div>
      <ShopLink className="button secondary" to={orderPath(order)}>Order details <ArrowRight size={16} /></ShopLink></div>
    <div className="cluster">
      {pickups.length ? [...new Set(pickups.map((pickup) => pickupStatus(pickup)))].map((status) => <StatusLabel key={status} value={status} labels={pickupLabels} />) :
        <StatusLabel value={order.status} labels={orderLabels} />}
      {items.some((item) => item.fulfillment === 'shipping') && <Status>Shipping</Status>}
    </div>
    {items.length ? <p>{items.slice(0, 4).map((item) => item.title || 'Unavailable item').join(' · ')}{items.length > 4 && ` · +${items.length - 4} more`}</p> :
      <p className="small muted">Item details unavailable</p>}
  </article>
}

export function Purchases() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const pickupByOrder = new Map()
  for (const pickup of list(state.pickupOrders)) {
    const records = pickupByOrder.get(pickup.orderId) || []
    records.push(pickup)
    pickupByOrder.set(pickup.orderId, records)
  }
  const orders = list(state.orders).filter((order) => {
    const items = list(order.items)
    const pickups = pickupByOrder.get(order.id) || []
    const searchable = [order.orderNumber, order.id, ...items.map((item) => item.title)].filter(Boolean).join(' ').toLowerCase()
    return terms.every((term) => searchable.includes(term)) &&
      (!filter || order.status === filter || pickups.some((pickup) => pickupStatus(pickup) === filter) || items.some((item) => item.status === filter))
  }).sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')) ||
    String(orderNumber(second)).localeCompare(String(orderNumber(first))))
  return <div className="orders-page">
    <PageHeading title="Purchase history"><p className="muted">Find your orders, pickup details and returns.</p></PageHeading>
    <div className="cluster orders-tools">
      <label className="field">Search purchases<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or item name" /></label>
      <label className="field">Status<select value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">All statuses</option>
        {Object.entries({ ...orderLabels, ...pickupLabels, delivered: lineLabels.delivered }).map(([value, [label]]) =>
          <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    {orders.length ? <div className="stack">{orders.map((order) => <PurchaseCard order={order} pickups={pickupByOrder.get(order.id) || []} key={order.id} />)}</div> :
      <Empty title="No purchases found" to="/s?q=" action="Continue shopping">Try another order number or item name.</Empty>}
  </div>
}

function OrderLine({ item }) {
  const { state } = useStore()
  const { open, close } = useFeedback()
  const { product, variant } = lineItem(state, item)
  const title = item.title || product?.title || 'Unavailable item'
  const rebuy = ['collected', 'delivered'].includes(item.status) && variant && validCents(variant.priceCents) &&
    (variant.shippingAvailable || list(state.stores).some((store) => pickupStock(state, variant, store.id) > 0))
  return <article className="checkout-row order-line">
    <ProductImage product={product || { title }} variant={variant} />
    <div><h3>{product?.id ? <ShopLink to={`/p/${encodeURIComponent(product.id)}`}>{title}</ShopLink> : title}</h3>
      <p className="small muted">Quantity {item.quantity ?? 'unavailable'}{item.variantLabel && ` · ${item.variantLabel}`}</p>
      <StatusLabel value={item.status} labels={lineLabels} />
      {rebuy && <button className="text-button buy-again" onClick={() => open({
        title: 'Buy it again',
        content: <div className="stack"><h3>{product.title || title}</h3>
          <PurchaseOptions product={product} source="buy_again" initialVariantId={item.variantId} initialMethod={item.fulfillment} onAdded={close} />
        </div>,
      })}>Buy it again</button>}</div>
    <strong>{Number.isInteger(item.paidCents) ? money(item.paidCents) : 'Price unavailable'}</strong>
  </article>
}

function PickupPersonForm({ order, pickup }) {
  const { transact } = useStore()
  const { close, notify } = useFeedback()
  const [value, setValue] = useState({
    fullName: pickup.alternatePickupPerson?.fullName || '', email: pickup.alternatePickupPerson?.email || '',
  })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  return <form className="stack" noValidate onSubmit={(event) => {
    event.preventDefault()
    const result = transact((state) => managePickup(state, { orderId: order.id, pickupId: pickup.id, action: 'edit_person', person: value }))
    if (result.error) { setErrors(result.errors || {}); setFailure(result.error); return }
    close()
    if (result.state) notify('Pickup person updated.')
  }}>
    <PersonFields value={value} errors={errors} update={(key, text) => {
      setValue({ ...value, [key]: text }); setErrors({ ...errors, [key]: '' }); setFailure('')
    }} />
    {failure && <p className="error small" role="alert">{failure}</p>}
    <div className="cluster"><button className="button primary" type="submit">Save pickup person</button><button className="button secondary" type="button" onClick={close}>Close</button></div>
  </form>
}

function CancelItemsForm({ order, pickup, lines }) {
  const { transact } = useStore()
  const { close, notify } = useFeedback()
  const [selected, setSelected] = useState([])
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const chosen = lines.filter((item) => selected.includes(item.id))
  const amount = chosen.reduce((total, item) => total + (canRefund(item) ? refundLine(item).amountCents : 0), 0)
  return <form className="stack" onSubmit={(event) => {
    event.preventDefault()
    if (!selected.length) return
    if (!review) { setReview(true); return }
    const result = transact((state) => managePickup(state, { orderId: order.id, pickupId: pickup.id, action: 'cancel_items', lineIds: selected }))
    if (result.error) { setError(result.error); return }
    close(); notify('Pickup items canceled.')
  }}>
    <p>{review ? 'Review the items you’re canceling.' : 'Select the items you want to cancel.'}</p>
    {review ? <ul>{chosen.map((item) => <li key={item.id}>{item.title || 'Unavailable item'} × {item.quantity}</li>)}</ul> :
      <div>{lines.map((item) => <label className="check-label" key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
        {item.title || 'Unavailable item'} × {item.quantity}</label>)}</div>}
    {review && pickup.paymentStatus === 'captured' && <p>Estimated refund <strong>{money(amount)}</strong></p>}
    {error && <p className="error small" role="alert">{error}</p>}
    <div className="cluster">
      <button className="button primary" type="submit" disabled={!selected.length}>{review ? 'Confirm cancellation' : 'Review cancellation'}</button>
      {review && <button className="button secondary" type="button" onClick={() => { setReview(false); setError('') }}>Back</button>}
    </div>
  </form>
}

function PickupGroup({ order, pickup }) {
  const { state, transact } = useStore()
  const { open, notify } = useFeedback()
  const [error, setError] = useState('')
  const actions = pickupActions(order, pickup)
  const store = byId(state.stores, pickup.storeId)
  const storeName = pickup.storeName || store?.name
  const address = addressText(pickup.storeAddress) || addressText(store?.address)
  const timeOptions = { dateStyle: 'medium', timeStyle: 'short', timeZone: store?.timeZone }
  const lines = pickupLines(order, pickup)
  function extend() {
    const result = transact((world) => managePickup(world, { orderId: order.id, pickupId: pickup.id, action: 'extend' }))
    setError(result.error || '')
    if (result.state) notify('Pickup window extended by 3 days.')
  }
  return <section className="panel stack">
    <div className="section-heading"><h2 className="cluster"><Store size={23} />Order Pickup</h2><StatusLabel value={actions.status} labels={pickupLabels} /></div>
    <div><h3>{storeName ? `Target ${storeName}` : 'Pickup store unavailable'}</h3>
      {address && <p className="small muted address"><MapPin size={14} />{address}</p>}</div>
    {actions.status === 'preparing' && pickup.estimatedReadyAt && <p>Estimated ready {dateText(pickup.estimatedReadyAt, timeOptions)}</p>}
    {['ready', 'expired'].includes(actions.status) && pickup.holdUntil && <p>{actions.status === 'ready' ? 'Pick up by' : 'Pickup window ended'} <strong>{dateText(pickup.holdUntil, timeOptions)}</strong></p>}
    {actions.status === 'collected' && pickup.collectedAt && <p>Picked up {dateText(pickup.collectedAt, timeOptions)}</p>}
    {actions.status === 'ready' && (pickup.pickupInstructions || store?.pickupInstructions) && <p>{pickup.pickupInstructions || store.pickupInstructions}</p>}
    {pickup.alternatePickupPerson?.fullName && <p>Alternate pickup person <strong>{pickup.alternatePickupPerson.fullName}</strong>{pickup.alternatePickupPerson.email && ` · ${pickup.alternatePickupPerson.email}`}</p>}
    <div className="cluster">
      {actions.barcode && <button className="button primary" onClick={() => open({
        title: 'Pickup barcode',
        content: <div className="stack"><p>Show this barcode at Guest Services{storeName ? ` at Target ${storeName}` : ''}.</p><Barcode code={pickup.barcode} /></div>,
      })}>View barcode</button>}
      {actions.person && <button className="button secondary" onClick={() => open({ title: 'Edit pickup person', content: <PickupPersonForm order={order} pickup={pickup} /> })}>Edit pickup person</button>}
      {actions.extend && <button className="button secondary" onClick={extend}>Extend pickup</button>}
      {actions.cancel && <button className="text-button" onClick={() => open({ title: 'Cancel pickup items', content: <CancelItemsForm order={order} pickup={pickup} lines={actions.lines} /> })}>Cancel items</button>}
    </div>
    {error && <p className="error small" role="alert">{error}</p>}
    {lines.length ? <div>{lines.map((item) => <OrderLine item={item} key={item.id} />)}</div> : <p className="muted">Pickup item details unavailable.</p>}
  </section>
}

function OrderTotals({ order }) {
  const rows = [
    ['Merchandise subtotal', order.subtotalCents], ['Target Circle savings', order.discountCents ? -order.discountCents : null],
    ['Shipping', order.shippingCents], ['Tax', order.taxCents], ['Total paid', order.totalCents],
  ]
  return <section className="panel stack">
    <h2>Order summary</h2>
    <dl className="money-list">{rows.filter(([, amount]) => Number.isInteger(amount)).map(([label, amount]) =>
      <div key={label} className={label === 'Total paid' ? 'money-total' : ''}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl>
    <MaskedPayment payment={order.payment} />
  </section>
}

export function OrderDetails() {
  const { state } = useStore()
  const { orderId } = useParams()
  const { search } = useLocation()
  const placed = new URLSearchParams(search).get('placed') === '1'
  const order = byId(state.orders, orderId)
  if (!order) return <Empty title="Order unavailable" to="/orders" action="View purchases">We couldn’t find this order.</Empty>
  const pickups = list(state.pickupOrders).filter((pickup) => pickup.orderId === order.id)
  const items = list(order.items)
  const pickupHandled = new Set(pickups.flatMap((pickup) => pickupLines(order, pickup).map((line) => line.id)))
  const shipping = items.filter((item) => item.fulfillment === 'shipping')
  const other = items.filter((item) => item.fulfillment !== 'shipping' && !pickupHandled.has(item.id))
  const cancellations = list(state.refunds).filter((refund) => refund.source === 'pickup_cancellation' && refund.orderId === order.id)

  return <div className="orders-page">
    <div className="breadcrumbs"><ShopLink to="/orders">Purchase history</ShopLink><ChevronRight size={15} /> Order details</div>
    {placed && <section className="panel confirmation"><CheckCircle2 size={24} /><div><h2>Order placed</h2><p>Order #{orderNumber(order)}</p></div></section>}
    <PageHeading title={`Order #${orderNumber(order)}`}>
      <div className="cluster"><span className="muted">{dateText(order.createdAt)}</span><StatusLabel value={order.status} labels={orderLabels} /></div>
    </PageHeading>
    <div className="stack">
      {pickups.map((pickup) => <PickupGroup order={order} pickup={pickup} key={pickup.id} />)}
      {shipping.length > 0 && <section className="panel stack"><h2 className="cluster"><Truck size={23} />Shipping</h2>
        {order.shippingAddress && <p className="muted">{addressText(order.shippingAddress)}</p>}
        <div>{shipping.map((item) => <OrderLine item={item} key={item.id} />)}</div>
      </section>}
      {(other.length > 0 || !items.length) && <section className="panel stack"><h2>Order items</h2>
        {other.length ? <div>{other.map((item) => <OrderLine item={item} key={item.id} />)}</div> : <p className="muted">Item details unavailable.</p>}
      </section>}
      {cancellations.length > 0 && <section className="panel stack"><h2>Pickup cancellation refunds</h2>
        {cancellations.map((refund) => <p key={refund.id}>{money(refund.amountCents)} · {refund.status === 'issued' ? 'Refund issued' : refund.status === 'cancelled' ? 'Refund canceled' : 'Refund pending'}</p>)}
      </section>}
      <OrderReturns order={order} orderPath={orderPath(order)} />
      <OrderTotals order={order} />
    </div>
  </div>
}
