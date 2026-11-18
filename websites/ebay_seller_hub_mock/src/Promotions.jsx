import React, { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { actor, append, byText, date, effectivePromotion, event, find, match, money, newId, oneCentValue, promoStatuses, promoTypes, recordPath, replace, rows, timestamp } from './model.js'
import { useStore } from './store.jsx'
import { Back, Dialog, ErrorMessage, Field, History, Icon, LinkTo, Missing, PageTitle, Queue, Status, useBrowse, useHrefFor } from './ui.jsx'

const types = Object.fromEntries(promoTypes)
const sorts = [['newest', 'Newest created'], ['start', 'Start date'], ['end', 'End date'], ['name', 'Name A–Z']]
const discountLabel = discount => !discount?.value ? '—' : discount.kind === 'percent' ? discount.value + '% off' : money(discount.value) + ' off'
const productCount = item => Array.isArray(item.listingIds) ? item.listingIds.length : 0

export function Promotions() {
  const { state } = useStore()
  const browse = useBrowse('newest')
  const promotions = rows(state.promotions)
  const now = new Date()
  const statusOf = item => effectivePromotion(item, now)
  const filtered = promotions.filter(item => (!browse.status || statusOf(item) === browse.status) &&
    (!browse.filter || item.type === browse.filter) && match(browse.query, item.name, item.code, item.id))
    .sort((a, b) => {
      if (browse.sort === 'start') return byText(a.startsAt || '9999', b.startsAt || '9999')
      if (browse.sort === 'end') return byText(a.endsAt || '9999', b.endsAt || '9999')
      if (browse.sort === 'name') return byText(a.name, b.name)
      return byText(b.createdAt, a.createdAt)
    })
  const create = <LinkTo to="/promotions/new" className="button primary"><Icon name="plus" />Create promotion</LinkTo>
  return <>
    <PageTitle title="Promotions" action={create}>Plan and manage discounts across your inventory.</PageTitle>
    <Queue label="Promotions" browse={browse} records={promotions} filtered={filtered} statuses={promoStatuses} statusOf={statusOf}
      searchLabel="Search by promotion name or code" filterLabel="Promotion type" filters={[[ '', 'All types'], ...promoTypes]} sorts={sorts} emptyAction={create}
      columns={[{ label: 'Promotion' }, { label: 'Type' }, { label: 'Discount' }, { label: 'Start date' }, { label: 'End date' }, { label: 'Status' }, { label: 'Actions' }]}
      renderRow={(item, index) => {
        const status = statusOf(item)
        const path = item.id && recordPath('promotions', item.id)
        return <tr key={item.id || index}>
          <td>{path ? <LinkTo to={path}>{item.name || 'Untitled promotion'}</LinkTo> : item.name || 'Untitled promotion'}<small>{item.code || productCount(item) + ' listings'}</small></td>
          <td>{types[item.type] || '—'}</td><td>{discountLabel(item.discount)}</td><td>{date(item.startsAt)}</td><td>{date(item.endsAt)}</td>
          <td><Status value={status} /></td><td>{path && <LinkTo to={['draft', 'scheduled'].includes(status) ? path + '/edit' : path}>{['draft', 'scheduled'].includes(status) ? 'Edit' : 'View'}</LinkTo>}</td>
        </tr>
      }} />
  </>
}

const steps = ['Offer details', 'Eligible inventory', 'Dates and review']
const fieldSteps = {
  name: 0, type: 0, discountKind: 0, discountValue: 0, code: 0, minimumOrderTotal: 0,
  listingIds: 1, startsAt: 2, endsAt: 2,
}

function localTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function isoTime(value, existing) {
  if (!value) return null
  if (existing && localTime(existing) === value) return existing
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function validate(state, original, values, mode, now) {
  const errors = {}
  const publishing = mode !== 'draft'
  const startsAt = mode === 'launch' ? now : isoTime(values.startsAt, original?.startsAt)
  const endsAt = isoTime(values.endsAt, original?.endsAt)
  if (!values.name) errors.name = 'Enter a promotion name.'
  if (!types[values.type]) errors.type = 'Select a promotion type.'
  if (publishing || values.discountValue) {
    if (!['percent', 'fixed'].includes(values.discountKind)) errors.discountKind = 'Select a discount method.'
    if (!oneCentValue(values.discountValue) || Number(values.discountValue) <= 0 ||
        (values.discountKind === 'percent' && Number(values.discountValue) > 100)) {
      errors.discountValue = values.discountKind === 'percent' ? 'Enter a percentage above zero and up to 100.' : 'Enter a positive amount with up to two decimal places.'
    }
  }
  if (values.type === 'order_discount' && (publishing || values.minimumOrderTotal) &&
      (!oneCentValue(values.minimumOrderTotal) || Number(values.minimumOrderTotal) <= 0)) errors.minimumOrderTotal = 'Enter a positive minimum subtotal.'
  if (values.type === 'coupon' && (publishing || values.code)) {
    if (!/^[A-Z0-9_-]{3,32}$/.test(values.code)) errors.code = 'Use 3–32 letters, numbers, hyphens, or underscores.'
    else if (rows(state.promotions).some(item => item.id !== original?.id && String(item.code || '').trim().toUpperCase() === values.code)) errors.code = 'This coupon code is already in use.'
  }
  if (publishing) {
    const eligible = new Set(rows(state.listings).filter(item => item.status === 'active').map(item => item.id))
    if (!values.listingIds.length || !values.listingIds.every(id => eligible.has(id))) errors.listingIds = 'Select at least one listing and remove any unavailable listings.'
  }
  if ((mode === 'schedule' && (!startsAt || Date.parse(startsAt) <= Date.parse(now))) || (values.startsAt && !startsAt)) errors.startsAt = 'Enter a valid future start date.'
  if ((publishing && !endsAt) || (values.endsAt && !endsAt) ||
      (endsAt && ((startsAt && Date.parse(endsAt) <= Date.parse(startsAt)) || (publishing && Date.parse(endsAt) <= Date.parse(now))))) {
    errors.endsAt = 'Enter an end date after the start.'
  }
  return { errors, startsAt, endsAt }
}

function savePromotion(state, original, values, mode, id) {
  const now = timestamp()
  const latest = find(state.promotions, original?.id)
  if (original && (!latest || !['draft', 'scheduled'].includes(effectivePromotion(latest)))) throw new Error('This promotion can no longer be edited.')
  const { errors, startsAt, endsAt } = validate(state, latest, values, mode, now)
  if (Object.keys(errors).length) throw new Error('Review the promotion details before saving.')
  const status = { draft: 'draft', launch: 'active', schedule: 'scheduled' }[mode]
  const item = {
    ...latest, id, name: values.name, type: values.type, status, listingIds: values.listingIds,
    createdAt: latest?.createdAt || now, actorId: latest?.actorId || actor(state),
  }
  if (values.discountValue) item.discount = { kind: values.discountKind, value: Number(values.discountValue) }
  else delete item.discount
  if (values.type === 'coupon' && values.code) item.code = values.code
  else delete item.code
  if (values.type === 'order_discount' && values.minimumOrderTotal) item.minimumOrderTotal = Number(values.minimumOrderTotal)
  else delete item.minimumOrderTotal
  if (startsAt) item.startsAt = startsAt
  else delete item.startsAt
  if (endsAt) item.endsAt = endsAt
  else delete item.endsAt
  if (latest && JSON.stringify(item) === JSON.stringify(latest)) return state
  item.updatedAt = now
  if (mode !== 'draft') item.publishedAt = latest?.publishedAt || now
  const details = { previousStatus: latest?.status || null, status }
  const events = [event(state, latest ? 'promotion_revised' : 'promotion_created', 'promotion', id, now, details)]
  if (mode === 'launch' || (mode === 'schedule' && (latest?.status !== 'scheduled' || latest.startsAt !== startsAt))) {
    events.push(event(state, mode === 'launch' ? 'promotion_started' : 'promotion_scheduled', 'promotion', id, now, details))
  }
  return { ...state, promotions: replace(state.promotions, item), activity: append(state, 'activity', ...events) }
}

export function PromotionEditor() {
  const { id } = useParams()
  const { state } = useStore()
  const item = find(state.promotions, id)
  if (id && !item) return <Missing name="Promotion" to="/promotions" label="Back to Promotions" />
  if (item && !['draft', 'scheduled'].includes(effectivePromotion(item))) {
    return <Missing name="Promotion editor" to={recordPath('promotions', id)} label="View promotion" />
  }
  return <PromotionForm key={id || 'new'} item={item} />
}

function PromotionForm({ item }) {
  const { state, commit } = useStore()
  const hrefFor = useHrefFor()
  const navigate = useNavigate()
  const submitted = useRef(false)
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('schedule')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [values, setValues] = useState(() => ({
    name: item?.name ?? '', type: item?.type || 'sale_event', discountKind: item?.discount?.kind || 'percent',
    discountValue: item?.discount?.value ?? '', code: item?.code ?? '', minimumOrderTotal: item?.minimumOrderTotal ?? '',
    listingIds: Array.isArray(item?.listingIds) ? item.listingIds : [],
    startsAt: localTime(item?.startsAt), endsAt: localTime(item?.endsAt),
  }))
  const scheduled = item && effectivePromotion(item) === 'scheduled'
  const active = rows(state.listings).filter(listing => listing.id && listing.status === 'active')
  const offers = active.filter(listing => match(query, listing.title, listing.sku, listing.id))
  const activeIds = new Set(active.map(listing => listing.id))
  const invalidIds = values.listingIds.filter(id => !activeIds.has(id))
  const input = key => ({ value: values[key], 'aria-invalid': !!errors[key], onChange: evt => setValues(current => ({ ...current, [key]: evt.target.value })) })
  const toggle = id => setValues(current => ({
    ...current, listingIds: current.listingIds.includes(id) ? current.listingIds.filter(value => value !== id) : [...current.listingIds, id],
  }))

  function submit(evt) {
    evt.preventDefault()
    if (submitted.current) return
    const submitMode = evt.nativeEvent.submitter?.value || (step < 2 ? 'next' : mode)
    if (submitMode === 'next') {
      setStep(current => Math.min(2, current + 1))
      return
    }
    const clean = { ...values, name: values.name.trim(), code: values.code.trim().toUpperCase() }
    const { errors } = validate(state, item, clean, submitMode, timestamp())
    setErrors(errors)
    if (Object.keys(errors).length) {
      setStep(Math.min(...Object.keys(errors).map(key => fieldSteps[key])))
      setMessage('Review the highlighted fields.')
      return
    }
    const id = item?.id || newId('promo')
    const done = submitMode === 'draft' ? 'Promotion draft saved.' : submitMode === 'launch' ? 'Promotion launched.' : scheduled ? 'Promotion updated.' : 'Promotion scheduled.'
    const result = commit(current => savePromotion(current, item, clean, submitMode, id), done)
    if (result.error) setMessage(result.error)
    else {
      submitted.current = true
      navigate(hrefFor(recordPath('promotions', id)))
    }
  }

  const back = item ? recordPath('promotions', item.id) : '/promotions'
  return <>
    <Back to={back}>{item ? 'Back to promotion' : 'Back to Promotions'}</Back>
    <PageTitle title={item ? 'Edit promotion' : 'Create promotion'}>{item?.name || 'Set up an offer for selected inventory.'}</PageTitle>
    <form className="panel padded editor" onSubmit={submit} noValidate>
      <nav className="steps" aria-label="Promotion editor steps">{steps.map((label, index) =>
        <button type="button" key={label} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <h2>{steps[step]}</h2>
      <ErrorMessage>{message}</ErrorMessage>
      {step === 0 && <div className="form-grid">
        <Field label="Promotion name" wide error={errors.name}><input maxLength={100} {...input('name')} /></Field>
        <Field label="Promotion type" error={errors.type}><select {...input('type')}>{promoTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
        <Field label="Discount method" error={errors.discountKind}><select {...input('discountKind')}><option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option></select></Field>
        <Field label={values.discountKind === 'percent' ? 'Discount (%)' : 'Discount (USD)'} error={errors.discountValue}><input type="number" min="0.01" step="0.01" {...input('discountValue')} /></Field>
        {values.type === 'order_discount' && <Field label="Minimum subtotal (USD)" error={errors.minimumOrderTotal}><input type="number" min="0.01" step="0.01" {...input('minimumOrderTotal')} /></Field>}
        {values.type === 'coupon' && <Field label="Coupon code" error={errors.code}><input maxLength={32} {...input('code')} /></Field>}
      </div>}
      {step === 1 && <>
        <div className="inventory-head"><label className="search"><Icon name="search" /><input type="search" aria-label="Search eligible inventory" placeholder="Search by title or SKU" value={query} onChange={evt => setQuery(evt.target.value)} /></label><strong>{values.listingIds.length} selected</strong></div>
        <ErrorMessage>{errors.listingIds}</ErrorMessage>
        <div className="inventory" role="region" aria-label="Eligible listings" tabIndex={0}>
          {invalidIds.map(id => <label key={id}><input type="checkbox" checked onChange={() => toggle(id)} /><span>{id} (unavailable)</span></label>)}
          {offers.map(listing => <label key={listing.id}><input type="checkbox" checked={values.listingIds.includes(listing.id)} onChange={() => toggle(listing.id)} /><span>{listing.title || listing.id}<small>{listing.sku}</small></span></label>)}
          {!offers.length && <p className="muted">No eligible listings match your search.</p>}
        </div>
      </>}
      {step === 2 && <>
        <div className="form-grid">
          <Field label="Publishing option"><select value={mode} onChange={evt => setMode(evt.target.value)}><option value="schedule">Schedule a start</option><option value="launch">Launch immediately</option></select></Field>
          <div className="wide form-grid">
            {mode === 'schedule' && <Field label="Start date and time" error={errors.startsAt}><input type="datetime-local" {...input('startsAt')} /></Field>}
            <Field label="End date and time" error={errors.endsAt}><input type="datetime-local" {...input('endsAt')} /></Field>
          </div>
        </div>
        <dl className="facts review"><div><dt>Promotion</dt><dd>{values.name || '—'}</dd></div><div><dt>Type</dt><dd>{types[values.type] || '—'}</dd></div>
          <div><dt>Discount</dt><dd>{discountLabel({ kind: values.discountKind, value: values.discountValue })}</dd></div>
          <div><dt>Inventory</dt><dd>{values.listingIds.length} selected</dd></div></dl>
      </>}
      <div className="form-actions">
        {step > 0 ? <button type="button" className="button" onClick={() => setStep(step - 1)}>Previous step</button> : <LinkTo className="button" to={back}>Cancel</LinkTo>}
        {!scheduled && <button className="button" value="draft">Save draft</button>}
        {step < 2 ? <button className="button primary" value="next">Continue</button> : <button className="button primary" value={mode}>{mode === 'launch' ? 'Launch promotion' : scheduled ? 'Save changes' : 'Schedule promotion'}</button>}
      </div>
    </form>
  </>
}

function endPromotion(state, id) {
  const item = find(state.promotions, id)
  const status = item && effectivePromotion(item)
  if (!['active', 'scheduled'].includes(status)) throw new Error('This promotion is no longer active or scheduled.')
  const now = timestamp()
  return { ...state, promotions: replace(state.promotions, { ...item, status: 'ended', endedAt: now, updatedAt: now }),
    activity: append(state, 'activity', event(state, 'promotion_ended', 'promotion', id, now, { previousStatus: status, status: 'ended' })) }
}

export function PromotionDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [end, setEnd] = useState(false)
  const item = find(state.promotions, id)
  if (!item) return <Missing name="Promotion" to="/promotions" label="Back to Promotions" />
  const status = effectivePromotion(item)
  const path = recordPath('promotions', id)
  const ids = Array.isArray(item.listingIds) ? item.listingIds : []
  return <>
    <Back to="/promotions">Back to Promotions</Back>
    <PageTitle title={item.name || 'Untitled promotion'} action={<Status value={status} />}>{types[item.type] || id}</PageTitle>
    <div className="detail-grid">
      <div className="stack">
        <section className="panel padded"><h2>Offer details</h2>
          <dl className="facts"><div><dt>Discount</dt><dd>{discountLabel(item.discount)}</dd></div>
            {item.code && <div><dt>Coupon code</dt><dd>{item.code}</dd></div>}
            {item.minimumOrderTotal != null && <div><dt>Minimum subtotal</dt><dd>{money(item.minimumOrderTotal)}</dd></div>}
            <div><dt>Starts</dt><dd>{date(item.startsAt, true)}</dd></div><div><dt>Ends</dt><dd>{date(item.endsAt, true)}</dd></div>
            {item.endedAt && <div><dt>Ended</dt><dd>{date(item.endedAt, true)}</dd></div>}
          </dl>
          <div className="inline-actions">
            {['draft', 'scheduled'].includes(status) && <LinkTo className="button primary" to={path + '/edit'}>Edit promotion</LinkTo>}
            {['active', 'scheduled'].includes(status) && <button className="button" onClick={() => setEnd(true)}>End promotion</button>}
          </div>
        </section>
        <section className="panel padded"><h2>Eligible inventory</h2>
          {ids.length ? <ul className="record-list">{ids.map((listingId, index) => {
            const listing = find(state.listings, listingId)
            return <li key={index}>{listing ? <LinkTo to={recordPath('listings', listing.id)}>{listing.title || listingId}</LinkTo> : <span>{listingId}</span>}
              {listing && <Status value={listing.status} />}</li>
          })}</ul> : <p className="muted">No listings selected.</p>}
        </section>
      </div>
      <aside><History kind="promotion" id={id} /></aside>
    </div>
    {end && <Dialog title="End promotion?" confirm="End promotion" danger onClose={() => setEnd(false)}
      onConfirm={() => commit(current => endPromotion(current, id), 'Promotion ended.')}>
      <p>This offer will no longer be available to buyers.</p>
    </Dialog>}
  </>
}
