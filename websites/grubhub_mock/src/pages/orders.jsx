import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AccountLink, CuisineTile, Empty, Glyph, PageHeading, Status } from '../components/ui'
import { Address, Tender, Totals } from '../components/detail'
import { ReorderAction } from '../components/ordering'
import { RefundAction } from '../components/refundRequest'
import { ScheduleActions } from '../components/schedule'
import { dateLabel, list, money, orderHref, orderName, refundHref, restaurantFor, searchable, timeValue, windowLabel } from '../data/format'
import { orderFor, scheduleFor, upcoming } from '../data/scheduling'
import { refundBalance } from '../data/refundRules'
import { useAccount } from '../store'

const groups = { All: [], Active: ['placed', 'scheduled'], Past: ['delivered', 'cancelled'] }

function OrderCard({ order, restaurant }) {
  const items = list(order.items)
  const summary = items.slice(0, 3).map(item => `${item.quantity || 1} × ${item.name || 'Menu item'}`).join(' · ')
  return (
    <article className="card order-card">
      <CuisineTile kind={restaurant?.tile} />
      <div className="order-body">
        <div className="order-title">
          <div><h3>{orderName(order, restaurant)}</h3><p className="meta">{dateLabel(order.createdAt)} · #{order.id}</p></div>
          <div className="order-price"><Status value={order.status} /><strong>{money(order.totals?.total)}</strong></div>
        </div>
        <p className="order-summary">{summary || 'Item details unavailable'}{items.length > 3 && ` · +${items.length - 3} more`}</p>
        <div className="actions order-quick-actions">
          <AccountLink className="inline-action" to={orderHref(order.id)}>View receipt <Glyph name="arrow" /></AccountLink>
          {order.status === 'delivered' && restaurant?.id && <ReorderAction orderId={order.id} />}
        </div>
      </div>
    </article>
  )
}

