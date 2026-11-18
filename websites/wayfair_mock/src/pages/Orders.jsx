import { useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Search, Truck } from 'lucide-react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/Account.jsx'
import { AccountLink, BackLink, Missing } from '../components/Navigation.jsx'
import { Address, AppointmentWindow, Badge, CopyIdentifier, Empty, PageTitle, ProductImage, Quote, Timeline } from '../components/Details.jsx'
import { SelectField } from '../components/Fields.jsx'
import { CancelItemsDialog } from '../components/CancelItems.jsx'
import {
  availableSlots, byRecent, canSchedule, cents, deliveryStatus, findRecord, formatDate, formatWindow, futureAppointment,
  itemEligibility, money, orderNumber, orderStatus, records, remaining, shipmentZone,
} from '../data/rules.js'

export const orderPath = (id) => '/orders/' + encodeURIComponent(id)
export const shipmentPath = (id) => '/deliveries/' + encodeURIComponent(id)
export const servicePath = (kind, id) => '/' + kind + '/' + encodeURIComponent(id)

const placedSort = (a, b) => byRecent(a.placedAt, b.placedAt)
const orderStatuses = ['preparing', 'in_transit', 'partially_delivered', 'delivered', 'partially_canceled', 'canceled']

function OrderCard({ order, from, compact }) {
  const { state } = useAccount()
  const { status, partiallyCanceled } = orderStatus(state, order)
  const items = records(order.items)
  const to = orderPath(order.id)
  const displayNumber = orderNumber(order)
  return <article className={'card order-card' + (compact ? ' compact-order' : '')}>
    <div className="order-summary">
      <div>
        <h3><AccountLink className="order-number" to={to} state={from && { ordersPath: from }}>{displayNumber}</AccountLink></h3>
        <p className="muted meta">Placed {formatDate(order.placedAt, shipmentZone(state))}</p>
      </div>
      <div className="order-badges">
        <Badge status={status} />
        {partiallyCanceled && <Badge status="partially_canceled" />}
      </div>
      <div className="order-total"><span className="muted meta">Order total</span><strong>{money(order.totalAmount, order.currency)}</strong></div>
    </div>
    <div className="order-preview">
      <div className="order-preview-items">
        {items.length > 0 && <div className="thumbnail-group">{items.slice(0, 3).map((item, index) => <ProductImage key={item.id || index} item={item} />)}</div>}
        <div className="preview-description">
          <strong>{items[0]?.name || 'Item details unavailable'}</strong>
          {items.length > 1 && <span className="muted meta">+ {items.length - 1} more {items.length === 2 ? 'item' : 'items'}</span>}
        </div>
      </div>
      <AccountLink className="button" to={to} state={from && { ordersPath: from }} aria-label={'View order ' + displayNumber}>View order <ArrowRight size={16} aria-hidden="true" /></AccountLink>
    </div>
  </article>
}

