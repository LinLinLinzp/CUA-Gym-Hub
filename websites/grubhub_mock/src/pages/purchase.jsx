import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccountLink, CuisineTile, Empty, Glyph, Modal, PageHeading, useAccountNavigate } from '../components/ui'
import { Totals } from '../components/detail'
import { labelSlots, SlotPicker } from '../components/schedule'
import { availableDays } from '../data/scheduling'
import { addressLine, list, money, orderHref, paymentLabel, restaurantFor, restaurantHref, searchable, timingPath } from '../data/format'
import { addItem, changeQuantity, checkoutDetails, menuAvailable, placeOrder } from '../data/transactions'
import { useAccount } from '../store'

function useSchedulingMode() {
  const [params] = useSearchParams()
  return params.get('timing') === 'scheduled'
}

export function Restaurants() {
  const { state } = useAccount()
  const scheduled = useSchedulingMode()
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(12)
  const dishes = useMemo(() => {
    const grouped = new Map()
    for (const item of list(state.menuItems)) {
      const names = grouped.get(item.restaurantId) || []
      names.push(item.name)
      grouped.set(item.restaurantId, names)
    }
    return grouped
  }, [state.menuItems])
  const restaurants = list(state.restaurants).filter(restaurant => restaurant.id)
  const query = search.trim().toLowerCase()
  const filtered = restaurants.filter(restaurant => searchable(restaurant.name, restaurant.cuisine, restaurant.neighborhood, ...(dishes.get(restaurant.id) || [])).includes(query))

  return (
    <>
      <PageHeading title="Browse restaurants" description={scheduled ? 'Choose a restaurant to start a scheduled order.' : 'Find a neighborhood restaurant or search for a dish.'} />
      <div className="stack">
        <label className="search-field"><span className="sr-only">Search restaurants</span><Glyph name="search" /><input type="search" placeholder="Search restaurant, cuisine, or dish" value={search} onChange={event => { setSearch(event.target.value); setLimit(12) }} /></label>
        <p className="meta" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'restaurant' : 'restaurants'}</p>
        {filtered.length ? (
          <div className="catalog-grid">
            {filtered.slice(0, limit).map(restaurant => (
              <article key={restaurant.id} className="card catalog-card">
                <CuisineTile kind={restaurant.tile} banner />
                <div className="catalog-content">
                  <h2>{restaurant.name || 'Restaurant'}</h2>
                  <p className="meta">{[restaurant.cuisine, restaurant.neighborhood].filter(Boolean).join(' · ')}</p>
                  <div className="catalog-bottom"><AccountLink className="inline-action" to={timingPath(restaurantHref(restaurant.id), scheduled)}>View menu <Glyph name="arrow" /></AccountLink>{restaurant.deliveryFee != null && <span className="meta">{money(restaurant.deliveryFee)} delivery</span>}</div>
                </div>
              </article>
            ))}
          </div>
        ) : restaurants.length
          ? <Empty title="No matching restaurants" action={<button className="button" onClick={() => setSearch('')}>Clear search</button>}>Try another dish or cuisine.</Empty>
          : <Empty title="No restaurants available" action={<AccountLink className="button" to="/orders">Back to orders</AccountLink>} />}
        {filtered.length > limit && <button className="button more" onClick={() => setLimit(value => value + 12)}>Show more restaurants</button>}
      </div>
    </>
  )
}

export function RestaurantMenu() {
  const { restaurantId } = useParams()
  return <Menu key={restaurantId} restaurantId={restaurantId} />
}

