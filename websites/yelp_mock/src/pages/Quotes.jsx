import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { actor, append, businessName, dated, displayDate, find, localClock, newId, own, services, stamp, update, validDate } from '../model.js'
import { useWorld } from '../store.jsx'
import { BusinessLink, Confirm, Dialog, Empty, Field, Heading, Row, SiteLink, Status, Tabs, subPath, useGo } from '../ui.jsx'

const back = { to: '/account/quotes', label: 'Quote requests' }
const dateError = value => value && (!validDate(value) || value < localClock().date) ? 'Choose today or a future date.' : ''
const blank = { serviceType: '', details: '', zipCode: '', preferredDate: '' }

function QuoteFields({ quote }) {
  let amount
  if (typeof quote.quotedAmount === 'number' && Number.isFinite(quote.quotedAmount)) {
    try { amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.currency || 'USD' }).format(quote.quotedAmount) }
    catch { amount = quote.quotedAmount }
  }
  return <dl className="details">
    <div><dt>Service type</dt><dd>{quote.serviceType || 'Service unavailable'}</dd></div>
    <div><dt>Project details</dt><dd>{quote.details || 'Details unavailable'}</dd></div>
    <div><dt>Service ZIP code</dt><dd>{quote.zipCode || 'ZIP unavailable'}</dd></div>
    <div><dt>Preferred date</dt><dd>{quote.preferredDate ? displayDate(quote.preferredDate) : 'No preference'}</dd></div>
    {amount !== undefined && <div><dt>Quoted amount</dt><dd>{amount}</dd></div>}
  </dl>
}

export function QuoteForm({ business, close }) {
  const { mutate } = useWorld()
  const go = useGo()
  const options = services(business)
  const [draft, setDraft] = useState(blank)
  const [errors, setErrors] = useState({})
  const [isReview, setReview] = useState(false)
  const committed = useRef(false)
  const change = key => event => setDraft({ ...draft, [key]: event.target.value })

  function validate(offered) {
    const errors = {}
    if (!offered.includes(draft.serviceType)) errors.serviceType = 'Choose one of the offered services.'
    if (!draft.details.trim()) errors.details = 'Enter a description of the project.'
    if (!/^\d{5}$/.test(draft.zipCode.trim())) errors.zipCode = 'Enter a five-digit ZIP code.'
    if (dateError(draft.preferredDate)) errors.preferredDate = dateError(draft.preferredDate)
    return errors
  }

  function review(event) {
    event.preventDefault()
    const errors = validate(options)
    setErrors(errors)
    if (!Object.keys(errors).length) setReview(true)
  }

  function submit() {
    if (committed.current) return
    let record
    const success = mutate(world => {
      const businessNow = find(world, 'businesses', business.id)
      const errors = validate(services(businessNow))
      if (Object.keys(errors).length) {
        setErrors(errors)
        setReview(false)
        return
      }
      if (!actor(world)) return
      record = {
        id: newId('quote'), userId: world.currentUserId, businessId: business.id, serviceType: draft.serviceType,
        details: draft.details.trim(), zipCode: draft.zipCode.trim(), preferredDate: draft.preferredDate || null,
        status: 'submitted', createdAt: stamp(),
      }
      return append(world, 'quoteRequests', record)
    }, 'Quote request submitted.')
    if (!success) return
    committed.current = true
    close()
    go(subPath('quotes', record.id))
  }

  return <Dialog title={isReview ? 'Review your quote request' : 'Request a quote'} close={close}>
    <p>{businessName(business)}</p>
    {isReview ? <div className="stack">
      <QuoteFields quote={draft} />
      <div className="form-actions"><button type="button" onClick={() => setReview(false)}>Back to details</button>
        <button type="button" className="primary" onClick={submit}>Submit request</button></div>
    </div> : <form className="stack" onSubmit={review} noValidate>
      <Field label="Service type" name="quote-service" error={errors.serviceType}>
        <select value={draft.serviceType} onChange={change('serviceType')}>
          <option value="">Choose a service</option>{options.map(option => <option key={option}>{option}</option>)}
        </select>
      </Field>
      <Field label="Project details" name="quote-details" error={errors.details}><textarea value={draft.details} onChange={change('details')} /></Field>
      <Field label="Service ZIP code" name="quote-zip" error={errors.zipCode}><input inputMode="numeric" autoComplete="postal-code" value={draft.zipCode} onChange={change('zipCode')} /></Field>
      <Field label="Preferred date (optional)" name="quote-date" error={errors.preferredDate}><input type="date" min={localClock().date} value={draft.preferredDate} onChange={change('preferredDate')} /></Field>
      <div className="form-actions"><button type="button" onClick={close}>Cancel</button><button type="submit" className="primary">Review request</button></div>
    </form>}
  </Dialog>
}

