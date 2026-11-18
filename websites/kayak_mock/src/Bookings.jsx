import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  bookingStatus, createRecord, dateRange, find, label, matches, money, normalize, readFields,
  replace, sources, travelTypes, validateDates, visibleBookings, visibleTrips,
} from './model'
import { useAccount } from './store'
import { TripPicker, tripChoices } from './TripAssignment'
import {
  AccountLink, Badge, Confirm, Empty, Filter, FormDialog, PageHeader, Primary, Results, Search, useAccountPath,
} from './ui'

const statuses = [['', 'All statuses'], ['Upcoming', 'Upcoming'], ['Past', 'Past'],
  ['Pending', 'Pending'], ['Cancelled', 'Cancelled']]
const storedStatuses = [['confirmed', 'Confirmed'], ['pending', 'Pending'], ['cancelled', 'Cancelled']]
const bookingPath = (id) => `/bookings/${encodeURIComponent(id)}`

export function Bookings() {
  const { world } = useAccount()
  const navigate = useNavigate()
  const path = useAccountPath()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [creating, setCreating] = useState(false)
  const bookings = visibleBookings(world).filter((booking) => matches(query, booking.title, booking.confirmationCode, booking.travelerName, booking.provider)
    && (!type || booking.type === type) && (!status || bookingStatus(booking) === status) && (!source || booking.source === source))
  const reset = query || type || status || source ? () => { setQuery(''); setType(''); setStatus(''); setSource('') } : undefined
  const open = () => setCreating(true)

  return <>
    <PageHeader title="Bookings" description="Find your receipts and saved reservations."
      actions={<Primary onClick={open}>Add booking</Primary>} />
    <div className="toolbar">
      <Search label="Search bookings" placeholder="Title, reference, traveler or provider" value={query} onChange={setQuery} />
      <Filter label="Booking type" value={type} onChange={setType} options={[[ '', 'All types'], ...travelTypes]} />
      <Filter label="Travel status" value={status} onChange={setStatus} options={statuses} />
      <Filter label="Source" value={source} onChange={setSource} options={[[ '', 'All sources'], ...sources]} />
    </div>
    <div className="listing">
      <Results count={bookings.length} singular="booking" onReset={reset} />
      {bookings.length ? <div className="ruled">
        {bookings.map((booking, index) => {
          const title = booking.title || 'Untitled booking'
          return <article className="row" key={booking.id ?? index}>
            <div className="row-heading">
              <div className="caption">{label(travelTypes, booking.type, 'Booking')}{booking.source && ` · ${label(sources, booking.source)}`}</div>
              <h3>{booking.id ? <AccountLink to={bookingPath(booking.id)}>{title}</AccountLink> : title}</h3>
              {booking.provider && <div className="muted">{booking.provider}</div>}
            </div>
            <div className="row-meta">
              <div>{dateRange(booking.startDate, booking.endDate)}</div>
              <div className="caption">Reference {booking.confirmationCode || '—'}</div>
            </div>
            <div className="row-end"><Badge>{bookingStatus(booking)}</Badge></div>
          </article>
        })}
      </div> : <Empty title="No bookings to show" action={<Primary onClick={open}>Add booking</Primary>}>
        {reset ? 'Try a different search or clear the filters.' : 'Save a reservation to keep its details handy.'}
      </Empty>}
    </div>
    {creating && <BookingForm onClose={() => setCreating(false)} onSaved={(id) => navigate(path(bookingPath(id)))} />}
  </>
}

