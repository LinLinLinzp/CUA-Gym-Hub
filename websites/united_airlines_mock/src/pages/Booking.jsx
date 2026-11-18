import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { credits, eligibleCredit, list, uid } from '../data/account.js'
import { isDay, localDay } from '../data/dates.js'
import { cashFare, confirmBooking, matchingFlights, quoteBooking } from '../data/booking.js'
import { AppLink, Dialog, Empty, ErrorMessage, Field, Heading, count, money, routeTitle, segmentDay, time, tripPath } from '../ui.jsx'

export function PaymentDetails({ payment }) {
  return <dl className="payment">
    {payment.method === 'miles'
      ? <div><dt>Award miles</dt><dd>{count(payment.milesUsed)} miles</dd></div>
      : <div><dt>Base fare</dt><dd>{money(payment.baseFare)}</dd></div>}
    <div><dt>Taxes and fees</dt><dd>{money(payment.taxes)}</dd></div>
    {payment.creditAmount > 0 && <>
      <div><dt>Booking total</dt><dd>{money(payment.totalAmount)}</dd></div>
      <div><dt>Travel credit applied</dt><dd>−{money(payment.creditAmount)}</dd></div>
    </>}
    <div className="payment-total"><dt>Cash total</dt><dd>{money(payment.cashAmount)}</dd></div>
  </dl>
}

function FlightResults({ label, options, selected, onSelect, mode, travelers }) {
  return <fieldset className="flight-results">
    <legend>{label}</legend>
    {options.length ? options.map(flight => <label className="flight-option" key={flight.id}>
      <input type="radio" name={label} checked={selected === flight.id} onChange={() => onSelect(flight.id)} />
      <div><strong>{flight.origin?.code} {flight.departureLocalTime} <span aria-hidden="true">→</span> {flight.destination?.code} {flight.arrivalLocalTime}{flight.arrivalDayOffset > 0 && <sup>+{flight.arrivalDayOffset}</sup>}</strong>
        <small>{flight.flightNumber} · {flight.fareClass || flight.cabin}</small></div>
      <div className="flight-price"><strong>{mode === 'miles' ? count(flight.milesFare * travelers) + ' miles' : money(Math.round(cashFare(flight) * 100) * travelers / 100)}</strong>
        <small>{mode === 'miles' ? '+ ' + money(Math.round(flight.taxes * 100) * travelers / 100) + ' taxes' : 'Including taxes'}</small></div>
    </label>) : <Empty title="No matching flights">Choose another route or date and search again.</Empty>}
  </fieldset>
}

export function BookingPage() {
  const { search } = useLocation()
  return <BookingForm key={search} params={new URLSearchParams(search)} />
}

