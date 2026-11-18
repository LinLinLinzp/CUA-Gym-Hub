
import React, { useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  AppLink, date, Dialog, Empty, ErrorMessage, Field, find, Heading, latest, matches, Metric,
  Missing, money, newId, records, replace, ResultCount, roundMoney, route,
  stamp, Status, storeName, useAccount, useAccountNavigate, validPrice,
} from '../shared.jsx'
import { durationOptions, rateKeys, rentalConflict } from '../eligibility.js'

const equipmentArt = ['floor', 'garden', 'power', 'moving']

function EquipmentArt({ imageKey }) {
  return <div className={'equipment-art ' + (equipmentArt.includes(imageKey) ? 'art-' + imageKey : '')} aria-hidden="true">
    {equipmentArt.includes(imageKey) && <i />}
  </div>
}

function Reserve({ tool, filteredStore, onClose }) {
  const { state, mutate } = useAccount()
  const navigate = useAccountNavigate()
  const available = records(state.stores).filter((store) => Array.isArray(tool.storeIds) && tool.storeIds.includes(store.id))
  const [storeId, setStoreId] = useState(available.find((store) => store.id === (filteredStore || state.account?.preferredStoreId))?.id || available[0]?.id || '')
  const [pickup, setPickup] = useState('')
  const [duration, setDuration] = useState(() => ['24', '4', '168'].find((value) => validPrice(tool.rates?.[rateKeys[value]])) || '')
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const rate = tool.rates?.[rateKeys[duration]]

  function validate(current) {
    const selected = find(current.rentalTools, tool.id)
    const store = find(current.stores, storeId)
    if (!store || !Array.isArray(selected?.storeIds) || !selected.storeIds.includes(store.id)) return 'Choose a pickup store that offers this tool.'
    const start = new Date(pickup)
    if (!Number.isFinite(start.valueOf()) || start <= new Date()) return 'Choose a pickup date and time in the future.'
    const rentalRate = Object.hasOwn(rateKeys, duration) ? selected.rates?.[rateKeys[duration]] : undefined
    if (!validPrice(rentalRate)) return 'Choose an available rental duration.'
    if (!validPrice(selected.depositAmount)) return 'Deposit information is unavailable for this tool.'
    if (rentalConflict(current, selected.id, store.id, start.toISOString(), Number(duration))) return 'This tool is already booked at that store during the selected time. Try another time or store.'
    return {
      toolId: selected.id, toolName: selected.name || 'Equipment', storeId: store.id, pickupAt: start.toISOString(),
      durationHours: Number(duration), quantity: 1, estimatedAmount: roundMoney(Number(rentalRate)),
      depositAmount: roundMoney(Number(selected.depositAmount)),
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!review) {
      const result = validate(state)
      setError(typeof result === 'string' ? result : '')
      setReview(typeof result !== 'string')
      return
    }
    const id = newId('rental')
    const problem = await mutate((current) => {
      const result = validate(current)
      if (typeof result === 'string') return result
      return { ...current, rentals: [...(current.rentals ?? []), { id, ...result, status: 'reserved', ...stamp(current) }] }
    })
    setError(problem)
    if (!problem) {
      onClose()
      navigate(route('/rentals', id), { state: { notice: 'Reservation confirmed.' } })
    }
  }

  return <Dialog title={(review ? 'Review reservation' : 'Reserve equipment') + ' · ' + (tool.name || 'Equipment')} onClose={onClose}>
    <form className="form-flow" noValidate onSubmit={submit}>
      {review ? <dl className="metrics">
        <Metric title="Pickup store">{storeName(state, storeId)}</Metric><Metric title="Pickup time">{date(pickup, true)}</Metric>
        <Metric title="Duration">{durationOptions[duration]}</Metric>
      </dl> : <>
        <Field label="Pickup store"><select value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
          <option value="">Choose a store</option>{available.map((store) => <option key={store.id} value={store.id}>{store.name || store.id}</option>)}
        </select></Field>
        <Field label="Pickup date and time"><input type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} required /></Field>
        <Field label="Duration"><select value={duration} onChange={(e) => setDuration(e.target.value)}>
          {Object.entries(durationOptions).map(([value, name]) => <option key={value} value={value}
            disabled={!validPrice(tool.rates?.[rateKeys[value]])}>{name}</option>)}
        </select></Field>
      </>}
      <dl className="metrics inset"><Metric title="Estimated rental">{money(rate)}</Metric><Metric title="Separate deposit">{money(tool.depositAmount)}</Metric></dl>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions">
        <button type="button" className="secondary" onClick={review ? () => { setReview(false); setError('') } : onClose}>{review ? 'Edit pickup details' : 'Close'}</button>
        <button type="submit" className="primary">{review ? 'Confirm reservation' : 'Review reservation'}</button>
      </div>
    </form>
  </Dialog>
}

