import React, { useRef, useState } from 'react'
import { Armchair, ChevronRight, Truck } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccountLink, ConfirmDialog, detailPath, Empty, ErrorText, Page, SlotChoices, Status, useAccountNavigate } from '../components.jsx'
import { assemblyChoices, assemblyItems, assemblySchedule, assemblySlots, bookAssembly, dependentAssemblies, manageBooking, rescheduleSlots } from '../data/mutations.js'
import { useAccount } from '../store.jsx'
import { addressText, byId, dateText, future, hasServiceAddress, list, money, newest, orderLabel, serviceLabel, slotText, statusLabel } from '../utils/account.js'
import { AssemblySelection } from './Shopping.jsx'

export function assemblyPath(orderId) {
  return '/services?order=' + encodeURIComponent(orderId) + '&action=assembly'
}

function ServiceRow({ booking, order }) {
  const Icon = booking.type === 'assembly' ? Armchair : Truck
  return <AccountLink className="record-row service-row" to={detailPath('services', booking.id)}>
    <span className="tile-icon"><Icon size={21} aria-hidden="true" /></span>
    <span className="record-name"><strong>{serviceLabel(booking.type)} · {booking.reference || booking.id}</strong>
      <small>{slotText(booking.slot)}</small><small>Order {orderLabel(order ?? { id: booking.orderId })}</small></span>
    <Status value={booking.status} /><ChevronRight className="row-chevron" size={18} aria-hidden="true" />
  </AccountLink>
}

export function Services() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const orderId = params.get('order')
  if (params.get('action') === 'assembly') return <ExistingAssembly key={orderId} orderId={orderId} />
  const appointments = list(state.bookings)
  const now = new Date()
  const upcoming = appointments.filter((booking) => booking.status === 'scheduled' && future(booking.slot?.startsAt, now))
    .sort((a, b) => Date.parse(a.slot.startsAt) - Date.parse(b.slot.startsAt))
  const shown = new Set(upcoming.map((booking) => booking.id))
  const past = newest(appointments.filter((booking) => !shown.has(booking.id)))
  const eligible = newest(state.orders).filter((order) => hasServiceAddress(order.address)
    && assemblyChoices(state, order).length && assemblySlots(assemblySchedule(state, order).after, now).length)
  return <Page title="Delivery & assembly" description="Review appointment times and manage home services.">
    {eligible.length > 0 && <div className="card panel service-cta"><div><h2>Need help with assembly?</h2>
      <p className="muted">Choose an eligible order to book an appointment.</p></div>
      <OrderAssemblyPicker orders={eligible} />
    </div>}
    {[['Upcoming appointments', upcoming, 'No upcoming appointments'], ['Past appointments', past, 'No past appointments']].map(([title, rows, empty]) =>
      <section key={title}>
        <div className="section-heading"><h2>{title}</h2><span className="muted">{rows.length}</span></div>
        {rows.length ? <div className="card rows">{rows.map((booking) => <ServiceRow key={booking.id}
          booking={booking} order={byId(state.orders, booking.orderId)} />)}</div> : <Empty title={empty} />}
      </section>)}
  </Page>
}

function OrderAssemblyPicker({ orders }) {
  const [id, setId] = useState(orders[0].id)
  return <div className="actions">
    <label className="field">Order<select value={id} onChange={(event) => setId(event.target.value)}>
      {orders.map((order) => <option key={order.id} value={order.id}>{orderLabel(order)}</option>)}
    </select></label>
    <AccountLink to={assemblyPath(id)} className="button primary">Book assembly</AccountLink>
  </div>
}

function ExistingAssembly({ orderId }) {
  const { state, commit, announce } = useAccount()
  const navigate = useAccountNavigate()
  const submitted = useRef(false)
  const [quantities, setQuantities] = useState({})
  const [slotId, setSlotId] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const order = byId(state.orders, orderId)
  const choices = order ? assemblyChoices(state, order) : []
  const slots = assemblySlots(assemblySchedule(state, order).after)
  const selection = assemblyItems(choices, quantities)
  const available = order && hasServiceAddress(order.address) && choices.length && slots.length

  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const result = commit((current) => bookAssembly(current, orderId, { quantities, consent, slotId }))
    setError(result.error || '')
    if (result.booking) {
      submitted.current = true
      announce('Assembly booked.')
      navigate(detailPath('services', result.booking.id), { replace: true })
    }
  }

  return <Page title="Book assembly" description={order && 'Order ' + orderLabel(order)} back={['/services', 'Delivery & assembly']}>
    {!available ? <Empty title="Assembly is unavailable for this order"
      action={<AccountLink to={order ? detailPath('orders', orderId) : '/orders'}>View purchases</AccountLink>}>
      A serviceable address, an eligible item and a window after fulfillment are required.
    </Empty> : <form className="card panel stack" noValidate onSubmit={submit}>
      <div><h2>Service address</h2><p>{addressText(order.address)}</p></div>
      <AssemblySelection choices={choices} quantities={quantities} setQuantities={setQuantities}
        slots={slots} slotId={slotId} setSlotId={setSlotId} consent={consent} setConsent={setConsent} />
      <ErrorText error={error} />
      <div className="actions"><strong>Assembly total {money(selection.amount ?? 0)}</strong>
        <button type="submit" className="button primary">Confirm assembly</button></div>
    </form>}
  </Page>
}

const historyLabels = { scheduled: 'Appointment scheduled', rescheduled: 'Appointment rescheduled', cancelled: 'Appointment cancelled' }