export function Overview() {
  const { state } = useAccount()
  const orders = records(state.orders).sort(placedSort)
  const next = records(state.shipments).flatMap((shipment) => {
    const appointment = futureAppointment(state, shipment)
    return appointment && shipment.id ? [{ shipment, appointment }] : []
  }).sort((a, b) => byRecent(b.appointment.startAt, a.appointment.startAt))[0]
  const openClaims = records(state.damageClaims).filter(({ status }) => ['submitted', 'in_review', 'approved'].includes(status))
  const openReturns = records(state.returns).filter(({ status }) => ['requested', 'in_transit', 'received'].includes(status))
  const firstName = state.account?.name?.trim().split(/\s+/)[0]
  const nextOrder = findRecord(state.orders, next?.shipment.orderId)
  return <div className="page-stack">
    <section className="welcome">
      <div className="welcome-content">
        <div className="welcome-context">Account overview</div>
        <h1>{firstName ? 'Welcome, ' + firstName : 'Welcome'}</h1>
        <p>Keep track of orders, deliveries and service requests.</p>
      </div>
      <img src="/images/reading-corner.webp" alt="" width="600" height="400" />
    </section>
    <section className="overview-grid" aria-label="Account activity">
      <article className="card summary-card">
        <div className="summary-heading"><span className="section-icon"><Truck size={21} aria-hidden="true" /></span><h2>Upcoming delivery</h2></div>
        {next ? <>
          <div className="summary-content">
            <strong>{records(nextOrder?.items).find((item) => item.shipmentId === next.shipment.id)?.name || 'Scheduled delivery'}</strong>
            <AppointmentWindow>{formatWindow(next.appointment, next.appointment.timeZone || shipmentZone(state, next.shipment))}</AppointmentWindow>
          </div>
          <AccountLink className="text-link" to={shipmentPath(next.shipment.id)}>View delivery <ArrowRight size={16} aria-hidden="true" /></AccountLink>
        </> : <>
          <p className="muted summary-content">No deliveries are scheduled.</p>
          <AccountLink className="text-link" to="/deliveries">View deliveries <ArrowRight size={16} aria-hidden="true" /></AccountLink>
        </>}
      </article>
      <article className="card summary-card">
        <div className="summary-heading"><span className="section-icon sage"><ClipboardList size={20} aria-hidden="true" /></span><h2>Open requests</h2></div>
        <div className="summary-content request-counts">
          <AccountLink to="/claims?status=open"><strong>{openClaims.length}</strong><span>Damage claims</span><ArrowRight size={15} aria-hidden="true" /></AccountLink>
          <AccountLink to="/returns?status=open"><strong>{openReturns.length}</strong><span>Returns</span><ArrowRight size={15} aria-hidden="true" /></AccountLink>
        </div>
        <p className="muted meta">View request updates and next steps.</p>
      </article>
    </section>
    <section className="section-stack">
      <div className="section-heading"><h2>Recent orders</h2><AccountLink className="text-link" to="/orders">View all orders <ArrowRight size={16} aria-hidden="true" /></AccountLink></div>
      {orders.length ? orders.slice(0, 3).map((order, index) => <OrderCard compact key={order.id || index} order={order} />)
        : <Empty title="No orders yet"><p className="muted">Orders will appear here when available.</p></Empty>}
    </section>
  </div>
}

function yearOf(order, zone) {
  return formatDate(order.placedAt, zone, { year: 'numeric' })
}

export function OrderList() {
  const { state } = useAccount()
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const query = params.get('q') || ''
  const status = params.get('status') || 'all'
  const year = params.get('year') || 'all'
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const zone = shipmentZone(state)
  const orders = records(state.orders)
  const years = [...new Set(orders.map((order) => yearOf(order, zone)).filter((value) => /^\d+$/.test(value)))].sort().reverse()
  const term = query.trim().toLowerCase()
  const filtered = orders.filter((order) => {
    const derived = orderStatus(state, order)
    if (status !== 'all' && status !== derived.status && !(status === 'partially_canceled' && derived.partiallyCanceled)) return false
    if (year !== 'all' && yearOf(order, zone) !== year) return false
    return [orderNumber(order), ...records(order.items).flatMap((item) => [item.name, item.sku])]
      .some((candidate) => String(candidate ?? '').toLowerCase().includes(term))
  }).sort((a, b) => sort === 'oldest' ? placedSort(b, a) : placedSort(a, b))
  const lastPage = Math.max(1, Math.ceil(filtered.length / 12))
  const page = Math.min(lastPage, Math.max(1, Math.floor(Number(params.get('page')) || 1)))
  const start = (page - 1) * 12

  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key !== 'page' })
  }
  function reset() {
    const next = new URLSearchParams(params)
    for (const key of ['q', 'status', 'year', 'sort', 'page']) next.delete(key)
    setParams(next, { replace: true })
  }

  return <div className="page-stack">
    <PageTitle title="Orders" description="Find an order, track its shipments or manage individual items." />
    <div className="section-stack">
      <div className="card filters order-filters">
        <label className="field search-field">
          <span>Search orders</span>
          <span className="search-input"><Search size={18} aria-hidden="true" /><input type="search" placeholder="Order number, item or SKU" value={query} onChange={(event) => update('q', event.currentTarget.value)} /></span>
        </label>
        <SelectField title="Status" options={[{ value: 'all', label: 'All statuses' }, ...orderStatuses]} value={status} onChange={(value) => update('status', value === 'all' ? '' : value)} />
        <SelectField title="Year" options={[{ value: 'all', label: 'All years' }, ...years]} value={year} onChange={(value) => update('year', value === 'all' ? '' : value)} />
        <SelectField title="Sort by" options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }]} value={sort} onChange={(value) => update('sort', value === 'newest' ? '' : value)} />
      </div>
      <p className="meta muted" role="status">{filtered.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + 12, filtered.length) + ' of ' + filtered.length + ' orders' : '0 orders'}</p>
      {filtered.length ? filtered.slice(start, start + 12).map((order, index) => <OrderCard key={order.id || index} order={order} from={'/orders' + search} />) : <Empty title="No orders found">
        <p className="muted">Try clearing the filters or searching for a different item.</p>
        <button className="button" type="button" onClick={reset}>Clear filters</button>
      </Empty>}
      {lastPage > 1 && <nav aria-label="Order pages" className="pagination">
        <button className="button" type="button" disabled={page === 1} onClick={() => update('page', page - 1)}><ChevronLeft size={16} aria-hidden="true" /> Previous</button>
        <span className="muted meta">Page {page} of {lastPage}</span>
        <button className="button" type="button" disabled={page === lastPage} onClick={() => update('page', page + 1)}>Next <ChevronRight size={16} aria-hidden="true" /></button>
      </nav>}
    </div>
  </div>
}

