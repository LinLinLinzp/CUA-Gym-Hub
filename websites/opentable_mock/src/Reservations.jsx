import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Clock3, Compass, Search, Users } from 'lucide-react'
import { AccountLink, Dialog, Empty, ErrorMessage, Heading, Photo, Tabs } from './ui'
import { useAccount } from './store'
import { downloadCalendar } from './utils/calendar'
import { BookingForm } from './BookingForm'
import { ReviewForm } from './ReviewForm'
import { prettyDate, prettyTime } from './data/dates'
import { canReview, cancelBooking, manageable, owned, reviewFor, partyLabel, reservation, restaurantName, start, venue } from './data/model'

export function BookingStatus({ booking }) {
  const labels = { confirmed: 'Confirmed', completed: 'Completed', canceled: 'Canceled' }
  return <span className={'status ' + (labels[booking.status] ? booking.status : '')}>{labels[booking.status] || 'Status unavailable'}</span>
}

export function BookingMeta({ booking }) {
  return <div className="metadata">
    <span><CalendarDays />{prettyDate(booking.date)}</span>
    <span><Clock3 />{prettyTime(booking.time)}</span>
    <span><Users />{partyLabel(booking.partySize)}</span>
  </div>
}

function Featured({ booking, restaurant }) {
  return <article className="featured surface">
    <div className="ticket">
      <div className="ticket-main">
        <span className="sr-only">{prettyDate(booking.date)}</span>
        <div className="date-tile" aria-hidden="true">
          <span>{booking.date ? prettyDate(booking.date, { month: 'short' }) : '—'}</span>
          <strong>{booking.date ? prettyDate(booking.date, { day: 'numeric' }) : '—'}</strong>
          <span>{booking.date ? prettyDate(booking.date, { weekday: 'short' }) : '—'}</span>
        </div>
        <div className="ticket-info">
          <BookingStatus booking={booking} />
          <h3>{restaurant?.name || 'Restaurant unavailable'}</h3>
          {(restaurant?.neighborhood || restaurant?.cuisine) && <p>{[restaurant.neighborhood, restaurant.cuisine].filter(Boolean).join(' · ')}</p>}
          <div className="metadata"><span><Clock3 />{prettyTime(booking.time)}</span><span><Users />{partyLabel(booking.partySize)}</span></div>
        </div>
      </div>
      <div className="ticket-footer">
        {booking.confirmationCode && <span>Confirmation <strong>{booking.confirmationCode}</strong></span>}
        {booking.id && <AccountLink to={'/reservations/' + encodeURIComponent(booking.id)} className="text-link">View reservation <ArrowRight size={16} /></AccountLink>}
      </div>
    </div>
    <Photo restaurant={restaurant} className="ticket-photo" eager />
  </article>
}

function BookingRow({ booking, restaurant, eager }) {
  const name = restaurant?.name || 'Restaurant unavailable'
  return <article className="booking-row">
    <Photo restaurant={restaurant} className="thumbnail" eager={eager} />
    <div className="row-body">
      <h3>{name}</h3>
      <BookingMeta booking={booking} />
    </div>
    <BookingStatus booking={booking} />
    {booking.id && <AccountLink to={'/reservations/' + encodeURIComponent(booking.id)} className="row-link" aria-label={'View reservation for ' + name + (booking.confirmationCode ? ', ' + booking.confirmationCode : '')}><span>View details</span><ChevronRight size={17} /></AccountLink>}
  </article>
}

const tabs = ['Upcoming', 'Past', 'Canceled']

export function Reservations() {
  const { state } = useAccount()
  const [tab, setTab] = useState(tabs[0])
  const [query, setQuery] = useState('')
  const now = new Date()
  const byTab = owned(state, 'reservations').filter(item => {
    if (tab === 'Canceled') return item.status === 'canceled'
    if (tab === 'Upcoming') return manageable(state, item, now)
    return item.status === 'completed' || (item.status === 'confirmed' && !manageable(state, item, now))
  })
  const found = byTab.filter(item => [restaurantName(state, item.restaurantId), item.confirmationCode]
    .some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())))
  const ordered = found.map(item => ({ item, timestamp: start(state, item) })).sort((a, b) => {
    const direction = tab === 'Upcoming' ? 1 : -1
    return direction * (a.timestamp - b.timestamp) || String(a.item.id || '').localeCompare(b.item.id || '')
  }).map(({ item }) => item)
  const featured = tab === 'Upcoming' ? ordered[0] : null
  const list = featured ? ordered.slice(1) : ordered

  return <>
    <Heading title="Reservations" action={<AccountLink to="/discover" className="button primary"><Compass size={17} />Find a table</AccountLink>} />
    <div className="list-controls">
      <Tabs label="Reservation status" options={tabs} value={tab} onChange={setTab} />
      <div className="search-field"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search reservations" placeholder="Restaurant or confirmation code" value={query} onChange={event => setQuery(event.target.value)} /></div>
    </div>
    {featured && <section className="section"><div className="section-heading"><h2>Next reservation</h2><span>{ordered.length} upcoming</span></div><Featured booking={featured} restaurant={venue(state, featured.restaurantId)} /></section>}
    {list.length > 0 && <section className="section">
      <div className="section-heading"><h2>{featured ? 'More upcoming' : tab === 'Past' ? 'Past visits' : 'Canceled reservations'}</h2><span>{list.length} {list.length === 1 ? 'reservation' : 'reservations'}</span></div>
      <div className="surface row-list">
        {list.map((booking, index) => <BookingRow key={booking.id || index} booking={booking} restaurant={venue(state, booking.restaurantId)} eager={index < 5} />)}
      </div>
    </section>}
    {!ordered.length && <Empty title={query.trim() ? 'No matching reservations' : 'No ' + tab.toLowerCase() + ' reservations'}
      action={query.trim() ? <button type="button" className="button" onClick={() => setQuery('')}>Clear search</button> : tab === 'Upcoming' ? <AccountLink to="/discover" className="button primary">Find a table</AccountLink> : null}>
      {query.trim() ? 'Try a different restaurant name or confirmation code.' : tab === 'Upcoming' ? 'Your next table will appear here once you book.' : undefined}
    </Empty>}
  </>
}