export function Orders() {
  const { state } = useAccount()
  const [group, setGroup] = useState('All')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [limit, setLimit] = useState(12)
  const restaurants = useMemo(() => new Map(list(state.restaurants).map(restaurant => [restaurant.id, restaurant])), [state.restaurants])
  const orders = list(state.orders).filter(order => order.id)
  const query = search.trim().toLowerCase().replace(/^#/, '')
  const filtered = orders.filter(order => (
    (group === 'All' || groups[group].includes(order.status))
    && searchable(order.id, orderName(order, restaurants.get(order.restaurantId)), ...list(order.items).map(item => item.name)).includes(query)
  )).sort((a, b) => (sort === 'oldest' ? 1 : -1) * (timeValue(a.createdAt) - timeValue(b.createdAt)))
  const now = new Date()
  const next = list(state.scheduledDeliveries).filter(delivery => upcoming(delivery, now)).sort((a, b) => timeValue(a.windowStartAt) - timeValue(b.windowStartAt))[0]
  const nextOrder = next && orderFor(state, next)

  function clear() {
    setGroup('All')
    setSearch('')
    setLimit(12)
  }

  return (
    <>
      <PageHeading title="Orders" description="Find receipts and keep track of your deliveries."
        action={<AccountLink to="/restaurants" className="button primary">Browse restaurants <Glyph name="arrow" /></AccountLink>} />
      <div className={next ? 'split' : undefined}>
        <section className="stack" aria-label="Order history">
          <div className="order-controls">
            <label className="search-field"><span className="sr-only">Search orders</span><Glyph name="search" /><input type="search" placeholder="Search restaurant, item, or order number" value={search} onChange={event => { setSearch(event.target.value); setLimit(12) }} /></label>
            <div className="control-row">
              <div className="segmented" role="group" aria-label="Order status">
                {Object.keys(groups).map(label => <button key={label} type="button" aria-pressed={group === label} onClick={() => { setGroup(label); setLimit(12) }}>{label}</button>)}
              </div>
              <label className="sort"><span className="sr-only">Sort orders</span><select value={sort} onChange={event => { setSort(event.target.value); setLimit(12) }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            </div>
          </div>
          <p className="meta results-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'order' : 'orders'}</p>
          {filtered.slice(0, limit).map(order => <OrderCard key={order.id} order={order} restaurant={restaurants.get(order.restaurantId)} />)}
          {!filtered.length && (orders.length
            ? <Empty title="No matching orders" action={<button className="button" onClick={clear}>Clear filters</button>}>Try another restaurant, dish, or order number.</Empty>
            : <Empty title="No orders yet" action={<AccountLink className="button" to="/restaurants">Browse restaurants</AccountLink>}>Your delivery orders and receipts will appear here.</Empty>)}
          {filtered.length > limit && <button className="button more" onClick={() => setLimit(value => value + 12)}>Show more orders</button>}
        </section>
        {next && (
          <aside className="card next-delivery">
            <span className="next-icon"><Glyph name="calendar" /></span>
            <h2>Next delivery</h2>
            {nextOrder && <p className="next-name">{orderName(nextOrder, restaurants.get(nextOrder.restaurantId))}</p>}
            <p className="meta">{windowLabel(next)}</p>
            <AccountLink className="inline-action" to="/scheduled">Scheduled deliveries <Glyph name="arrow" /></AccountLink>
          </aside>
        )}
      </div>
    </>
  )
}

export function Receipt() {
  const { orderId } = useParams()
  const location = useLocation()
  const { state } = useAccount()
  const order = list(state.orders).find(candidate => candidate.id === orderId)
  const back = { to: '/orders', label: 'Back to orders' }
  if (!order) return <><PageHeading title="Receipt unavailable" back={back} /><Empty title="Order unavailable">This order is missing from your account history.</Empty></>

  const restaurant = restaurantFor(state, order.restaurantId)
  const schedule = scheduleFor(state, order)
  const refunds = list(state.refunds).filter(refund => refund.orderId === order.id)
  const balance = refundBalance(order, refunds)
  const items = list(order.items)

  return (
    <>
      <PageHeading title="Order receipt" back={back} description={`#${order.id} · ${dateLabel(order.createdAt)}`}
        action={<div className="actions">
          <button className="button" type="button" onClick={() => window.print()}>Print receipt</button>
          {order.status === 'delivered' && <ReorderAction key={order.id} orderId={order.id} />}
        </div>} />
      {location.state?.notice && <p className="notice confirmation" role="status">{location.state.notice}. Order #{order.id}.</p>}
      <div className="split receipt">
        <div className="stack">
          <section className="card receipt-main">
            <div className="detail-title"><CuisineTile kind={restaurant?.tile} /><div><h2>{orderName(order, restaurant)}</h2><p className="meta">Delivery order</p></div><Status value={order.status} /></div>
            <ul className="receipt-lines">
              {items.map((item, index) => <li key={item.id || index}><div><strong>{item.name || 'Menu item'}</strong><p className="meta">{item.quantity ?? '—'} × {money(item.unitPrice)}</p></div><strong>{money(item.subtotal ?? (item.unitPrice != null && item.quantity != null ? Number(item.unitPrice) * item.quantity : null))}</strong></li>)}
              {!items.length && <li className="meta">Item details unavailable</li>}
            </ul>
            {order.status === 'placed' && <p className="receipt-note">Delivery as soon as possible.</p>}
            {(schedule || order.timing === 'scheduled') && (
              <div className="receipt-note">
                <h3>Scheduled delivery</h3><p>{windowLabel(schedule)}</p>
                {schedule?.confirmedAt && schedule.status === 'scheduled' && <Status value="confirmed" />}
                {schedule?.id && upcoming(schedule) && <AccountLink className="inline-action" to={`/scheduled?delivery=${encodeURIComponent(schedule.id)}`}>Manage delivery <Glyph name="arrow" /></AccountLink>}
                {schedule && <ScheduleActions delivery={schedule} order={order} restaurant={restaurant} />}
              </div>
            )}
          </section>
          <section className="card receipt-logistics">
            <div><h2>Delivery address</h2><Address address={order.address} /></div>
            <div><h2>Payment</h2><Tender payment={order.payment} /></div>
          </section>
          {(order.status === 'delivered' || refunds.length > 0) && (
            <section className="card receipt-support">
              <h2>Help with this order</h2>
              {balance.amount ? <p className="meta">{money(balance.amount / 100)} remaining to request.</p> : <p className="meta">This order has no refundable amount available.</p>}
              {refunds.filter(refund => refund.id).map(refund => <div className="support-row" key={refund.id}><AccountLink to={refundHref(refund.id)}>#{refund.id}</AccountLink><Status value={refund.status} /><strong>{money(refund.amount)}</strong></div>)}
              {balance.amount > 0 && state.account?.id && <RefundAction key={order.id} orderId={order.id} />}
            </section>
          )}
        </div>
        <Totals totals={order.totals} />
      </div>
    </>
  )
}