export function Rentals() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const reservations = params.get('view') === 'reservations'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [store, setStore] = useState('')
  const [reserve, setReserve] = useState(null)
  const tools = records(state.rentalTools)
  const categories = [...new Set(tools.map((tool) => tool.category).filter(Boolean))].sort()
  const filtered = tools.filter((tool) => matches(search, tool.name, tool.category) && (!category || tool.category === category) &&
    (!store || (Array.isArray(tool.storeIds) && tool.storeIds.includes(store))))
  const bookings = latest(state.rentals)

  return <div className="flow">
    <Heading title="Tool Rental" intro="Find equipment for your project and manage your pickup reservations." />
    <nav className="subnav" aria-label="Tool Rental views">
      <AppLink to="/rentals" aria-current={!reservations ? 'page' : undefined}>Equipment</AppLink>
      <AppLink to="/rentals?view=reservations" aria-current={reservations ? 'page' : undefined}>My Reservations</AppLink>
    </nav>
    {reservations ? <>
      <ResultCount count={bookings.length} singular="reservation" />
      {bookings.length ? <ul className="panel rows">{bookings.map((booking) => <li className="record-row order-row" key={booking.id}>
        <div><AppLink to={route('/rentals', booking.id)}>{booking.toolName || find(state.rentalTools, booking.toolId)?.name || 'Equipment reservation'}</AppLink><small>{booking.id}</small></div>
        <div><small>Pickup</small>{date(booking.pickupAt, true)}</div>
        <div><small>Store</small>{storeName(state, booking.storeId)}</div>
        <Status value={booking.status} />
        <AppLink className="row-arrow" aria-label={'Manage ' + booking.id} to={route('/rentals', booking.id)}>→</AppLink>
      </li>)}</ul> : <Empty title="No reservations yet"><AppLink to="/rentals">Browse equipment</AppLink></Empty>}
    </> : <>
      <div className="panel filters three">
        <Field label="Search equipment"><input type="search" placeholder="Tool name or category" value={search} onChange={(e) => setSearch(e.target.value)} /></Field>
        <Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>
          {categories.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Pickup store"><select value={store} onChange={(e) => setStore(e.target.value)}><option value="">All stores</option>
          {records(state.stores).map((location) => <option key={location.id} value={location.id}>{location.name || location.id}</option>)}</select></Field>
      </div>
      <ResultCount count={filtered.length} singular="tool" reset={(search || category || store) ? () => { setSearch(''); setCategory(''); setStore('') } : undefined} />
      {filtered.length ? <div className="card-grid">{filtered.map((tool) => {
        const locations = records(state.stores).filter((location) => Array.isArray(tool.storeIds) && tool.storeIds.includes(location.id))
        const bookable = locations.length > 0 && validPrice(tool.depositAmount) && Object.values(rateKeys).some((key) => validPrice(tool.rates?.[key]))
        return <article className="panel catalog-card" key={tool.id}>
          <EquipmentArt imageKey={tool.imageKey} />
          <div className="card-body">
            <small>{tool.category || 'Equipment'}</small><h2>{tool.name || 'Equipment'}</h2>
            <p className="card-rate">{validPrice(tool.rates?.daily) ? <><strong>{money(tool.rates.daily)}</strong> / day</> : 'Daily rate unavailable'}</p>
            <small>{locations.map(({ name, id }) => name || id).join(' · ') || 'Pickup availability unavailable'}</small>
            <button className="secondary" disabled={!bookable} onClick={() => setReserve(tool.id)}>{bookable ? 'Reserve' : 'Unavailable'}</button>
          </div>
        </article>
      })}</div> : <Empty title="No equipment found"><p>Try another search, category or store.</p></Empty>}
    </>}
    {reserve && find(state.rentalTools, reserve) && <Reserve tool={find(state.rentalTools, reserve)} filteredStore={store} onClose={() => setReserve(null)} />}
  </div>
}

export function RentalDetail() {
  const { rentalId } = useParams()
  const { state, mutate } = useAccount()
  const { state: screenState } = useLocation()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState(screenState?.notice || '')
  const [error, setError] = useState('')
  const booking = find(state.rentals, rentalId)
  if (!booking) return <Missing title="Reservation unavailable" to="/rentals?view=reservations" link="Back to My Reservations" />
  const name = booking.toolName || find(state.rentalTools, booking.toolId)?.name || 'Equipment reservation'

  async function cancel() {
    const problem = await mutate((current) => {
      if (find(current.rentals, rentalId)?.status !== 'reserved') return 'This reservation can no longer be cancelled.'
      return { ...current, rentals: replace(current.rentals, rentalId, (record) => ({
        ...record, status: 'cancelled', cancellation: stamp(current),
      })) }
    })
    setError(problem)
    if (!problem) { setOpen(false); setNotice('Reservation cancelled.') }
  }

  return <div className="flow">
    <Heading title={name} intro={booking.id} back={{ to: '/rentals?view=reservations', label: 'My Reservations' }}
      action={<Status value={booking.status} />} />
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="detail-grid">
      <section className="panel pad"><h2>Pickup details</h2><dl className="metrics">
        <Metric title="Store">{storeName(state, booking.storeId)}</Metric>
        <Metric title="Address">{find(state.stores, booking.storeId)?.address || 'Unavailable'}</Metric>
        <Metric title="Pickup time">{date(booking.pickupAt, true)}</Metric>
        <Metric title="Duration">{durationOptions[booking.durationHours] || (booking.durationHours ? booking.durationHours + ' hours' : 'Unavailable')}</Metric>
        <Metric title="Quantity">{booking.quantity ?? '—'}</Metric>
        {booking.cancellation && <Metric title="Cancelled">{date(booking.cancellation.createdAt)}</Metric>}
      </dl></section>
      <section className="panel pad"><h2>Rental estimate</h2><dl className="metrics">
        <Metric title="Estimated rental">{money(booking.estimatedAmount)}</Metric><Metric title="Separate deposit">{money(booking.depositAmount)}</Metric>
      </dl>{booking.status === 'reserved' && <button className="secondary" onClick={() => { setError(''); setOpen(true) }}>Cancel reservation</button>}</section>
    </div>
    {open && <Dialog title={'Cancel reservation for ' + name + '?'} onClose={() => setOpen(false)}>
      <p>Reservation {booking.id} will be cancelled and the pickup slot will be released.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="secondary" onClick={() => setOpen(false)}>Keep reservation</button>
        <button className="danger" onClick={cancel}>Confirm cancellation</button></div>
    </Dialog>}
  </div>
}