function ItemDetail({ state, order, item, shipment }) {
  const available = itemEligibility(state, order, item, 'claim')
  const query = new URLSearchParams({ new: '1', order: order.id, item: item.id })
  return <div className="line-item">
    <ProductImage item={item} size={72} />
    <div className="line-info">
      <h3>{item.name || 'Order item'}</h3>
      {item.variant && <p className="muted meta">{item.variant}</p>}
      {item.sku && <p className="muted meta">SKU {item.sku}</p>}
      <p className="meta">Quantity {item.quantity ?? 'unavailable'}{Number(item.canceledQuantity) > 0 && ' · ' + item.canceledQuantity + ' canceled'}</p>
      {shipment?.status === 'delivered' && available.reason && <p className="muted meta">{available.reason}</p>}
    </div>
    <div className="line-actions">
      <strong>{money(item.unitPrice, order.currency)}</strong>
      {!available.reason && <AccountLink to={'/claims?' + query} className="text-link">Report damage</AccountLink>}
    </div>
  </div>
}

function ShipmentGroup({ state, order, shipment, items }) {
  const zone = shipmentZone(state, shipment)
  const booking = shipment && futureAppointment(state, shipment)
  const offer = shipment && canSchedule(state, shipment)
  return <article className="card shipment-group">
    <div className="section-heading">
      <div>
        <h2>{shipment ? (shipment.type === 'freight' ? 'Freight delivery' : shipment.type === 'parcel' ? 'Parcel shipment' : 'Shipment') : 'Shipment unavailable'}</h2>
        {shipment?.carrier && <p className="meta muted">{shipment.carrier}</p>}
        {shipment?.trackingNumber && <div className="actions meta muted">
          <span className="wrap-text">{shipment.trackingNumber}</span>
          <CopyIdentifier value={shipment.trackingNumber} name="tracking number" />
        </div>}
      </div>
      {shipment && <Badge status={deliveryStatus(state, shipment)} />}
    </div>
    {items.map((item, index) => <ItemDetail key={item.id || index} state={state} order={order} item={item} shipment={shipment} />)}
    {shipment && <>
      <div className="shipment-links">
        {booking && <AppointmentWindow>{formatWindow(booking, booking.timeZone || zone)}</AppointmentWindow>}
        <AccountLink className="text-link" to={shipmentPath(shipment.id)}>View delivery <ArrowRight size={16} aria-hidden="true" /></AccountLink>
        {offer && availableSlots(state, shipment).length > 0 && <AccountLink className="button" to={shipmentPath(shipment.id) + '?schedule=1'}>
          {booking ? 'Reschedule delivery' : 'Schedule delivery'}
        </AccountLink>}
        {offer && !availableSlots(state, shipment).length && <p className="muted meta">No appointment windows are available.</p>}
      </div>
      <Timeline shipment={shipment} zone={zone} />
    </>}
  </article>
}

