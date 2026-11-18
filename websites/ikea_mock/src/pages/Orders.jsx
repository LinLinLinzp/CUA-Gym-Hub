import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AccountLink, detailPath, Empty, OrderRow, Page, Photo, PriceSummary, Status } from '../components.jsx'
import { assemblyChoices, assemblySchedule, assemblySlots, returnQuantity } from '../data/mutations.js'
import { useAccount } from '../store.jsx'
import { addressText, byId, dateText, hasServiceAddress, list, money, newest, orderLabel, serviceLabel, statusLabel } from '../utils/account.js'
import { assemblyPath } from './Services.jsx'

export function Orders() {
  const { state } = useAccount()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const orders = newest(state.orders)
  const statuses = [...new Set(orders.map((order) => order.status).filter(Boolean))].sort()
  const query = search.trim().toLowerCase()
  const filtered = orders.filter((order) => (!status || status === order.status) && [
    order.reference, order.id, ...list(order.lines).flatMap((line) => [line.name, line.articleNumber, line.productId]),
  ].some((value) => String(value ?? '').toLowerCase().includes(query)))

  return <Page title="Purchases" description="Find receipts, order details and services for your purchases.">
    <div className="card filters">
      <label className="field grow">Search purchases<span className="search-field"><Search size={18} aria-hidden="true" />
        <input type="search" placeholder="Order reference or item name" value={search} onChange={(event) => setSearch(event.target.value)} />
      </span></label>
      <label className="field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
      </select></label>
    </div>
    <p className="results">{filtered.length} {filtered.length === 1 ? 'purchase' : 'purchases'}</p>
    {filtered.length ? <div className="card rows">{filtered.map((order) =>
      <OrderRow key={order.id} order={order} product={byId(state.products, list(order.lines)[0]?.productId)} />)}</div>
      : <Empty title={orders.length ? 'No matching purchases' : 'No purchases yet'}>
        {orders.length ? 'Try a different search or status.' : 'Your orders will appear here after checkout.'}
      </Empty>}
  </Page>
}

export function OrderDetail() {
  const { state } = useAccount()
  const { orderId } = useParams()
  const order = byId(state.orders, orderId)
  if (!order) return <Page title="Order unavailable" back={['/orders', 'Purchases']}>
    <Empty title="We couldn’t find that order" action={<AccountLink to="/orders">View purchases</AccountLink>} />
  </Page>
  const items = list(order.lines)
  const services = newest(state.bookings).filter((entry) => entry.orderId === order.id)
  const returns = newest(state.returns).filter((entry) => entry.orderId === order.id)
  const canReturn = items.some((line) => returnQuantity(state, order, line) > 0)
  const hasAssembly = assemblyChoices(state, order).length > 0
  const canAssemble = hasAssembly && hasServiceAddress(order.address)
    && assemblySlots(assemblySchedule(state, order).after).length > 0
  const totals = order.totals || {}
  const purchaseDate = dateText(order.createdAt)
  return <Page title={'Order ' + orderLabel(order)} description={purchaseDate} back={['/orders', 'Purchases']}
    action={<Status value={order.status} />}>
    <div className="split">
      <div className="stack">
        <section className="card panel"><h2>Purchased items</h2>
          {items.length ? <ul className="detail-items">{items.map((item, i) => {
            const product = byId(state.products, item.productId)
            return <li key={item.id || i}>
              <Photo imageKey={product?.imageKey} category={product?.category} className="row-photo" />
              <div className="record-name"><strong>{item.name || item.productId || 'Order item'}</strong>
                <small>{[item.variant, item.articleNumber].filter(Boolean).join(' · ')}</small></div>
              <span>Qty {item.quantity ?? '—'}</span><strong>{money(item.lineAmount)}</strong>
            </li>
          })}</ul> : <p className="muted">Item details are unavailable for this purchase.</p>}
        </section>
        <section className="card panel"><h2>Delivery & assembly</h2>
          {order.address && <p className="muted">{addressText(order.address)}</p>}
          {services.length ? <ul className="linked-items">{services.map((booking) =>
            <li key={booking.id}><AccountLink to={detailPath('services', booking.id)}>
              {serviceLabel(booking.type)} · {booking.reference || booking.id}
            </AccountLink><Status value={booking.status} /></li>)}</ul> : <p className="muted">No appointments recorded.</p>}
          {canAssemble ? <AccountLink className="button secondary" to={assemblyPath(order.id)}>Book assembly</AccountLink>
            : hasAssembly && <p className="muted">Assembly requires a serviceable address and an available time after fulfillment.</p>}
        </section>
        <section className="card panel"><h2>Returns</h2>
          {returns.length ? <ul className="linked-items">{returns.map((entry) =>
            <li key={entry.id}><AccountLink to={detailPath('returns', entry.id)}>{entry.reference || entry.id}</AccountLink>
              <Status value={entry.status} /></li>)}</ul> : <p className="muted">No return requests for this order.</p>}
          {canReturn && <AccountLink className="button secondary" to={'/returns/new?order=' + encodeURIComponent(order.id)}>Start a return</AccountLink>}
        </section>
      </div>
      <PriceSummary entries={[['Merchandise', totals.subtotal], ['Delivery', totals.delivery], ['Assembly', totals.assembly], ['Tax', totals.tax]]}
        totalLabel="Order total" total={totals.total} />
    </div>
  </Page>
}
