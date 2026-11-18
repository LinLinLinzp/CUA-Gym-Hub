import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { byId, list, merchantName, orderPath, ordersNewest, refundPath } from './model.js'
import { methods, reasons } from './refund-request.jsx'
import { Amounts, Back, Details, Icon, ListPanel, Missing, PageHeading, RecordRow, SessionLink, Status, label, matches, money, when } from './ui.jsx'

const filters = [['all', 'All'], ['requested', 'Requested'], ['issued', 'Issued'], ['declined', 'Declined']]

function restaurant(state, refund) {
  return refund.merchantName || merchantName(state, byId(state.orders, refund.orderId) || {})
}

export function Refunds() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const refunds = ordersNewest(state.refunds).filter((refund) => (filter === 'all' || refund.status === filter) &&
    matches(query, refund.id, refund.orderId, restaurant(state, refund), reasons[refund.reason], ...list(refund.items).map((item) => item.name)))

  return <>
    <PageHeading title="Refunds" description="Track item issues, requested amounts, and refund decisions." />
    <ListPanel title="Refunds" placeholder="Search restaurants, IDs or items" query={query} setQuery={setQuery}
      filter={filter} setFilter={setFilter} filters={filters} count={refunds.length}>
      {refunds.map((refund, index) => <RecordRow key={refund.id || index} art={<span className="record-icon"><Icon name="receipt" /></span>}
        title={restaurant(state, refund)} subtitle={[refund.id, refund.orderId, when(refund.createdAt)].filter(Boolean).join(' · ')}
        status={refund.status} amount={money(refund.totalCents)} to={refund.id && refundPath(refund.id)} action="View refund" />)}
    </ListPanel>
  </>
}

export function RefundDetails() {
  const { refundId } = useParams()
  const { state } = useAccount()
  const refund = byId(state.refunds, refundId)
  if (!refund) return <Missing title="Refund unavailable" to="/refunds" back="All refunds" />

  const order = byId(state.orders, refund.orderId)
  return <>
    <Back to="/refunds">All refunds</Back>
    <PageHeading title={restaurant(state, refund)} description={[refund.id, 'Requested ' + when(refund.createdAt)].join(' · ')}>
      <Status value={refund.status} />
    </PageHeading>
    <div className="detail-grid">
      <section className="panel panel-pad">
        <h2>Affected items</h2>
        <ul className="line-list">
          {list(refund.items).map((item, index) => <li className="line-item" key={item.orderItemId || index}>
            <span className="wrap"><strong>{item.name || byId(order?.items, item.orderItemId)?.name || 'Item'}</strong><small>Quantity {item.quantity ?? '—'}</small></span>
            <strong>{money(item.amountCents)}</strong>
          </li>)}
        </ul>
        {!list(refund.items).length && <p className="muted">No item details are available.</p>}
      </section>
      <aside className="stack">
        <section className="panel panel-pad">
          <h2>Refund summary</h2>
          <Details rows={[
            ['Reason', reasons[refund.reason] || label(refund.reason)], ['Refund method', methods[refund.method] || label(refund.method)],
            ['Issued', refund.status === 'issued' && refund.resolvedAt ? when(refund.resolvedAt, true) : null],
            ['Order', order ? <SessionLink to={orderPath(order.id)}>{order.id}</SessionLink> : refund.orderId],
            ['Note', refund.note],
          ]} />
          <div className="section-actions"><Amounts rows={[]} total={[refund.status === 'issued' ? 'Refunded amount' : 'Requested amount', refund.totalCents]} /></div>
        </section>
      </aside>
    </div>
  </>
}
