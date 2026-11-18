import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { find, free, issueFor, rows, seatsFor } from './data/model.js'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { OrderAction } from './OrderAction.jsx'
import { dateLabel, Empty, EventArt, EventInfo, Filters, human, OrderLink, PageHeading, Pager, paymentLabel, Receipt, seatLabel, Status, ticketCount, useDialog } from './ui.jsx'

const tabs = [['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All'], ['saved', 'Saved']]
const pageSize = 12
const isSaved = (save, world) => save.actorId === world.account?.id && save.status === 'saved'

function sortOrders(a, b, upcoming) {
  const aTime = a.time ?? (upcoming ? Infinity : -Infinity)
  const bTime = b.time ?? (upcoming ? Infinity : -Infinity)
  return (upcoming ? aTime - bTime : bTime - aTime) ||
    String(a.order.id ?? '').localeCompare(String(b.order.id ?? '')) || a.index - b.index
}

export function Orders() {
  const { world } = useAccount()
  const [tab, setTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [selectedPage, setPage] = useState(0)
  const entries = useMemo(() => {
    const events = new Map(rows(world, 'events').map((event) => [event.id, event]))
    const saved = new Set(rows(world, 'orderSaves').filter((save) => isSaved(save, world)).map((save) => save.orderId))
    return rows(world, 'orders').map((order, index) => {
      const event = order.eventId ? events.get(order.eventId) : undefined
      const time = Date.parse(event?.startsAt)
      return { order, event, index, time: Number.isFinite(time) ? time : null, saved: saved.has(order.id) }
    })
  }, [world])
  const now = new Date().getTime()
  const query = search.trim().toLowerCase()
  const filtered = entries.filter(({ order, event, time, saved }) => {
    if (tab === 'saved' && !saved) return false
    if (tab === 'upcoming' && time !== null && time < now) return false
    if (tab === 'past' && (time === null || time >= now)) return false
    return !query || [order.orderNumber, event?.name, event?.venue, event?.city].some((value) => String(value ?? '').toLowerCase().includes(query))
  }).sort((a, b) => sortOrders(a, b, tab === 'upcoming'))
  const page = Math.min(selectedPage, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))

  return <>
    <PageHeading title="Orders" description="Find your events, manage seats and view receipts." />
    <div className="ledger-controls">
      <Filters options={tabs} value={tab} label="Order views" onChange={(value) => { setTab(value); setPage(0) }} />
      <label className="search"><span className="search-icon" aria-hidden="true" /><span className="sr-only">Search orders</span>
        <input type="search" value={search} placeholder="Search events, venues or orders" onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      </label>
    </div>
    <div className="ledger-heading"><h2>{tabs.find(([id]) => id === tab)[1]} orders</h2><span role="status">{filtered.length} {filtered.length === 1 ? 'order' : 'orders'}</span></div>
    {filtered.length ? <ul className="ledger">
      {filtered.slice(page * pageSize, (page + 1) * pageSize).map(({ order, event, saved, index }) =>
        <li key={order.id || index} className="ledger-row">
          <EventArt event={event} />
          <EventInfo event={event} as="h3" />
          <div className="row-meta"><span className="meta-label">Order number</span><strong>{order.orderNumber || 'Unavailable'}</strong><span>{ticketCount(order.quantity)}{saved ? ' · Saved' : ''}</span></div>
          <Status value={event?.status && event.status !== 'scheduled' ? event.status : order.status} />
          <OrderLink order={order} />
        </li>,
      )}
    </ul> : <Empty title={query ? 'No matching orders' : `No ${tab === 'all' ? '' : `${tab} `}orders`} description={
      query ? 'Try another event, venue, city or order number.' : tab === 'saved' ? 'Saved orders will appear here.' : 'Orders in this view will appear here.'
    } />}
    <Pager page={page} total={filtered.length} size={pageSize} label="Order pages" onChange={setPage} />
  </>
}

const actions = [['transfer', 'Transfer tickets'], ['listing', 'Sell tickets'], ['refund', 'Request refund']]

export function OrderDetail() {
  const { orderId } = useParams()
  return <OrderDetailView key={orderId} orderId={orderId} />
}

