import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createRecord, dateAscending, dateRange, dayLabel, find, idAscending, itemTypes, label,
  matches, readFields, records, replace, text, tripItinerary, tripStatus, validateDates, visibleTrips,
} from './model'
import { BookingPicker } from './TripAssignment'
import { useAccount } from './store'
import { AccountLink, Badge, Confirm, Empty, Filter, FormDialog, PageHeader, Primary, Results, Search, useAccountPath } from './ui'

const categories = [['', 'All trips'], ['Upcoming', 'Upcoming'], ['Planning', 'Planning'], ['Past', 'Past']]
const sorts = [['date', 'Trip date'], ['recent', 'Recently edited']]
const tripPath = (id) => `/trip/${encodeURIComponent(id)}`

export function Trips() {
  const { world } = useAccount()
  const navigate = useNavigate()
  const path = useAccountPath()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('date')
  const [creating, setCreating] = useState(false)
  const trips = visibleTrips(world).filter((trip) =>
    matches(query, trip.title, trip.destination) && (!category || tripStatus(trip) === category))
  trips.sort((a, b) => {
    if (sort === 'recent') return text(b.updatedAt).localeCompare(text(a.updatedAt)) || idAscending(a, b)
    const rank = { Upcoming: 0, Planning: 1, Past: 2 }
    const first = tripStatus(a)
    const second = tripStatus(b)
    const date = first === 'Past' ? dateAscending(b.startDate, a.startDate) : dateAscending(a.startDate, b.startDate)
    return rank[first] - rank[second] || date || idAscending(a, b)
  })
  const counts = new Map()
  for (const item of records(world.itineraryItems)) {
    if (item.status !== 'removed') counts.set(item.tripId, (counts.get(item.tripId) || 0) + 1)
  }
  const linkedIds = new Set()
  for (const booking of records(world.bookings)) {
    if (!booking.tripId || booking.status === 'removed' || linkedIds.has(booking.id)) continue
    linkedIds.add(booking.id)
    counts.set(booking.tripId, (counts.get(booking.tripId) || 0) + 1)
  }
  const open = () => setCreating(true)
  const reset = query || category || sort !== 'date' ? () => { setQuery(''); setCategory(''); setSort('date') } : undefined

  return <>
    <PageHeader title="Trips" description="Keep your plans and reservations in one place." feature
      actions={<Primary onClick={open}>New trip</Primary>} />
    <div className="toolbar">
      <Search label="Search trips" placeholder="Trip name or destination" value={query} onChange={setQuery} />
      <Filter label="Trip status" value={category} onChange={setCategory} options={categories} />
      <Filter label="Sort by" value={sort} onChange={setSort} options={sorts} />
    </div>
    <div className="listing">
      <Results count={trips.length} singular="trip" onReset={reset} />
      {trips.length ? <div className="trip-grid"><div className="trip-cards">
        {trips.map((trip, index) => {
          const count = counts.get(trip.id) || 0
          const title = trip.title || 'Untitled trip'
          return <article className="card trip-card" key={trip.id ?? index}>
            <div className="card-top">
              <div><h3>{trip.id ? <AccountLink to={tripPath(trip.id)}>{title}</AccountLink> : title}</h3>
                <p className="muted">{trip.destination || 'Destination to be confirmed'}</p></div>
              <Badge>{tripStatus(trip)}</Badge>
            </div>
            <div className="card-bottom caption">
              <span>{dateRange(trip.startDate, trip.endDate)}</span>
              <span>{count} itinerary {count === 1 ? 'item' : 'items'}</span>
            </div>
          </article>
        })}
      </div></div> : <Empty title="No trips to show" action={<Primary onClick={open}>New trip</Primary>}>
        {reset ? 'Try a different search or clear the filters.' : 'Create a trip to start organizing your itinerary.'}
      </Empty>}
    </div>
    {creating && <TripForm onClose={() => setCreating(false)} onSaved={(id) => navigate(path(tripPath(id)))} />}
  </>
}

