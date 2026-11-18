import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { byId, ensure, groupPath, list, makeOrder, merchantName, newId, orderPath, ordersNewest, quantityOf, refundPath, replaceRecord, subtotalOf, totalsFor, validQuantity } from './model.js'
import { Amounts, Back, Confirm, Details, FoodArt, ListPanel, Missing, PageHeading, QuantityField, RecordRow, SessionLink, Status, matches, money, receiptRows, useSessionNavigate, when } from './ui.jsx'
import { RefundRequest, refundableLines } from './refund-request.jsx'

const filters = [['all', 'All'], ['progress', 'In progress'], ['delivered', 'Delivered'], ['canceled', 'Canceled']]
const inProgress = (status) => ['placed', 'preparing'].includes(status)
const isReorderable = (order) => order?.status === 'delivered' && Boolean(order.merchantId) &&
  list(order.items).some((item) => item.id && item.name && validQuantity(item.quantity) && item.quantity > 0 && validQuantity(item.unitPriceCents))

export function Orders() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const orders = ordersNewest(state.orders).filter((order) =>
    (filter === 'all' || (filter === 'progress' ? inProgress(order.status) : order.status === filter)) &&
    matches(query, merchantName(state, order), order.id, ...list(order.items).map((item) => item.name)))

  return <>
    <PageHeading title="Orders" description="Review your order history, find receipts, and reorder your favorites." />
    <ListPanel title="Orders" placeholder="Search restaurants, IDs or items" query={query} setQuery={setQuery}
      filter={filter} setFilter={setFilter} filters={filters} count={orders.length}>
      {orders.map((order, index) => {
        const quantity = quantityOf(order.items)
        return <RecordRow key={order.id || index} art={<FoodArt merchantId={order.merchantId} />} title={merchantName(state, order)}
          subtitle={[order.id, when(order.createdAt), quantity + (quantity === 1 ? ' item' : ' items')].filter(Boolean).join(' · ')}
          status={order.status} amount={money(order.totals?.totalCents)} to={order.id && orderPath(order.id)} action="View order" />
      })}
    </ListPanel>
  </>
}

export function OrderDetails() {
  const { orderId } = useParams()
  const { state } = useAccount()
  const order = byId(state.orders, orderId)
  return order ? <OrderView key={orderId} order={order} /> : <Missing title="Order unavailable" to="/orders" back="All orders" />
}

function OrderView({ order }) {
  const { state, commit } = useAccount()
  const [dialog, setDialog] = useState(null)
  const close = () => setDialog(null)
  const refunds = ordersNewest(state.refunds).filter((refund) => refund.orderId === order.id)
  const group = byId(state.groupOrders, order.groupOrderId) || list(state.groupOrders).find((record) => record.orderId === order.id)
  const canCancel = order.status === 'placed' && Boolean(state.account?.id)
  const canReorder = isReorderable(order) && Boolean(state.account?.id)
  const canGetHelp = order.status === 'delivered' && Boolean(state.account?.id)

  function cancel() {
    return commit((latest, now) => {
      const current = byId(latest.orders, order.id)
      ensure(current?.status === 'placed' && latest.account?.id, 'This order can no longer be canceled.')
      const next = { ...current, status: 'canceled', updatedAt: now, canceledAt: now, canceledBy: latest.account.id }
      return { ...latest, orders: replaceRecord(latest.orders, next) }
    }, 'Order canceled.')
  }

  return <>
    <Back to="/orders">All orders</Back>
    <PageHeading title={merchantName(state, order)} description={[order.id, when(order.createdAt, true)].join(' · ')}>
      {canReorder && <button className="button primary" onClick={() => setDialog('reorder')}>Reorder</button>}
      {canGetHelp && <button className="button secondary" onClick={() => setDialog('refund')}>Get help</button>}
      {canCancel && <button className="button secondary" onClick={() => setDialog('cancel')}>Cancel order</button>}
    </PageHeading>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel panel-pad">
          <h2>Receipt</h2>
          <ul className="line-list">
            {list(order.items).map((item, index) => <li className="line-item" key={item.id || index}>
              <span className="wrap"><strong>{item.name || 'Item'}</strong><small>{item.quantity ?? '—'} × {money(item.unitPriceCents)}</small></span>
              <strong>{money(Number(item.quantity) * Number(item.unitPriceCents))}</strong>
            </li>)}
          </ul>
          {!list(order.items).length && <p className="muted">No receipt items are available.</p>}
        </section>
        {refunds.length > 0 && <section className="panel panel-pad">
          <h2>Refunds for this order</h2>
          <ul className="line-list">
            {refunds.map((refund, index) => <li className="line-item" key={refund.id || index}>
              <span>{refund.id ? <SessionLink to={refundPath(refund.id)}>{refund.id}</SessionLink> : 'Refund'}<small>{when(refund.createdAt)}</small></span>
              <span><Status value={refund.status} /> <strong>{money(refund.totalCents)}</strong></span>
            </li>)}
          </ul>
        </section>}
      </div>
      <aside className="stack">
        <section className="panel panel-pad">
          <h2>Order total</h2>
          <Amounts rows={receiptRows(order.totals)} total={['Total', order.totals?.totalCents]} />
        </section>
        <section className="panel panel-pad">
          <h2>Fulfillment</h2>
          <Details rows={[
            ['Status', <Status value={order.status} />], ['Delivery address', order.deliveryAddress],
            ['Payment', order.paymentLabel], ['Delivered', order.deliveredAt && when(order.deliveredAt, true)],
            ['Canceled', order.canceledAt && when(order.canceledAt, true)],
            ['Group order', group?.id ? <SessionLink to={groupPath(group.id)}>{group.name || group.id}</SessionLink> : order.groupOrderId],
          ]} />
        </section>
      </aside>
    </div>
    {dialog === 'reorder' && <Reorder order={order} close={close} />}
    {dialog === 'refund' && <RefundRequest order={order} close={close} lines={refundableLines(state, order)} />}
    {dialog === 'cancel' && <Confirm title="Cancel order?" submitLabel="Confirm cancellation" onClose={close} onConfirm={cancel}>
      <p>Cancel order {order.id} from {merchantName(state, order)} for {money(order.totals?.totalCents)}?</p>
    </Confirm>}
  </>
}

