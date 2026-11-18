import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { useStore } from '../context/Store.jsx'
import { changeHold, dateStripLabel, slotAvailability, storeDate, windowLabel, windowTime } from '../data/pickup.js'
import { array, find, heldReservation, orderFor, preferredStore, time, validHold } from '../data/model.js'
import { canRescheduleOrder, orderPath, rescheduleOrder } from '../data/orders.js'
import { Back, Badge, ButtonLink, Empty, Feedback, Field, Missing, money } from '../components/UI.jsx'
import { routeWith, useSiteNavigate } from '../utils/navigation.jsx'

export function PickupPanel({ back = 'cart' }) {
  const { state, commit } = useStore()
  const [feedback, setFeedback] = useState(null)
  const hold = heldReservation(state)
  const valid = validHold(state)
  const store = find(state.stores, hold?.storeId) || preferredStore(state)
  const slot = find(state.pickupSlots, hold?.slotId)
  return <section className="pickup-panel stack small-gap" aria-label="Pickup reservation">
    <h3 className="with-icon"><MapPin size={18} aria-hidden="true" />{store?.name || 'Pickup store'}</h3>
    {hold ? <>
      <p>{windowLabel(slot, store?.timezone)}</p>
      {valid ? <p className="small muted">Held until {windowTime({ startAt: hold.expiresAt }, store?.timezone)} · {money(hold.fee)} window fee</p> : <p><Badge status="expired" /></p>}
    </> : <p className="small muted">Reserve a pickup window before placing your order.</p>}
    <div className="actions">
      <ButtonLink kind="secondary" to={routeWith('/pickup/reserve', { from: back })}>{hold ? 'Change' : 'Reserve a time'}</ButtonLink>
      {state.cart?.pickupReservationId && <button className="text-button" onClick={() => {
        const result = commit(changeHold, { release: true })
        setFeedback(result.error ? { error: result.error } : { message: 'Pickup reservation released.' })
      }}>Release</button>}
    </div>
    <Feedback success={!feedback?.error}>{feedback?.error || feedback?.message}</Feedback>
  </section>
}

export function PickupPage() {
  const { state, commit } = useStore()
  const [params] = useSearchParams()
  const navigate = useSiteNavigate()
  const orderId = params.get('orderId')
  if (orderId) {
    const order = orderFor(state, orderId)
    if (!order) return <Missing name="Order" to="/account/purchase-history" action="Back to purchase history" />
    const back = orderPath(order)
    if (!canRescheduleOrder(order)) return <Empty title="Pickup can’t be rescheduled" to={back} action="Back to order">This pickup order is outside its editing window or already rescheduled.</Empty>
    const oldFee = find(state.pickupReservations, order.pickupReservationId)?.fee ?? find(state.pickupSlots, order.slotId)?.fee ?? 0
    return <PickupPicker key={orderId} back={back} backLabel="Back to order" defaultStore={order.storeId} currentSlotId={order.slotId}
      previousFee={oldFee} lockedStore submit={selection => {
        const result = commit(rescheduleOrder, { ...selection, orderId })
        if (result.state) navigate(back)
        return result
      }} />
  }
  const back = params.get('from') === 'checkout' ? '/checkout?mode=pickup' : '/cart'
  const hold = validHold(state)
  const defaultStore = hold?.storeId || preferredStore(state)?.id
  return <PickupPicker
    key="cart-pickup" back={back} backLabel={params.get('from') === 'checkout' ? 'Back to checkout' : 'Back to cart'}
    defaultStore={defaultStore} currentSlotId={hold?.slotId}
    excludeReservationId={hold?.id}
    submit={selection => {
      const result = commit(changeHold, selection)
      if (result.state) navigate(back)
      return result
    }} />
}