export function ServiceDetail() {
  const { bookingId } = useParams()
  const { state } = useAccount()
  const booking = byId(state.bookings, bookingId)
  if (!booking) return <Page title="Appointment unavailable" back={['/services', 'Delivery & assembly']}>
    <Empty title="We couldn’t find that appointment" action={<AccountLink to="/services">View appointments</AccountLink>} />
  </Page>
  return <BookingPage key={bookingId} booking={booking} />
}

function BookingPage({ booking }) {
  const { state, commit, announce } = useAccount()
  const [action, setAction] = useState('')
  const [slotId, setSlotId] = useState('')
  const [error, setError] = useState('')
  const order = byId(state.orders, booking.orderId)
  const delivery = byId(state.bookings, booking.deliveryBookingId)
  const manageable = booking.status === 'scheduled' && future(booking.slot?.startsAt) && ['assembly', 'delivery'].includes(booking.type)
  const dependencies = dependentAssemblies(state, booking)
  const slots = manageable ? rescheduleSlots(state, booking) : []
  const chosenSlot = byId(slots, slotId)
  const history = newest(booking.history).reverse()

  function open(nextAction) {
    setSlotId('')
    setError('')
    setAction(nextAction)
  }
  function confirm() {
    const result = commit((current) => manageBooking(current, booking.id, action, slotId))
    setError(result.error || '')
    if (!result.error) {
      setAction('')
      announce(action === 'cancel' ? 'Appointment cancelled.' : 'Appointment rescheduled.')
    }
  }

  return <Page title={serviceLabel(booking.type) + ' appointment'} description={booking.reference || booking.id}
    back={['/services', 'Delivery & assembly']} action={<Status value={booking.status} />}>
    <div className="split">
      <div className="stack">
        <section className="card panel"><h2>Appointment details</h2>
          <dl className="facts">
            <div><dt>Window</dt><dd>{slotText(booking.slot)}{booking.slot?.timeZone && <small>{booking.slot.timeZone.replaceAll('_', ' ')}</small>}</dd></div>
            <div><dt>Address</dt><dd>{addressText(booking.address) || 'Address unavailable'}</dd></div>
            <div><dt>Order</dt><dd>{order ? <AccountLink to={detailPath('orders', order.id)}>{orderLabel(order)}</AccountLink> : booking.orderId || 'Order unavailable'}</dd></div>
            <div><dt>Amount</dt><dd>{money(booking.amount)}</dd></div>
            {delivery && <div><dt>Related delivery</dt><dd><AccountLink to={detailPath('services', delivery.id)}>{delivery.reference || delivery.id}</AccountLink></dd></div>}
          </dl>
        </section>
        <section className="card panel"><h2>Included items</h2>
          {list(booking.items).length ? <ul className="detail-items">{list(booking.items).map((item, index) => {
            const line = byId(order?.lines, item.orderLineId)
            return <li key={item.orderLineId || index}><span>{line?.name || item.productId || 'Order item'}</span>
              <span>Qty {item.quantity ?? '—'}</span>{booking.type === 'assembly' && <strong>{money(item.lineAmount)}</strong>}</li>
          })}</ul> : <p className="muted">Item details are unavailable.</p>}
        </section>
      </div>
      <div className="stack">
        {manageable && <section className="card panel">
          <h2>Manage appointment</h2>
          {dependencies.length > 0 && <div className="callout">
            <p>Delivery must finish before assembly. Cancel the linked assembly before cancelling delivery.</p>
            {dependencies.map((entry) => <AccountLink key={entry.id} to={detailPath('services', entry.id)}>
              View linked assembly {entry.reference || entry.id}
            </AccountLink>)}
          </div>}
          {slots.length ? <button className="button secondary full" type="button" onClick={() => open('reschedule')}>Reschedule</button>
            : <p className="muted">No other windows fit this appointment.</p>}
          {dependencies.length === 0 && <button className="button secondary full" type="button" onClick={() => open('cancel')}>Cancel appointment</button>}
        </section>}
        <section className="card panel"><h2>Appointment activity</h2>
          <ol className="timeline">{history.length ? history.map((entry, index) => <li key={entry.id || index}>
            <strong>{historyLabels[entry.type] || statusLabel(entry.statusAfter)}</strong><small>{dateText(entry.createdAt)}</small>
            {entry.slotAfter && <small>{slotText(entry.slotAfter)}</small>}
          </li>) : null}
          {(!history.length || history.at(-1).statusAfter !== booking.status) &&
            <li><strong>{statusLabel(booking.status)}</strong><small>{dateText(booking.updatedAt || booking.createdAt)}</small></li>}
          </ol>
        </section>
      </div>
    </div>
    {action && <ConfirmDialog title={action === 'cancel' ? 'Cancel this appointment?' : 'Choose a new appointment window'}
      onClose={() => setAction('')} onConfirm={confirm} error={error}
      confirmLabel={action === 'cancel' ? 'Confirm cancellation' : 'Confirm reschedule'}>
      {action === 'cancel' ? <p>{serviceLabel(booking.type)} · {slotText(booking.slot)}</p> :
        <><p className="muted">Current window · {slotText(booking.slot)}</p>
          <SlotChoices legend="New window" name="new-slot" slots={slots} value={slotId} onChange={setSlotId} />
          {chosenSlot && <p>New window · {slotText(chosenSlot)}</p>}</>}
    </ConfirmDialog>}
  </Page>
}
