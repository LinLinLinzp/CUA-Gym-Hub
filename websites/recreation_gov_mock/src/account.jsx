import { useState } from 'react'
import landscape from '../assets/trip-landscape.svg'
import { cancellationPlan, dateSpan, find, formatDate, formatTime, isCamp, matches, money, owns, reservationView, rows, typeLabel, words } from './data/domain'
import { useRoute, useStore } from './store'
import { Charges, Empty, ErrorText, Facts, Heading, Missing, Modal, OptionField, Pill, recordPath, RouteLink, SearchField, Segments } from './ui'

const RESERVATIONS = '/account/reservations'
const views = ['Upcoming', 'Past', 'Cancelled']
const centsLabels = { service: 'Service fee', cancellation: 'Cancellation fee', late_forfeit: 'Late cancellation charge' }
const facilityName = (facility, row) => facility?.name || (row ? typeLabel(row) + ' reservation' : 'Facility unavailable')
const locationLabel = (facility) => [facility?.locality, facility?.state].filter(Boolean).join(', ')
const byDate = (a, b) => String(a.startDate || '').localeCompare(String(b.startDate || ''))

function ReservationRow({ reservation, state, search = '' }) {
  const facility = find(state.facilities, reservation.facilityId)
  return <li className="record-row">
    <div>
      <RouteLink className="record-title" to={recordPath(RESERVATIONS, reservation.id) + search}>{facilityName(facility, reservation)}</RouteLink>
      <p>{[typeLabel(reservation), locationLabel(facility), reservation.confirmationCode].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="record-meta"><span>{dateSpan(reservation)}</span><Pill value={reservation.status} /></div>
  </li>
}

export function Overview() {
  const { state } = useStore()
  const reservations = rows(state.reservations).filter((row) => owns(state, row))
  const next = reservations.filter((row) => reservationView(row, find(state.facilities, row.facilityId)) === 'Upcoming')
    .sort(byDate)[0]
  const facility = find(state.facilities, next?.facilityId)
  const recent = [...reservations].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))).slice(0, 3)
  const applications = rows(state.lotteryApplications).filter((row) => owns(state, row))
  const availableClaims = applications.filter((row) => row.status === 'selected' && !rows(state.reservations).some((reservation) => reservation.lotteryApplicationId === row.id))
  return <>
    <Heading title={state.account?.firstName ? `Welcome, ${state.account.firstName}` : 'Account overview'}>Manage your trips, permits, and lottery applications.</Heading>
    <section className="trip panel" aria-labelledby="next-trip">
      <div className="trip-copy">
        <div className="section-label">Next trip</div>
        <h2 id="next-trip">{next ? facilityName(facility, next) : 'Plan your next trip'}</h2>
        {next
          ? <><p className="trip-location">{locationLabel(facility) || typeLabel(next)}</p><p className="trip-dates">{dateSpan(next)}{next.confirmationCode && <span>{next.confirmationCode}</span>}</p></>
          : <p>Find a campground or reserve a backcountry permit.</p>}
        <RouteLink className="button primary" to={next ? recordPath(RESERVATIONS, next.id) : '/explore'}>{next ? 'View reservation' : 'Explore camping and permits'} <span aria-hidden="true">→</span></RouteLink>
      </div>
      <img src={landscape} alt="" width="640" height="360" />
    </section>
    <div className="overview-columns">
      <section className="panel list-panel" aria-labelledby="recent-reservations">
        <div className="section-head"><h2 id="recent-reservations">Recent reservations</h2></div>
        {recent.length ? <ul className="records">{recent.map((reservation) => <ReservationRow key={reservation.id} state={state} reservation={reservation} />)}</ul> : <p className="list-note">Your reservations will appear here.</p>}
        <div className="section-foot"><RouteLink to={RESERVATIONS}>All reservations <span aria-hidden="true">→</span></RouteLink></div>
      </section>
      <section className="panel lottery-summary" aria-labelledby="lottery-activity">
        <h2 id="lottery-activity">Lottery activity</h2>
        {applications.length > 0 && <Facts items={[
          ['Applications', applications.length],
          ['Selected results', availableClaims.length],
        ]} />}
        <RouteLink to={applications.length ? '/account/lotteries' : '/lotteries'}>{applications.length ? 'View my lotteries' : 'Find a lottery'} <span aria-hidden="true">→</span></RouteLink>
      </section>
    </div>
  </>
}