export function PickupPicker({ back, backLabel, defaultStore, currentSlotId, excludeReservationId, lockedStore, previousFee, submit }) {
  const { state } = useStore()
  const stores = array(state.stores).filter(store => store.pickupEnabled)
  const [chosenStore, setChosenStore] = useState(defaultStore || '')
  const store = find(stores, chosenStore) || (!lockedStore ? stores[0] : undefined)
  const now = new Date()
  const slots = array(state.pickupSlots).filter(slot => slot.storeId === store?.id && storeDate(slot.startAt, store?.timezone))
    .sort((a, b) => time(a.startAt) - time(b.startAt) || String(a.id).localeCompare(String(b.id)))
  const dates = [...new Set(slots.map(slot => storeDate(slot.startAt, store?.timezone)))]
  const [chosenDate, setDate] = useState('')
  const date = dates.includes(chosenDate) ? chosenDate : dates.find(value => value >= storeDate(now, store?.timezone)) || dates.at(-1)
  const daily = slots.filter(slot => storeDate(slot.startAt, store?.timezone) === date)
  const [slotId, setSlotId] = useState('')
  const [error, setError] = useState('')
  const choice = find(daily, slotId)
  const statusFor = slot => {
    if (slot.id === currentSlotId) return 'Current reservation'
    if (slot.enabled === false) return 'Unavailable'
    if (time(slot.startAt) <= +now) return 'Window has passed'
    if (!slotAvailability(state, slot, now, excludeReservationId)) return 'Full'
    return ''
  }
  const ready = choice && !statusFor(choice)
  return <div className="stack picker">
    <Back to={back}>{backLabel}</Back>
    <h1>{lockedStore ? 'Reschedule pickup' : 'Reserve a time'}</h1>
    {store ? <form className="panel stack" onSubmit={event => {
      event.preventDefault()
      if (!ready) return
      const result = submit({ storeId: store.id, slotId: choice.id })
      setError(result.error || '')
    }}>
      {lockedStore ? <p className="with-icon"><MapPin size={18} aria-hidden="true" />{store.name}</p> : <Field label="Pickup store"><select value={store.id} onChange={event => {
        setChosenStore(event.target.value); setDate(''); setSlotId(''); setError('')
      }}>{stores.map(option => <option key={option.id} value={option.id}>{option.name || 'Pickup store'}</option>)}</select></Field>}
      <p className="small muted">{[store.address?.line1, store.address?.city, store.address?.region].filter(Boolean).join(', ')}</p>
      <h2 className="with-icon"><CalendarDays size={20} aria-hidden="true" />Choose a date</h2>
      {dates.length > 0 && <div className="date-strip" role="group" aria-label="Pickup date">
        {dates.map(value => <button type="button" className="date-button" key={value} aria-pressed={date === value} onClick={() => {
          setDate(value); setSlotId(''); setError('')
        }}><strong>{dateStripLabel(value, store.timezone, now)}</strong><span>{Number(value.slice(5, 7))}/{Number(value.slice(8, 10))}</span></button>)}
      </div>}
      <h2>Choose a window</h2>
      {!daily.some(slot => !statusFor(slot)) && <p className="muted">No available pickup slots for this date.</p>}
      <div className="slot-grid">
        {daily.map(slot => {
          const status = statusFor(slot)
          return <label className="slot-option" key={slot.id}>
            <input type="radio" name="pickup-slot" value={slot.id} disabled={Boolean(status)} checked={slotId === slot.id} onChange={() => { setSlotId(slot.id); setError('') }} />
            <span><strong>{windowTime(slot, store.timezone)}</strong>{status && <small>{status}</small>}</span>
            <span>{money(slot.fee)}</span>
          </label>
        })}
      </div>
      {ready && <div className="pickup-panel">
        <strong>{windowLabel(choice, store.timezone)}</strong>
        <p className="small muted">{previousFee === undefined ? `${money(choice.fee)} window fee` : `Window fee changes from ${money(previousFee)} to ${money(choice.fee)}.`}</p>
      </div>}
      <Feedback>{error}</Feedback>
      <div className="actions"><button className="button primary" disabled={!ready}>{lockedStore ? 'Save changes' : 'Reserve'}</button></div>
    </form> : <Empty title="No pickup stores available" to={back} action={backLabel} />}
  </div>
}
