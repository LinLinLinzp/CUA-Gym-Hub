import React, { useState } from 'react'
import { ArrowUpRight, CalendarDays, ClipboardList, Plus } from 'lucide-react'
import { activeOffer, activeTour, lookup, makeId, owned, replace, sortNewest, timeValue, useStore } from './store'
import { appointmentInstant, wallTime } from './tourTime'
import { appointment, Confirm, dateTime, Empty, Field, homeAddress, invalid, label, localDate, matching, Modal, money, PageTitle, SiteLink, Status, TextLink, zone } from './ui'

const eligible = home => home.status !== 'sold'
const zones = [
  ['America/Los_Angeles', 'Pacific time'],
  ['America/Denver', 'Mountain time'],
  ['America/Chicago', 'Central time'],
  ['America/New_York', 'Eastern time'],
]
const zoneName = value => zones.find(([id]) => id === value)?.[1] || value
const tourModes = ['in_person', 'video']
const financingMethods = ['conventional', 'cash', 'fha', 'va', 'other']
const offerStatuses = ['draft', 'submitted', 'accepted', 'declined', 'withdrawn']

function Options({ values }) {
  return values.map(value => <option value={value} key={value}>{label(value)}</option>)
}

function HomeField({ homes, value, onChange, error, id, currentHome }) {
  const choices = homes.filter(eligible)
  return <Field label="Listing" id={id} error={error}>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} {...invalid(id, error)} required>
      <option value="">Choose a home</option>
      {value && !choices.some(home => home.id === value) && <option value={value}>{homeAddress(currentHome)}</option>}
      {choices.map(home => <option value={home.id} key={home.id}>{homeAddress(home)}{home.city ? ' · ' + home.city : ''}</option>)}
    </select>
  </Field>
}

function ContextHome({ home }) {
  return <p className="form-listing"><strong>{homeAddress(home)}</strong>{home?.city && <span>{home.city}</span>}</p>
}

function focusInvalid(event, errors, ids) {
  const key = Object.keys(errors)[0]
  if (key && ids[key]) event.currentTarget.querySelector('#' + ids[key])?.focus()
}

