import { useState } from 'react'
import { useAccount } from '../context/Account.jsx'
import { bookDelivery } from '../data/actions.js'
import { availableSlots, findRecord, formatDate, formatWindow, records, shipmentZone } from '../data/rules.js'
import { Address, AppointmentWindow, ProductImage } from './Details.jsx'
import { Dialog, DialogButtons, useConfirmation } from './Dialog.jsx'
import { useToast } from './Feedback.jsx'

export function ScheduleDeliveryDialog({ shipment, booking, onClose }) {
  const { state, transact } = useAccount()
  const toast = useToast()
  const [slotId, setSlotId] = useState('')
  const [instructions, setInstructions] = useState(booking?.instructions || '')
  const [expectedAppointmentId] = useState(booking?.id || null)
  const [review, setReview] = useState(false)
  const [reviewSlot, setReviewSlot] = useState(null)
  const slots = availableSlots(state, shipment)
  const zone = shipmentZone(state, shipment)
  const windowsByDay = new Map()
  for (const slot of slots) {
    const day = formatDate(slot.startAt, zone, { weekday: 'short', month: 'short', day: 'numeric' })
    const windows = windowsByDay.get(day) || []
    windows.push(slot)
    windowsByDay.set(day, windows)
  }
  const order = findRecord(state.orders, shipment.orderId)
  const items = records(order?.items).filter((item) => item?.shipmentId === shipment.id)
  const initialTitle = expectedAppointmentId ? 'Reschedule delivery' : 'Schedule delivery'
  const { confirm, pending, error, clearError } = useConfirmation(
    () => transact((current, now) => bookDelivery(current, now, { shipmentId: shipment.id, slotId, instructions, expectedAppointmentId })),
    (record) => {
      toast((expectedAppointmentId ? 'Delivery rescheduled. ' : 'Delivery scheduled. ') + 'Reference ' + record.id)
      onClose()
    },
  )

  function showReview(event) {
    event.preventDefault()
    const selected = findRecord(slots, slotId)
    if (selected) { setReviewSlot(selected); setReview(true) }
  }

  return <Dialog title={review ? 'Review delivery appointment' : initialTitle} onClose={onClose} pending={pending}>
    {review ? <form className="dialog-body" onSubmit={confirm}>
      <div className="review-panel"><h3>New appointment</h3><AppointmentWindow>{formatWindow(reviewSlot, zone)}</AppointmentWindow></div>
      <div className="request-product">
        <ProductImage item={items[0]} size={72} />
        <div>{items.map((item) => <p key={item.id || item.name}>{item.name || 'Order item'}</p>)}</div>
      </div>
      <div><h3>Delivery address</h3><Address address={order?.shipTo} /></div>
      <div className="wrap-text"><h3>Delivery instructions</h3><p>{instructions.trim() || 'No instructions added.'}</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={() => { clearError(); setReview(false) }} submitLabel={expectedAppointmentId ? 'Confirm reschedule' : 'Confirm delivery'} pending={pending} />
    </form> : <form className="dialog-body" onSubmit={showReview}>
      {booking && <div className="review-panel">
        <h3>Current appointment</h3><AppointmentWindow>{formatWindow(booking, booking.timeZone || zone)}</AppointmentWindow>
      </div>}
      <div className="request-product">
        <ProductImage item={items[0]} size={72} />
        <div><h3>{items[0]?.name || 'Freight delivery'}</h3>{items.length > 1 && <p className="muted meta">+ {items.length - 1} more</p>}</div>
      </div>
      <div><h3>Delivery address</h3><Address address={order?.shipTo} /></div>
      {slots.length ? <fieldset className="choices">
        <legend>Available dates and times</legend>
        {[...windowsByDay].map(([day, windows]) => <div key={day} className="window-day">
          <h3>{day}</h3>
          <div className="window-options">
            {windows.map((slot) => <label className="item-choice check-label window-choice" key={slot.id}>
              <input type="radio" name="slot" required value={slot.id} checked={slotId === slot.id} onChange={() => setSlotId(slot.id)} />
              <span>{formatWindow(slot, zone).split(' · ').at(-1)}</span>
            </label>)}
          </div>
        </div>)}
      </fieldset> : <p className="muted">No appointment windows are available.</p>}
      <label className="field">
        <span>Delivery instructions (optional)</span>
        <textarea value={instructions} maxLength={500} placeholder="Gate code, driveway or access details" onChange={(event) => setInstructions(event.currentTarget.value)} />
        <small className="muted">{instructions.length} / 500 characters</small>
      </label>
      <DialogButtons onBack={onClose} backLabel="Close" submitLabel="Review appointment" disabled={!slotId} />
    </form>}
  </Dialog>
}
