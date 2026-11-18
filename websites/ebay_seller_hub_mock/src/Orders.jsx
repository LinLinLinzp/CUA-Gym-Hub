import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { append, byNumber, byText, date, event, find, match, money, orderStatuses, recordPath, replace, rows, timestamp } from './model.js'
import { cancellationRefund } from './refunds.js'
import { useStore } from './store.jsx'
import { Back, Dialog, Field, History, Icon, LinkTo, Missing, PageTitle, Queue, Status, useBrowse } from './ui.jsx'

const sorts = [['newest', 'Newest orders'], ['oldest', 'Oldest orders'], ['total-high', 'Highest total'], ['total-low', 'Lowest total']]

export function Orders() {
  const { state } = useStore()
  const browse = useBrowse('newest')
  const orders = rows(state.orders)
  const filtered = orders.filter(order => (!browse.status || order.status === browse.status) &&
    match(browse.query, order.id, order.orderNumber, order.buyer?.name, order.buyer?.username, ...rows(order.lines).flatMap(line => [line.title, line.sku])))
    .sort((a, b) => {
      if (browse.sort === 'oldest') return byText(a.createdAt, b.createdAt)
      if (browse.sort === 'total-high') return byNumber(b.total, a.total)
      if (browse.sort === 'total-low') return byNumber(a.total, b.total)
      return byText(b.createdAt, a.createdAt)
    })
  return <>
    <PageTitle title="Orders" action={<LinkTo className="button" to="/returns?status=requested"><Icon name="return" />Review return requests</LinkTo>}>Manage shipments, tracking, and order cancellations.</PageTitle>
    <Queue label="Orders" browse={browse} records={orders} filtered={filtered} statuses={orderStatuses} searchLabel="Search order, buyer, item, or SKU" sorts={sorts}
      columns={[{ label: 'Order' }, { label: 'Buyer' }, { label: 'Items' }, { label: 'Date' }, { label: 'Total', numeric: true }, { label: 'Status' }]}
      renderRow={(order, index) => {
        const lines = rows(order.lines)
        const title = order.orderNumber || order.id || 'Order'
        return <tr key={order.id || index}>
          <td>{order.id ? <LinkTo to={recordPath('orders', order.id)}>{title}</LinkTo> : title}</td>
          <td>{order.buyer?.name || order.buyer?.username || '—'}</td>
          <td><span>{lines[0]?.title || lines[0]?.sku || '—'}</span>{lines.length > 1 && <small>+{lines.length - 1} more</small>}</td>
          <td>{date(order.createdAt)}</td><td className="numeric">{money(order.total)}</td><td><Status value={order.status} /></td>
        </tr>
      }} />
  </>
}

const carriers = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other']
const reasons = ['Buyer requested cancellation', 'Item out of stock', 'Issue with shipping address', 'Other']
const actionLabels = { ship: 'Mark as shipped', tracking: 'Save tracking', cancel: 'Cancel order' }

function updateOrder(state, id, mode, form) {
  const order = find(state.orders, id)
  if (!order || (mode === 'tracking' ? !['awaiting_shipment', 'shipped'].includes(order.status) : order.status !== 'awaiting_shipment')) {
    throw new Error('This order is no longer eligible for that action.')
  }
  const now = timestamp()
  const updated = { ...order, updatedAt: now }
  const details = { previousStatus: order.status }
  let refund
  if (mode === 'cancel') {
    const reason = String(form.get('reason') || '').trim()
    if (!reasons.includes(reason)) throw new Error('Select a cancellation reason.')
    Object.assign(updated, { status: 'canceled', canceledAt: now, cancellationReason: reason })
    details.cancellationReason = reason
    if (order.paymentStatus === 'paid') {
      refund = cancellationRefund(state, order, now, reason)
      Object.assign(updated, { paymentStatus: 'refunded' })
      Object.assign(details, { refundId: refund.id, amount: refund.totalAmount })
    }
  } else {
    if (order.status === 'awaiting_shipment') Object.assign(updated, { status: 'shipped', shippedAt: now })
    if (mode === 'tracking') {
      const carrier = String(form.get('carrier') || '').trim()
      const number = String(form.get('number') || '').trim()
      if (!carrier || !number) throw new Error('Enter the carrier and tracking number.')
      if (order.status === 'shipped' && order.tracking?.carrier === carrier && order.tracking?.number === number) return state
      updated.tracking = { carrier, number, updatedAt: now }
      Object.assign(details, { carrier, number })
    }
  }
  details.status = updated.status
  const type = { ship: 'order_shipped', tracking: 'order_tracking_saved', cancel: 'order_canceled' }[mode]
  return { ...state, orders: replace(state.orders, updated), activity: append(state, 'activity', event(state, type, 'order', id, now, details)),
    ...(refund && { refunds: append(state, 'refunds', refund) }),
  }
}

