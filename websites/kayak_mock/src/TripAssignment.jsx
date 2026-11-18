import { useId, useState } from 'react'
import { find, matches, replace, visibleBookings, visibleTrips } from './model'
import { useAccount } from './store'
import { Dialog, FormDialog, Primary, Search } from './ui'

export function useAssignBooking() {
  const { commit } = useAccount()
  return (bookingId, tripId) => commit((world, update) => {
    const booking = find(visibleBookings(world), bookingId)
    if (!booking || (booking.tripId || null) === tripId) return world
    if (tripId !== null && !find(visibleTrips(world), tripId)) return world
    return { ...world, bookings: replace(world.bookings, bookingId, { tripId, ...update }) }
  }, tripId ? 'Booking added to trip.' : 'Booking removed from trip.')
}

export function tripChoices(world) {
  return [['', 'No trip'], ...visibleTrips(world).filter((trip) => trip.id)
    .map((trip) => [trip.id, trip.title || 'Untitled trip'])]
}

export function TripPicker({ booking, onClose }) {
  const { world } = useAccount()
  const assign = useAssignBooking()
  const trips = tripChoices(world)
  const assigned = trips.some(([id]) => id === booking.tripId) ? booking.tripId : ''

  return <FormDialog title="Manage trip assignment" initial={{ tripId: assigned }} onClose={onClose}
    submit="Save assignment" onSave={(values) => {
      assign(booking.id, values.tripId || null)
      onClose()
    }}>
    {(field) => field('tripId', 'Trip', { choices: trips, wide: true })}
  </FormDialog>
}

export function BookingPicker({ trip, onClose }) {
  const inputId = useId()
  const { world } = useAccount()
  const assign = useAssignBooking()
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState('')
  const bookings = visibleBookings(world).filter((booking) => booking.id && booking.tripId !== trip.id
    && matches(query, booking.title, booking.confirmationCode, booking.provider, booking.travelerName))
  const selected = find(bookings, selection)
  const currentTrip = selected && find(visibleTrips(world), selected.tripId)

  return <Dialog title="Add existing booking" onClose={onClose}>
    <form className="dialog-form" onSubmit={(event) => {
      event.preventDefault()
      if (!selected) return
      assign(selected.id, trip.id)
      onClose()
    }}>
      <div className="dialog-body picker">
        <Search label="Search bookings" placeholder="Name, provider or reference" value={query} onChange={(value) => {
          setQuery(value)
          setSelection('')
        }} />
        <div className="field"><label htmlFor={inputId}>Booking</label>
          <select id={inputId} value={selection} onChange={(event) => setSelection(event.target.value)}>
            <option value="">Choose a booking</option>
            {bookings.map((booking) => <option key={booking.id} value={booking.id}>
              {booking.title || 'Untitled booking'}{booking.confirmationCode ? ` · ${booking.confirmationCode}` : ''}
            </option>)}
          </select>
        </div>
        {!bookings.length && <p className="caption" role="status">No available bookings match this search.</p>}
        {currentTrip && <p className="muted">This booking will move from <strong>{currentTrip.title || 'Untitled trip'}</strong>.</p>}
      </div>
      <footer className="dialog-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <Primary type="submit" disabled={!selected}>{currentTrip ? 'Move booking' : 'Add booking to trip'}</Primary>
      </footer>
    </form>
  </Dialog>
}
