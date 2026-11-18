import { useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { byId, date, label, newId, records, routeId, tripLabel, useAccount } from '../account.jsx'
import { AccountLink, Badge, Confirm, Facts, Field, Missing, PageTitle, Trail, TripPicker, useAccountNavigation, useSelectedTrip } from '../ui.jsx'
import { SupportHistory } from './SupportHistory.jsx'

const base = '/lost-items'
const categories = ['phone', 'wallet', 'bag', 'keys', 'clothing', 'other']
const statuses = ['submitted', 'in_progress', 'returned', 'closed']
const canReturn = (entry) => ['submitted', 'in_progress'].includes(entry?.status)

function LostHistory() {
  const { data } = useAccount()
  return <SupportHistory title="Lost items" description="Report belongings left on a ride and track your cases."
    action="Report lost item" base={base} entries={data.lostItemReports} statuses={statuses}
    subject="category" subjectLabel="Item category" empty="No lost item reports yet" />
}

function LostForm() {
  const { data, commit } = useAccount()
  const navigate = useAccountNavigation()
  const selectedTrip = useSelectedTrip()
  const trips = records(data.trips).filter((trip) => trip.id && trip.status === 'completed')
  const [tripId, setTripId] = useState(() => byId(trips, selectedTrip)?.id ?? '')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState(data.rider?.phone ?? '')
  const [errors, setErrors] = useState({})
  const back = byId(trips, selectedTrip) ? '/trips/' + routeId(selectedTrip) : base

  function update(key, setter) {
    return (value) => {
      setter(value)
      setErrors((previous) => ({ ...previous, [key]: undefined }))
    }
  }

  function submit(event) {
    event.preventDefault()
    const notes = description.trim()
    const callbackPhone = phone.trim()
    const digits = callbackPhone.replace(/\D/g, '').length
    const invalid = {}
    if (!byId(trips, tripId)) invalid.tripId = 'Select a completed trip.'
    if (!categories.includes(category)) invalid.category = 'Select an item category.'
    if (!notes) invalid.description = 'Describe the item and where you left it.'
    if (digits < 7 || digits > 15 || !/^\+?[\d\s().-]+$/.test(callbackPhone)) invalid.phone = 'Enter a callback phone number with 7 to 15 digits.'
    if (Object.keys(invalid).length) {
      setErrors(invalid)
      return
    }
    const id = newId('lost')
    commit((state, { now, actorId }) => ({
      ...state,
      lostItemReports: [...records(state.lostItemReports), {
        id, tripId, reporterId: actorId, category, description: notes, callbackPhone,
        status: 'submitted', createdAt: now, updatedAt: now,
      }],
    }), 'Lost item report submitted.')
    navigate(base + '/' + routeId(id))
  }

  return <>
    <Trail to={back}>{back === base ? 'All lost items' : 'Back to trip'}</Trail>
    <PageTitle title="Report lost item" description="Tell us what you left behind and how to reach you." />
    {trips.length ? <form className="panel form-panel form" onSubmit={submit} noValidate>
      <TripPicker trips={trips} value={tripId} onChange={update('tripId', setTripId)} error={errors.tripId} />
      <Field label="Item category" error={errors.category}>{(props) => <select {...props} value={category} onChange={(event) => update('category', setCategory)(event.target.value)} required>
        <option value="" disabled>Select a category</option>
        {categories.map((option) => <option value={option} key={option}>{label(option)}</option>)}
      </select>}</Field>
      <Field label="Description" error={errors.description}>{(props) => <textarea {...props} value={description} onChange={(event) => update('description', setDescription)(event.target.value)} rows={4} placeholder="Color, identifying details and where you last saw it" required />}</Field>
      <Field label="Callback phone" error={errors.phone}>{(props) => <input {...props} type="tel" value={phone} onChange={(event) => update('phone', setPhone)(event.target.value)} required />}</Field>
      <div className="form-actions"><AccountLink className="button secondary" to={back}>Cancel</AccountLink><button className="button">Submit report</button></div>
    </form> : <section className="panel detail-panel"><h2>No completed trips available</h2><p>A completed trip is required to report a lost item.</p></section>}
  </>
}

function LostDetail() {
  const { caseId } = useParams()
  const { data, commit } = useAccount()
  const [confirm, setConfirm] = useState(false)
  const entry = byId(data.lostItemReports, caseId)
  if (!entry) return <Missing title="Lost item report unavailable" to={base} back="All lost items" />
  const trip = byId(data.trips, entry.tripId)

  function markReturned() {
    commit((state, { now, actorId }) => {
      const current = byId(state.lostItemReports, caseId)
      if (!canReturn(current)) return state
      return {
        ...state,
        lostItemReports: records(state.lostItemReports).map((item) => item.id === caseId ? {
          ...item, status: 'returned', updatedAt: now, resolvedAt: now, resolvedBy: actorId,
        } : item),
      }
    }, 'Item marked as returned.')
    setConfirm(false)
  }

  return <>
    <Trail to={base}>All lost items</Trail>
    <PageTitle title="Lost item report" description={entry.id} action={<Badge status={entry.status} />} />
    <div className="detail-grid">
      <section className="panel detail-panel">
        <h2>{entry.category ? label(entry.category) : 'Item details'}</h2>
        <p className="description">{entry.description || 'No item description available.'}</p>
        <Facts items={[
          ['Trip', trip?.id ? <AccountLink to={'/trips/' + routeId(trip.id)}>{tripLabel(trip)}</AccountLink> : entry.tripId],
          ['Callback phone', entry.callbackPhone],
        ]} />
      </section>
      <section className="panel detail-panel">
        <h2>Case history</h2>
        <Facts items={[
          ['Submitted', date(entry.createdAt, data.rider?.timeZone)],
          ['Last updated', date(entry.updatedAt, data.rider?.timeZone)],
          ...(entry.resolvedAt ? [['Returned', date(entry.resolvedAt, data.rider?.timeZone)]] : []),
        ]} />
        {canReturn(entry) && <p><button className="button secondary" onClick={() => setConfirm(true)}>Mark as returned</button></p>}
      </section>
    </div>
    {confirm && <Confirm title="Mark item as returned?" action="Confirm returned" onClose={() => setConfirm(false)} onConfirm={markReturned}>
      Confirm that you recovered this item.
    </Confirm>}
  </>
}

export function LostRoutes() {
  return <Routes>
    <Route index element={<LostHistory />} />
    <Route path="new" element={<LostForm />} />
    <Route path=":caseId" element={<LostDetail />} />
    <Route path="*" element={<Missing title="Lost item report unavailable" to={base} back="All lost items" />} />
  </Routes>
}