function BookingForm({ params }) {
  const { world, commit } = useStore()
  const [form, setForm] = useState({
    origin: '', destination: '', departure: '', returnDate: '', travelers: '1',
    mode: params.get('credit') ? 'cash_and_credit' : params.get('mode') === 'miles' ? 'miles' : 'cash',
  })
  const [search, setSearch] = useState(null)
  const [outboundId, setOutbound] = useState('')
  const [returnId, setReturn] = useState('')
  const [travelers, setTravelers] = useState([])
  const [creditId, setCredit] = useState(params.get('credit') ?? '')
  const [error, setError] = useState('')
  const [review, setReview] = useState(null)
  const [reviewError, setReviewError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const settled = useRef(false)
  const results = useRef(null)
  const airports = [...new Map(list(world.flightOptions).flatMap(flight => [flight.origin, flight.destination])
    .filter(airport => airport?.code).map(airport => [airport.code, airport])).values()].sort((a, b) => a.code.localeCompare(b.code))
  const wallet = credits(world).filter(credit => eligibleCredit(world, credit))
  const today = localDay()
  const airportOptions = airports.map(airport => <option key={airport.code} value={airport.code}>{airport.city || airport.code} ({airport.code})</option>)
  const update = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    setSearch(null)
    setError('')
  }

  function searchFlights(event) {
    event.preventDefault()
    if (form.origin === form.destination) return setError('Choose a destination different from your origin.')
    if (!isDay(form.departure) || form.departure < today || (form.returnDate && (!isDay(form.returnDate) || form.returnDate < form.departure))) return setError('Choose a valid departure and return date.')
    const next = { ...form, travelers: Number(form.travelers) }
    setSearch(next)
    setOutbound('')
    setReturn('')
    setTravelers(previous => Array.from({ length: next.travelers }, (_, index) => previous[index] ?? {
      firstName: index ? '' : world.account?.firstName ?? '', lastName: index ? '' : world.account?.lastName ?? '',
    }))
    setError('')
    requestAnimationFrame(() => results.current?.focus())
  }

  function reviewBooking(event) {
    event.preventDefault()
    const draft = { search, outboundId, returnId, travelers, mode: search.mode, creditId }
    const quote = quoteBooking(world, draft)
    if (quote.error) return setError(quote.error)
    setError('')
    setReviewError('')
    settled.current = false
    setReview({ draft, quote, id: uid('bkg') })
  }

  function book() {
    if (settled.current) return
    const result = commit(current => confirmBooking(current, review.draft, review.quote, review.id))
    if (result.error) return setReviewError(result.error)
    settled.current = true
    setReview(null)
    setReceipt(result.booking)
    window.scrollTo(0, 0)
  }

  if (receipt) return <>
    <Heading title="Booking confirmed">Your itinerary has been added to My trips.</Heading>
    <section className="panel receipt" role="status">
      <h2>{routeTitle(receipt.segments[0])}</h2><p>Confirmation <strong>{receipt.confirmationCode}</strong></p>
      <p>Cash total {money(receipt.payment.cashAmount)}{receipt.payment.milesUsed > 0 && ' · ' + count(receipt.payment.milesUsed) + ' miles used'}</p>
      <AppLink className="button primary" to={tripPath(receipt)}>View trip</AppLink>
    </section>
  </>

  const outbound = search ? matchingFlights(world, search.origin, search.destination, search.departure, search.travelers, search.mode) : []
  const inbound = search?.returnDate ? matchingFlights(world, search.destination, search.origin, search.returnDate, search.travelers, search.mode) : []
  const selectedCredit = wallet.find(credit => credit.id === creditId)
  return <>
    <Heading title="Book a flight">Search schedules, select your flights and review your total.</Heading>
    <section className="panel">
      <h2>Flight search</h2>
      <form onSubmit={searchFlights}>
        <div className="form-grid">
          <Field label="Origin"><select name="origin" required value={form.origin} onChange={update}><option value="">Select an airport</option>{airportOptions}</select></Field>
          <Field label="Destination"><select name="destination" required value={form.destination} onChange={update}><option value="">Select an airport</option>{airportOptions}</select></Field>
          <Field label="Departure date"><input type="date" name="departure" required min={today} value={form.departure} onChange={update} /></Field>
          <Field label="Return date (optional)"><input type="date" name="returnDate" min={form.departure || today} value={form.returnDate} onChange={update} /></Field>
          <Field label="Travelers"><select name="travelers" value={form.travelers} onChange={update}>{[1, 2, 3, 4].map(i => <option key={i}>{i}</option>)}</select></Field>
          <Field label="Payment method"><select name="mode" value={form.mode} onChange={update}><option value="cash">Cash</option><option value="miles">Book with miles</option><option value="cash_and_credit">Cash with travel credit</option></select></Field>
        </div>
        {form.mode === 'miles' && <p className="meta">{count(world.mileagePlus?.awardMiles)} award miles available</p>}
        {form.mode === 'cash_and_credit' && selectedCredit && <p className="meta">Selected credit {selectedCredit.code || selectedCredit.id} · {money(selectedCredit.remainingAmount)} available</p>}
        {!airports.length && <p>Flight schedules are currently unavailable.</p>}
        {!search && <ErrorMessage>{error}</ErrorMessage>}
        <button className="primary" disabled={!airports.length}>Search flights</button>
      </form>
    </section>
    {search && <section className="panel section-gap" ref={results} tabIndex={-1}>
      <h2>Flight results</h2>
      <FlightResults label="Outbound flight" options={outbound} selected={outboundId} onSelect={setOutbound} mode={search.mode} travelers={search.travelers} />
      {search.returnDate && <FlightResults label="Return flight" options={inbound} selected={returnId} onSelect={setReturn} mode={search.mode} travelers={search.travelers} />}
      {outboundId && (!search.returnDate || returnId) && <form className="travelers" onSubmit={reviewBooking}>
        <h2>Traveler details</h2>
        {travelers.map((traveler, index) => <fieldset key={index}><legend>Traveler {index + 1}</legend><div className="form-grid two">
          {['firstName', 'lastName'].map(field => <Field label={(field === 'firstName' ? 'First name' : 'Last name') + ' · Traveler ' + (index + 1)} key={field}>
            <input required maxLength={80} value={traveler[field]} onChange={event => {
              const value = event.target.value
              setTravelers(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item))
            }} />
          </Field>)}
        </div></fieldset>)}
        {search.mode === 'cash_and_credit' && <Field label="Travel credit"><select required value={creditId} onChange={event => setCredit(event.target.value)}>
          <option value="">{wallet.length ? 'Choose a travel credit' : 'No eligible credits available'}</option>
          {wallet.map(credit => <option key={credit.id} value={credit.id}>{credit.code || credit.id} · {money(credit.remainingAmount)} · {credit.ownerName || 'Account credit'}</option>)}
        </select></Field>}
        <ErrorMessage>{error}</ErrorMessage>
        <button className="primary">Review booking</button>
      </form>}
    </section>}
    {review && <Dialog title="Review your booking" onClose={() => setReview(null)}>
      {review.quote.segments.map(segment => <div className="review-flight" key={segment.id}>
        <strong>{routeTitle(segment)}</strong><div>{segment.flightNumber} · {segmentDay(segment)} · {time(segment.departureAt, segment.origin)}</div>
      </div>)}
      <p>{review.draft.travelers.map(traveler => traveler.firstName.trim() + ' ' + traveler.lastName.trim()).join(', ')}</p>
      <PaymentDetails payment={review.quote.payment} />
      {review.quote.credit && <p className="meta">Credit {review.quote.credit.code || review.quote.credit.id} will have {money((Math.round(review.quote.credit.remainingAmount * 100) - Math.round(review.quote.payment.creditAmount * 100)) / 100)} remaining.</p>}
      <ErrorMessage>{reviewError}</ErrorMessage>
      <div className="dialog-actions"><button className="secondary" onClick={() => setReview(null)}>Back to booking</button><button className="primary" onClick={book}>Confirm booking</button></div>
    </Dialog>}
  </>
}