export function OrderDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [mode, setMode] = useState(null)
  const order = find(state.orders, id)
  if (!order) return <Missing name="Order" to="/orders" label="Back to Orders" />
  const lines = rows(order.lines)
  const cases = rows(state.returns).filter(item => item.orderId === id && item.id)
  const carrierOptions = [...new Set([order.tracking?.carrier, ...carriers].filter(Boolean))]
  const address = order.shipTo
  const title = order.orderNumber || id
  const close = () => setMode(null)
  return <>
    <Back to="/orders">Back to Orders</Back>
    <PageTitle title={'Order ' + title} action={<Status value={order.status} />}>{[order.buyer?.name, date(order.createdAt)].filter(Boolean).join(' · ')}</PageTitle>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel padded"><h2>Items purchased</h2>
          {lines.length ? <div className="table-scroll compact" role="region" aria-label="Purchased items" tabIndex={0}><table><thead><tr><th>Item</th><th className="numeric">Unit price</th><th className="numeric">Quantity</th><th className="numeric">Total</th></tr></thead><tbody>
            {lines.map((line, index) => <tr key={line.id || index}><td>{find(state.listings, line.listingId) ? <LinkTo to={recordPath('listings', line.listingId)}>{line.title || line.listingId}</LinkTo> : line.title || line.listingId || 'Item'}<small>{line.sku}</small></td>
              <td className="numeric">{money(line.unitPrice)}</td><td className="numeric">{line.quantity ?? '—'}</td><td className="numeric">{money(line.lineTotal)}</td></tr>)}
          </tbody></table></div> : <p className="muted">No line items are available.</p>}
          <dl className="totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(order.shipping)}</dd></div>
            <div><dt>Tax</dt><dd>{money(order.tax)}</dd></div><div><dt>Order total</dt><dd>{money(order.total)}</dd></div></dl>
        </section>
        <section className="panel padded"><h2>Fulfillment</h2>
          <dl className="facts"><div><dt>Shipment status</dt><dd><Status value={order.status} /></dd></div>
            <div><dt>Tracking</dt><dd>{order.tracking?.number ? [order.tracking.carrier, order.tracking.number].filter(Boolean).join(' · ') : 'No tracking added'}</dd></div>
            {order.shippedAt && <div><dt>Shipped</dt><dd>{date(order.shippedAt, true)}</dd></div>}
            {order.canceledAt && <div><dt>Canceled</dt><dd>{date(order.canceledAt, true)}</dd></div>}
            {order.cancellationReason && <div><dt>Cancellation reason</dt><dd>{order.cancellationReason}</dd></div>}
          </dl>
          <div className="inline-actions">
            {order.status === 'awaiting_shipment' && <button className="button primary" onClick={() => setMode('ship')}>Mark as shipped</button>}
            {['awaiting_shipment', 'shipped'].includes(order.status) && <button className="button" onClick={() => setMode('tracking')}>{order.tracking?.number ? 'Edit tracking' : 'Add tracking'}</button>}
            {order.status === 'awaiting_shipment' && <button className="button" onClick={() => setMode('cancel')}>Cancel order</button>}
          </div>
        </section>
      </div>
      <aside className="stack">
        <section className="panel padded"><h2>Shipping destination</h2>
          {address ? <address>{address.name || order.buyer?.name}<br />{address.line1}<br />{[address.city, address.region, address.postalCode].filter(Boolean).join(' ')}<br />{address.country}</address> : <p className="muted">No shipping address is available.</p>}
          <dl className="facts"><div><dt>Payment</dt><dd><Status value={order.paymentStatus} /></dd></div></dl>
        </section>
        {cases.length > 0 && <section className="panel padded"><h2>Related returns</h2><ul className="record-list">{cases.map(item => <li key={item.id}><LinkTo to={recordPath('returns', item.id)}>{item.id}</LinkTo><Status value={item.status} /></li>)}</ul></section>}
        <History kind="order" id={id} />
      </aside>
    </div>
    {mode && <Dialog title={mode === 'tracking' ? (order.tracking?.number ? 'Edit tracking' : 'Add tracking') : actionLabels[mode] + '?'} confirm={actionLabels[mode]} danger={mode === 'cancel'} onClose={close}
      onConfirm={form => commit(current => updateOrder(current, id, mode, form), { ship: 'Order marked as shipped.', tracking: 'Tracking saved.', cancel: 'Order canceled.' }[mode])}>
      {mode === 'ship' && <p>Confirm that order <strong>{title}</strong> has been handed to the carrier.</p>}
      {mode === 'tracking' && <>
        {order.status === 'awaiting_shipment' && <p>Saving tracking will mark this order as shipped.</p>}
        <Field label="Carrier"><select name="carrier" defaultValue={order.tracking?.carrier || ''} required><option value="">Select carrier</option>{carrierOptions.map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Tracking number"><input name="number" defaultValue={order.tracking?.number || ''} maxLength={100} required /></Field>
      </>}
      {mode === 'cancel' && <>
        <p>{order.paymentStatus === 'paid' ? <>The buyer will receive a refund of <strong>{money(order.total)}</strong>.</> : <>Confirm cancellation of order <strong>{title}</strong>.</>}</p>
        <Field label="Cancellation reason"><select name="reason" defaultValue="" required><option value="">Select reason</option>{reasons.map(reason => <option key={reason}>{reason}</option>)}</select></Field>
      </>}
    </Dialog>}
  </>
}
