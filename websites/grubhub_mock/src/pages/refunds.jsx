import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AccountLink, Empty, Glyph, PageHeading, Status } from '../components/ui'
import { Tender } from '../components/detail'
import { eligibleRefundOrders, RefundRequest } from '../components/refundRequest'
import { dateLabel, list, money, orderHref, orderName, refundHref, restaurantFor, searchable, timeValue } from '../data/format'
import { reasons } from '../data/refundRules'
import { useAccount } from '../store'

const statuses = ['requested', 'approved', 'refunded', 'denied']

function RefundCard({ refund, order, restaurant }) {
  return (
    <article className="card">
      <div className="order-title">
        <div>
          <h3>{orderName(order, restaurant)}</h3>
          <p className="meta">#{refund.id} · {dateLabel(refund.createdAt)}</p>
          <p className="meta">{refund.orderId ? `Order #${refund.orderId}` : 'Linked order unavailable'}</p>
        </div>
        <div className="order-price"><Status value={refund.status} /><strong>{money(refund.amount)}</strong></div>
      </div>
      <AccountLink className="inline-action case-link" to={refundHref(refund.id)}>View request <Glyph name="arrow" /></AccountLink>
    </article>
  )
}

export function Refunds() {
  const { state } = useAccount()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(12)
  const orders = useMemo(() => new Map(list(state.orders).map(order => [order.id, order])), [state.orders])
  const restaurants = useMemo(() => new Map(list(state.restaurants).map(restaurant => [restaurant.id, restaurant])), [state.restaurants])
  const cases = list(state.refunds).filter(refund => refund.id)
  const query = search.trim().toLowerCase().replace(/^#/, '')
  const matching = cases.filter(refund => {
    const order = orders.get(refund.orderId)
    return (!status || refund.status === status)
      && searchable(refund.id, refund.orderId, orderName(order, restaurants.get(order?.restaurantId))).includes(query)
  }).sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
  const canRequest = state.account?.id && eligibleRefundOrders(state).length > 0

  return (
    <>
      <PageHeading title="Refunds" description="Request a refund or check the status of an existing case."
        action={canRequest && <button type="button" className="button primary" onClick={() => setOpen(true)}>Request a refund</button>} />
      <div className="stack">
        <div className="refund-filters">
          <label className="search-field"><span className="sr-only">Search refunds</span><Glyph name="search" /><input type="search" placeholder="Search restaurant, order number, or case ID" value={search} onChange={event => { setSearch(event.target.value); setLimit(12) }} /></label>
          <label className="sort"><span className="sr-only">Refund status</span><select value={status} onChange={event => { setStatus(event.target.value); setLimit(12) }}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        </div>
        <p className="meta" aria-live="polite">{matching.length} {matching.length === 1 ? 'request' : 'requests'}</p>
        {matching.slice(0, limit).map(refund => {
          const order = orders.get(refund.orderId)
          return <RefundCard key={refund.id} refund={refund} order={order} restaurant={restaurants.get(order?.restaurantId)} />
        })}
        {!matching.length && (cases.length ? <Empty title="No matching requests" action={<button className="button" onClick={() => { setSearch(''); setStatus(''); setLimit(12) }}>Clear filters</button>} />
          : <Empty title="No refund requests" action={<AccountLink className="button" to="/orders">View orders</AccountLink>}>Submitted requests will appear here.</Empty>)}
        {matching.length > limit && <button className="button more" onClick={() => setLimit(value => value + 12)}>Show more requests</button>}
      </div>
      {open && <RefundRequest onClose={() => setOpen(false)} />}
    </>
  )
}

export function RefundDetail() {
  const { refundId } = useParams()
  const location = useLocation()
  const { state } = useAccount()
  const refund = list(state.refunds).find(item => item.id === refundId)
  const back = { to: '/refunds', label: 'Back to refunds' }
  if (!refund) return <><PageHeading title="Request unavailable" back={back} /><Empty title="Refund request unavailable">This case is missing from your refund history.</Empty></>

  const order = refund.orderId && list(state.orders).find(item => item.id === refund.orderId)
  const lines = new Map(list(order?.items).map(item => [item.id, item]))
  const restaurant = restaurantFor(state, order?.restaurantId)
  const items = list(refund.lineItems)
  const scopeLabel = refund.scope === 'full_order' ? 'Full order' : refund.scope === 'items' ? 'Specific items' : 'Unavailable'

  return (
    <>
      <PageHeading title="Refund request" back={back} description={`#${refund.id} · ${dateLabel(refund.createdAt)}`} />
      {location.state?.notice && <p className="notice confirmation" role="status">{location.state.notice}. Case #{refund.id} for {money(refund.amount)}.</p>}
      <div className="split">
        <div className="stack">
          <section className="card stack">
            <div className="order-title"><h2>{orderName(order, restaurant)}</h2><Status value={refund.status} /></div>
            {order ? <AccountLink className="inline-action" to={orderHref(order.id)}>View order #{order.id} <Glyph name="arrow" /></AccountLink> : <p className="meta">Linked order unavailable{refund.orderId && ` · #${refund.orderId}`}</p>}
            <dl className="case-details">
              <div><dt>Scope</dt><dd>{scopeLabel}</dd></div>
              <div><dt>Reason</dt><dd>{Object.hasOwn(reasons, refund.reason) ? reasons[refund.reason] : 'Reason unavailable'}</dd></div>
              {refund.notes && <div><dt>Details</dt><dd>{refund.notes}</dd></div>}
              {refund.resolvedAt && <div><dt>Resolved</dt><dd>{dateLabel(refund.resolvedAt)}</dd></div>}
            </dl>
          </section>
          <section className="card">
            <h2>Requested items</h2>
            <ul className="receipt-lines">
              {items.length ? items.map((item, index) => <li key={`${item.orderItemId}-${index}`}><div><strong>{lines.get(item.orderItemId)?.name || 'Order item'}</strong><p className="meta">Quantity {item.quantity ?? '—'}{!lines.has(item.orderItemId) && item.orderItemId && ` · ${item.orderItemId}`}</p></div><strong>{money(item.amount)}</strong></li>) : <li className="meta">Item details unavailable</li>}
            </ul>
          </section>
        </div>
        <aside className="card stack">
          <h2>Requested amount</h2>
          <p className="case-amount">{money(refund.amount)}</p>
          <div><p className="meta">Original payment</p><Tender payment={refund.payment?.last4 ? refund.payment : order?.payment} /></div>
        </aside>
      </div>
    </>
  )
}
