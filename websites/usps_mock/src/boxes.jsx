import { useState } from 'react'
import { SiteLink, useSiteNavigate } from './navigation.jsx'
import { useStore } from './store.jsx'
import { AddressFields, Field, SelectField, Summary, Wizard } from './ui.jsx'
import { RecordFrame } from './schedules.jsx'
import {
  addMonths, boxSizes, boxTerms, byId, clean, cleanAddress, created, isDate, label,
  makeCode, makeId, money, newest, records, replace, showAddress, showDate, today, updated, validAddress, validEmail,
} from './model.js'

function priceFor(office, size, term) {
  const raw = office?.inventory?.[size]?.prices?.[term]
  if (raw == null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) <= 0) return null
  return Math.round(Number(raw) * 100) / 100
}
const offeredTerms = (office, size) => boxTerms.filter(term => priceFor(office, size, term) !== null)
const availability = (office, size) => office?.inventory?.[size]?.available ?? 0
const officeFor = (state, box) => byId(state, 'postOffices', box?.officeId)

function boxRows(box, office) {
  return [
    ['Post Office', office?.name || (box.officeId ? 'Office unavailable (' + box.officeId + ')' : 'Office unavailable')],
    ['Post Office address', showAddress(office?.address)], ['Box size', boxSizes[box.size]], ['Box number', box.boxNumber || (box.status === 'reserved' ? 'Assigned at the Post Office' : 'Not provided')],
    ['Term', box.termMonths ? box.termMonths + ' months' : null], ['Automatic renewal', box.autoRenew == null ? null : box.autoRenew ? 'On' : 'Off'],
    ['Expiration', box.expiresOn ? showDate(box.expiresOn) : box.status === 'reserved' ? 'Set at activation' : 'Not provided'],
    ['Applicant name', box.applicantName], ['Applicant email', box.applicantEmail], ['Mailing address', showAddress(box.mailingAddress)],
  ]
}

export function BoxDetail({ service, record }) {
  const { state } = useStore()
  const office = officeFor(state, record)
  const renewable = record.status === 'active' && offeredTerms(office, record.size).length > 0
  const transactions = records(state, 'poBoxTransactions').filter(entry => entry.poBoxId === record.id).sort(newest)
  return <RecordFrame service={service} record={record} rows={boxRows(record, office)}
    actions={renewable && <SiteLink className="button primary" to={service.path + '/' + encodeURIComponent(record.id) + '/renew'}>Renew PO Box</SiteLink>}>
    {record.status === 'reserved' && <section className="card detail-section claim-contents"><h2>Pick up your keys</h2>
      <p>Bring your confirmation reference and two forms of identification to {office?.name || 'the listed Post Office'} to activate your box and get access.</p>
    </section>}
    <section className="card detail-section claim-contents"><h2>Payment history</h2>
      {transactions.length ? <ul className="data-list">{transactions.map((entry, i) => <li key={entry.id || i}>
        <div><strong>{label(entry.type)}</strong><small className="meta block">{showDate(entry.createdAt)}{entry.termMonths ? ' · ' + entry.termMonths + ' months' : ''}</small>
          {entry.nextExpiresOn && <small className="block">New expiration {showDate(entry.nextExpiresOn)}</small>}</div>
        <div><strong>{money(entry.amount)}</strong><small className="meta block">{label(entry.status)}</small></div>
      </li>)}</ul> : <p>No payments are linked to this rental.</p>}
    </section>
  </RecordFrame>
}

function OfficeCatalog({ offices, query, setQuery, selected, choose }) {
  const [limit, setLimit] = useState(6)
  const words = clean(query).toLowerCase().split(/[\s,]+/).filter(Boolean)
  const filtered = offices.filter(office => {
    const haystack = [office.name, showAddress(office.address)].join(' ').toLowerCase()
    return words.every(word => haystack.includes(word))
  })
  return <>
    <Field title="Search Post Offices" hint="Enter a ZIP Code, city and state, or Post Office name."><input type="search"
      value={query} placeholder="e.g. 97205 or Portland, OR" onChange={event => { setLimit(6); setQuery(event.target.value) }} /></Field>
    <p className="meta" role="status">{filtered.length} {filtered.length === 1 ? 'location' : 'locations'}</p>
    {filtered.length === 0 && <p>{offices.length ? 'No Post Offices match your search.' : 'There are no Post Offices in this account’s catalog.'}</p>}
    {filtered.slice(0, limit).map((office, officeIndex) => <section className="office-result" key={office.id || officeIndex}>
      <div className="office-title"><h2>{office.name || 'Post Office'}</h2><p>{showAddress(office.address)}</p></div>
      <ul className="office-sizes">{Object.entries(boxSizes).map(([size, name]) => {
        const count = availability(office, size)
        const terms = offeredTerms(office, size)
        const available = Boolean(office.id && count > 0 && terms.length)
        const chosen = selected.officeId === office.id && selected.size === size
        return <li key={size}>
          <div><strong>{name}</strong><small className="block">{available ? count + ' available' : 'Unavailable'}</small></div>
          <div className="price-grid">{boxTerms.map(term => <span key={term}><small>{term} mo.</small><span>{terms.includes(term) ? money(priceFor(office, size, term)) : '—'}</span></span>)}</div>
          <button className={chosen ? 'button primary' : 'button'} type="button" aria-pressed={chosen}
            aria-label={'Select ' + name + ' at ' + (office.name || 'Post Office')} disabled={!available}
            onClick={() => choose(office, size)}>{chosen ? 'Selected' : 'Select'}</button>
        </li>
      })}</ul>
    </section>)}
    {filtered.length > limit && <button className="button" type="button" onClick={() => setLimit(limit + 6)}>Show more locations</button>}
  </>
}

