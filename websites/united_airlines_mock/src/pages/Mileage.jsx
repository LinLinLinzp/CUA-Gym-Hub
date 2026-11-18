import { useState } from 'react'
import { useStore } from '../store.jsx'
import { bookingFor, list, normalize } from '../data/account.js'
import { completedFlights, requestMileage } from '../data/mileage.js'
import { AppLink, Dialog, Empty, ErrorMessage, Field, Heading, Status, count, dateTime, routeTitle, segmentDay, titleCase, tripPath } from '../ui.jsx'

const newest = (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)

export function MileagePage() {
  const { world } = useStore()
  const membership = world.mileagePlus ?? {}
  const forMember = item => !item.memberId || item.memberId === membership.memberId
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [requestOpen, setRequestOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const activity = list(world.mileageActivity).filter(item => forMember(item) &&
    (type === 'all' || item.type === type) && normalize([item.label, item.type, item.bookingId].join(' ')).includes(normalize(query))).sort(newest)
  const requests = list(world.mileageRequests).filter(forMember).sort(newest)
  return <>
    <Heading title="MileagePlus" actions={<AppLink className="button primary" to="/book?mode=miles">Book with miles</AppLink>}>
      View your award balance, activity and missing-miles requests.
    </Heading>
    <div className="stat-grid">
      <section className="panel stat"><h2>Award miles</h2><div className="metric">{count(membership.awardMiles)}</div><p>Available for award travel</p></section>
      <section className="panel stat"><h2>Membership</h2><div className="metric compact">{membership.tier || 'MileagePlus member'}</div><p>Member number {membership.memberId || 'unavailable'}</p></section>
      <section className="panel stat"><h2>Premier progress</h2><dl className="payment"><div><dt>Premier qualifying points</dt><dd>{count(membership.pqp)}</dd></div><div><dt>Premier qualifying flights</dt><dd>{count(membership.pqf)}</dd></div></dl></section>
    </div>
    <section className="panel section-gap">
      <h2>Mileage activity</h2>
      <div className="filters">
        <Field label="Search activity"><input type="search" placeholder="Flight, partner or activity" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Activity type"><select value={type} onChange={event => setType(event.target.value)}>
          <option value="all">All activity</option>{['flight', 'partner', 'bonus', 'redemption'].map(value => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select></Field>
      </div>
      {activity.length ? <ul className="record-list" aria-label="Mileage activity results">{activity.map((item, i) => <li key={item.id || i}>
        <div className="record-main"><strong>{item.label || titleCase(item.type) || 'Mileage entry'}</strong>
          <span>{dateTime(item.createdAt)}{item.type ? ' · ' + titleCase(item.type) : ''}</span></div>
        <div className="record-actions"><strong>{item.miles > 0 ? '+' : ''}{count(item.miles)} miles</strong><span className="meta">{item.pqp || 0} PQP · {item.pqf || 0} PQF</span></div>
      </li>)}</ul> : <Empty title="No matching mileage activity">{query || type !== 'all' ? 'Try a different search or activity type.' : 'Eligible activity will appear here when it posts.'}</Empty>}
    </section>
    <section className="panel section-gap">
      <div className="section-title"><h2>Requests</h2><button className="secondary" onClick={() => { setNotice(''); setRequestOpen(true) }}>Request missing miles</button></div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {requests.length ? <ul className="record-list" aria-label="Missing miles requests">{requests.map((item, i) => {
        const booking = bookingFor(world, item.bookingId)
        const segment = list(booking?.segments).find(entry => entry.id === item.segmentId)
        return <li key={item.id || i}>
          <div className="record-main"><strong>{segment ? routeTitle(segment) : 'Missing miles'}</strong>
            <span>{dateTime(item.createdAt)}{item.ticketNumber ? ' · Ticket ' + item.ticketNumber : ''}</span></div>
          <div className="record-actions"><Status value={item.status} />{booking && <AppLink to={tripPath(booking)}>View trip</AppLink>}</div>
        </li>
      })}</ul> : <Empty title="No missing-miles requests">Submit a request for a completed flight on your account.</Empty>}
    </section>
    {requestOpen && <MileageRequest onClose={() => setRequestOpen(false)} onSuccess={() => {
      setRequestOpen(false)
      setNotice('Missing-miles request submitted. You can track its status below.')
    }} />}
  </>
}

function MileageRequest({ onClose, onSuccess }) {
  const { world, commit } = useStore()
  const [choice, setChoice] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [error, setError] = useState('')
  const flights = completedFlights(world)
  const keyFor = ({ booking, segment }) => JSON.stringify([booking.id, segment.id])
  function submit(event) {
    event.preventDefault()
    const selected = flights.find(flight => keyFor(flight) === choice)
    if (!selected) return setError('Choose a completed flight on your account.')
    const result = commit(current => requestMileage(current, { bookingId: selected.booking.id, segmentId: selected.segment.id, ticketNumber }))
    if (result.error) return setError(result.error)
    onSuccess()
  }
  return <Dialog title="Request missing miles" onClose={onClose}>
    {flights.length ? <form onSubmit={submit}>
      <Field label="Completed flight"><select required value={choice} onChange={event => { setChoice(event.target.value); setError('') }}>
        <option value="">Choose a flight</option>{flights.map(item => <option key={keyFor(item)} value={keyFor(item)}>
          {item.booking.confirmationCode || item.booking.id} · {item.segment.flightNumber || 'Flight'} · {routeTitle(item.segment)} · {segmentDay(item.segment)}
        </option>)}
      </select></Field>
      <Field label="Ticket number"><input required inputMode="numeric" maxLength={20} value={ticketNumber} onChange={event => { setTicketNumber(event.target.value); setError('') }} /></Field>
      <p className="meta">Find the traveler’s 13-digit ticket number in the trip details under Travelers.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="dialog-actions"><button type="button" className="secondary" onClick={onClose}>Close</button><button className="primary">Submit request</button></div>
    </form> : <><Empty title="No completed flights">Completed account trips can be selected for missing-miles requests.</Empty>
      <div className="dialog-actions"><button className="secondary" onClick={onClose}>Close</button></div></>}
  </Dialog>
}
