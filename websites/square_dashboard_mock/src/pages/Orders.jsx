import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { byRecent, contains, date, find, inRange, label, metadata, money, nameOf, newId, paymentMethod, ref, replace, rows } from '../model.js'
import { refundContext } from '../refundModel.js'
import { useStore } from '../store.jsx'
import { choices, Confirm, DateFilters, Facts, Header, ListCard, Notice, options, Recovery, RouteLink, Search, Select, Status, Table, useFilters } from '../ui.jsx'

const transitions = { new: 'in_progress', in_progress: 'ready', ready: 'completed' }
const statuses = choices(['new', 'in_progress', 'ready', 'completed', 'canceled'])
const sources = choices(['online', 'point_of_sale'])
export const orderPath = (id) => '/orders/' + encodeURIComponent(id)
const nextLabel = (status, fulfillment) => {
  if (status === 'new') return 'Start preparing'
  if (status === 'in_progress') return 'Mark ready'
  if (fulfillment === 'pickup') return 'Mark picked up'
  if (fulfillment === 'shipping') return 'Mark shipped'
  return 'Complete order'
}

export function Orders() {
  const { state } = useStore()
  const [filters, change, reset] = useFilters()
  const entries = rows(state.orders).filter((order) =>
    contains(filters.query || '', order.orderNumber, order.id, order.customerName)
    && (!filters.status || order.status === filters.status)
    && (!filters.source || order.source === filters.source)
    && (!filters.location || order.locationId === filters.location)
    && inRange(order.createdAt, filters.from, filters.to),
  ).sort(byRecent)
  return <>
    <Header title="Orders" subtitle="Track fulfillment across your sales channels." />
    <div className="filters">
      <Search title="Search orders" placeholder="Order number or customer" value={filters.query || ''} change={(value) => change('query', value)} />
      <Select title="Status" value={filters.status} change={(value) => change('status', value)} options={statuses} empty="All statuses" />
      <Select title="Source" value={filters.source} change={(value) => change('source', value)} options={sources} empty="All sources" />
      <Select title="Location" value={filters.location} change={(value) => change('location', value)} options={options(rows(state.locations))} empty="All locations" />
      <DateFilters filters={filters} change={change} />
    </div>
    <ListCard count={entries.length} noun="order">
      <Table label="Orders" headings={['Order', 'Customer', 'Source', 'Fulfillment', 'Location', '$Total', 'Placed', 'Status']} entries={entries} reset={Object.values(filters).some(Boolean) ? reset : null} empty="No orders found." render={(order, index) => <tr key={order.id ?? index}>
        <td>{order.id ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : ref(order, 'orderNumber')}</td>
        <td>{order.customerName || 'Guest'}</td><td>{label(order.source)}</td><td>{label(order.fulfillmentType)}</td><td>{nameOf(state.locations, order.locationId)}</td>
        <td className="number">{money(order.totalAmount, order.currency)}</td><td>{date(order.createdAt, true)}</td><td><Status value={order.status} /></td>
      </tr>} />
    </ListCard>
  </>
}

export function OrderRoute() {
  const { orderId } = useParams()
  const { state } = useStore()
  const order = find(state.orders, orderId)
  if (!order) return <Recovery title="Order unavailable" message="This order could not be found." to="/orders" action="Back to orders" />
  return <OrderDetail key={orderId} order={order} />
}

