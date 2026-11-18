import { useState } from 'react'
import { ArrowRight, Truck } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/Account.jsx'
import { AccountLink, BackLink, Missing } from '../components/Navigation.jsx'
import { Address, AppointmentWindow, Badge, CopyIdentifier, Empty, PageTitle, ProductImage, Timeline } from '../components/Details.jsx'
import { SelectField } from '../components/Fields.jsx'
import { ConfirmDialog } from '../components/Dialog.jsx'
import { ScheduleDeliveryDialog } from '../components/ScheduleDelivery.jsx'
import { useToast } from '../components/Feedback.jsx'
import { cancelDelivery } from '../data/actions.js'
import {
  appointmentHistory, availableSlots, byRecent, canSchedule, deliveryStatus, findRecord, formatDate, formatWindow,
  futureAppointment, orderNumber, records, shipmentItems, shipmentZone,
} from '../data/rules.js'
import { orderPath, shipmentPath } from './Orders.jsx'

const deliveryTitle = (shipment) => shipment.type === 'freight' ? 'Freight delivery' : shipment.type === 'parcel' ? 'Parcel shipment' : 'Delivery'

function DeliveryCard({ shipment, booking, order }) {
  const { state } = useAccount()
  const item = shipmentItems(state, shipment)[0]
  const zone = shipmentZone(state, shipment)
  const status = deliveryStatus(state, shipment)
  return <article className="card delivery-card">
    <ProductImage item={item} />
    <div className="delivery-info">
      <div className="actions"><h3>{item?.name || deliveryTitle(shipment)}</h3><Badge status={status} /></div>
      <p className="muted meta">{deliveryTitle(shipment)} · {order ? orderNumber(order) : shipment.orderId || 'Order unavailable'}</p>
      {booking ? <AppointmentWindow>{formatWindow(booking, booking.timeZone || zone)}</AppointmentWindow>
        : shipment.deliveredAt && <p className="muted meta">Delivered {formatDate(shipment.deliveredAt, zone)}</p>}
      {status === 'ready_to_schedule' && !availableSlots(state, shipment).length && <p className="muted meta">No appointment windows are available.</p>}
    </div>
    <AccountLink className="button" to={shipmentPath(shipment.id)}>View delivery <ArrowRight size={16} aria-hidden="true" /></AccountLink>
  </article>
}

export function DeliveryList() {
  const { state } = useAccount()
  const [params, setParams] = useSearchParams()
  const filter = params.get('show') === 'all' ? 'all' : 'upcoming'
  const future = []
  const ready = []
  const other = []
  for (const shipment of records(state.shipments)) {
    if (!shipment.id) continue
    const order = findRecord(state.orders, shipment.orderId)
    const booking = futureAppointment(state, shipment)
    const row = { shipment, booking, order }
    if (booking) future.push(row)
    else if (canSchedule(state, shipment)) ready.push(row)
    else other.push(row)
  }
  future.sort((a, b) => byRecent(b.booking.startAt, a.booking.startAt))
  ready.sort((a, b) => byRecent(a.order?.placedAt, b.order?.placedAt))
  other.sort((a, b) => byRecent(a.order?.placedAt, b.order?.placedAt))
  const groups = [['Scheduled appointments', future], ['Ready to schedule', ready], ...(filter === 'all' ? [['Other deliveries', other]] : [])]
  function changeFilter(value) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.set('show', 'all')
    else next.delete('show')
    setParams(next, { replace: true })
  }
  return <div className="page-stack">
    <PageTitle title="Deliveries" description="Book a freight delivery or track a shipment." />
    <div className="card delivery-filter">
      <SelectField title="Show deliveries" options={[{ value: 'upcoming', label: 'Appointments and scheduling' }, { value: 'all', label: 'All deliveries' }]}
        value={filter} onChange={changeFilter} />
    </div>
    {groups.every(([, rows]) => !rows.length) && <Empty title={filter === 'all' ? 'No deliveries found' : 'No upcoming appointments'}>
      <p className="muted">Shipments and their tracking updates appear under all deliveries.</p>
      {filter !== 'all' && <button type="button" className="button" onClick={() => changeFilter('all')}>Show all deliveries</button>}
    </Empty>}
    {groups.map(([heading, rows]) => rows.length > 0 && <section className="section-stack" key={heading}>
      <h2>{heading}</h2>{rows.map((row) => <DeliveryCard key={row.shipment.id} {...row} />)}
    </section>)}
  </div>
}

