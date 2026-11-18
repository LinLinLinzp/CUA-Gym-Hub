import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store'
import { date, eventId, find, list, matches, merchandise, money, newOrder, orderLabel, remaining, cents } from '../model'
import { Address, Back, Badge, ButtonLink, Dialog, Empty, ErrorText, Filter, Missing, PageHeader, ProductLine, Search, SiteLink, Totals, routeId, useSiteNavigate } from '../ui'

const orderStatuses = { '': 'All statuses', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Canceled' }

export function Orders() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const orders = list(state.orders).filter(order =>
    (!status || order.status === status) && matches(query, orderLabel(order), ...list(order.items).map(item => item.name)))
    .sort((a, b) => (sort === 'newest' ? -1 : 1) * String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  return <>
    <PageHeader title="Order History" description="Find your purchases, track packages, and manage recent orders." />
    <section aria-label="Orders">
      <div className="toolbar">
        <Search label="Search order numbers or products" value={query} onChange={setQuery} />
        <Filter label="Order status" options={orderStatuses} value={status} onChange={setStatus} />
        <Filter label="Sort orders" options={{ newest: 'Newest first', oldest: 'Oldest first' }} value={sort} onChange={setSort} />
      </div>
      {!orders.length && <Empty title={query || status ? 'No matching orders' : 'No orders yet'} />}
      <div className="collection">{orders.map(order => <article key={order.id} className="card list-card">
        <div><h3>{orderLabel(order)}</h3><small>{date(order.createdAt)} · {list(order.items)[0]?.name || 'Order details'}</small></div>
        <div className="actions"><Badge status={order.status} /><strong className="amount">{money(order.total)}</strong><ButtonLink to={'/orders/' + routeId(order.id)}>View order</ButtonLink></div>
      </article>)}</div>
    </section>
  </>
}

function OrderTotals({ order }) {
  const subtotal = order.subtotal ?? merchandise(order.items)
  return <Totals rows={[[ 'Subtotal', subtotal], ['Shipping', order.shipping], ['Tax', order.tax]]}
    total={order.total ?? (cents(subtotal) + cents(order.shipping) + cents(order.tax)) / 100} />
}

export function OrderDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const order = find(state.orders, id)
  if (!order) return <Missing to="/orders" label="Back to Order History" title="Order not found" />
  return <Order key={id} order={order} />
}