function reorderTotals(items, previous) {
  const subtotal = subtotalOf(items)
  const ratio = previous?.subtotalCents > 0 ? subtotal / previous.subtotalCents : 0
  return totalsFor(items, { ...previous, taxCents: Math.round((Number(previous?.taxCents) || 0) * ratio) })
}

function Reorder({ order, close }) {
  const { state, commit } = useAccount()
  const navigate = useSessionNavigate()
  const sourceLines = list(order.items).filter((item) => item.id && item.name && validQuantity(item.unitPriceCents))
  const [counts, setCounts] = useState(() => Object.fromEntries(sourceLines.map((item) => [item.id, String(item.quantity ?? 0)])))
  const selected = sourceLines.map((item) => ({ ...item, quantity: Number(counts[item.id]) })).filter((item) => item.quantity > 0)

  async function place() {
    let placed
    await commit((latest, now) => {
      const current = byId(latest.orders, order.id)
      ensure(isReorderable(current), 'This order is no longer eligible for reorder.')
      ensure(Object.values(counts).every((count) => count !== '' && validQuantity(Number(count))), 'Enter a whole quantity for each item.')
      const items = list(current.items).filter((item) => Number(counts[item.id]) > 0).map((item) => {
        ensure(item.name && validQuantity(item.unitPriceCents), 'An item is missing its receipt price.')
        return { id: newId('line'), menuItemId: item.menuItemId, name: item.name, unitPriceCents: item.unitPriceCents, quantity: Number(counts[item.id]) }
      })
      ensure(items.length && items.length === selected.length, 'Select at least one available item.')
      placed = makeOrder(latest.account, { id: current.merchantId, name: merchantName(latest, current) }, items,
        reorderTotals(items, current.totals), now, { sourceOrderId: current.id })
      return { ...latest, orders: [...list(latest.orders), placed] }
    }, 'Order placed.')
    navigate(orderPath(placed.id))
  }

  const totals = reorderTotals(selected, order.totals)
  return <Confirm title="Review reorder" submitLabel="Place order" onClose={close} onConfirm={place} disabled={!selected.length}>
    <p>Choose quantities for your order from {merchantName(state, order)}.</p>
    <ul className="line-list">
      {sourceLines.map((item) => <li className="line-item" key={item.id}>
        <span className="wrap"><strong>{item.name}</strong><small>{money(item.unitPriceCents)} each</small></span>
        <QuantityField label={item.name + ' quantity'} value={counts[item.id]} max={Math.max(99, item.quantity || 0)}
          onChange={(value) => setCounts({ ...counts, [item.id]: value })} />
      </li>)}
    </ul>
    <Amounts rows={receiptRows(totals)} total={['Order total', totals.totalCents]} />
  </Confirm>
}
