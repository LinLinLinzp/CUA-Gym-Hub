
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppLink, date, Dialog, Empty, ErrorMessage, Field, find, fulfillmentLabels, Heading, latest,
  matches, Metric, Missing, money, orderName, records, replace, ResultCount, route,
  SelectOptions, stamp, Status, storeName, useAccount,
} from '../shared.jsx'
import { canCancelOrder, orderCancellationReasons, returnableLines } from '../eligibility.js'

const orderStatuses = {
  processing: 'Processing', shipped: 'Shipped', ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up', delivered: 'Delivered', purchased: 'Purchased', cancelled: 'Cancelled',
}

function itemDetails(item, products) {
  const product = find(products, item.productId)
  return { name: item.name || product?.name, sku: item.sku || product?.sku, price: item.unitPrice ?? product?.unitPrice }
}

export function Orders() {
  const { state } = useAccount()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fulfillment, setFulfillment] = useState('')
  const [sort, setSort] = useState('newest')
  const orders = latest(state.orders).filter((order) =>
    (!status || order.status === status) && (!fulfillment || order.fulfillment === fulfillment) &&
    matches(search, orderName(order), ...records(order.items).flatMap((item) => {
      const { name, sku } = itemDetails(item, state.products)
      return [name, sku]
    })))
  if (sort === 'oldest') orders.reverse()

  function reset() {
    setSearch('')
    setStatus('')
    setFulfillment('')
    setSort('newest')
  }

  return <div className="flow">
    <Heading title="Orders" intro="Find your purchases, receipts and fulfillment details." />
    <div className="panel filters">
      <Field label="Search orders"><input type="search" placeholder="Order number, item or SKU" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
      <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><SelectOptions options={orderStatuses} /></select></Field>
      <Field label="Fulfillment"><select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}><option value="">All methods</option><SelectOptions options={fulfillmentLabels} /></select></Field>
      <Field label="Sort by"><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></Field>
    </div>
    <ResultCount count={orders.length} singular="order" reset={(search || status || fulfillment || sort !== 'newest') ? reset : undefined} />
    {orders.length ? <ul className="panel rows">{orders.map((order) => <li className="record-row order-row" key={order.id}>
      <div><AppLink to={route('/orders', order.id)}>{orderName(order)}</AppLink><small>{date(order.createdAt)}</small></div>
      <div><small>Status</small><Status value={order.status} /></div>
      <div><small>Fulfillment</small>{fulfillmentLabels[order.fulfillment] || 'Unavailable'}</div>
      <div><small>Total</small><strong>{money(order.total)}</strong></div>
      <AppLink className="row-arrow" aria-label={'View ' + orderName(order)} to={route('/orders', order.id)}>→</AppLink>
    </li>)}</ul> : <Empty title="No orders found"><p>{records(state.orders).length ? 'Try a different search or filter.' : 'Your purchase history will appear here.'}</p></Empty>}
  </div>
}

export function OrderDetail() {
  const { orderId } = useParams()
  const { state, mutate } = useAccount()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const order = find(state.orders, orderId)
  if (!order) return <Missing title="Order unavailable" to="/orders" link="Back to Orders" />

  async function confirm(event) {
    event.preventDefault()
    const problem = await mutate((current) => {
      if (!Object.hasOwn(orderCancellationReasons, reason)) return 'Choose a cancellation reason.'
      const target = find(current.orders, orderId)
      if (!canCancelOrder(target)) return 'This order can no longer be cancelled.'
      return { ...current, orders: replace(current.orders, orderId, (record) => ({
        ...record, status: 'cancelled', cancellation: { reason, ...stamp(current) },
      })) }
    })
    setError(problem)
    if (!problem) {
      setCancelling(false)
      setNotice('Order cancelled.')
    }
  }

  const items = records(order.items)
  const store = find(state.stores, order.storeId)

  return <div className="flow">
    <Heading title={orderName(order)} intro={'Placed ' + date(order.createdAt)} back={{ to: '/orders', label: 'Orders' }}
      action={<Status value={order.status} />} />
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Order items</h2></div>
        {items.length ? <ul className="rows">{items.map((item, index) => {
          const { name, sku, price } = itemDetails(item, state.products)
          return <li className="record-row line-row" key={item.id ?? index}>
            <div><strong>{name || 'Order item'}</strong><small>SKU {sku || 'unavailable'}</small></div>
            <div><small>Quantity</small>{item.quantity ?? '—'}</div>
            <div><small>Unit price</small>{money(price)}</div>
          </li>
        })}</ul> : <p className="panel-body">Item details are unavailable.</p>}
      </section>
      <div className="flow">
        <section className="panel pad">
          <h2>Receipt summary</h2>
          <dl className="metrics">
            <Metric title="Subtotal">{money(order.subtotal)}</Metric><Metric title="Tax">{money(order.tax)}</Metric>
            <Metric title="Shipping">{money(order.shipping)}</Metric><Metric title="Total">{money(order.total)}</Metric>
          </dl>
        </section>
        <section className="panel pad">
          <h2>{fulfillmentLabels[order.fulfillment] || 'Fulfillment'}</h2>
          {order.fulfillment === 'ship_to_home' ? <dl className="metrics">
            <Metric title="Delivery address">{order.deliveryAddress || 'Unavailable'}</Metric>
            <Metric title="Carrier">{order.carrier || 'Unavailable'}</Metric>
            <Metric title="Tracking number">{order.trackingNumber || 'Unavailable'}</Metric>
          </dl> : <div><p>{storeName(state, order.storeId)}</p>{store?.address && <p>{store.address}</p>}</div>}
          {order.fulfilledAt && <p className="muted">Fulfilled {date(order.fulfilledAt)}</p>}
          {order.cancellation && <p className="muted">Cancelled {date(order.cancellation.createdAt)}{order.cancellation.reason ? ' · ' + (orderCancellationReasons[order.cancellation.reason] || 'Other') : ''}</p>}
        </section>
        {canCancelOrder(order) && <button className="secondary" onClick={() => { setReason(''); setError(''); setCancelling(true) }}>Cancel order</button>}
        {returnableLines(state, order).length > 0 && <AppLink className="button primary" to={route('/returns/new', order.id)}>Start a return</AppLink>}
      </div>
    </div>
    {cancelling && <Dialog title={'Cancel ' + orderName(order) + '?'} onClose={() => setCancelling(false)}>
      <form className="form-flow" onSubmit={confirm} noValidate>
        <Field label="Cancellation reason"><select required value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Choose a reason</option><SelectOptions options={orderCancellationReasons} />
        </select></Field>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="actions"><button type="button" className="secondary" onClick={() => setCancelling(false)}>Keep order</button>
          <button className="danger" type="submit">Confirm cancellation</button></div>
      </form>
    </Dialog>}
  </div>
}
