import { useState } from 'react'
import { bookingPlan, bookingQuote, dateSpan, find, inventoryError, isCamp, matches, money, quotaLeft, rows, today, typeLabel } from './data/domain'
import { useRoute, useStore } from './store'
import { Charges, Empty, ErrorText, Facts, Field, Heading, Missing, OptionField, recordPath, RouteLink, Rules, SearchField, Segments, Terms } from './ui'

const modes = ['Camping', 'Permits']
const equipmentList = (units) => [...new Set(units.flatMap((unit) => Array.isArray(unit.equipment) ? unit.equipment.filter((item) => typeof item === 'string') : []))].sort()
const locationLabel = (facility) => [facility.locality, facility.state, facility.area].filter(Boolean).join(' · ')
const directUnits = (state, facility) => rows(state.units).filter((unit) =>
  unit.facilityId === facility.id && unit.kind === facility.kind && unit.allocation !== 'lottery')
const blankDraft = { startDate: '', endDate: '', partySize: '', equipment: '', unitId: '' }
const bookingDraft = (draft) => ({ ...draft, partySize: Number(draft.partySize) })
const selectionLabels = (camp) => [camp ? 'Campsite' : 'Entry point', camp ? 'Arrival' : 'Entry date']
const validInventory = (state, facility, unit, draft) => !inventoryError(state, facility, unit, bookingDraft(draft))

function TripFields({ camp, draft, change, equipment, min, required }) {
  const [, startLabel] = selectionLabels(camp)
  return <>
    <Field label={startLabel}><input type="date" min={min} required={required} value={draft.startDate} onChange={(event) => change('startDate', event.target.value)} /></Field>
    {camp && <Field label="Departure"><input type="date" min={draft.startDate || min} required={required} value={draft.endDate} onChange={(event) => change('endDate', event.target.value)} /></Field>}
    <Field label="Party size"><input type="number" min="1" step="1" required={required} value={draft.partySize} onChange={(event) => change('partySize', event.target.value)} /></Field>
    {camp && <OptionField label="Equipment" value={draft.equipment} onChange={(value) => change('equipment', value)}
      options={[[ '', required ? 'Choose equipment' : 'Any equipment'], ...equipment]} />}
  </>
}

export function Explore() {
  const { state } = useStore()
  const { location, go } = useRoute()
  const params = new URLSearchParams(location.search)
  const mode = params.get('kind') === 'permit' ? 'Permits' : 'Camping'
  const camp = mode === 'Camping'
  const kind = camp ? 'campsite' : 'permit'
  const query = params.get('q') || ''
  const region = params.get('region') || ''
  const draft = Object.fromEntries(Object.entries(blankDraft).map(([key, value]) => [key, params.get(key) || value]))
  const catalog = rows(state.facilities).filter((facility) => facility.kind === kind)
  const states = [...new Set(catalog.map((facility) => facility.state).filter(Boolean))].sort()
  function change(key, value) {
    if (value) params.set(key, value)
    else params.delete(key)
    go(`/explore?${params}`, { replace: true })
  }
  const facilities = catalog.filter((facility) => {
    const units = directUnits(state, facility)
    const requiresUnit = draft.partySize || draft.equipment || draft.startDate || (camp && draft.endDate)
    if (region && facility.state !== region) return false
    const facilityMatches = matches(query, facility.name, facility.locality, facility.area, facility.state)
    if (!requiresUnit && facilityMatches) return true
    return units.some((unit) => {
      if (!facilityMatches && !matches(query, unit.name)) return false
      if (draft.partySize && (!Number.isInteger(Number(draft.partySize)) || Number(draft.partySize) < 1 || Number(draft.partySize) > (unit.maxPartySize || 0))) return false
      if (camp && draft.equipment && !equipmentList([unit]).includes(draft.equipment)) return false
      if (!draft.startDate || (camp && !draft.endDate)) return true
      const selection = {
        ...draft, partySize: draft.partySize || 1,
        equipment: camp ? draft.equipment || equipmentList([unit])[0] : '',
      }
      return validInventory(state, facility, unit, selection)
    })
  })
  return <>
    <Heading title="Explore camping and permits">Find a place to camp or an entry point for your backcountry trip.</Heading>
    <Segments label="Explore type" options={modes} value={mode} onChange={(option) => {
      if (option === mode) return
      params.delete('endDate')
      params.delete('equipment')
      params.delete('region')
      params.set('kind', option === 'Camping' ? 'campsite' : 'permit')
      go(`/explore?${params}`, { replace: true })
    }} />
    <div className="filter-bar explore-filters">
      <SearchField label="Search destinations" value={query} onChange={(value) => change('q', value)} placeholder="Facility, area, town, or site" />
      <OptionField label="State" value={region} onChange={(value) => change('region', value)} options={[[ '', 'All states'], ...states]} />
      <TripFields camp={camp} draft={draft} change={change} equipment={equipmentList(rows(state.units).filter(isCamp))} />
    </div>
    <p className="result-count" role="status">{facilities.length} {facilities.length === 1 ? 'destination' : 'destinations'}</p>
    {facilities.length ? <ul className="records panel">
      {facilities.map((facility) => {
        const units = directUnits(state, facility)
        return <li className="record-row" key={facility.id}>
          <div><RouteLink className="record-title" to={recordPath('/explore', facility.id) + location.search}>{facility.name || 'Unnamed destination'}</RouteLink>
            <p>{locationLabel(facility) || typeLabel(facility)}</p></div>
          <div className="record-meta"><span>{units.length} {camp ? (units.length === 1 ? 'campsite' : 'campsites') : (units.length === 1 ? 'entry point' : 'entry points')}</span></div>
        </li>
      })}
    </ul> : <Empty title="No destinations found">Try a different location, date, or party size.</Empty>}
  </>
}