function BookingForm({ booking, onClose, onSaved }) {
  const { world, commit } = useAccount()
  const trips = tripChoices(world)
  const initial = { type: 'flight', travelerName: world.user?.name || '', currency: world.user?.currency || 'USD', ...booking }
  if (!trips.some(([id]) => id === initial.tripId)) initial.tripId = ''

  return <FormDialog title={booking ? 'Edit saved booking' : 'Add booking'} initial={initial} onClose={onClose}
    submit={booking ? 'Save changes' : 'Save booking'} onSave={(values) => {
      const fields = readFields(values, [
        'type', 'title', 'provider', 'confirmationCode', 'destination', 'startDate', 'endDate',
        'travelerName', 'totalAmount', 'currency', 'notes', 'tripId',
      ])
      const errors = {}
      const required = {
        title: 'Enter a booking title.', provider: 'Enter a provider.', confirmationCode: 'Enter a confirmation code.',
        destination: 'Enter a destination.', travelerName: 'Enter the lead traveler.',
      }
      if (!label(travelTypes, fields.type, '')) errors.type = 'Choose a booking type.'
      for (const [name, message] of Object.entries(required)) {
        if (!fields[name]) errors[name] = message
      }
      validateDates(fields, errors, true)
      if (fields.totalAmount && (!/^\d+(\.\d+)?$|^\.\d+$/.test(fields.totalAmount) || !Number.isFinite(Number(fields.totalAmount)))) {
        errors.totalAmount = 'Enter a nonnegative amount.'
      }
      fields.currency = fields.currency.toUpperCase()
      if (!/^[A-Z]{3}$/.test(fields.currency)) errors.currency = 'Enter a three-letter currency code.'
      if (Object.keys(errors).length) return errors
      fields.totalAmount = fields.totalAmount === '' ? null : Number(fields.totalAmount)
      fields.tripId ||= null
      let id = booking?.id
      commit((previous, update) => {
        const bookings = visibleBookings(previous)
        if (fields.tripId && !find(visibleTrips(previous), fields.tripId)) {
          errors.tripId = 'Choose an available trip.'
          return previous
        }
        const duplicate = bookings.some((entry) => entry.id !== id && ['confirmed', 'pending'].includes(entry.status)
          && normalize(entry.provider) === normalize(fields.provider) && normalize(entry.confirmationCode) === normalize(fields.confirmationCode))
        if (duplicate) {
          errors.confirmationCode = 'A booking already uses this provider and confirmation code.'
          return previous
        }
        if (booking) {
          if (find(bookings, id)?.source !== 'manual') return previous
          return { ...previous, bookings: replace(previous.bookings, id, { ...fields, ...update }) }
        }
        const next = createRecord('booking', { ...fields, source: 'manual', status: 'confirmed' }, update)
        id = next.id
        return { ...previous, bookings: [...(Array.isArray(previous.bookings) ? previous.bookings : []), next] }
      }, booking ? 'Booking updated.' : 'Booking saved.')
      if (Object.keys(errors).length) return errors
      onClose()
      onSaved?.(id)
    }}>
    {(field) => <>
      {field('type', 'Booking type', { choices: travelTypes, wide: true })}
      {field('title', 'Booking title', { wide: true })}
      {field('provider', 'Provider')}
      {field('confirmationCode', 'Confirmation code')}
      {field('destination', 'Destination', { wide: true })}
      {field('startDate', 'Start date', { type: 'date' })}
      {field('endDate', 'End date', { type: 'date' })}
      {field('travelerName', 'Lead traveler', { wide: true })}
      {field('totalAmount', 'Total amount (optional)', { inputMode: 'decimal' })}
      {field('currency', 'Currency', { maxLength: 3 })}
      {field('tripId', 'Trip (optional)', { choices: trips, wide: true })}
      {field('notes', 'Notes', { multiline: true, wide: true })}
    </>}
  </FormDialog>
}