function TripForm({ trip, onClose, onSaved }) {
  const { commit } = useAccount()
  return <FormDialog title={trip ? 'Edit trip' : 'New trip'} initial={trip || {}} onClose={onClose}
    submit={trip ? 'Save changes' : 'Create trip'} onSave={(values) => {
      const fields = readFields(values, ['title', 'destination', 'notes', 'startDate', 'endDate'])
      const errors = {}
      if (!fields.title) errors.title = 'Enter a trip name.'
      if (!fields.destination) errors.destination = 'Enter a destination.'
      validateDates(fields, errors)
      if (Object.keys(errors).length) return errors
      fields.startDate ||= null
      fields.endDate ||= null
      let id = trip?.id
      commit((world, update) => {
        if (trip) {
          if (!find(visibleTrips(world), id)) return world
          return { ...world, trips: replace(world.trips, id, { ...fields, ...update }) }
        }
        const next = createRecord('trip', { ...fields, status: 'active' }, update)
        id = next.id
        return { ...world, trips: [...(Array.isArray(world.trips) ? world.trips : []), next] }
      }, trip ? 'Trip updated.' : 'Trip created.')
      onClose()
      onSaved?.(id)
    }}>
    {(field) => <>
      {field('title', 'Trip name', { wide: true })}
      {field('destination', 'Destination', { wide: true })}
      {field('startDate', 'Start date', { type: 'date' })}
      {field('endDate', 'End date', { type: 'date' })}
      {field('notes', 'Notes', { multiline: true, wide: true })}
    </>}
  </FormDialog>
}

function ItemForm({ tripId, item, onClose }) {
  const { commit } = useAccount()
  return <FormDialog title={item ? 'Edit itinerary item' : 'Add itinerary item'}
    initial={{ type: 'activity', ...item }} onClose={onClose} submit={item ? 'Save changes' : 'Add item'}
    onSave={(values) => {
      const fields = readFields(values, ['type', 'title', 'startDate', 'startTime', 'endDate', 'location', 'notes'])
      const errors = {}
      if (!label(itemTypes, fields.type, '')) errors.type = 'Choose an item type.'
      if (!fields.title) errors.title = 'Enter a title.'
      if (!fields.startDate) errors.startDate = 'Enter a start date.'
      if (fields.endDate && fields.endDate < fields.startDate) errors.endDate = 'End date must be on or after the start date.'
      if (Object.keys(errors).length) return errors
      fields.startTime ||= null
      fields.endDate ||= null
      commit((world, update) => {
        if (!find(visibleTrips(world), tripId)) return world
        if (item) {
          const current = find(records(world.itineraryItems), item.id)
          if (!current || current.status === 'removed') return world
          return { ...world, itineraryItems: replace(world.itineraryItems, item.id, { ...fields, ...update }) }
        }
        const next = createRecord('item', { ...fields, tripId, status: 'active' }, update)
        return { ...world, itineraryItems: [...(Array.isArray(world.itineraryItems) ? world.itineraryItems : []), next] }
      }, item ? 'Itinerary item updated.' : 'Item added to your itinerary.')
      onClose()
    }}>
    {(field) => <>
      {field('type', 'Item type', { choices: itemTypes, wide: true })}
      {field('title', 'Title', { wide: true })}
      {field('startDate', 'Start date', { type: 'date' })}
      {field('startTime', 'Time (optional)', { type: 'time' })}
      {field('endDate', 'End date (optional)', { type: 'date' })}
      {field('location', 'Location', {})}
      {field('notes', 'Notes', { multiline: true, wide: true })}
    </>}
  </FormDialog>
}

function removeItem(update) {
  return { status: 'removed', removedAt: update.updatedAt, removedBy: update.updatedBy, ...update }
}

