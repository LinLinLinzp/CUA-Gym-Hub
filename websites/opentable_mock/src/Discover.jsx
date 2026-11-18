import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, CheckCircle2, MapPin, Search } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccountLink, Empty, Heading, Photo } from './ui'
import { useAccount } from './store'
import { BookingForm, GuestSelect, maxSlotPartySize } from './BookingForm'
import { BookingMeta } from './Reservations'
import { addDays, localClock, prettyTime } from './data/dates'
import { availableSlots, rows, slotKey, venue } from './data/model'

function filterParams({ query, date, time, partySize, cuisine }) {
  return new URLSearchParams({ q: query, date, time, party: String(partySize), cuisine })
}

function RestaurantCard({ restaurant, filters, slots }) {
  const params = filterParams(filters)
  const path = '/restaurants/' + encodeURIComponent(restaurant.id)
  const link = path + '?' + params
  return <article className="surface restaurant-card">
    <AccountLink to={link} aria-label={'View ' + restaurant.name}><Photo restaurant={restaurant} className="restaurant-photo" /></AccountLink>
    <div className="restaurant-content">
      <h2><AccountLink to={link}>{restaurant.name || 'Unnamed restaurant'} <ArrowUpRight size={16} /></AccountLink></h2>
      <p>{[restaurant.neighborhood, restaurant.cuisine, price(restaurant)].filter(Boolean).join(' · ')}</p>
      {slots.length ? <div className="times">
        {slots.map((slot, index) => {
          const selection = new URLSearchParams(params)
          selection.set('slot', slotKey(slot))
          return <AccountLink key={slotKey(slot) + index} className="time-link" to={path + '?' + selection} aria-label={prettyTime(slot.time) + ' at ' + restaurant.name}>{prettyTime(slot.time)}</AccountLink>
        })}
      </div> : <span className="muted">No times near your search</span>}
    </div>
  </article>
}

function price(restaurant) {
  return typeof restaurant.priceTier === 'number' && restaurant.priceTier >= 1 && restaurant.priceTier <= 4 ? '$'.repeat(restaurant.priceTier) : ''
}

const minute = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const defaultDate = zone => addDays(localClock(zone).date, 1)

export function Discover() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const zone = state.account?.timeZone
  const defaults = { query: '', date: defaultDate(zone), time: '19:00', partySize: 2, cuisine: '' }
  const [filters, setFilters] = useState({
    query: params.get('q') ?? '', date: params.get('date') || defaults.date, time: params.get('time') ?? defaults.time,
    partySize: Number(params.get('party')) || 2, cuisine: params.get('cuisine') ?? '',
  })
  const { query, date, time, partySize, cuisine } = filters
  const restaurants = rows(state.restaurants).filter(restaurant => restaurant.id)
  const maximum = restaurants.reduce((max, restaurant) => Math.max(max, maxSlotPartySize(restaurant)), 10)
  const cuisines = [...new Set(restaurants.map(restaurant => restaurant.cuisine).filter(Boolean))].sort()
  const matches = restaurants.filter(restaurant => (!cuisine || restaurant.cuisine === cuisine) && [restaurant.name, restaurant.neighborhood]
    .some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())))
  const results = matches.map(restaurant => ({
    restaurant, slots: availableSlots(state, restaurant, date, partySize).filter(slot => !time || Math.abs(minute(slot.time) - minute(time)) <= 90),
  }))
  const hasAvailability = results.some(({ slots }) => slots.length)
  const update = (key, value) => setFilters(previous => ({ ...previous, [key]: value }))

  return <>
    <Heading title="Find a table" />
    <div className="surface discover-filters">
      <label className="discover-search">Restaurant or neighborhood<span className="search-field"><Search size={17} aria-hidden="true" /><input type="search" value={query} placeholder="Search restaurants" onChange={event => update('query', event.target.value)} /></span></label>
      <label>Date<input type="date" value={date} min={localClock(zone).date} onChange={event => update('date', event.target.value)} /></label>
      <label>Preferred time<input type="time" value={time} onChange={event => update('time', event.target.value)} /></label>
      <label>Party size<GuestSelect value={partySize} onChange={value => update('partySize', value)} max={maximum} /></label>
      <label>Cuisine<select value={cuisine} onChange={event => update('cuisine', event.target.value)}><option value="">All cuisines</option>{cuisines.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    {results.length ? <section className="section">
      <div className="section-heading"><h2>Restaurants</h2><span>{results.length} {results.length === 1 ? 'result' : 'results'}</span></div>
      {!hasAvailability && <p className="availability-note" role="status">No available tables near your search time. Try another date or party size.</p>}
      {time && <button type="button" className="text-link broaden" onClick={() => update('time', '')}>Show all available times</button>}
      <div className="restaurant-grid">{results.map(({ restaurant, slots }) => <RestaurantCard key={restaurant.id} restaurant={restaurant} filters={filters} slots={slots} />)}</div>
    </section> : <Empty title={restaurants.length ? 'No matching restaurants' : 'No restaurants available'}
      action={restaurants.length ? <button type="button" className="button" onClick={() => setFilters(defaults)}>Clear filters</button> : null}>
      {restaurants.length ? 'Try a different restaurant, neighborhood or cuisine.' : 'Check back for more dining options.'}
    </Empty>}
  </>
}

export function RestaurantDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { state } = useAccount()
  const restaurant = venue(state, id)
  const [confirmation, setConfirmation] = useState(null)
  const previous = new URLSearchParams(params)
  previous.delete('slot')
  const back = <AccountLink to={'/discover?' + previous} className="text-link back-link"><ArrowLeft size={17} />Back to restaurants</AccountLink>
  if (!restaurant) return <>{back}<Empty title="Restaurant unavailable">This restaurant could not be found.</Empty></>

  return <>
    {back}
    <Heading title={restaurant.name || 'Restaurant'}>{[restaurant.neighborhood, restaurant.cuisine, price(restaurant)].filter(Boolean).join(' · ')}</Heading>
    <div className="detail-grid">
      <article className="surface venue-detail">
        <Photo restaurant={restaurant} className="detail-photo" eager />
        <div className="panel"><h2>About the restaurant</h2>
          {restaurant.description && <p>{restaurant.description}</p>}
          {restaurant.address && <p className="address"><MapPin size={17} />{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>}
        </div>
      </article>
      <section className="surface panel detail-panel">
        {confirmation?.restaurantId === id ? <div className="form confirmation">
          <CheckCircle2 size={28} />
          <h2>Reservation confirmed</h2>
          <BookingMeta booking={confirmation} />
          <p>Confirmation code <strong>{confirmation.confirmationCode}</strong></p>
          <AccountLink className="button primary" to={'/reservations/' + confirmation.id}>View reservation</AccountLink>
        </div> : <>
          <h2>Book a table</h2>
          <BookingForm key={id + params.get('slot')} restaurant={restaurant}
            defaults={{ date: params.get('date') || defaultDate(restaurant.timeZone || state.account?.timeZone), partySize: Number(params.get('party')) || 2, selected: params.get('slot') }}
            onSuccess={({ result }) => setConfirmation(result)} />
        </>}
      </section>
    </div>
  </>
}