export function TourForm({ homeId, tour, onClose }) {
  const { state, commit } = useStore()
  const { account, homes } = state
  const [selectedHome, setHome] = useState(tour?.homeId || homeId || '')
  const [timeZone, setZone] = useState(zone(tour?.timeZone || account.timeZone))
  const [when, setWhen] = useState(() => wallTime(tour?.scheduledAt, timeZone))
  const [mode, setMode] = useState(tour?.mode || 'in_person')
  const [notes, setNotes] = useState(tour?.notes || '')
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState(null)
  const home = lookup(homes, selectedHome)
  const title = tour ? 'Reschedule tour' : 'Schedule a tour'

  function validate() {
    const next = {}
    if (!tour && (!home || !eligible(home))) next.home = 'Choose an available listing.'
    if (!when.date) next.date = 'Choose a tour date.'
    if (!when.time) next.time = 'Choose a tour time.'
    const scheduledAt = when.date && when.time ? appointmentInstant(when.date, when.time, timeZone) : null
    if (when.date && when.time && !scheduledAt) next.time = 'That local time is unavailable. Choose another time.'
    if (scheduledAt && new Date(scheduledAt) <= new Date()) next.date = 'Choose a date and time in the future.'
    if (!tourModes.includes(mode)) next.mode = 'Choose a tour format.'
    if (!tour && owned(state.tours, account.id).some(row => row.homeId === selectedHome && activeTour(row))) {
      next.form = 'You already have an upcoming tour for this home. Manage it from Tours.'
    }
    return { next, scheduledAt }
  }

  function reviewTour(event) {
    event.preventDefault()
    const { next, scheduledAt } = validate()
    setErrors(next)
    if (Object.keys(next).length) {
      focusInvalid(event, next, { home: 'tour-home', date: 'tour-date', time: 'tour-time', mode: 'tour-mode' })
      return
    }
    setReview(scheduledAt)
  }

  function submit() {
    const { next, scheduledAt } = validate()
    if (Object.keys(next).length) {
      setErrors(next)
      setReview(null)
      return
    }
    const saved = commit((world, now) => {
      const records = owned(world.tours, account.id)
      if (tour) {
        const current = lookup(records, tour.id)
        if (!current || !activeTour(current, new Date(now))) return world
        return { ...world, tours: replace(world.tours, { ...current, scheduledAt, timeZone, status: 'requested', rescheduledAt: now, updatedAt: now }) }
      }
      if (records.some(row => row.homeId === selectedHome && activeTour(row, new Date(now)))) return world
      return { ...world, tours: [...world.tours, {
        id: makeId('tour'), homeId: selectedHome, actorId: account.id, ...(home.agentId && { agentId: home.agentId }),
        scheduledAt, timeZone, mode, ...(notes.trim() && { notes: notes.trim() }),
        status: 'requested', createdAt: now, updatedAt: now,
      }] }
    }, tour ? 'Tour reschedule requested.' : 'Tour requested.')
    if (saved) onClose()
    else { setReview(null); setErrors({ form: 'This tour has changed. Check your upcoming tours.' }) }
  }

  return <Modal title={review ? 'Review tour request' : title} onClose={onClose}>
    {review ? <>
      <div className="dialog-body" key="review">
        <ContextHome home={home} />
        <dl className="terms"><div><dt>When</dt><dd>{appointment(review, timeZone)}</dd></div>
          <div><dt>Format</dt><dd>{label(mode)}</dd></div>
          {notes.trim() && <div><dt>Notes</dt><dd>{notes.trim()}</dd></div>}</dl>
      </div>
      <div className="form-actions"><button className="secondary" onClick={() => setReview(null)}>Back</button>
        <button className="primary" autoFocus onClick={submit}>{tour ? 'Request reschedule' : 'Request tour'}</button></div>
    </> : <form key="tour-form" noValidate onSubmit={reviewTour}>
      <div className="dialog-body form-fields">
        {homeId || tour ? <ContextHome home={home} /> :
          <HomeField id="tour-home" homes={homes} value={selectedHome} onChange={setHome} error={errors.home} />}
        <div className="form-pair">
          <Field label="Tour date" id="tour-date" error={errors.date}><input id="tour-date" type="date" min={wallTime(new Date(), timeZone).date}
            value={when.date} onChange={e => setWhen({ ...when, date: e.target.value })} {...invalid('tour-date', errors.date)} required /></Field>
          <Field label="Tour time" id="tour-time" error={errors.time}><input id="tour-time" type="time"
            value={when.time} onChange={e => setWhen({ ...when, time: e.target.value })} {...invalid('tour-time', errors.time)} required /></Field>
        </div>
        <div className="form-pair">
          <Field label="Time zone" id="tour-zone"><select id="tour-zone" value={timeZone} onChange={e => setZone(e.target.value)}>
            {!zones.some(([value]) => value === timeZone) && <option value={timeZone}>{zoneName(timeZone)}</option>}
            {zones.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></Field>
          <Field label="Tour format" id="tour-mode" error={errors.mode}><select id="tour-mode" value={mode} disabled={Boolean(tour)}
            onChange={e => setMode(e.target.value)} {...invalid('tour-mode', errors.mode)}><Options values={tourModes} /></select></Field>
        </div>
        {!tour && <Field label="Notes (optional)" id="tour-notes"><textarea id="tour-notes" rows="3" value={notes} onChange={e => setNotes(e.target.value)} /></Field>}
        {(errors.form || ((homeId || tour) && errors.home)) && <p className="field-error" role="alert">{errors.form || errors.home}</p>}
      </div>
      <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>Close</button><button className="primary" type="submit">Review tour</button></div>
    </form>}
  </Modal>
}

function RowListing({ home, children }) {
  return <div className="row-listing">
    {home ? <SiteLink to={'/homes/' + encodeURIComponent(home.id)}>{homeAddress(home)} <ArrowUpRight size={14} aria-hidden="true" /></SiteLink> : <strong>{homeAddress(null)}</strong>}
    {children}
  </div>
}

export function Tours() {
  const { state, commit } = useStore()
  const { account, homes, agents } = state
  const [page, setPage] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [cancel, setCancel] = useState(null)
  const now = new Date()
  const records = owned(state.tours, account.id)
  const upcoming = records.filter(row => activeTour(row, now))
  const history = records.filter(row => !activeTour(row, now))
  const rows = (page === 'upcoming' ? upcoming : history).sort((a, b) => {
    const order = timeValue(a.scheduledAt) - timeValue(b.scheduledAt)
    return page === 'upcoming' ? order : -order
  }).filter(row => matching(search, homeAddress(lookup(homes, row.homeId))))

  function cancelTour() {
    commit((world, timestamp) => {
      const current = lookup(owned(world.tours, account.id), cancel.id)
      if (!current || !activeTour(current, new Date(timestamp))) return world
      return { ...world, tours: replace(world.tours, { ...current, status: 'canceled', canceledAt: timestamp, updatedAt: timestamp }) }
    }, 'Tour canceled.')
    setCancel(null)
  }

  return <>
    <PageTitle title="Tours" action={homes.some(eligible) && <button className="primary" onClick={() => setForm({})}><Plus size={17} /> Schedule a tour</button>}>
      Review upcoming visits and past tour requests.
    </PageTitle>
    <div className="queue-toolbar">
      <div className="segments" aria-label="Tour views">
        <button type="button" aria-pressed={page === 'upcoming'} onClick={() => setPage('upcoming')}>Upcoming <span>{upcoming.length}</span></button>
        <button type="button" aria-pressed={page === 'history'} onClick={() => setPage('history')}>History <span>{history.length}</span></button>
      </div>
      <Field label="Search tours" id="tour-search"><input type="search" id="tour-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by address" /></Field>
    </div>
    {rows.length ? <div className="queue">
      {rows.map(row => <article className="queue-row" key={row.id}>
        <div className="row-icon"><CalendarDays size={20} /></div>
        <RowListing home={lookup(homes, row.homeId)}>
          <span>{appointment(row.scheduledAt, row.timeZone || account.timeZone)} · {label(row.mode)}</span>
          <span>{lookup(agents, row.agentId)?.displayName || 'Redfin agent'}</span>
          {row.notes && <p className="row-note">{row.notes}</p>}
        </RowListing>
        <Status value={row.status} />
        {page === 'upcoming' && <div className="row-actions"><button className="secondary" onClick={() => setForm({ tour: row })}>Reschedule</button>
          <button className="text-button" onClick={() => setCancel(row)}>Cancel tour</button></div>}
      </article>)}
    </div> : <Empty title={search ? 'No matching tours' : page === 'upcoming' ? 'No upcoming tours' : 'No tour history'}
      action={page === 'upcoming' && !search ? <TextLink to="/homes">Browse homes</TextLink> : null} />}
    {form && <TourForm {...form} onClose={() => setForm(null)} />}
    {cancel && <Confirm title="Cancel this tour?" body={'The tour for ' + homeAddress(lookup(homes, cancel.homeId)) + ' will move to History.'}
      action="Cancel tour" onClose={() => setCancel(null)} onConfirm={cancelTour} />}
  </>
}

function parseAmount(input) {
  const value = input.trim()
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) return null
  const amount = Number(value.replaceAll(',', ''))
  return amount > 0 && Number.isSafeInteger(Math.round(amount * 100)) ? amount : null
}

