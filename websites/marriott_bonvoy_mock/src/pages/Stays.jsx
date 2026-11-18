import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from '../context/AccountContext'
import { actionId, canManage, canRequestService, creditIssue, findRecord, linkedFolios, positiveInteger, replaceRecord, rowsWith, validDay } from '../model'
import { AccountLink, Badge, Confirm, Facts, Field, Missing, Results, Search, Sort, Title, dateText, dates, matches, recordPath, records, sorted } from '../ui'

const views = [
  ['upcoming', 'Upcoming', ['upcoming', 'in_progress']],
  ['past', 'Past', ['completed']],
  ['cancelled', 'Cancelled', ['cancelled']],
]

export function Stays() {
  const { data } = useAccount()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const active = views.find(([key]) => key === params.get('view')) || views[0]
  const [sortChoice, setSortChoice] = useState('')
  const sort = sortChoice || (active[0] === 'upcoming' ? 'oldest' : 'newest')
  const found = sorted(records(data.stays).filter(stay => active[2].includes(stay.status) &&
    matches(search, stay.propertyName, stay.city, stay.country, stay.confirmationNumber)), stay => stay.checkIn, sort)
  return <>
    <Title title="Stays" description="Find your reservations and manage upcoming trips." />
    <nav className="tabs" aria-label="Stay views">{views.map(([key, title]) => <AccountLink key={key} to="/stays" query={{ view: key }}
      className="button" aria-current={active[0] === key ? 'page' : undefined}>{title}</AccountLink>)}</nav>
    <div className="controls">
      <Search value={search} onChange={setSearch} placeholder="Hotel, destination or confirmation" />
      <Sort value={sort} onChange={setSortChoice} />
    </div>
    <Results key={[active[0], search, sort].join('|')} rows={found} empty="No stays match this view." render={(stay, index) =>
      <li className="row list-row" key={stay.id || index}>
        <div className="row-main">
          {stay.id ? <AccountLink className="row-title" to={recordPath('stays', stay.id)}>{stay.propertyName || 'Hotel stay'}</AccountLink> : <strong>{stay.propertyName || 'Hotel stay'}</strong>}
          <span className="meta">{[stay.city, stay.country].filter(Boolean).join(', ') || '—'}</span>
        </div>
        <div className="row-field"><span className="meta">Stay dates</span><span>{dates(stay)}</span></div>
        <div className="row-field"><span className="meta">Confirmation</span><span>{stay.confirmationNumber || '—'}</span></div>
        <div className="row-action"><Badge value={stay.status} /></div>
      </li>
    } />
  </>
}

function staySnapshot(stay) {
  return { checkIn: stay.checkIn ?? null, checkOut: stay.checkOut ?? null, guests: stay.guests ?? null, status: stay.status }
}

export function StayDetail() {
  const { id } = useParams()
  const { data, commit } = useAccount()
  const stay = findRecord(data.stays, id)
  return stay ? <Reservation key={id} stay={stay} data={data} commit={commit} /> : <Missing collection="Stays" name="Stay" />
}

