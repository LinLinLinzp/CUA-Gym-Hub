import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { canCancel, cancelOrder, returnableLines } from './actions.js'
import {
  AccountLink, Back, Badge, Dialog, Empty, Heading, ProductArt, SectionHeading, SelectFilter, Timeline,
  cents, date, dateValue, human, list, money, newest, orderNumber, paths, paymentLabel,
} from './ui.jsx'

const statuses = ['placed', 'in_progress', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'returned']
const dateOptions = [['', 'Any date'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last year']]
const sortOptions = [['newest', 'Newest first'], ['oldest', 'Oldest first']]

export function Orders() {
  const { state } = useAccount()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [windowDays, setWindowDays] = useState('')
  const [sort, setSort] = useState('newest')
  const orders = list(state.orders)
  const now = new Date().getTime()
  const cutoff = now - Number(windowDays) * 86_400_000
  const phrase = search.trim().toLowerCase()
  const availableStatuses = [...new Set([...statuses, ...orders.map((order) => order.status).filter(Boolean)])]
  const matches = newest(orders.filter((order) => {
    if (status && order.status !== status) return false
    const placed = dateValue(order.placedAt)
    if (windowDays && !(placed >= cutoff && placed <= now)) return false
    return !phrase || [orderNumber(order), order.id, ...list(order.items).map((item) => item.name)]
      .some((value) => String(value ?? '').toLowerCase().includes(phrase))
  }), 'placedAt')
  if (sort === 'oldest') matches.reverse()
  const clear = () => { setSearch(''); setStatus(''); setWindowDays(''); setSort('newest') }
  return <>
    <Heading title="Orders" description="Review purchases and track each shipment." />
    <div className="filters">
      <label className="search-control">Search orders<input type="search" placeholder="Order number or product name" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <SelectFilter label="Order status" value={status} onChange={setStatus} options={[[ '', 'All statuses'], ...availableStatuses.map((key) => [key, human(key)])]} />
      <SelectFilter label="Date range" value={windowDays} onChange={setWindowDays} options={dateOptions} />
      <SelectFilter label="Sort by" value={sort} onChange={setSort} options={sortOptions} />
      <button type="button" className="button secondary" onClick={clear}>Clear filters</button>
    </div>
    <p className="results" role="status">{matches.length} {matches.length === 1 ? 'order' : 'orders'}</p>
    {matches.length ? <div className="history card"><ul className="rows">
      {matches.map((order, index) => {
        const items = list(order.items)
        return <li className="history-row" key={order.id ?? index}>
          <div>{order.id ? <AccountLink className="row-id" to={paths.order(order.id)}>{orderNumber(order)}</AccountLink> : <strong>{orderNumber(order)}</strong>}
            <span className="metadata">{date(order.placedAt)}</span></div>
          <div className="item-preview">{items[0]?.name || 'Item details unavailable'}{items.length > 1 && <span className="metadata">+ {items.length - 1} more</span>}</div>
          <Badge status={order.status} />
          <strong>{money(order.total, order.currency)}</strong>
        </li>
      })}
    </ul></div> : <Empty title={orders.length ? 'No matching orders' : 'No orders yet'}>
      <p className="muted">{orders.length ? 'Try a different search or clear your filters.' : 'Once you place an order, you can find it here.'}</p>
      {orders.length > 0 && <button className="button secondary" onClick={clear}>Show all orders</button>}
    </Empty>}
  </>
}

function Shipment({ shipment, number, items }) {
  const contents = list(shipment.lineIds).map((id) => {
    const item = items.find((line) => line.id === id)
    return item?.name || id
  })
  return <div className="shipment">
    <div className="compact-row"><h3>Shipment {number}</h3><Badge status={shipment.status} /></div>
    {contents.length > 0 && <p className="muted">{contents.join(', ')}</p>}
    {shipment.estimatedDeliveryAt && shipment.status !== 'delivered' && <p className="metadata">Estimated delivery {date(shipment.estimatedDeliveryAt)}</p>}
    <details>
      <summary>Track shipment {number}</summary>
      <dl className="facts">
        <div><dt>Carrier</dt><dd>{shipment.carrier || 'Not assigned'}</dd></div>
        <div><dt>Tracking number</dt><dd>{shipment.trackingNumber || 'Not available yet'}</dd></div>
      </dl>
      <Timeline events={shipment.events} />
    </details>
  </div>
}

export function OrderDetails() {
  const { orderId } = useParams()
  return <OrderView key={orderId} orderId={orderId} />
}

function OrderView({ orderId }) {
  const { state, commit } = useAccount()
  const [dialog, setDialog] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const order = list(state.orders).find((entry) => entry.id === orderId)
  if (!order) return <><Back to={paths.orders}>Orders</Back><Empty title="Order unavailable"><p>This order could not be found in your account.</p><AccountLink to={paths.orders}>View orders</AccountLink></Empty></>
  const items = list(order.items)
  const shipments = list(order.shipments)
  const label = orderNumber(order)

  function confirm() {
    const result = commit((current) => cancelOrder(current, orderId))
    if (result.error) {
      setError(result.error)
      return
    }
    setDialog(false)
    setNotice('Order ' + label + ' was cancelled.')
  }

  return <>
    <Back to={paths.orders}>Orders</Back>
    <Heading title={<span className="detail-header">Order {label} <Badge status={order.status} /></span>}
      description={'Placed ' + date(order.placedAt)} />
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="detail-grid">
      <div className="stack">
        <section className="card">
          <SectionHeading title="Items" />
          {items.length ? <ul className="rows">{items.map((item, index) => (
            <li className="line-item" key={item.id ?? index}>
              <ProductArt category={item.category} />
              <div><strong>{item.name || item.id || 'Product'}</strong>
                {item.brand && <span className="metadata">{item.brand}{item.variant && ' · ' + item.variant}</span>}
                <span className="metadata">Quantity {item.quantity ?? '—'} · {money(item.unitPrice, order.currency)} each</span></div>
              <strong>{money(cents(item.unitPrice) !== null && Number.isInteger(item.quantity) ? cents(item.unitPrice) * item.quantity / 100 : null, order.currency)}</strong>
            </li>
          ))}</ul> : <p className="muted">Item details are unavailable.</p>}
        </section>
        <section className="card">
          <SectionHeading title="Fulfillment" />
          <dl className="facts">
            {order.fulfillmentMethod && <div><dt>Method</dt><dd>{human(order.fulfillmentMethod)}</dd></div>}
            {order.deliveredAt && <div><dt>Delivered</dt><dd>{date(order.deliveredAt)}</dd></div>}
            {order.cancelledAt && <div><dt>Cancelled</dt><dd>{date(order.cancelledAt, true)}</dd></div>}
          </dl>
          {shipments.length ? shipments.map((shipment, index) => <Shipment key={shipment.id ?? index} shipment={shipment} number={index + 1} items={items} />)
            : <p className="muted">No shipments for this order.</p>}
        </section>
      </div>
      <div className="stack">
        <section className="card">
          <SectionHeading title="Order summary" />
          <dl className="amounts">
            <div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            {cents(order.discount) > 0 && <div><dt>Discount</dt><dd>−{money(order.discount, order.currency)}</dd></div>}
            <div><dt>Shipping</dt><dd>{money(order.shipping, order.currency)}</dd></div>
            <div><dt>Tax</dt><dd>{money(order.tax, order.currency)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(order.total, order.currency)}</dd></div>
          </dl>
          <p className="metadata">{paymentLabel(order.payment)}</p>
        </section>
        {canCancel(state, order) && <button className="button secondary" onClick={() => { setError(''); setDialog(true) }}>Cancel order</button>}
        {returnableLines(state, order).length > 0 && <AccountLink className="button" to={paths.newReturn(order.id)}>Start a return</AccountLink>}
      </div>
    </div>
    {dialog && <Dialog title="Cancel order?" close={() => setDialog(false)}>
      <p>Cancel order <strong>{label}</strong> with an authorized total of <strong>{money(order.total, order.currency)}</strong>?</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={() => setDialog(false)}>Keep order</button>
        <button type="button" className="button" onClick={confirm}>Confirm cancellation</button>
      </div>
    </Dialog>}
  </>
}