export function Facility({ id }) {
  const { state, commit } = useStore()
  const { location, go } = useRoute()
  const [rawDraft, setDraft] = useState(() => {
    const params = new URLSearchParams(location.search)
    return { ...blankDraft, startDate: params.get('startDate') || '', endDate: params.get('endDate') || '', equipment: params.get('equipment') || '', partySize: params.get('partySize') || '1' }
  })
  const [review, setReview] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const facility = find(state.facilities, id)
  if (!facility) return <Missing title="Destination not found" to="/explore" action="Explore destinations" />
  const camp = isCamp(facility)
  const units = directUnits(state, facility)
  const unit = find(units, rawDraft.unitId)
  const draft = bookingDraft(rawDraft)
  const quote = bookingQuote(facility, unit, draft)
  const [unitLabel, startLabel] = selectionLabels(camp)
  const params = new URLSearchParams(location.search)
  params.set('kind', facility.kind)
  const back = { to: `/explore?${params}`, label: 'Explore destinations' }
  function change(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setError('')
    setAccepted(false)
  }
  function prepare(event) {
    event.preventDefault()
    const plan = bookingPlan(state, facility, unit, draft)
    if (plan.error) return setError(unit ? plan.error : `Choose a ${unitLabel.toLowerCase()}.`)
    setError('')
    setReview(true)
  }
  function confirm(event) {
    event.preventDefault()
    if (!accepted) return setError('Agree to the rules and booking terms before confirming.')
    const result = commit({ type: 'book', facilityId: id, draft }, 'Reservation confirmed.')
    if (result.error) return setError(result.error)
    go(recordPath('/account/reservations', result.record.id))
  }
  return <>
    <Heading title={review ? 'Review reservation' : facility.name || 'Destination details'} back={back}>
      {review ? facility.name : locationLabel(facility)}
    </Heading>
    <form className="details-grid" onSubmit={review ? confirm : prepare}>
      <section className="panel detail-panel">
        <h2>{review ? 'Trip details' : camp ? 'Choose a campsite' : 'Choose an entry point'}</h2>
        {review ? <>
          <Facts className="trip-facts" items={[[unitLabel, unit?.name], [camp ? 'Stay' : startLabel, dateSpan(draft)], ['Party size', draft.partySize],
            ...(camp ? [['Equipment', draft.equipment]] : [])]} />
          <Rules items={facility.rules} />
          <Terms checked={accepted} onChange={setAccepted}>I agree to the rules and booking terms.</Terms>
        </> : <>
          {facility.description && <p className="muted">{facility.description}</p>}
          <div className="form-grid"><TripFields camp={camp} draft={rawDraft} change={change} equipment={equipmentList(units)}
            min={today(facility.timeZone)} required /></div>
          {units.length ? <fieldset className="unit-list"><legend>{camp ? 'Campsites' : 'Entry points'}</legend>
            {units.map((option) => {
              const dated = draft.startDate && (!camp || draft.endDate)
              const remaining = !camp && draft.startDate ? quotaLeft(state, option, draft.startDate) : null
              const availability = dated && (!camp || draft.equipment) ? inventoryError(state, facility, option, draft) : ''
              return <label key={option.id} className="unit">
                <input type="radio" name="unit" checked={draft.unitId === option.id} onChange={() => change('unitId', option.id)} />
                <span><strong>{option.name || unitLabel}</strong><small>{[option.category, option.maxPartySize ? `Up to ${option.maxPartySize} people` : '', ...equipmentList([option])].filter(Boolean).join(' · ')}</small>
                  {remaining !== null && <small>{remaining} {remaining === 1 ? 'place' : 'places'} remaining</small>}
                  {availability && <small className="danger-text">{availability}</small>}</span>
                <span className="unit-price">{money(option.rate)} <small>{camp ? 'per night' : 'per person'}</small></span>
              </label>
            })}
          </fieldset> : <p className="muted">There are no units available for direct booking at this destination.</p>}
        </>}
        <ErrorText error={error} />
        <div className="action-row">
          {review && <button type="button" className="button secondary" onClick={() => { setReview(false); setError(''); setAccepted(false) }}>Edit trip</button>}
          <button className="button primary" disabled={!units.length} type="submit">{review ? 'Confirm reservation' : 'Review reservation'}</button>
        </div>
      </section>
      <aside className="panel detail-panel summary">
        <h2>{review ? 'Booking total' : 'Trip estimate'}</h2>
        {quote ? <Charges quote={quote} camp={camp} /> : <p className="muted">Choose dates and {camp ? 'a campsite' : 'an entry point'} to see your total.</p>}
        {review && <p className="fine-print">The service fee is retained on cancellation. Other deductions depend on the facility policy.</p>}
      </aside>
    </form>
  </>
}