function Reservation({ stay, data, commit }) {
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState(null)
  const [notice, setNotice] = useState('')
  const folios = linkedFolios(data, stay.id)
  const manageable = canManage(stay) && data.member?.id
  const service = canRequestService(stay) && data.member?.id
  const missingCredit = data.member?.id && !creditIssue(data, stay)
  const backView = { completed: 'past', cancelled: 'cancelled' }[stay.status] || 'upcoming'

  function openEdit() {
    setDraft({ checkIn: stay.checkIn || '', checkOut: stay.checkOut || '', guests: stay.guests ?? '' })
    setErrors({})
    setNotice('')
  }

  function reviewEdit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!validDay(draft.checkIn)) nextErrors.checkIn = 'Enter a check-in date.'
    if (!validDay(draft.checkOut) || draft.checkOut <= draft.checkIn) nextErrors.checkOut = 'Checkout must be after check-in.'
    if (!positiveInteger(draft.guests)) nextErrors.guests = 'Enter a positive whole number of guests.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const changes = { ...draft, guests: Number(draft.guests) }
    if (Object.keys(changes).every(key => changes[key] === stay[key])) {
      setErrors({ unchanged: 'Change a date or guest count to continue.' })
      return
    }
    setReview({ action: 'modify', changes })
  }

  function confirm() {
    if (!review) return
    const saved = commit(current => {
      const before = findRecord(current.stays, stay.id)
      if (!canManage(before) || !current.member?.id) return null
      const now = new Date().toISOString()
      const after = review.action === 'cancel'
        ? { ...before, status: 'cancelled', cancelledAt: now, updatedAt: now }
        : { ...before, ...review.changes, updatedAt: now }
      if (JSON.stringify(staySnapshot(before)) === JSON.stringify(staySnapshot(after))) return null
      const entry = { id: actionId('stay-action'), stayId: before.id, actorId: current.member.id,
        action: review.action, status: 'applied', createdAt: now, before: staySnapshot(before), after: staySnapshot(after) }
      return { ...current, stays: replaceRecord(current.stays, before, after), stayActions: rowsWith(current.stayActions, entry) }
    })
    setReview(null)
    setDraft(null)
    if (saved) setNotice(review.action === 'cancel' ? 'Reservation cancelled.' : 'Reservation updated.')
  }

  return <>
    <AccountLink className="back" to="/stays" query={{ view: backView }}>← Back to stays</AccountLink>
    <Title title={stay.propertyName || 'Hotel stay'} description={[stay.city, stay.country].filter(Boolean).join(', ')}>
      <Badge value={stay.status} />
    </Title>
    <div className="notice" role="status">{notice}</div>
    <div className="detail-stack">
      <section className="panel">
        <h2>Reservation details</h2>
        <Facts entries={[
          ['Confirmation', stay.confirmationNumber], ['Check-in', dateText(stay.checkIn)],
          ['Checkout', dateText(stay.checkOut)],
          ['Guests', stay.guests], ['Room type', stay.roomType],
        ]} />
        {(manageable || service || missingCredit) && <div className="actions detail-actions">
          {manageable && <button className="primary" onClick={openEdit}>Edit reservation</button>}
          {manageable && <button onClick={() => setReview({ action: 'cancel' })}>Cancel reservation</button>}
          {service && <AccountLink className="button" to="/requests/new" query={{ type: 'hotel_service', stay: stay.id }}>New service request</AccountLink>}
          {missingCredit && <AccountLink className="button" to="/requests/new" query={{ type: 'missing_stay_credit', stay: stay.id }}>Request missing stay credit</AccountLink>}
        </div>}
      </section>
      {draft && manageable && <form className="panel form" onSubmit={reviewEdit} noValidate>
        <h2>Edit reservation</h2>
        <div className="form-grid">
          {[['checkIn', 'Check-in', 'date'], ['checkOut', 'Checkout', 'date'], ['guests', 'Guests', 'number']].map(([key, title, type]) =>
            <Field key={key} label={title} error={errors[key]}><input autoFocus={key === 'checkIn'} type={type} value={draft[key]} required aria-invalid={!!errors[key]}
              onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></Field>)}
        </div>
        {errors.unchanged && <span className="field-error" role="alert">{errors.unchanged}</span>}
        <div className="actions"><button type="submit" className="primary">Review changes</button>
          <button type="button" onClick={() => setDraft(null)}>Discard edits</button></div>
      </form>}
      {stay.status === 'completed' && <section className="panel">
        <h2>Hotel folios</h2>
        {folios.length ? <ul className="results">{folios.map((folio, index) => <li key={folio.id || index} className="row compact-row">
          {folio.id ? <AccountLink to={recordPath('folios', folio.id)}>View folio{folio.number ? ' ' + folio.number : ''}</AccountLink> : <span>{folio.number || 'Hotel folio'}</span>}
          <Badge value={folio.status} />
        </li>)}</ul> : <p>No folio is listed for this stay.</p>}
      </section>}
    </div>
    {review?.action === 'modify' && <Confirm title="Review reservation changes" action="Confirm changes" onClose={() => setReview(null)} onConfirm={confirm}>
      <p>Your reservation will be updated to these dates and guest count.</p>
      <Facts entries={[['New stay dates', dates(review.changes)], ['Guests', review.changes.guests]]} />
    </Confirm>}
    {review?.action === 'cancel' && <Confirm title="Cancel this reservation?" action="Confirm cancellation" danger onClose={() => setReview(null)} onConfirm={confirm}>
      <p>Your booking at {stay.propertyName || 'this hotel'} will move to Cancelled. You will no longer be able to change or use it.</p>
    </Confirm>}
  </>
}