export function Quotes() {
  const { world } = useWorld()
  const [tab, setTab] = useState('Active')
  const results = own(world, 'quoteRequests').filter(item => tab === 'Archived' ? item.status === 'archived' : item.status !== 'archived').sort(dated)
  const discover = '/discover?available=quotes'

  return <>
    <Heading title="Quote requests" actions={<SiteLink to={discover} className="button primary">Find a service</SiteLink>}>
      See the project details you’ve shared with local businesses.
    </Heading>
    <Tabs label="Quote request status" values={['Active', 'Archived']} selected={tab} onSelect={setTab} />
    {results.length ? <div className="record-list">{results.map(item => {
      const business = find(world, 'businesses', item.businessId)
      const to = subPath('quotes', item.id)
      return <Row key={item.id} business={business} title={<SiteLink to={to}>{item.serviceType || 'Quote request'}</SiteLink>}
        actions={<SiteLink to={to} className="button">View request</SiteLink>}>
        <p className="metadata">{businessName(business)} · {displayDate(item.createdAt)}</p>
        <div><Status value={item.status} /></div>
      </Row>
    })}</div> : <Empty title={`No ${tab.toLowerCase()} requests`} to={discover} label="Find a service">
      {tab === 'Archived' ? 'Archived requests will appear here.' : 'Choose a local service to start a quote request.'}
    </Empty>}
  </>
}

function RequestDetail({ quote }) {
  const { world, mutate } = useWorld()
  const [confirm, setConfirm] = useState(false)
  const business = find(world, 'businesses', quote.businessId)
  function archive() {
    if (mutate(current => {
      if (!actor(current) || !own(current, 'quoteRequests').some(item => item.id === quote.id && item.status === 'submitted')) return
      const time = stamp()
      return update(current, 'quoteRequests', quote.id, { status: 'archived', archivedAt: time, updatedAt: time })
    }, 'Quote request archived.')) setConfirm(false)
  }

  return <div className="detail">
    <Heading title={quote.serviceType || 'Quote request'} back={back}><BusinessLink business={business} /></Heading>
    <section className="panel stack">
      <div className="tags"><Status value={quote.status} /><span className="metadata">Submitted {displayDate(quote.createdAt)}</span></div>
      <QuoteFields quote={quote} />
      {quote.archivedAt && <p className="metadata">Archived {displayDate(quote.archivedAt)}</p>}
      {actor(world) && quote.status === 'submitted' && <div>
        <button type="button" className="danger" onClick={() => setConfirm(true)}>Archive request</button>
      </div>}
    </section>
    {confirm && <Confirm title="Archive request?" label="Archive request" onConfirm={archive} close={() => setConfirm(false)}>
      This request will move to the Archived list.
    </Confirm>}
  </div>
}

export function QuoteDetail() {
  const { world } = useWorld()
  const { quoteId } = useParams()
  const quote = own(world, 'quoteRequests').find(item => item.id === quoteId)
  return quote ? <RequestDetail key={quoteId} quote={quote} /> :
    <Empty title="Quote request unavailable" to={back.to} label={back.label}>This request could not be found.</Empty>
}