export function BookingDetails() {
  const { id } = useParams()
  const { world, commit, announce } = useAccount()
  const navigate = useNavigate()
  const path = useAccountPath()
  const [dialog, setDialog] = useState(null)
  const booking = find(visibleBookings(world), id)
  const back = <AccountLink className="back" to="/bookings">← All bookings</AccountLink>
  if (!booking) return <>{back}<PageHeader title="Booking unavailable" description="This reservation may have been removed." /></>

  const trip = find(visibleTrips(world), booking.tripId)
  const manual = booking.source === 'manual'
  const title = booking.title || 'Untitled booking'
  const total = money(booking.totalAmount, booking.currency)
  const close = () => setDialog(null)

  async function copy(value, name) {
    try {
      await navigator.clipboard.writeText(value)
      announce(`${name} copied.`)
    } catch {
      announce(`Could not copy ${name.toLowerCase()}.`)
    }
  }

  return <>
    {back}
    <PageHeader title={title} eyebrow={label(sources, booking.source, 'Booking')} description={booking.destination}
      actions={manual ? <><button onClick={() => setDialog('edit')}>Edit booking</button>
        <button className="danger" onClick={() => setDialog('remove')}>Remove saved booking</button></> : undefined}>
      <div className="detail-status"><Badge>{bookingStatus(booking)}</Badge></div>
    </PageHeader>
    <section className="panel">
      <h2>Reservation details</h2>
      <dl className="facts">
        <div><dt>Provider</dt><dd>{booking.provider || '—'}{booking.provider && <button className="text-button" aria-label="Copy provider name"
          onClick={() => copy(booking.provider, 'Provider name')}>Copy</button>}</dd></div>
        <div><dt>Confirmation code</dt><dd>{booking.confirmationCode || '—'}{booking.confirmationCode && <button className="text-button" aria-label="Copy confirmation code"
          onClick={() => copy(booking.confirmationCode, 'Confirmation code')}>Copy</button>}</dd></div>
        <div><dt>Lead traveler</dt><dd>{booking.travelerName || '—'}</dd></div>
        <div><dt>Travel dates</dt><dd>{dateRange(booking.startDate, booking.endDate)}</dd></div>
        <div><dt>Booking type</dt><dd>{label(travelTypes, booking.type)}</dd></div>
        <div><dt>Reservation status</dt><dd>{label(storedStatuses, booking.status)}</dd></div>
        <div><dt>Total amount</dt><dd className="number">{total || '—'}{booking.currency && ` ${booking.currency}`}</dd></div>
      </dl>
      <p className="caption">For changes or cancellations, contact {booking.provider || 'the booking provider'} directly.</p>
    </section>
    <section className="panel">
      <header className="section-heading"><h2>Trip assignment</h2><button onClick={() => setDialog('assign')}>Manage trip</button></header>
      {trip ? <AccountLink to={`/trip/${encodeURIComponent(trip.id)}`}>{trip.title || 'Untitled trip'}</AccountLink>
        : <p className="muted">No trip assigned.</p>}
    </section>
    <section className="panel">
      <header className="section-heading"><h2>Booking notes</h2><button onClick={() => setDialog('notes')}>Edit notes</button></header>
      <p className={booking.notes ? 'notes' : 'muted'}>{booking.notes || 'No notes yet.'}</p>
    </section>
    {dialog === 'edit' && <BookingForm booking={booking} onClose={close} />}
    {dialog === 'assign' && <TripPicker booking={booking} onClose={close} />}
    {dialog === 'notes' && <FormDialog title="Edit booking notes" initial={{ notes: booking.notes || '' }} onClose={close}
      submit="Save notes" onSave={(values) => {
        commit((previous, update) => {
          const current = find(visibleBookings(previous), id)
          const { notes } = readFields(values, ['notes'])
          if (!current || (current.notes || '') === notes) return previous
          return { ...previous, bookings: replace(previous.bookings, id, { notes, ...update }) }
        }, 'Booking notes saved.')
        close()
      }}>
      {(field) => field('notes', 'Notes', { multiline: true, wide: true })}
    </FormDialog>}
    {dialog === 'remove' && <Confirm action="Remove saved booking" name={title} onClose={close} onConfirm={() => {
      commit((previous, update) => {
        if (find(visibleBookings(previous), id)?.source !== 'manual') return previous
        const removal = { status: 'removed', tripId: null, removedAt: update.updatedAt, removedBy: update.updatedBy, ...update }
        return { ...previous, bookings: replace(previous.bookings, id, removal) }
      }, 'Saved booking removed.')
      close()
      navigate(path('/bookings'), { replace: true })
    }} />}
  </>
}