function OrderDetailView({ orderId }) {
  const { world, commit, pending } = useAccount()
  const ui = useDialog()
  const [saveError, setSaveError] = useState('')
  const order = find(world, 'orders', orderId)
  const back = <Link className="text-link back-link" to={withSid('/orders')}>← All orders</Link>
  if (!order) return <>{back}<Empty title="Order unavailable" description="We couldn’t find this order in your account." /></>

  const event = find(world, 'events', order.eventId)
  const seats = seatsFor(world, order.id)
  const usable = seats.filter((seat) => seat.id && free(seat)).length
  const saved = rows(world, 'orderSaves').some((save) => save.orderId === order.id && isSaved(save, world))
  const method = find(world, 'paymentMethods', order.paymentMethodId)
  const actionIssues = Object.fromEntries(actions.map(([kind]) => [kind, issueFor(order, event, seats, kind, world)]))
  const canSave = Number.isSafeInteger(order.quantity) && order.quantity > 0 && !!world.account?.id
  async function toggleSave() {
    setSaveError('')
    ui.setNotice('')
    const problem = await commit({ type: 'saveOrder', orderId, saved: !saved })
    if (problem) setSaveError(problem)
    else ui.setNotice(saved ? 'Order removed from saved.' : 'Order saved.')
  }

  return <>
    {back}
    <div className="order-hero panel">
      <EventArt event={event} large />
      <div className="hero-content">
        <div className="hero-top"><span className="meta-label">Order {order.orderNumber || 'details'}</span><Status value={order.status} /></div>
        <EventInfo event={event} as="h1" />
      </div>
      {canSave && <button type="button" className="button secondary" disabled={pending} onClick={toggleSave}>{saved ? 'Remove from saved' : 'Save order'}</button>}
    </div>
    {(event?.notice || (event?.status && event.status !== 'scheduled')) && <div className="notice event-notice">
      <strong>{event.status ? human(event.status) : 'Event notice'}</strong>{event.notice && <span>{event.notice}</span>}
    </div>}
    {ui.notice && <p className="notice success" role="status">{ui.notice}</p>}
    {saveError && <p className="notice error" role="alert">{saveError}</p>}
    <div className="order-grid">
      <section className="panel detail-panel">
        <div className="section-heading"><h2>Tickets</h2><span>{usable} available · {ticketCount(seats.length)}</span></div>
        {seats.length ? <ul className="ticket-list">{seats.map((seat, index) =>
          <li key={seat.id || index}><div><strong>{seatLabel(seat)}</strong><span>{seat.holdId && free(seat) === false && seat.status === 'available' ? 'On hold' : 'Assigned seat'}</span></div><Status value={seat.holdId && seat.status === 'available' ? 'on_hold' : seat.status} /></li>,
        )}</ul> : <p className="muted">Seat details are unavailable for this order.</p>}
        <div className="order-actions">
          {actions.slice(0, 2).map(([kind, label]) => <div key={kind}>
            <button className="button secondary" type="button" disabled={!!actionIssues[kind]} onClick={() => ui.open(kind)}>{label}</button>
            {actionIssues[kind] && <p>{actionIssues[kind]}</p>}
          </div>)}
        </div>
      </section>
      <aside className="panel detail-panel order-summary">
        <h2>Order summary</h2>
        <dl className="summary-meta"><div><dt>{order.source === 'transfer' ? 'Received' : 'Purchased'}</dt><dd>{dateLabel(order.createdAt)}</dd></div>
          <div><dt>Payment</dt><dd>{order.source === 'transfer' ? 'Received by transfer' : paymentLabel(method)}</dd></div>
        </dl>
        <details open><summary>Itemized receipt</summary><Receipt totals={order} /></details>
        <div className="refund-controls">
          <h3>Refund options</h3>
          {actionIssues.refund ? <p>{actionIssues.refund}</p> : <>
            <p>The organizer is accepting refund requests for this order.{order.refundDeadline && ` Request by ${dateLabel(order.refundDeadline, event?.timeZone, true)}.`}</p>
            <button type="button" className="button primary" onClick={() => ui.open('refund')}>Request refund</button>
          </>}
          {(order.refundPolicy === 'automatic' || ['refund_requested', 'refunded'].includes(order.status)) &&
            <Link className="text-link" to={withSid('/refunds')}>View refunds</Link>}
        </div>
      </aside>
    </div>
    {ui.dialog && <OrderAction kind={ui.dialog} order={order} seats={seats} world={world} commit={commit} pending={pending} onClose={ui.close} onSuccess={ui.success} />}
  </>
}
