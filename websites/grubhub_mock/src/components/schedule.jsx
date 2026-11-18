import { useState } from 'react'
import { dayLabel, windowLabel } from '../data/format'
import { availableDays, schedulePermissions } from '../data/scheduling'
import { changeSchedule } from '../data/transactions'
import { useAccount } from '../store'
import { Modal } from './ui'

export function SlotPicker({ days, date, start, onDateChange, onStartChange }) {
  const windows = days.find(day => day.date === date)?.windows || []
  const available = days.some(day => day.windows.length)
  if (!available) return <p className="error">No delivery windows are available in the next five days.</p>
  return (
    <div className="stack">
      <label className="field">Delivery day
        <select required value={date} onChange={event => onDateChange(event.target.value)} data-initial-focus>
          <option value="">Choose a day</option>
          {days.map(day => <option key={day.date} value={day.date} disabled={!day.windows.length}>{dayLabel(day.date)}{!day.windows.length && ' · Unavailable'}</option>)}
        </select>
      </label>
      <label className="field">Delivery window
        <select required disabled={!windows.length} value={windows.some(window => window.windowStartAt === start) ? start : ''} onChange={event => onStartChange(event.target.value)}>
          <option value="">{date ? 'Choose a 30-minute window' : 'Choose a day first'}</option>
          {windows.map(window => <option key={window.windowStartAt} value={window.windowStartAt}>{window.label}</option>)}
        </select>
      </label>
    </div>
  )
}

export function labelSlots(days, timeZone) {
  return days.map(day => ({ ...day, windows: day.windows.map(window => ({ ...window, label: windowLabel({ ...window, timeZone }, { timeOnly: true }) })) }))
}

export function ScheduleActions({ delivery, order, restaurant, onChange }) {
  const { state, commit } = useAccount()
  const [dialog, setDialog] = useState(null)
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const now = new Date()
  const permissions = schedulePermissions(delivery, order, now)
  const editable = !!(state.account?.id && delivery.id)
  const canReschedule = editable && permissions.reschedule && restaurant?.timeZone === delivery.timeZone
  const canCancel = editable && permissions.cancel
  const rescheduling = dialog === 'reschedule'
  const days = rescheduling ? labelSlots(availableDays(restaurant, now, delivery.windowStartAt), restaurant?.timeZone) : []

  function open(action) {
    setError('')
    setDate('')
    setStart('')
    setDialog(action)
  }

  function submit(event) {
    event.preventDefault()
    const result = commit(current => changeSchedule(current, delivery.id, dialog, start))
    if (result.error) {
      setError(result.error)
      return
    }
    const message = rescheduling ? 'Delivery rescheduled.' : 'Delivery cancelled.'
    setDialog(null)
    if (onChange) onChange(message)
    else setNotice(message)
  }

  return (
    <>
      {(canReschedule || canCancel) && (
        <div className="actions delivery-actions">
          {canReschedule && <button className="button" onClick={() => open('reschedule')}>Reschedule</button>}
          {canCancel && <button className="button danger" onClick={() => open('cancel')}>Cancel delivery</button>}
        </div>
      )}
      {notice && <p className="notice" role="status">{notice}</p>}
      {dialog && (
        <Modal title={rescheduling ? 'Reschedule delivery' : 'Cancel scheduled delivery?'} onClose={() => setDialog(null)}>
          <form className="stack" onSubmit={submit}>
            <div className="notice"><p className="meta">Current delivery window</p><p>{windowLabel(delivery)}</p></div>
            {rescheduling && <SlotPicker days={days} date={date} start={start} onDateChange={value => { setDate(value); setStart(''); setError('') }} onStartChange={value => { setStart(value); setError('') }} />}
            {!rescheduling && <p>This also cancels the linked order #{order.id}.</p>}
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions">
              <button className="button" type="button" onClick={() => setDialog(null)}>{rescheduling ? 'Keep current window' : 'Keep delivery'}</button>
              <button className={`button ${rescheduling ? 'primary' : 'danger'}`} type="submit" disabled={rescheduling && !days.some(day => day.windows.length)}>{rescheduling ? 'Confirm reschedule' : 'Confirm cancellation'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
