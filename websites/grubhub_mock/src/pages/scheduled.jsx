import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountLink, Empty, Glyph, PageHeading, Status } from '../components/ui'
import { ScheduleActions } from '../components/schedule'
import { list, orderHref, orderName, restaurantFor, timeValue, timingPath, windowLabel } from '../data/format'
import { orderFor, upcoming } from '../data/scheduling'
import { useAccount } from '../store'

function DeliveryCard({ delivery, order, restaurant, selected, onChange }) {
  return (
    <article className={`card delivery-card${selected ? ' selected-delivery' : ''}`} data-delivery-selected={selected || undefined} tabIndex={selected ? -1 : undefined}>
      <div className="delivery-head">
        <span className="next-icon"><Glyph name="calendar" /></span>
        <div><h3>{orderName(order, restaurant)}</h3><p className="meta">{order ? `#${order.id}` : 'Linked order unavailable'}</p></div>
        <Status value={delivery.status === 'scheduled' && delivery.confirmedAt ? 'confirmed' : delivery.status} />
      </div>
      <p className="delivery-window">{windowLabel(delivery)}</p>
      {order && <AccountLink className="inline-action" to={orderHref(order.id)}>View receipt <Glyph name="arrow" /></AccountLink>}
      <ScheduleActions delivery={delivery} order={order} restaurant={restaurant} onChange={onChange} />
    </article>
  )
}

export function Scheduled() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const [limit, setLimit] = useState(12)
  const [notice, setNotice] = useState('')
  const now = new Date()
  const selectedId = params.get('delivery')
  const deliveries = list(state.scheduledDeliveries)
  const future = deliveries.filter(delivery => upcoming(delivery, now)).sort((a, b) => timeValue(a.windowStartAt) - timeValue(b.windowStartAt))
  const past = deliveries.filter(delivery => !upcoming(delivery, now)).sort((a, b) => timeValue(b.windowStartAt) - timeValue(a.windowStartAt))
  const hasBag = list(state.cart?.items).length > 0

  function card(delivery, index) {
    const order = orderFor(state, delivery)
    return <DeliveryCard key={delivery.id || index} delivery={delivery} order={order} restaurant={restaurantFor(state, order?.restaurantId)} selected={selectedId !== null && delivery.id === selectedId} onChange={setNotice} />
  }

  return (
    <>
      <PageHeading title="Scheduled deliveries" description="See your booked delivery windows and past scheduled orders."
        action={<AccountLink className="button primary" to={timingPath(hasBag ? '/checkout' : '/restaurants', true)}>Schedule delivery <Glyph name="arrow" /></AccountLink>} />
      {notice && <p className="notice confirmation" role="status">{notice}</p>}
      <div className="stack schedule-sections">
        <section className="stack" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading">Upcoming</h2>
          {future.length ? future.map(card) : <Empty title="No upcoming deliveries">When you schedule an order, its delivery window will appear here.</Empty>}
        </section>
        <section className="stack" aria-labelledby="past-heading">
          <h2 id="past-heading">Past deliveries</h2>
          {past.length ? past.slice(0, limit).map(card) : <Empty title="No past deliveries" />}
          {past.length > limit && <button className="button more" onClick={() => setLimit(value => value + 12)}>Show more past deliveries</button>}
        </section>
      </div>
    </>
  )
}