export function Reservations() {
  const { state } = useStore()
  const { go, location } = useRoute()
  const params = new URLSearchParams(location.search)
  const view = views.includes(params.get('view')) ? params.get('view') : views[0]
  const type = params.get('type') || ''
  const query = params.get('q') || ''
  const sort = params.get('sort') || 'soonest'
  function setFilter(key, value) {
    if (value) params.set(key, value)
    else params.delete(key)
    go(`${RESERVATIONS}?${params}`, { replace: true })
  }
  const reservations = rows(state.reservations).filter((row) => {
    const facility = find(state.facilities, row.facilityId)
    const unit = find(state.units, row.unitId)
    return owns(state, row) && reservationView(row, facility) === view && (!type || row.kind === type) &&
      matches(query, facility?.name, locationLabel(facility), unit?.name, row.confirmationCode)
  }).sort((a, b) => (sort === 'latest' ? -1 : 1) * byDate(a, b))
  return <>
    <div className="heading-action"><Heading title="My reservations">Review upcoming trips, past visits, and cancellations.</Heading>
      <RouteLink className="button primary" to="/explore">Find a campsite or permit</RouteLink></div>
    <Segments label="Reservation view" options={views} value={view} onChange={(value) => setFilter('view', value)} />
    <div className="filter-bar">
      <SearchField label="Search reservations" placeholder="Destination or confirmation code" value={query} onChange={(value) => setFilter('q', value)} />
      <OptionField label="Reservation type" value={type} onChange={(value) => setFilter('type', value)} options={ [['', 'All types'], ['campsite', 'Campsites'], ['permit', 'Permits']] } />
      <OptionField label="Date order" value={sort} onChange={(value) => setFilter('sort', value)} options={ [['soonest', 'Earliest first'], ['latest', 'Latest first']] } />
    </div>
    <p className="result-count" role="status">{reservations.length} {reservations.length === 1 ? 'reservation' : 'reservations'}</p>
    {reservations.length ? <ul className="records panel">{reservations.map((reservation) =>
      <ReservationRow key={reservation.id} reservation={reservation} state={state} search={location.search} />)}</ul>
      : <Empty title={`No ${view.toLowerCase()} reservations found`}>Change your filters or explore destinations for a new trip.</Empty>}
  </>
}

function Refund({ adjustment }) {
  return <Facts className="costs" items={[
    ['Amount paid', money(adjustment.paidAmount, adjustment.currency)],
    ...rows(adjustment.deductionLines).map((line) => [centsLabels[line.code] || line.code || 'Deduction', money(line.amount, adjustment.currency)]),
    ['Refund amount', money(adjustment.refundAmount, adjustment.currency)],
  ]} />
}

export function Reservation({ id }) {
  const { state, commit } = useStore()
  const { location } = useRoute()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')
  const reservation = find(state.reservations, id)
  if (!owns(state, reservation)) return <Missing title="Reservation not found" to={RESERVATIONS} action="My reservations" />
  const facility = find(state.facilities, reservation.facilityId)
  const unit = find(state.units, reservation.unitId)
  const cancelled = reservation.status === 'cancelled'
  const adjustment = find(state.cancellations, reservation.cancellationId) ||
    rows(state.cancellations).find((row) => row.reservationId === id)
  const params = new URLSearchParams(location.search)
  if (cancelled) params.set('view', 'Cancelled')
  if (!params.get('view')) params.set('view', reservationView(reservation, facility))
  const back = { to: `${RESERVATIONS}?${params}`, label: 'My reservations' }
  const preview = cancellationPlan(state, reservation)
  function dismiss() {
    setModal(false)
    setError('')
  }
  function cancel() {
    const result = commit({ type: 'cancel', id }, 'Reservation cancelled.')
    if (result.error) setError(result.error)
    else {
      dismiss()
      requestAnimationFrame(() => document.getElementById('receipt-heading')?.focus())
    }
  }
  return <>
    <Heading title={cancelled ? 'Reservation cancelled' : 'Reservation details'} back={back} id="receipt-heading">
      {reservation.confirmationCode ? `Confirmation ${reservation.confirmationCode}` : 'Reservation receipt'}
    </Heading>
    <div className="details-grid">
      <section className="panel detail-panel">
        <div className="title-row"><h2>{facilityName(facility, reservation)}</h2><Pill value={reservation.status} /></div>
        {facility && <p className="muted">{words(locationLabel(facility), facility.area && `· ${facility.area}`)}</p>}
        <Facts className="trip-facts" items={[
          [isCamp(reservation) ? 'Campsite' : 'Entry point', unit?.name],
          [isCamp(reservation) ? 'Arrival' : 'Entry date', formatDate(reservation.startDate)],
          ...(isCamp(reservation) ? [['Departure', formatDate(reservation.endDate)], ['Equipment', reservation.equipment]] : []),
          ['Party size', reservation.partySize],
          ...(cancelled ? [['Cancelled on', reservation.cancelledAt ? formatTime(reservation.cancelledAt) : null]] : []),
        ]} />
        <div className="action-row receipt-actions">
          {!cancelled && !preview.error && <button className="button secondary danger-text" onClick={() => setModal(true)}>Cancel reservation</button>}
          {cancelled && <RouteLink to={back.to} className="button secondary">View cancelled reservations</RouteLink>}
          <button className="button secondary" onClick={() => window.print()}>Print receipt</button>
        </div>
        {!cancelled && preview.error && <p className="muted">{preview.error}</p>}
        {reservation.lotteryApplicationId && <p><RouteLink to={recordPath('/account/lotteries', reservation.lotteryApplicationId)}>View lottery application</RouteLink></p>}
      </section>
      <section className="panel detail-panel summary">
        <h2>Charges</h2>
        <Charges quote={reservation} camp={isCamp(reservation)} />
        {cancelled && <><h3 className="subsection">Cancellation summary</h3>{adjustment ? <Refund adjustment={adjustment} /> : <p className="muted">Refund details are unavailable.</p>}</>}
      </section>
    </div>
    {modal && <Modal title="Cancel this reservation?" onDismiss={dismiss}>
      <p>Your booking at {facilityName(facility, reservation)} will be released.</p>
      {!preview.error && <Refund adjustment={preview} />}
      <ErrorText error={error || preview.error} />
      <div className="action-row"><button className="button secondary" autoFocus onClick={dismiss}>Keep reservation</button>
        <button className="button danger" disabled={Boolean(preview.error)} onClick={cancel}>Confirm cancellation</button></div>
    </Modal>}
  </>
}
