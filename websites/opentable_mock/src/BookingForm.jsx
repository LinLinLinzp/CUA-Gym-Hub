import { useState } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import { ErrorMessage } from './ui'
import { localClock, prettyDate, prettyTime } from './data/dates'
import { availableSlots, number, partyLabel, points, rows, saveBooking, slotKey } from './data/model'
import { useAccount } from './store'

export function maxSlotPartySize(restaurant) {
  return rows(restaurant?.slots).reduce((max, slot) => Math.max(max, Number(slot.maxPartySize) || 0), 10)
}

export function GuestSelect({ value, onChange, max = 10 }) {
  const limit = Math.min(20, Math.max(max, Number(value) || 0))
  return <select value={value} onChange={event => onChange(Number(event.target.value))}>
    {Array.from({ length: limit }, (_, index) => <option key={index + 1} value={index + 1}>{partyLabel(index + 1)}</option>)}
  </select>
}

export function BookingForm({ restaurant, current, defaults, onSuccess, onDismiss }) {
  const { state, commit } = useAccount()
  const today = localClock(restaurant?.timeZone || state.account?.timeZone).date
  const [date, setDate] = useState(current?.date || defaults?.date || today)
  const [partySize, setPartySize] = useState(Number(current?.partySize ?? defaults?.partySize ?? 2))
  const [selected, setSelected] = useState(
    current?.time ? slotKey(current) : defaults?.selected || '',
  )
  const [occasion, setOccasion] = useState(current?.occasion || '')
  const [specialRequest, setSpecialRequest] = useState(current?.specialRequest || '')
  const [error, setError] = useState('')
  const slots = availableSlots(state, restaurant, date, partySize, current)
  const seatings = [...new Set(slots.map(slot => slot.seating || ''))]
  const chosen = slots.find(slot => slotKey(slot) === selected)
  const [preferredSeating, setPreferredSeating] = useState(current?.seating || '')
  const seating = seatings.includes(preferredSeating) ? preferredSeating : chosen?.seating || seatings[0] || ''
  const visibleSlots = slots.filter(slot => (slot.seating || '') === seating)
  const maximum = maxSlotPartySize(restaurant)
  const potential = chosen ? points(
    current?.date === date && current?.partySize === partySize && slotKey(current) === selected ? current.potentialPoints : chosen.potentialPoints,
  ) : 0

  function updateDate(next) {
    setDate(next)
    if (!availableSlots(state, restaurant, next, partySize, current).some(slot => slotKey(slot) === selected)) setSelected('')
    setError('')
  }
  function updateParty(next) {
    setPartySize(next)
    if (!availableSlots(state, restaurant, date, next, current).some(slot => slotKey(slot) === selected)) setSelected('')
    setError('')
  }
  function submit(event) {
    event.preventDefault()
    const outcome = commit(data => saveBooking(data, {
      id: current?.id, restaurantId: restaurant?.id, date, partySize, selected, occasion, specialRequest,
    }))
    if (outcome.error) setError(outcome.error)
    else onSuccess(outcome)
  }

  return <form className="form booking-form" onSubmit={submit} noValidate>
    <div className="fields-two">
      <label>Date<input type="date" value={date} min={today} onChange={event => updateDate(event.target.value)} /></label>
      <label>Party size<GuestSelect value={partySize} onChange={updateParty} max={maximum} /></label>
    </div>
    {seatings.length > 1 && <label>Seating<select value={seating} onChange={event => { setPreferredSeating(event.target.value); setSelected(''); setError('') }}>
      {seatings.map(item => <option key={item} value={item}>{item || 'Unspecified'}</option>)}
    </select></label>}
    <fieldset className="time-field">
      <legend>Available times</legend>
      {visibleSlots.length > 0 ? <div className="times">
        {visibleSlots.map((slot, index) => <button type="button" key={slotKey(slot) + index} aria-pressed={selected === slotKey(slot)}
          onClick={() => { setSelected(slotKey(slot)); setError('') }}>{prettyTime(slot.time)}</button>)}
      </div> : <p className="muted">No available times for this date and party. Try a different date or party size.</p>}
    </fieldset>
    {chosen && <div className="booking-summary">
      <strong><CalendarDays size={16} />{prettyDate(date)} · {prettyTime(chosen.time)}</strong>
      <span>{partyLabel(partySize)}{chosen.seating && ' · ' + chosen.seating}</span>
      {potential > 0 && <span className="pending-text"><Sparkles size={15} />{number(potential)} potential points</span>}
    </div>}
    <label>Occasion <span className="optional">Optional</span><input maxLength={80} value={occasion} placeholder="e.g. Birthday" onChange={event => setOccasion(event.target.value)} /></label>
    <label>Special request <span className="optional">Optional</span><textarea rows="2" maxLength={500} value={specialRequest} placeholder="Anything the restaurant should know?" onChange={event => setSpecialRequest(event.target.value)} /></label>
    <ErrorMessage>{error}</ErrorMessage>
    <div className="form-actions">
      {onDismiss && <button type="button" className="button" onClick={onDismiss}>Discard changes</button>}
      <button type="submit" className="button primary">{current ? 'Save changes' : 'Confirm reservation'}</button>
    </div>
  </form>
}