function TermFields({ terms, form, field }) {
  return <>
    <SelectField title="Rental term" value={form.termMonths} options={terms.map(term => [term, term + ' months'])}
      placeholder="Choose a term" onChange={value => {
        field('termMonths', Number(value))
        if (Number(value) === 3) field('autoRenew', true)
      }} />
    <label className="checkbox"><input type="checkbox" checked={form.termMonths === 3 || Boolean(form.autoRenew)}
      disabled={form.termMonths === 3} onChange={event => field('autoRenew', event.target.checked)} />
      <span>Automatically renew this rental {form.termMonths === 3 && <small className="block">Required for 3-month rentals.</small>}</span>
    </label>
  </>
}

function PaymentOption({ amount }) {
  return <fieldset className="field-group">
    <legend>Payment option</legend>
    <label className="checkbox"><input type="radio" name="payment-method" value="account_payment" checked readOnly />
      <span>Account payment · {money(amount)}<small className="block">Synthetic payment. No card details are needed.</small></span></label>
  </fieldset>
}

function transaction(state, box, type, amount, time) {
  return {
    ...created(state, makeId('pobox-txn'), time), poBoxId: box.id, officeId: box.officeId,
    type, status: 'paid', amount, currency: 'USD', quantity: 1, termMonths: box.termMonths, paymentMethod: 'account_payment',
  }
}

export function ReserveForm({ service }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const [query, setQuery] = useState(state.account?.mailingAddress?.zip || '')
  const [form, setForm] = useState(() => ({
    officeId: '', size: '', termMonths: 0, autoRenew: false, termsAccepted: false,
    applicantName: state.account?.fullName || '', applicantEmail: state.account?.email || '', mailingAddress: state.account?.mailingAddress || {},
  }))
  const field = (key, value) => setForm(prior => ({ ...prior, [key]: value }))
  const office = officeFor(state, form)
  const amount = priceFor(office, form.size, form.termMonths)
  const steps = ['Find a PO Box', 'Rental and applicant', 'Review reservation']

  function choose(selectedOffice, size) {
    const terms = offeredTerms(selectedOffice, size)
    const termMonths = terms.includes(6) ? 6 : terms[0]
    setForm(prior => ({ ...prior, officeId: selectedOffice.id, size, termMonths, autoRenew: termMonths === 3 }))
  }

  function validate(step) {
    if (!office || !form.size || availability(office, form.size) < 1) return 'Select an available box size at a Post Office to continue.'
    if (step === 0) return ''
    if (!boxTerms.includes(form.termMonths) || amount === null) return 'Choose a rental term with a catalog price.'
    if (!clean(form.applicantName) || !validEmail(form.applicantEmail)) return 'Enter the applicant’s name and a valid email.'
    if (!validAddress(form.mailingAddress)) return 'Enter a complete mailing address with a valid state and ZIP Code.'
    return form.termsAccepted ? '' : 'Accept the rental terms to continue.'
  }

  async function confirm() {
    const id = makeId('box')
    const time = new Date().toISOString()
    await commit(latest => {
      const selected = officeFor(latest, form)
      const count = availability(selected, form.size)
      if (count < 1 || priceFor(selected, form.size, form.termMonths) !== amount) {
        throw new Error('Availability or pricing changed. Go back and select a current rental option.')
      }
      const box = {
        ...created(latest, id, time), status: 'reserved', confirmationCode: makeCode('PB'), officeId: selected.id, size: form.size,
        termMonths: form.termMonths, autoRenew: form.termMonths === 3 || form.autoRenew, applicantName: clean(form.applicantName),
        applicantEmail: clean(form.applicantEmail), mailingAddress: cleanAddress(form.mailingAddress), termsAccepted: true,
      }
      const entry = transaction(latest, box, 'reservation', amount, time)
      return {
        ...latest, poBoxes: [...records(latest, 'poBoxes'), box], poBoxTransactions: [...records(latest, 'poBoxTransactions'), entry],
        postOffices: records(latest, 'postOffices').map(current => current.id !== selected.id ? current : {
          ...current, inventory: { ...current.inventory, [box.size]: { ...current.inventory[box.size], available: count - 1 } },
        }),
      }
    }, 'PO Box reserved. See your confirmation and pickup instructions below.')
    navigate(service.path + '/' + encodeURIComponent(id), { replace: true })
  }

  function renderStep(step) {
    if (step === 0) return <>
      <OfficeCatalog offices={records(state, 'postOffices')} query={query} setQuery={setQuery} selected={form} choose={choose} />
      {office && <p role="status">Selected {boxSizes[form.size]} at {office.name}</p>}
    </>
    if (step === 1) return <>
      <Summary rows={[[ 'Post Office', office?.name ], ['Box size', boxSizes[form.size]]]} />
      <TermFields terms={offeredTerms(office, form.size)} form={form} field={field} />
      <div className="field-grid">
        <Field title="Applicant name"><input value={form.applicantName} onChange={event => field('applicantName', event.target.value)} /></Field>
        <Field title="Applicant email"><input type="email" value={form.applicantEmail} onChange={event => field('applicantEmail', event.target.value)} /></Field>
      </div>
      <AddressFields title="Mailing address" value={form.mailingAddress} onChange={value => field('mailingAddress', value)} />
      <label className="checkbox"><input type="checkbox" checked={form.termsAccepted} onChange={event => field('termsAccepted', event.target.checked)} />
        <span>I accept the PO Box rental terms.<small className="block">Visit the selected Post Office with identification to activate the rental. Renewal follows the term and preference you choose.</small></span>
      </label>
    </>
    return <>
      <Summary rows={boxRows({ ...form, status: 'reserved' }, office)} />
      <PaymentOption amount={amount} />
    </>
  }

  return <Wizard title={service.name} backTo={service.path} steps={steps} validate={validate} renderStep={renderStep} onConfirm={confirm} confirmLabel="Confirm reservation" />
}

