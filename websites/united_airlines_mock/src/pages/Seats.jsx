import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { bookingFor, changeSeat, list, person, seatSegments, seatState } from '../data/account.js'
import { AppLink, Empty, ErrorMessage, Field, Heading, money, routeTitle, segmentDay, tripPath } from '../ui.jsx'

function cabinRows(seats) {
  const rows = new Map()
  for (const seat of list(seats)) {
    const match = /^(\d+)([A-Z]+)$/i.exec(seat.label ?? '')
    if (!match) continue
    const [, row, column] = match
    if (!rows.has(row)) rows.set(row, new Map())
    rows.get(row).set(column.toUpperCase(), seat)
  }
  const columns = [...new Set([...rows.values()].flatMap(row => [...row.keys()]))].sort()
  return { columns, rows: [...rows.entries()].sort(([a], [b]) => Number(a) - Number(b)) }
}

export function SeatsPage() {
  const { bookingId } = useParams()
  return <SeatMap key={bookingId} bookingId={bookingId} />
}

function SeatMap({ bookingId }) {
  const { world, commit } = useStore()
  const booking = bookingFor(world, bookingId)
  const segments = seatSegments(world, booking)
  const passengers = list(booking?.passengers).filter(passenger => passenger.id)
  const [segmentId, setSegment] = useState('')
  const [passengerId, setPassenger] = useState('')
  const [selection, setSelection] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const segment = segments.find(item => item.id === segmentId) ?? segments[0]
  const passenger = passengers.find(item => item.id === passengerId) ?? passengers[0]

  if (!booking || !segment || !passenger) return <><Heading title="Seat selection unavailable" />
    <Empty title="There are no eligible flights for seat changes.">
      <AppLink to={booking ? tripPath(booking) : '/trips'}>{booking ? 'Back to trip' : 'Back to My trips'}</AppLink>
    </Empty></>

  const assigned = segment.seatAssignments?.[passenger.id] ?? null
  const { columns, rows } = cabinRows(segment.seats)
  const aisleIndex = Math.ceil(columns.length / 2)
  const grid = ['var(--seat-row-label)', ...columns.map((_, i) => (i === aisleIndex ? 'var(--seat-aisle) ' : '') + '44px')].join(' ')

  function resetSelection() {
    setSelection(null)
    setError('')
    setNotice('')
  }

  function confirm() {
    if (!selection) return
    const result = commit(current => changeSeat(current, {
      bookingId, segmentId: segment.id, passengerId: passenger.id, seatLabel: selection.label,
      previousSeat: assigned, fee: selection.fee, cabin: selection.cabin,
    }))
    if (result.error) return setError(result.error)
    resetSelection()
    setNotice('Seat ' + result.record.newSeat + ' confirmed for ' + (person(passenger) || 'this traveler') + '.')
  }

  return <>
    <AppLink className="back" to={tripPath(booking)}>← Trip details</AppLink>
    <Heading title="Change seats">Choose an available seat for each traveler and flight.</Heading>
    <section className="panel">
      <div className="form-grid two">
        <Field label="Flight segment"><select value={segment.id} onChange={event => { setSegment(event.target.value); resetSelection() }}>
          {segments.map(item => <option key={item.id} value={item.id}>{item.flightNumber || 'Flight'} · {routeTitle(item)} · {segmentDay(item)}</option>)}
        </select></Field>
        <Field label="Traveler"><select value={passenger.id} onChange={event => { setPassenger(event.target.value); resetSelection() }}>
          {passengers.map((item, i) => <option key={item.id} value={item.id}>{person(item) || 'Traveler ' + (i + 1)}</option>)}
        </select></Field>
      </div>
    </section>
    {notice && <div className="notice section-gap" role="status">{notice}</div>}
    <div className="content-split section-gap">
      <section className="panel">
        <h2>Seat map</h2>
        <p className="meta">{segment.cabin || 'Cabin'} · Front of aircraft at the top</p>
        <ul className="legend" aria-label="Seat map legend">
          {Object.entries({ available: 'Available', occupied: 'Occupied', assigned: 'Another traveler', current: 'Current seat', selected: 'Selected' }).map(([state, label]) =>
            <li key={state}><i className={state} aria-hidden="true" />{label}</li>)}
        </ul>
        {rows.length ? <div className="seat-scroll" role="region" aria-label="Cabin seating" tabIndex={0}>
          <div className="cabin-map" style={{ gridTemplateColumns: grid }}>
            <span />
            {columns.map((letter, i) => <span key={letter} className="column-label" style={{ gridColumn: i + (i >= aisleIndex ? 3 : 2) }}>{letter}</span>)}
            {rows.map(([row, seats], index) => <SeatRow key={row} row={row} gridRow={index + 2} columns={columns} aisleIndex={aisleIndex} seats={seats}
              segment={segment} passengerId={passenger.id} selection={selection} onSelect={seat => {
                setSelection(seat)
                setError('')
                setNotice('')
              }} />)}
          </div>
        </div> : <Empty title="Seat layout unavailable">Choose another flight segment if available.</Empty>}
      </section>
      <section className="panel sidebar-panel">
        <h2>Seat selection</h2>
        <dl className="payment">
          <div><dt>Current seat</dt><dd>{assigned || 'Unassigned'}</dd></div>
          {selection && <>
            <div><dt>New seat</dt><dd>{selection.label}</dd></div>
            <div><dt>Position</dt><dd className="capitalize">{selection.position || '—'}</dd></div>
            <div><dt>Cabin</dt><dd>{selection.cabin}</dd></div>
            <div className="payment-total"><dt>Seat fee</dt><dd>{money(selection.fee)}</dd></div>
          </>}
        </dl>
        {!selection && <p className="meta">Select an available seat to see its details.</p>}
        <ErrorMessage>{error}</ErrorMessage>
        {selection && <div className="actions"><button className="primary" onClick={confirm}>Confirm seat change</button><button className="secondary" onClick={resetSelection}>Clear selection</button></div>}
      </section>
    </div>
  </>
}

function SeatRow({ row, gridRow, columns, aisleIndex, seats, segment, passengerId, selection, onSelect }) {
  return <>
    <span className="row-label" style={{ gridRow }}>{row}</span>
    {columns.map((column, i) => {
      const seat = seats.get(column)
      if (!seat) return null
      const state = seatState(segment, passengerId, seat)
      const selected = state === 'available' && selection?.label === seat.label
      const label = selected ? 'Selected' : { current: 'Current seat', assigned: 'Assigned to another traveler', occupied: 'Occupied', available: 'Available' }[state]
      return <button type="button" key={seat.label} style={{ gridRow, gridColumn: i + (i >= aisleIndex ? 3 : 2) }}
        className={'seat ' + (selected ? 'selected' : state)} disabled={state !== 'available'}
        aria-pressed={state === 'available' ? selected : undefined}
        aria-label={[seat.label, seat.position || 'seat', label, state === 'available' ? money(seat.fee) : ''].filter(Boolean).join(' · ')}
        onClick={() => onSelect(seat)}>{selected ? '✓' : seat.label}</button>
    })}
  </>
}
