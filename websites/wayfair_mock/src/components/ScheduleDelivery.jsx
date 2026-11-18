import { useState } from 'react'
import { useAccount } from '../context/Account.jsx'
import { bookDelivery } from '../data/actions.js'
import { availableSlots, findRecord, formatWindow, shipmentZone } from '../data/rules.js'
import { Address, AppointmentWindow } from './Details.jsx'
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
  const order = findRecord(state.orders, shipment.orderId)
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
      <div><h3>Delivery address</h3><Address address={order?.shipTo} /></div>
      <div className="wrap-text"><h3>Delivery instructions</h3><p>{instructions.trim() || 'No instructions added.'}</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={() => { clearError(); setReview(false) }} submitLabel={expectedAppointmentId ? 'Confirm reschedule' : 'Confirm delivery'} pending={pending} />
    </form> : <form className="dialog-body" onSubmit={showReview}>
      {booking && <div className="review-panel">
        <h3>Current appointment</h3><AppointmentWindow>{formatWindow(booking, booking.timeZone || zone)}</AppointmentWindow>
      </div>}
      <div><h3>Delivery address</h3><Address address={order?.shipTo} /></div>
      {slots.length ? <fieldset className="choices">
        <legend>Available dates and times</legend>
        {slots.map((slot) => <label className="item-choice check-label window-choice" key={slot.id}>
          <input type="radio" name="slot" required value={slot.id} checked={slotId === slot.id} onChange={() => setSlotId(slot.id)} />
          <span>{formatWindow(slot, zone)}</span>
        </label>)}
      </fieldset> : <p className="muted">No appointment windows are available.</p>}
      <label className="field">
        <span>Delivery instructions (optional)</span>
        <textarea value={instructions} maxLength={500} placeholder="Gate code, driveway or access details" onChange={(event) => setInstructions(event.currentTarget.value)} />
        <small className="muted">{instructions.length} / 500 characters</small>
      </label>
      <DialogButtons onBack={onClose} backLabel="Close" submitLabel="Review appointment" disabled={!slots.length} />
    </form>}
  </Dialog>
}