function expiration(box, term) {
  const now = today()
  const base = isDate(box.expiresOn) && box.expiresOn > now ? box.expiresOn : now
  return addMonths(base, term)
}

export function RenewForm({ service, record }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const office = officeFor(state, record)
  const terms = offeredTerms(office, record.size)
  const [form, setForm] = useState(() => ({
    termMonths: terms.includes(record.termMonths) ? record.termMonths : terms[0] || 0,
    autoRenew: Boolean(record.autoRenew),
  }))
  const field = (key, value) => setForm(prior => ({ ...prior, [key]: value }))
  const detail = service.path + '/' + encodeURIComponent(record.id)
  const amount = priceFor(office, record.size, form.termMonths)
  const next = expiration(record, form.termMonths)
  const issue = record.status !== 'active' || !terms.length ? 'A renewal quote is unavailable for this rental.'
    : !terms.includes(form.termMonths) || amount === null ? 'Choose an available renewal term.' : ''

  async function confirm() {
    const time = new Date().toISOString()
    await commit(latest => {
      const original = byId(latest, 'poBoxes', record.id)
      const currentOffice = officeFor(latest, original)
      if (original?.status !== 'active' || priceFor(currentOffice, original.size, form.termMonths) !== amount ||
        original.expiresOn !== record.expiresOn || expiration(original, form.termMonths) !== next) {
        throw new Error('This rental or its pricing changed. Open its current details to continue.')
      }
      const patch = { expiresOn: next, termMonths: form.termMonths, autoRenew: form.termMonths === 3 || form.autoRenew, ...updated(latest, time) }
      const entry = {
        ...transaction(latest, { ...original, ...patch }, 'renewal', amount, time),
        previousExpiresOn: isDate(original.expiresOn) ? original.expiresOn : null, nextExpiresOn: next,
      }
      return { ...replace(latest, 'poBoxes', record.id, patch), poBoxTransactions: [...records(latest, 'poBoxTransactions'), entry] }
    }, 'PO Box renewed.')
    navigate(detail, { replace: true })
  }

  if (record.status !== 'active' || !terms.length) return <section className="card"><h1>Renewal unavailable</h1><p>{issue}</p>
    <SiteLink className="back-link" to={detail}>Return to rental details</SiteLink></section>
  return <Wizard title="rental details" backTo={detail} steps={['Renew PO Box', 'Review renewal']} validate={() => issue} onConfirm={confirm}
    confirmLabel="Confirm renewal" renderStep={step => step === 0 ? <>
      <Summary rows={[[ 'Post Office', office?.name ], ['Box number', record.boxNumber], ['Current expiration', showDate(record.expiresOn)]]} />
      <TermFields terms={terms} form={form} field={field} />
    </> : <>
      <Summary rows={[
        ['Post Office', office?.name], ['Box number', record.boxNumber], ['Current expiration', showDate(record.expiresOn)],
        ['New expiration', showDate(next)], ['Renewal term', form.termMonths + ' months'], ['Automatic renewal', form.termMonths === 3 || form.autoRenew ? 'On' : 'Off'],
      ]} />
      <PaymentOption amount={amount} />
    </>} />
}