export function DeliveryDetail() {
  const { state, transact } = useAccount()
  const toast = useToast()
  const { shipmentId } = useParams()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState('')
  const [cancelId, setCancelId] = useState('')
  const shipment = findRecord(state.shipments, shipmentId)
  if (!shipment) return <Missing title="Delivery unavailable" to="/deliveries" label="Back to deliveries" />
  const order = findRecord(state.orders, shipment.orderId)
  const items = shipmentItems(state, shipment)
  const zone = shipmentZone(state, shipment)
  const booking = futureAppointment(state, shipment)
  const history = appointmentHistory(state, shipment).filter((entry) => entry.id !== booking?.id)
  const canBook = canSchedule(state, shipment) && availableSlots(state, shipment).length > 0
  const scheduleRequested = params.get('schedule') === '1'
  const isScheduling = dialog === 'schedule' || (scheduleRequested && shipment.type === 'freight')
  function closeDialog() {
    setDialog('')
    if (scheduleRequested) {
      const next = new URLSearchParams(params)
      next.delete('schedule')
      setParams(next, { replace: true })
    }
  }
  return <div className="page-stack">
    <div className="detail-heading">
      <BackLink to="/deliveries">Back to deliveries</BackLink>
      <PageTitle title={deliveryTitle(shipment)} description={order ? 'Order ' + orderNumber(order) : shipment.orderId || 'Order unavailable'}>
        <Badge status={deliveryStatus(state, shipment)} />
      </PageTitle>
    </div>
    <div className="detail-grid">
      <div className="section-stack">
        {shipment.type === 'freight' && <section className="card section-stack">
          <div className="summary-heading"><span className="section-icon"><Truck size={21} aria-hidden="true" /></span><h2>Delivery appointment</h2></div>
          {booking ? <div className="review-panel section-stack">
            <div className="section-heading"><h3>Confirmed window</h3><Badge status="confirmed" /></div>
            <AppointmentWindow>{formatWindow(booking, booking.timeZone || zone)}</AppointmentWindow>
            {booking.instructions && <p className="wrap-text">{booking.instructions}</p>}
            <div className="actions">
              <p className="meta muted wrap-text">Reference {booking.id}</p>
              <CopyIdentifier value={booking.id} name="appointment reference" />
            </div>
          </div> : <p className="muted">{shipment.status === 'ready_to_schedule' && canSchedule(state, shipment) ? 'Choose a delivery window for this shipment.' : 'There is no upcoming appointment for this shipment.'}</p>}
          {canSchedule(state, shipment) && !canBook && <p className="muted">No appointment windows are available.</p>}
          {(canBook || (booking && order)) && <div className="actions">
            {canBook && <button className="button primary" type="button" onClick={() => setDialog('schedule')}>{booking ? 'Reschedule delivery' : 'Schedule delivery'}</button>}
            {booking && order && <button className="button" type="button" onClick={() => { setCancelId(booking.id); setDialog('cancel') }}>Cancel appointment</button>}
          </div>}
        </section>}
        <section className="card section-stack">
          <h2>Shipment details</h2>
          {shipment.carrier && <p><strong>Carrier</strong> · {shipment.carrier}</p>}
          {shipment.trackingNumber && <div className="actions">
            <p className="wrap-text"><strong>Tracking number</strong> · {shipment.trackingNumber}</p>
            <CopyIdentifier value={shipment.trackingNumber} name="tracking number" />
          </div>}
          {shipment.estimatedAt && <p><strong>Estimated delivery</strong> · {formatDate(shipment.estimatedAt, zone)}</p>}
          {items.length ? items.map((item, index) => <div className="delivery-item" key={item.id || index}>
            <ProductImage item={item} /><div><h3>{item.name || 'Order item'}</h3><p className="muted meta">Quantity {item.quantity ?? 'unavailable'}</p></div>
          </div>) : <p className="muted">Item details are unavailable.</p>}
          <Timeline shipment={shipment} zone={zone} />
        </section>
        {history.length > 0 && <section className="card section-stack">
          <h2>Previous appointments</h2>
          {history.map((entry, index) => <div className="history-booking" key={entry.id || index}>
            <div className="section-heading">
              <AppointmentWindow>{formatWindow(entry, entry.timeZone || zone)}</AppointmentWindow>
              <Badge status={entry.status === 'confirmed' ? 'appointment_started' : entry.status} />
            </div>
            <div className="actions">
              <span className="muted meta wrap-text">Reference {entry.id || 'unavailable'}</span>
              <CopyIdentifier value={entry.id} name="appointment reference" />
            </div>
          </div>)}
        </section>}
      </div>
      <aside className="section-stack">
        <section className="card section-stack">
          <h2>Ship to</h2><Address address={order?.shipTo} />
          {order && <AccountLink className="text-link" to={orderPath(order.id)}>View order <ArrowRight size={16} aria-hidden="true" /></AccountLink>}
        </section>
      </aside>
    </div>
    {isScheduling && <ScheduleDeliveryDialog shipment={shipment} booking={booking} onClose={closeDialog} />}
    {dialog === 'cancel' && <ConfirmDialog title="Cancel delivery appointment?" backLabel="Keep appointment"
      description="Your delivery will be unscheduled. You can choose a new window when one is available."
      submitLabel="Confirm appointment cancellation" onClose={closeDialog}
      action={() => transact((current, now) => cancelDelivery(current, now, { shipmentId, appointmentId: cancelId }))}
      onSuccess={(record) => { toast('Appointment canceled. Reference ' + record.id); closeDialog() }} />}
  </div>
}