export function ReservationDetail() {
  const { id } = useParams()
  const { state, commit, notify } = useAccount()
  const [dialog, setDialog] = useState('')
  const [error, setError] = useState('')
  const booking = reservation(state, id)
  const back = <AccountLink className="text-link back-link" to="/reservations"><ArrowLeft size={17} />All reservations</AccountLink>
  if (!booking) return <>{back}<Empty title="Reservation unavailable">This reservation could not be found in your account.</Empty></>
  const restaurant = venue(state, booking.restaurantId)
  function closeDialog() {
    setDialog('')
    setError('')
  }
  function confirmCancel() {
    const outcome = commit(current => cancelBooking(current, id))
    if (outcome.error) setError(outcome.error)
    else {
      closeDialog()
      notify('Reservation canceled.')
    }
  }

  return <>
    {back}
    <Heading title={restaurant?.name || 'Restaurant unavailable'}><BookingStatus booking={booking} /></Heading>
    <div className="detail-grid">
      <article className="surface venue-detail">
        <Photo restaurant={restaurant} className="detail-photo" eager />
        <div className="panel">
          <h2>Reservation details</h2>
          <BookingMeta booking={booking} />
          {restaurant?.address && <p>{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>}
        </div>
      </article>
      <section className="surface panel detail-panel">
        <h2>Your table</h2>
        <dl className="facts">
          <div><dt>Confirmation code</dt><dd>{booking.confirmationCode || 'Unavailable'}</dd></div>
          <div><dt>Seating</dt><dd>{booking.seating || 'Unspecified'}</dd></div>
          {booking.occasion && <div><dt>Occasion</dt><dd>{booking.occasion}</dd></div>}
          {booking.specialRequest && <div><dt>Special request</dt><dd>{booking.specialRequest}</dd></div>}
        </dl>
        {manageable(state, booking) && <div className="detail-actions">
          {restaurant && <button type="button" className="button primary" onClick={() => setDialog('modify')}>Modify reservation</button>}
          <button type="button" className="button danger" onClick={() => setDialog('cancel')}>Cancel reservation</button>
        </div>}
        {booking.status === 'confirmed' && Number.isFinite(start(state, booking)) && <button type="button" className="text-link calendar-link" onClick={() => downloadCalendar(state, booking, restaurant)}><CalendarDays size={16} /> Add to calendar</button>}
        {canReview(state, booking) && <div className="detail-actions"><button type="button" className="button primary" onClick={() => setDialog('review')}>Write a review</button></div>}
        {reviewFor(state, booking) && <p className="reviewed"><span className="status completed">Review submitted</span> <AccountLink className="text-link" to="/reviews?view=submitted">View reviews</AccountLink></p>}
      </section>
    </div>
    {dialog === 'review' && <ReviewForm booking={booking} onClose={closeDialog} onSuccess={closeDialog} />}
    {dialog === 'modify' && <Dialog title="Modify reservation" onClose={closeDialog}>
      <BookingForm restaurant={restaurant} current={booking} onDismiss={closeDialog} onSuccess={({ unchanged }) => {
        closeDialog()
        notify(unchanged ? 'No reservation changes were needed.' : 'Reservation updated.')
      }} />
    </Dialog>}
    {dialog === 'cancel' && <Dialog title="Cancel reservation?" onClose={closeDialog}>
      <p><strong>{restaurant?.name || 'Your restaurant reservation'}</strong></p>
      <BookingMeta booking={booking} />
      <ErrorMessage>{error}</ErrorMessage>
      <div className="form-actions">
        <button type="button" className="button" onClick={closeDialog}>Keep reservation</button>
        <button type="button" className="button primary" onClick={confirmCancel}>Cancel reservation</button>
      </div>
    </Dialog>}
  </>
}