function Menu({ restaurantId }) {
  const { state, commit } = useAccount()
  const scheduled = useSchedulingMode()
  const [pending, setPending] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const restaurant = restaurantFor(state, restaurantId)
  const back = { to: timingPath('/restaurants', scheduled), label: 'Back to restaurants' }
  const items = list(state.menuItems).filter(item => item.restaurantId === restaurantId)
  const categories = [...new Set(items.map(item => item.category || 'Menu items'))]
  const bag = checkoutDetails(state)
  const currentBagName = bag.restaurant?.name || 'another restaurant'
  const ownItems = state.cart?.restaurantId === restaurantId ? bag.items : []

  function add(item, replace = false) {
    const result = commit(current => addItem(current, restaurantId, item.id, replace))
    if (result.confirm) {
      setPending(item)
      setFeedback(null)
    } else if (result.error) setFeedback({ error: result.error })
    else {
      setPending(null)
      setFeedback({ message: `Added ${item.name || 'item'} to your bag.` })
    }
  }

  if (!restaurant) return <><PageHeading title="Restaurant unavailable" back={back} /><Empty title="Menu unavailable">Browse the catalog to find another restaurant.</Empty></>

  return (
    <>
      <PageHeading title={restaurant.name || 'Restaurant menu'} back={back}
        description={[restaurant.cuisine, restaurant.neighborhood].filter(Boolean).join(' · ')}
        action={bag.items.length > 0 && <AccountLink className="button primary" to={timingPath('/bag', scheduled)}>View bag <Glyph name="arrow" /></AccountLink>} />
      <div className="stack">
        <CuisineTile kind={restaurant.tile} banner />
        <div aria-live="polite" className={feedback ? feedback.error ? 'error' : 'notice' : 'sr-only'}>{feedback?.error || feedback?.message}</div>
        {!items.length && <Empty title="No menu items available" action={<AccountLink className="button" to={back.to}>Browse restaurants</AccountLink>} />}
        {categories.map(category => (
          <section className="card" key={category}>
            <h2>{category}</h2>
            <ul className="menu-list">
              {items.filter(item => (item.category || 'Menu items') === category).map((item, index) => {
                const count = ownItems.find(line => line.menuItemId === item.id)?.quantity
                return (
                  <li key={item.id || index}>
                    <div><h3>{item.name || 'Menu item'}</h3>{item.description && <p className="meta">{item.description}</p>}<p className="meta">{money(item.unitPrice)}{count > 0 && ` · ${count} in bag`}</p></div>
                    <button className="button" disabled={!menuAvailable(item, restaurantId)} aria-label={menuAvailable(item, restaurantId) ? `Add ${item.name || 'menu item'}` : undefined} onClick={() => add(item)}>{menuAvailable(item, restaurantId) ? 'Add' : 'Unavailable'}</button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      {pending && (
        <Modal title="Replace your bag?" onClose={() => setPending(null)}>
          <div className="stack">
            <p>Your bag contains items from {currentBagName}. Replace them with {pending.name || 'this item'}?</p>
            {feedback?.error && <p className="error" role="alert">{feedback.error}</p>}
            <div className="actions"><button className="button" onClick={() => setPending(null)}>Keep current bag</button><button className="button primary" onClick={() => add(pending, true)}>Replace bag</button></div>
          </div>
        </Modal>
      )}
    </>
  )
}

export function Bag() {
  const { state, commit } = useAccount()
  const scheduled = useSchedulingMode()
  const [error, setError] = useState('')
  const { restaurant, items, totals, valid } = checkoutDetails(state)
  const browse = timingPath('/restaurants', scheduled)
  const menuLink = restaurant ? timingPath(restaurantHref(restaurant.id), scheduled) : browse

  function change(item, delta, remove = false) {
    const result = commit(current => changeQuantity(current, item.menuItemId, delta, remove))
    setError(result.error || '')
  }

  return (
    <>
      <PageHeading title="Your bag" back={{ to: menuLink, label: restaurant ? 'Back to menu' : 'Back to restaurants' }} />
      {!items.length ? <Empty title="Your bag is empty" action={<AccountLink className="button primary" to={browse}>Browse restaurants</AccountLink>}>Add a dish to start an order.</Empty> : (
        <div className="split">
          <section className="card">
            <h2>{restaurant?.name || 'Restaurant unavailable'}</h2>
            {state.cart.sourceOrderId && <p className="meta">Reorder from <AccountLink to={orderHref(state.cart.sourceOrderId)}>#{state.cart.sourceOrderId}</AccountLink></p>}
            <ul className="menu-list">
              {items.map((item, index) => (
                <li key={item.menuItemId || index}>
                  <div><h3>{item.name || 'Menu item'}</h3><p className="meta">{money(item.unitPrice)} each</p></div>
                  <div className="bag-line-controls">
                    <div className="stepper" role="group" aria-label={`Quantity for ${item.name || 'item'}`}>
                      <button type="button" aria-label={`Decrease quantity for ${item.name || 'item'}`} onClick={() => change(item, -1)}>−</button>
                      <span>{item.quantity ?? '—'}</span>
                      <button type="button" aria-label={`Increase quantity for ${item.name || 'item'}`} onClick={() => change(item, 1)}>+</button>
                    </div>
                    <button className="text-button" type="button" aria-label={`Remove ${item.name || 'item'}`} onClick={() => change(item, -1, true)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            {(error || !valid) && <p className="error" role="alert">{error || 'Some items are unavailable. Remove them before checkout.'}</p>}
          </section>
          <Totals totals={totals} title="Bag total">
            {valid && <AccountLink className="button primary" to={timingPath('/checkout', scheduled)}>Checkout <Glyph name="arrow" /></AccountLink>}
          </Totals>
        </div>
      )}
    </>
  )
}

export function Checkout() {
  const { state, commit } = useAccount()
  const [params, setParams] = useSearchParams()
  const later = params.get('timing') === 'scheduled'
  const timing = later ? 'scheduled' : 'asap'
  const navigate = useAccountNavigate()
  const { restaurant, totals, items, valid } = checkoutDetails(state)
  const addresses = list(state.account?.addresses).filter(address => address.id && address.street)
  const payments = list(state.account?.paymentMethods).filter(payment => payment.id && payment.last4)
  const [addressId, setAddressId] = useState(() => addresses.find(address => address.id === state.account?.defaultAddressId)?.id || addresses[0]?.id || '')
  const [paymentId, setPaymentId] = useState(() => payments.find(payment => payment.id === state.account?.defaultPaymentId)?.id || payments[0]?.id || '')
  const [date, setDate] = useState('')
  const [windowStartAt, setWindowStartAt] = useState('')
  const [error, setError] = useState('')
  const days = later ? labelSlots(availableDays(restaurant), restaurant?.timeZone) : []
  const back = { to: timingPath('/bag', later), label: 'Back to bag' }

  function changeTiming(scheduled) {
    const next = new URLSearchParams(params)
    if (scheduled) next.set('timing', 'scheduled')
    else next.delete('timing')
    setParams(next, { replace: true })
    setError('')
  }

  function submit(event) {
    event.preventDefault()
    const result = commit(current => placeOrder(current, { addressId, paymentId, timing, windowStartAt }))
    if (result.error) setError(result.error)
    else navigate(orderHref(result.id), { replace: true, state: { notice: later ? 'Scheduled order placed' : 'Order placed' } })
  }

  if (!valid) return <><PageHeading title="Checkout" back={back} /><Empty title={items.length ? 'Review your bag' : 'Your bag is empty'} action={<AccountLink className="button primary" to={items.length ? back.to : timingPath('/restaurants', later)}>{items.length ? 'Back to bag' : 'Browse restaurants'}</AccountLink>} /></>

  return (
    <>
      <PageHeading title="Checkout" back={back} description={restaurant.name} />
      <form className="split" onSubmit={submit}>
        <div className="stack">
          <section className="card stack">
            <h2>Delivery details</h2>
            <label className="field">Delivery address<select value={addressId} required onChange={event => setAddressId(event.target.value)}><option value="">Choose a saved address</option>{addresses.map(address => <option key={address.id} value={address.id}>{address.label ? `${address.label} · ` : ''}{addressLine(address)}</option>)}</select></label>
            <label className="field">Payment method<select value={paymentId} required onChange={event => setPaymentId(event.target.value)}><option value="">Choose a saved card</option>{payments.map(payment => <option key={payment.id} value={payment.id}>{paymentLabel(payment)}</option>)}</select></label>
            {(!addresses.length || !payments.length) && <p className="error">A saved delivery address and payment method are required.</p>}
          </section>
          <section className="card stack">
            <h2>Delivery time</h2>
            <fieldset className="field-group">
              <legend className="sr-only">Delivery time</legend>
              <div className="mode-options">
                <label className="choice"><input type="radio" name="timing" checked={!later} onChange={() => changeTiming(false)} /> ASAP</label>
                <label className="choice"><input type="radio" name="timing" checked={later} onChange={() => changeTiming(true)} /> Schedule for later</label>
              </div>
            </fieldset>
            {later && <SlotPicker days={days} date={date} start={windowStartAt} onDateChange={value => { setDate(value); setWindowStartAt(''); setError('') }} onStartChange={value => { setWindowStartAt(value); setError('') }} />}
          </section>
        </div>
        <Totals totals={totals}>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button primary" type="submit" disabled={!addresses.length || !payments.length || later && !days.some(day => day.windows.length)}>{later ? 'Place scheduled order' : 'Place order'}</button>
        </Totals>
      </form>
    </>
  )
}