export function OfferForm({ homeId, offer, onClose, returnFocus }) {
  const { state, commit } = useStore()
  const { account, homes } = state
  const [selectedHome, setHome] = useState(offer?.homeId || homeId || '')
  const [amount, setAmount] = useState(offer?.amount != null ? String(offer.amount) : '')
  const [financing, setFinancing] = useState(offer?.financing || 'conventional')
  const [closingDate, setClosingDate] = useState(offer?.closingDate || '')
  const [notes, setNotes] = useState(offer?.notes || '')
  const [errors, setErrors] = useState({})
  const home = lookup(homes, selectedHome)
  const active = owned(state.offers, account.id).find(row => row.homeId === selectedHome && activeOffer(row) && row.id !== offer?.id)

  function submit(event) {
    event.preventDefault()
    const status = event.nativeEvent.submitter?.value === 'draft' ? 'draft' : 'submitted'
    const numericAmount = parseAmount(amount)
    const next = {}
    if (!offer && (!home || !eligible(home))) next.home = 'Choose an available listing.'
    if (numericAmount === null) next.amount = 'Enter a positive USD amount with up to two decimal places.'
    if (!financingMethods.includes(financing)) next.financing = 'Choose a financing method.'
    if (active) next.form = 'An active offer already exists for this home. Open Offers to manage it.'
    setErrors(next)
    if (Object.keys(next).length) {
      focusInvalid(event, next, { home: 'offer-home', amount: 'offer-amount', financing: 'offer-financing' })
      return
    }
    const saved = commit((world, now) => {
      const records = owned(world.offers, account.id)
      const current = offer && lookup(records, offer.id)
      if ((offer && current?.status !== 'draft') || records.some(row => row.homeId === selectedHome && activeOffer(row) && row.id !== offer?.id)) return world

      const terms = {
        ...current,
        id: current?.id || makeId('offer'), homeId: selectedHome, actorId: account.id,
        ...(home?.agentId && !current?.agentId && { agentId: home.agentId }),
        amount: numericAmount, currency: 'USD', financing, status,
        createdAt: current?.createdAt || now, updatedAt: now,
        ...(status === 'submitted' && { submittedAt: now }),
      }
      if (closingDate) terms.closingDate = closingDate
      else delete terms.closingDate
      if (notes.trim()) terms.notes = notes.trim()
      else delete terms.notes

      return { ...world, offers: current ? replace(world.offers, terms) : [...world.offers, terms] }
    }, status === 'draft' ? 'Offer draft saved.' : 'Offer request submitted.')
    if (saved) onClose()
    else setErrors({ form: 'This offer has changed. Check your offers.' })
  }

  return <Modal title={offer ? 'Edit offer draft' : 'Start an offer'} onClose={onClose} returnFocus={returnFocus}>
    <form noValidate onSubmit={submit}>
      <div className="dialog-body form-fields">
        {homeId || offer ? <ContextHome home={home} /> :
          <HomeField id="offer-home" homes={homes} value={selectedHome} onChange={setHome} error={errors.home} />}
        {typeof home?.price === 'number' && <p className="muted form-caption">Asking price {money(home.price)}</p>}
        <div className="form-pair">
          <Field label="Offer amount (USD)" id="offer-amount" error={errors.amount}><input id="offer-amount" inputMode="decimal" placeholder="850,000" value={amount}
            onChange={e => setAmount(e.target.value)} {...invalid('offer-amount', errors.amount)} required /></Field>
          <Field label="Financing" id="offer-financing" error={errors.financing}><select id="offer-financing" value={financing}
            onChange={e => setFinancing(e.target.value)} {...invalid('offer-financing', errors.financing)}><Options values={financingMethods} /></select></Field>
        </div>
        <Field label="Closing date (optional)" id="offer-date"><input id="offer-date" type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} /></Field>
        <Field label="Notes (optional)" id="offer-notes"><textarea id="offer-notes" rows="3" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        {(errors.form || ((homeId || offer) && errors.home)) && <p className="field-error" role="alert">{errors.form || errors.home}</p>}
      </div>
      <div className="form-actions">
        <button className="secondary" type="submit" value="draft">Save draft</button>
        <button className="primary" type="submit" value="submitted">Submit offer request</button>
      </div>
    </form>
  </Modal>
}