export function TripDetails() {
  const { id } = useParams()
  const { world, commit } = useAccount()
  const navigate = useNavigate()
  const path = useAccountPath()
  const [dialog, setDialog] = useState(null)
  const trip = find(visibleTrips(world), id)
  const back = <AccountLink className="back" to="/trip">← All trips</AccountLink>
  if (!trip) return <>{back}<PageHeader title="Trip unavailable" description="This trip may have been deleted." /></>

  const close = () => setDialog(null)
  const title = trip.title || 'Untitled trip'
  const days = Object.groupBy(tripItinerary(world, id), ({ record }) => record.startDate || '')

  function deleteTrip() {
    commit((previous, update) => {
      if (!find(visibleTrips(previous), id)) return previous
      const deletion = { status: 'deleted', deletedAt: update.updatedAt, deletedBy: update.updatedBy, ...update }
      const next = { ...previous, trips: replace(previous.trips, id, deletion) }
      if (Array.isArray(previous.itineraryItems)) {
        next.itineraryItems = previous.itineraryItems.map((item) =>
          item?.tripId === id && item.status !== 'removed' ? { ...item, ...removeItem(update) } : item)
      }
      if (Array.isArray(previous.bookings)) {
        next.bookings = previous.bookings.map((booking) =>
          booking?.tripId === id ? { ...booking, tripId: null, ...update } : booking)
      }
      return next
    }, 'Trip deleted.')
    close()
    navigate(path('/trip'), { replace: true })
  }

  return <>
    {back}
    <PageHeader title={title} eyebrow={trip.destination || 'Trip planner'} description={dateRange(trip.startDate, trip.endDate)}
      actions={<><button onClick={() => setDialog({ kind: 'edit' })}>Edit trip</button>
        <button className="danger" onClick={() => setDialog({ kind: 'delete' })}>Delete trip</button></>}>
      <div className="detail-status"><Badge>{tripStatus(trip)}</Badge></div>
    </PageHeader>
    {trip.notes && <section className="panel"><h2>Trip notes</h2><p className="notes">{trip.notes}</p></section>}
    <section className="section">
      <header className="section-heading"><h2>Itinerary</h2><div className="actions">
        <button onClick={() => window.print()}>Print itinerary</button>
        <button onClick={() => setDialog({ kind: 'booking' })}>Add existing booking</button>
        <Primary onClick={() => setDialog({ kind: 'add-item' })}>Add item</Primary>
      </div></header>
      {Object.keys(days).length ? <div className="timeline">
        {Object.entries(days).map(([date, entries]) => <section className="timeline-day" key={date}>
          <h3>{dayLabel(date)}</h3>
          <div className="ruled">
            {entries.map(({ record, source }, index) => {
              const booked = source === 'booking'
              const entryTitle = record.title || (booked ? 'Booking' : 'Itinerary item')
              return <article className="event" key={`${source}-${record.id ?? index}`}>
                <div className="caption number">{record.startTime || '—'}</div>
                <div className="event-content">
                  <p className="caption">{booked ? 'Booking · ' : ''}{label(itemTypes, record.type, 'Itinerary item')}</p>
                  <p><strong>{booked && record.id ? <AccountLink to={`/bookings/${encodeURIComponent(record.id)}`}>{entryTitle}</AccountLink> : entryTitle}</strong></p>
                  {(record.location || record.destination) && <p className="muted">{record.location || record.destination}</p>}
                  {record.endDate && record.endDate !== record.startDate && <p className="caption">Through {dateRange(record.endDate)}</p>}
                  {record.notes && <p className="caption notes">{record.notes}</p>}
                </div>
                {!booked && record.id && <div className="actions">
                  <button className="text-button" aria-label={`Edit ${entryTitle}`} onClick={() => setDialog({ kind: 'edit-item', record })}>Edit</button>
                  <button className="text-button danger" aria-label={`Remove ${entryTitle}`} onClick={() => setDialog({ kind: 'remove-item', record })}>Remove</button>
                </div>}
              </article>
            })}
          </div>
        </section>)}
      </div> : <Empty title="Your itinerary is empty">Add an activity or attach a booking to get started.</Empty>}
    </section>
    {dialog?.kind === 'edit' && <TripForm trip={trip} onClose={close} />}
    {dialog?.kind === 'delete' && <Confirm action="Delete trip" name={title}
      detail={<>Delete <strong>{title}</strong> and its itinerary items? Linked bookings will stay in your account.</>}
      onClose={close} onConfirm={deleteTrip} />}
    {['add-item', 'edit-item'].includes(dialog?.kind) && <ItemForm tripId={id} item={dialog.record} onClose={close} />}
    {dialog?.kind === 'remove-item' && <Confirm action="Remove item" name={dialog.record.title || 'this itinerary item'} onClose={close}
      onConfirm={() => {
        commit((previous, update) => {
          const current = find(records(previous.itineraryItems), dialog.record.id)
          if (!current || current.status === 'removed') return previous
          return { ...previous, itineraryItems: replace(previous.itineraryItems, current.id, removeItem(update)) }
        }, 'Itinerary item removed.')
        close()
      }} />}
    {dialog?.kind === 'booking' && <BookingPicker trip={trip} onClose={close} />}
  </>
}