function Order({ order }) {
  const { state, commit } = useAccount()
  const navigate = useSiteNavigate()
  const [action, setAction] = useState('')
  const [error, setError] = useState('')
  const items = list(order.items)
  const linkedReturns = list(state.returns).filter(entry => entry.orderId === order.id)
  const returnLines = remaining(order, linkedReturns)
  const canReturn = returnLines.some(line => line.available > 0)
  const sourceOrder = find(state.orders, order.sourceOrderId)
  const plan = find(state.autoships, order.autoshipId)
  const open = (next) => { setError(''); setAction(next) }

  function submit() {
    const isCancel = action === 'cancel'
    const id = isCancel ? order.id : eventId('ord')
    try {
      commit((current, metadata) => {
        const existing = find(current.orders, order.id)
        const orders = list(current.orders)
        const events = list(current.orderEvents)
        if (isCancel && existing?.status === 'processing') {
          const updated = { ...existing, status: 'cancelled', cancelledAt: metadata.createdAt, updatedAt: metadata.createdAt, updatedBy: metadata.actorId }
          return { ...current, orders: orders.map(entry => entry.id === id ? updated : entry), orderEvents: [...events,
            { id: eventId('ore'), orderId: id, action: 'cancelled', ...metadata, previousStatus: existing.status, newStatus: updated.status }] }
        }
        if (!isCancel && existing?.status === 'delivered') {
          const reorder = newOrder(existing, id, metadata, { sourceOrderId: existing.id })
          return { ...current, orders: [reorder, ...orders], orderEvents: [...events,
            { id: eventId('ore'), orderId: id, sourceOrderId: existing.id, action: 'reordered', ...metadata, newStatus: reorder.status }] }
        }
        throw Error('This order’s status has changed. Close this review and check the order details.')
      }, isCancel ? 'Order canceled.' : 'Order placed.')
      setAction('')
      if (!isCancel) navigate('/orders/' + routeId(id))
    } catch (err) { setError(err.message) }
  }

  const tracking = list(order.trackingEvents)
  const review = action === 'buy' ? { ...order, subtotal: merchandise(items), total: undefined } : null
  return <>
    <Back to="/orders">Order History</Back>
    <PageHeader title={orderLabel(order)} description={'Placed ' + date(order.createdAt)}><Badge status={order.status} /></PageHeader>
    <div className="detail-grid">
      <div className="stack">
        <section className="card">
          <h2>Items in this order</h2>
          {!items.length && <Empty title="No item details available" />}
          {returnLines.map(({ item, returned, available }, index) => <ProductLine key={item.id || index} item={item} price={item.lineTotal}>
            {order.status === 'delivered' && <small>{[
              returned > 0 ? returned + ' included in a return' : '',
              available > 0 ? available + ' available to return' : 'Unavailable to return',
            ].filter(Boolean).join(' · ')}</small>}
          </ProductLine>)}
          <div className="actions">
            {order.status === 'processing' && <button onClick={() => open('cancel')}>Cancel order</button>}
            {order.status === 'delivered' && items.length > 0 && <button onClick={() => open('buy')}>Buy again</button>}
            {canReturn && <ButtonLink primary to={'/returns/new/' + routeId(order.id)}>Return items</ButtonLink>}
          </div>
          {order.status === 'delivered' && !canReturn && <p className="meta">No items are available to return.</p>}
        </section>
        {(['shipped', 'delivered'].includes(order.status) || tracking.length > 0) && <section className="card">
          <h2>Shipment tracking</h2>
          {order.trackingNumber && <p>{order.carrier || 'Carrier'} · {order.trackingNumber}</p>}
          {tracking.length ? <ol className="tracking-list">{tracking.map((event, index) => <li key={event.id || index}><strong>{event.label || 'Shipment update'}</strong>
            <small>{[date(event.createdAt), event.location].filter(Boolean).join(' · ')}</small></li>)}</ol> : <p className="muted">No tracking events available.</p>}
        </section>}
        {linkedReturns.length > 0 && <section className="card">
          <h2>Returns for this order</h2>
          {linkedReturns.map(entry => <div className="list-card" key={entry.id}><SiteLink to={'/returns/' + routeId(entry.id)}>{entry.returnNumber || entry.id}</SiteLink><Badge status={entry.status} /></div>)}
        </section>}
      </div>
      <div className="stack">
        <section className="card"><h2>Order summary</h2><OrderTotals order={order} /></section>
        <section className="card"><h2>Delivery details</h2><Address address={order.address} />
          {order.paymentLabel && <p className="meta">{order.paymentLabel}</p>}
          {order.deliveredAt && <p className="meta">Delivered {date(order.deliveredAt)}</p>}
          {order.cancelledAt && <p className="meta">Canceled {date(order.cancelledAt)}</p>}
          {plan && <p><SiteLink to={'/autoship/' + routeId(plan.id)}>View Autoship plan</SiteLink></p>}
          {sourceOrder && <p><SiteLink to={'/orders/' + routeId(sourceOrder.id)}>View original order</SiteLink></p>}
        </section>
      </div>
    </div>
    {action && <Dialog title={review ? 'Review your reorder' : 'Cancel order'} confirm={review ? 'Place order' : 'Confirm cancellation'} danger={!review} onClose={() => setAction('')} onSubmit={submit}>
      {review ? <>
        <p>Reorder the items from {orderLabel(order)}.</p>
        <ul>{items.map((item, index) => <li key={item.id || index}>{item.name || 'Item'} × {item.quantity}</li>)}</ul>
        <OrderTotals order={review} />
      </> : <p>Cancel {orderLabel(order)} and stop it from shipping?</p>}
      <ErrorText>{error}</ErrorText>
    </Dialog>}
  </>
}