function OrderDetail({ order }) {
  const { state, commit } = useStore()
  const [cancelFrom, setCancelFrom] = useState(null)
  const [error, setError] = useState('')
  const payments = rows(state.payments).filter((payment) => payment.orderId === order.id)
  const next = transitions[order.status]
  function transition(from, to) {
    const result = commit((latest) => {
      const current = find(latest.orders, order.id)
      if (!current || current.status !== from || !transitions[from] || (transitions[from] !== to && to !== 'canceled')) {
        return { error: 'This order changed. Check its current status before continuing.' }
      }
      const meta = metadata(latest)
      const event = { id: newId('evt'), type: 'status_changed', fromStatus: current.status, toStatus: to, actorId: meta.actorId, createdAt: meta.updatedAt }
      const saved = { ...current, ...meta, status: to, activity: [...rows(current.activity), event] }
      return { state: { ...latest, orders: replace(latest.orders, saved) }, id: order.id, message: to === 'canceled' ? 'Order canceled.' : 'Order marked ' + label(to).toLowerCase() + '.' }
    })
    setError(result.error || '')
    if (!result.error) setCancelFrom(null)
  }
  return <>
    <Header title={'Order ' + ref(order, 'orderNumber')} subtitle={date(order.createdAt, true)} back={['/orders', 'Orders']} action={<Status value={order.status} />} />
    <Notice id={order.id} />
    <div className="grid">
      <div className="stack">
        <section className="card">
          <h2>Purchased items</h2>
          <Table label="Purchased items" headings={['Item', '$Quantity', '$Unit price', '$Total']} entries={rows(order.lineItems)} empty="Line details are unavailable." render={(line, index) => <tr key={line.id ?? index}>
            <td><strong>{line.name || 'Order item'}</strong>{line.variationName && <div className="muted small">{line.variationName}</div>}</td><td className="number">{line.quantity ?? '—'}</td>
            <td className="number">{money(line.unitPrice, order.currency)}</td><td className="number">{money(line.totalAmount, order.currency)}</td>
          </tr>} />
          <Facts entries={ [['Order total', money(order.totalAmount, order.currency)]] } />
        </section>
        <section className="card">
          <h2>Activity</h2>
          <ul className="activity">
            {rows(order.activity).slice().reverse().map((event, index) => <li key={event.id ?? index}>
              <strong>{event.type === 'created' ? 'Order placed' : label(event.fromStatus) + ' → ' + label(event.toStatus)}</strong>
              <span className="muted small">{date(event.createdAt, true)}{event.actorId && ' · ' + (event.actorId === state.account?.actorId ? state.account.actorName || event.actorId : event.actorId)}</span>
            </li>)}
            {!rows(order.activity).length && <li className="muted">No activity recorded.</li>}
          </ul>
        </section>
      </div>
      <div className="stack">
        <section className="card">
          <h2>Fulfillment</h2>
          <Facts entries={ [['Customer', order.customerName || 'Guest'], ['Location', nameOf(state.locations, order.locationId)], ['Source', label(order.source)], ['Method', label(order.fulfillmentType)]] } />
          {next && <div className="side-actions">
            <button className="button primary" onClick={() => transition(order.status, next)}>{nextLabel(order.status, order.fulfillmentType)}</button>
            <button className="button secondary" onClick={() => { setError(''); setCancelFrom(order.status) }}>Cancel order</button>
          </div>}
          {!cancelFrom && error && <p role="alert" className="error">{error}</p>}
        </section>
        <section className="card">
          <h2>Payments</h2>
          {!payments.length && <p className="muted">No payments linked to this order.</p>}
          {payments.map((payment, index) => {
            const { eligible, remaining } = refundContext(state, payment)
            return <div className="payment-block" key={payment.id ?? index}>
              <Facts entries={ [['Receipt', ref(payment, 'receiptNumber')], ['Method', paymentMethod(payment)], ['Amount', money(payment.amount, payment.currency)], ['Status', <Status value={payment.status} />]] } />
              {eligible ? <RouteLink className="button secondary" to={'/refunds?payment=' + encodeURIComponent(payment.id)}>{payments.length === 1 ? 'Issue refund' : 'Refund ' + ref(payment, 'receiptNumber')}</RouteLink>
                : <p className="muted small">{payment.status === 'paid' && !remaining ? 'No refundable balance.' : 'Refund available for linked paid payments.'}</p>}
            </div>
          })}
        </section>
      </div>
    </div>
    {cancelFrom && <Confirm title="Cancel this order?" action="Cancel order" close={() => { setCancelFrom(null); setError('') }} submit={() => transition(cancelFrom, 'canceled')} error={error}>The order will be marked canceled in your fulfillment history.</Confirm>}
  </>
}
