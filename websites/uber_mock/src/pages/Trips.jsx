import { useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { byId, date, isChargeEligible, matches, money, newest, records, relatedReceipt, routeId, tripLabel, useAccount } from '../account.jsx'
import { AccountLink, Badge, Dialog, Facts, Field, Filter, Ledger, Missing, PageTitle, Search, Trail } from '../ui.jsx'

function TripRows({ trips, recent = false, filtered, clear }) {
  const { data } = useAccount()
  const headers = recent ? ['Date', 'Route', 'Status', 'Fare'] : ['Date', 'Route', 'Service', 'Status', 'Expense profile', 'Fare']
  const rows = trips.map((trip, index) => {
    const dateCell = <span className="mono">{date(trip.startedAt, data.rider?.timeZone)}</span>
    const route = <>{trip.id ? <AccountLink to={'/trips/' + routeId(trip.id)}>{tripLabel(trip)}</AccountLink> : tripLabel(trip)}
      <span className="stacked">{[trip.pickup && 'From ' + trip.pickup, trip.city].filter(Boolean).join(' · ')}</span></>
    const status = <Badge status={trip.status} />
    const fare = <span className="mono">{money(trip.total, trip.currency)}</span>
    const profile = byId(data.expenseProfiles, trip.expenseProfileId)
    const cells = recent ? [dateCell, route, status, fare] : [dateCell, route, trip.service ?? '—', status, profile?.name || '—', fare]
    return { id: trip.id ?? index, cells }
  })
  return <Ledger headers={headers} rows={rows} empty="No trips yet" filtered={filtered} clear={clear} caption={recent ? 'Recent trips ledger' : 'Trip history'} showCount={!recent} />
}

export function RecentTrips() {
  const { data } = useAccount()
  return <TripRows trips={newest(data.trips, 'startedAt').slice(0, 5)} recent />
}

function Trips() {
  const { data } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [profileId, setProfileId] = useState('')
  const filtered = Boolean(query.trim() || status || profileId)
  const trips = newest(data.trips, 'startedAt').filter((trip) =>
    (!status || trip.status === status) && (!profileId || trip.expenseProfileId === profileId) &&
    matches(query, trip.id, trip.pickup, trip.destination, trip.city, trip.driverName))
  const clear = () => { setQuery(''); setStatus(''); setProfileId('') }
  return <>
    <PageTitle title="Trips" description="Browse your ride history and review individual trips." />
    <div className="panel filters">
      <Search label="Search trips" value={query} onChange={setQuery} placeholder="Pickup, destination, city or driver" />
      <Filter label="Status" value={status} onChange={setStatus} options={[['completed', 'Completed'], ['canceled', 'Canceled']]} />
      <Filter label="Expense profile" value={profileId} onChange={setProfileId} options={records(data.expenseProfiles).filter((profile) => profile.id).map((profile) => [profile.id, profile.name || profile.id])} />
      {filtered && trips.length > 0 && <button className="button secondary" onClick={clear}>Clear filters</button>}
    </div>
    <TripRows trips={trips} filtered={filtered} clear={clear} />
  </>
}

function Assignment({ trip, profiles, close }) {
  const { commit } = useAccount()
  const [profileId, setProfileId] = useState(profiles.some((profile) => profile.id === trip.expenseProfileId) ? trip.expenseProfileId : '')

  function submit(event) {
    event.preventDefault()
    const profile = profiles.find((entry) => entry.id === profileId)
    if (!profile || profileId === trip.expenseProfileId) return
    commit((state, { now, actorId }) => ({
      ...state,
      trips: records(state.trips).map((entry) => entry.id === trip.id ? {
        ...entry,
        expenseProfileId: profileId,
        expenseAssignment: { previousProfileId: entry.expenseProfileId ?? null, profileId, status: 'assigned', createdAt: now, actorId },
      } : entry),
    }), 'Expense profile changed to ' + (profile.name || profileId) + '.')
    close()
  }

  return <Dialog title="Change expense profile" onClose={close}>
    <p>Choose how this trip appears in your expense reporting. The receipt keeps its original billing details.</p>
    <form className="form" onSubmit={submit}>
      <Field label="Expense profile">{(props) => <select {...props} value={profileId} onChange={(event) => setProfileId(event.target.value)} required>
        <option value="" disabled>Select a profile</option>
        {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name || profile.id}</option>)}
      </select>}</Field>
      <div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button>
        <button className="button" disabled={!profileId || profileId === trip.expenseProfileId}>Save expense profile</button></div>
    </form>
  </Dialog>
}

function TripDetail() {
  const { tripId } = useParams()
  const { data } = useAccount()
  const [assign, setAssign] = useState(false)
  const trip = byId(data.trips, tripId)
  if (!trip) return <Missing title="Trip unavailable" to="/trips" back="All trips" />

  const profile = byId(data.expenseProfiles, trip.expenseProfileId)
  const activeProfiles = records(data.expenseProfiles).filter((entry) => entry.id && entry.status === 'active')
  const receipt = relatedReceipt(data, trip)
  const completed = trip.status === 'completed'
  const reviewEligible = isChargeEligible(data, trip)
  const query = '?tripId=' + routeId(tripId)
  return <>
    <Trail to="/trips">All trips</Trail>
    <PageTitle title={tripLabel(trip)} description={[date(trip.startedAt, data.rider?.timeZone), trip.city].filter(Boolean).join(' · ')} action={<Badge status={trip.status} />} />
    <div className="detail-grid">
      <div>
        <section className="panel detail-panel">
          <h2>Trip details</h2>
          <ol className="trip-stops">
            <li><small>Pickup</small><strong>{trip.pickup || 'Pickup unavailable'}</strong></li>
            <li><small>Drop-off</small><strong>{tripLabel(trip)}</strong></li>
          </ol>
          <Facts items={[[ 'Service', trip.service ], [ 'Driver', trip.driverName ], [ 'Trip ID', <span className="mono">{trip.id}</span> ]]} />
        </section>
        <section className="panel detail-panel">
          <h2>Expense profile</h2>
          <p>{profile?.id ? <AccountLink to={'/expense-profiles/' + routeId(profile.id)}>{profile.name || profile.id}</AccountLink> : 'No profile available'}</p>
          {completed && activeProfiles.some((entry) => entry.id !== trip.expenseProfileId) &&
            <p><button className="button secondary" onClick={() => setAssign(true)}>Change expense profile</button></p>}
        </section>
      </div>
      <div>
        <section className="panel detail-panel">
          <h2>Fare</h2><p className="mono total">{money(trip.total, trip.currency)}</p>
          {receipt?.id ? <p><AccountLink to={'/receipts/' + routeId(receipt.id)}>View receipt</AccountLink></p> : <p>No receipt available</p>}
        </section>
        {(completed || reviewEligible) && <aside className="panel detail-panel">
          <h2>Trip support</h2>
          <div className="button-stack">
            {completed && <AccountLink className="button secondary" to={'/lost-items/new' + query}>Report lost item</AccountLink>}
            {reviewEligible && <AccountLink className="button secondary" to={'/refunds/new' + query}>Request fare review</AccountLink>}
          </div>
        </aside>}
      </div>
    </div>
    {assign && <Assignment key={trip.id} trip={trip} profiles={activeProfiles} close={() => setAssign(false)} />}
  </>
}

export function TripRoutes() {
  return <Routes>
    <Route index element={<Trips />} />
    <Route path=":tripId" element={<TripDetail />} />
    <Route path="*" element={<Missing title="Trip unavailable" to="/trips" back="All trips" />} />
  </Routes>
}