function OfferDetails({ row, home, agent, timeZone, onClose, onEdit, onWithdraw, returnFocus }) {
  const history = [
    ['Created', row.createdAt],
    ['Submitted', row.submittedAt],
    ['Withdrawn', row.withdrawnAt],
    ...(row.status === 'draft' && row.updatedAt !== row.createdAt ? [['Draft updated', row.updatedAt]] : []),
  ].filter(([, time]) => time)
  return <Modal title="Offer details" onClose={onClose} returnFocus={returnFocus}>
    <div className="dialog-body">
      <ContextHome home={home} />
      <Status value={row.status} />
      <dl className="terms">
        <div><dt>Offer amount</dt><dd>{money(row.amount)}</dd></div>
        <div><dt>Financing</dt><dd>{label(row.financing)}</dd></div>
        <div><dt>Closing date</dt><dd>{localDate(row.closingDate)}</dd></div>
        <div><dt>Agent</dt><dd>{agent?.displayName || 'Redfin agent'}</dd></div>
        {row.notes && <div><dt>Notes</dt><dd>{row.notes}</dd></div>}
      </dl>
      <h3>Request history</h3>
      {history.length ? <ol className="history-list">{history.map(([event, time]) => <li key={event}><strong>{event}</strong>
        <span>{dateTime(time, timeZone, { year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span></li>)}</ol> : <p className="muted">No dates available.</p>}
    </div>
    <div className="form-actions">
      <button className="secondary" onClick={onClose}>Close</button>
      {row.status === 'draft' && <button className="primary" onClick={onEdit}>Edit draft</button>}
      {row.status === 'submitted' && <button className="primary" onClick={onWithdraw}>Withdraw offer</button>}
    </div>
  </Modal>
}

export function Offers() {
  const { state, commit } = useStore()
  const { account, homes, agents } = state
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const records = owned(state.offers, account.id)
  const rows = records.filter(row => (!status || row.status === status) && matching(search, homeAddress(lookup(homes, row.homeId))))
    .sort(sortNewest('updatedAt'))
  const selected = lookup(records, dialog?.id)
  const returnFocus = dialog?.trigger
  const close = () => setDialog(null)

  function withdraw() {
    commit((world, now) => {
      const current = lookup(owned(world.offers, account.id), selected.id)
      if (current?.status !== 'submitted') return world
      return { ...world, offers: replace(world.offers, { ...current, status: 'withdrawn', withdrawnAt: now, updatedAt: now }) }
    }, 'Offer withdrawn.')
    close()
  }

  return <>
    <PageTitle title="Offers" action={homes.some(eligible) && <button className="primary" onClick={() => setDialog({ view: 'form' })}><Plus size={17} /> Start an offer</button>}>
      Manage offer drafts, terms, and requests.
    </PageTitle>
    <div className="filter-panel compact-filters">
      <Field label="Search offers" id="offer-search"><input type="search" id="offer-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by address" /></Field>
      <Field label="Offer status" id="offer-status"><select id="offer-status" value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">All statuses</option><Options values={offerStatuses} /></select></Field>
    </div>
    <p className="result-count" aria-live="polite">{rows.length} {rows.length === 1 ? 'offer' : 'offers'}</p>
    {rows.length ? <div className="queue">
      {rows.map(row => <article className="queue-row" key={row.id}>
        <div className="row-icon"><ClipboardList size={20} /></div>
        <RowListing home={lookup(homes, row.homeId)}>
          <span>{money(row.amount)} · {label(row.financing)}</span>
          {row.updatedAt && <span>Updated {dateTime(row.updatedAt, account.timeZone, { year: 'numeric' })}</span>}
        </RowListing>
        <Status value={row.status} />
        <div className="row-actions"><button className="secondary" onClick={event => setDialog({
          id: row.id, view: 'detail', trigger: event.currentTarget,
        })}>View details</button></div>
      </article>)}
    </div> : <Empty title={records.length ? 'No matching offers' : 'No offers yet'} action={records.length ? null : <TextLink to="/homes">Browse homes</TextLink>} />}
    {dialog?.view === 'form' && <OfferForm key={'form-' + selected?.id} offer={selected} onClose={close} returnFocus={returnFocus} />}
    {dialog?.view === 'detail' && selected && <OfferDetails key="details" row={selected} home={lookup(homes, selected.homeId)}
      agent={lookup(agents, selected.agentId)} timeZone={account.timeZone} onClose={close} returnFocus={returnFocus}
      onEdit={() => setDialog({ ...dialog, view: 'form' })}
      onWithdraw={() => setDialog({ ...dialog, view: 'withdraw' })} />}
    {dialog?.view === 'withdraw' && selected && <Confirm key="withdraw" title="Withdraw this offer?" body="The request will stay in your offer history with a Withdrawn status."
      action="Withdraw offer" onClose={close} onConfirm={withdraw} returnFocus={returnFocus} />}
  </>
}