export function OrderDetail() {
  const { state } = useAccount()
  const { orderId } = useParams()
  const location = useLocation()
  const [canceling, setCanceling] = useState(false)
  const order = findRecord(state.orders, orderId)
  if (!order) return <Missing title="Order unavailable" to="/orders" label="Back to orders" />
  const items = records(order.items)
  const shipments = records(state.shipments).filter((shipment) => shipment.orderId === order.id)
  const unlinked = items.filter((item) => !shipments.some((shipment) => shipment.id === item.shipmentId))
  const { status, partiallyCanceled } = orderStatus(state, order)
  const eligible = items.some((item) => itemEligibility(state, order, item, 'cancel').quantity > 0)
  const claimed = records(state.damageClaims).filter((claim) => claim.orderId === order.id)
  const returned = records(state.returns).filter((entry) => entry.orderId === order.id)
  const cancellations = records(state.orderCancellations).filter((entry) => entry.orderId === order.id)
  const credits = cancellations.reduce((sum, entry) => sum + cents(entry.estimatedCredit), 0) / 100
  const hasLine = items.length > 0
  const subtotal = hasLine ? items.reduce((sum, item) => sum + cents(item.unitPrice) * (Number(item.quantity) || 0), 0) / 100 : undefined
  const tax = hasLine ? items.reduce((sum, item) => sum + cents(item.unitTax) * (Number(item.quantity) || 0), 0) / 100 : undefined

  return <div className="page-stack">
    <div className="detail-heading">
      <BackLink to={location.state?.ordersPath || '/orders'}>Back to orders</BackLink>
      <PageTitle title={'Order ' + orderNumber(order)} description={'Placed ' + formatDate(order.placedAt, shipmentZone(state))}>
        <div className="order-badges">
          <CopyIdentifier value={orderNumber(order)} name="order number" />
          <Badge status={status} />{partiallyCanceled && <Badge status="partially_canceled" />}
        </div>
      </PageTitle>
    </div>
    <div className="detail-grid">
      <div className="section-stack">
        {shipments.map((shipment, index) => <ShipmentGroup key={shipment.id || index} state={state} order={order} shipment={shipment}
          items={items.filter((item) => item.shipmentId === shipment.id)} />)}
        {unlinked.length > 0 && <ShipmentGroup state={state} order={order} items={unlinked} />}
        {!shipments.length && !unlinked.length && <Empty title="Shipment information unavailable" />}
        <section className="card section-stack">
          <h2>Order actions</h2>
          <div className="actions">
            {eligible && <button className="button" type="button" onClick={() => setCanceling(true)}>Cancel items</button>}
            <AccountLink className="button" to={'/returns?' + new URLSearchParams({ new: '1', order: order.id })}>Start a return</AccountLink>
          </div>
          {!eligible && <p className="muted meta">Only items being prepared can be canceled.</p>}
        </section>
        {Boolean(claimed.length || returned.length || cancellations.length) && <section className="card section-stack">
          <h2>Service activity</h2>
          {claimed.map((claim) => <div className="related-row" key={claim.id}>
            <AccountLink className="text-link wrap-text" to={servicePath('claims', claim.id)}>Damage claim {claim.id}</AccountLink><Badge status={claim.status} />
          </div>)}
          {returned.map((entry) => <div className="related-row" key={entry.id}>
            <AccountLink className="text-link wrap-text" to={servicePath('returns', entry.id)}>Return {entry.id}</AccountLink><Badge status={entry.status} />
          </div>)}
          {cancellations.map((entry) => <div className="related-row" key={entry.id}>
            <div className="actions">
              <p className="wrap-text"><strong>Item cancellation</strong><br /><span className="meta muted">{entry.id}</span></p>
              <CopyIdentifier value={entry.id} name="cancellation reference" />
            </div>
            <Badge status={entry.status} />
          </div>)}
        </section>}
      </div>
      <aside className="section-stack">
        <section className="card section-stack">
          <h2>Payment summary</h2>
          {order.paymentLabel && <p className="muted">{order.paymentLabel}</p>}
          <Quote currency={order.currency} rows={[
            ['Item subtotal', subtotal], ['Shipping', order.shippingAmount], ['Tax', tax], ['Order total', order.totalAmount, true],
            ...(credits > 0 ? [['Estimated cancellation credit', credits]] : []),
          ]} />
        </section>
        <section className="card section-stack"><h2>Ship to</h2><Address address={order.shipTo} /></section>
      </aside>
    </div>
    {canceling && <CancelItemsDialog order={order} onClose={() => setCanceling(false)} />}
  </div>
}
