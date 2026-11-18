import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { actorId, associatedCases, belongsToAccount, dateLabel, latest, matchingCases, newId, nextNumber, normalizeReceipt, PENDING, records, recordPath, validReceipt } from './model.js'
import { AccountLink, AddressText, Badge, Confirmation, Empty, ErrorSummary, Field, Heading, Missing, Panel, StepList, useAccountNavigate } from './ui.jsx'

const blankAddress = { line1: '', line2: '', city: '', region: '', postalCode: '', country: 'US' }
const addressBack = { to: '/address-change', label: 'Address change' }
const stepLabels = ['New addresses', 'Pending cases', 'Review and confirm']
const regions = 'AL AK AS AZ AR CA CO CT DE DC FL GA GU HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MP MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VI VA WA WV WI WY'.split(' ')

function addressLabel(state, receiptNumber) {
  if (!validReceipt(receiptNumber)) return 'Enter a receipt number with three letters followed by ten digits.'
  const matches = matchingCases(state, receiptNumber)
  if (!matches.length) return 'No case was found for that receipt number.'
  if (matches.length !== 1 || !matches[0].id) return 'That receipt could not be matched to a single case.'
  if (!PENDING.has(matches[0].status)) return 'That case is closed or no longer pending.'
  return ''
}

function cleanAddress(address) {
  return {
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    region: address.region,
    postalCode: address.postalCode.trim(),
    country: 'US',
  }
}

function addressErrors(address) {
  return {
    line1: address.line1 ? '' : 'Enter a street address.',
    city: address.city ? '' : 'Enter a city.',
    region: regions.includes(address.region) ? '' : 'Select a state or territory.',
    postalCode: /^\d{5}(?:-\d{4})?$/.test(address.postalCode) ? '' : 'Enter a five-digit ZIP code or ZIP+4.',
  }
}

function AddressFields({ kind, address, update, errors }) {
  const title = kind === 'physical' ? 'New physical address' : 'New mailing address'
  const fields = [
    ['line1', 'Street address', 'address-line1'],
    ['line2', 'Apartment, suite, or unit (optional)', 'address-line2'],
    ['city', 'City', 'address-level2'],
    ['region', 'State or territory', 'address-level1'],
    ['postalCode', 'ZIP code', 'postal-code'],
  ]
  return <fieldset className="field-stack">
    <legend>{title}</legend>
    {fields.map(([key, label, autocomplete]) => <Field key={key} id={kind + '-' + key}
      label={label} required={key !== 'line2'} autoComplete={'section-' + kind + ' ' + autocomplete}
      options={key === 'region' ? regions : undefined} value={address[key]} error={errors?.[key]}
      onChange={event => update({ ...address, [key]: event.target.value })} />)}
  </fieldset>
}

function AddressPair({ physical, mailing, prefix = '' }) {
  return <div className="two-column">
    <div><h3>{prefix}Physical address</h3><AddressText address={physical} /></div>
    <div><h3>{prefix}Mailing address</h3><AddressText address={mailing} /></div>
  </div>
}

function CaseLinks({ links, state }) {
  if (!links.length) return <p className="muted">No pending cases listed.</p>
  return <ul className="receipt-list">{links.map((link, index) => {
    const text = link.receiptNumber || 'Receipt unavailable'
    const exists = link.caseId && records(state?.cases).some(item => item.id === link.caseId)
    return <li className="numeric" key={link.caseId || link.receiptNumber || index}>
      {exists ? <AccountLink to={recordPath('/cases', link.caseId)}>{text}</AccountLink> : text}
    </li>
  })}</ul>
}

export function AddressChange() {
  const { state } = useAccount()
  const [started, setStarted] = useState(false)
  const requests = latest(records(state.addressChanges).filter(item => belongsToAccount(state, item)), 'createdAt')
  if (started) return <AddressWizard cancel={() => setStarted(false)} />
  return <>
    <Heading title="Address change" action={<button className="button" type="button" onClick={() => setStarted(true)}>Start address change</button>}>
      View your current addresses or send an update for pending cases.
    </Heading>
    <div className="stack">
      <Panel title="Current addresses"><AddressPair physical={state.profile?.physicalAddress} mailing={state.profile?.mailingAddress} /></Panel>
      <Panel title="Request history">
        {requests.length ? <ul className="record-list">{requests.map((item, index) => <li className="record-row" key={item.id || index}>
          <div className="record-main">
            {item.id ? <AccountLink className="record-title numeric" to={recordPath('/address-change', item.id)}>{item.confirmationNumber || 'View address request'}</AccountLink> :
              <strong className="numeric">{item.confirmationNumber || 'Address change request'}</strong>}
            <span className="meta">{dateLabel(item.createdAt)}</span>
          </div>
          <Badge status={item.status} />
        </li>)}</ul> : <Empty>No address change requests yet.</Empty>}
      </Panel>
    </div>
  </>
}

function AddressWizard({ cancel }) {
  const { state, commit } = useAccount()
  const navigate = useAccountNavigate()
  const [step, setStep] = useState(0)
  const [physical, setPhysical] = useState(blankAddress)
  const [mailing, setMailing] = useState(blankAddress)
  const [same, setSame] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [none, setNone] = useState(false)
  const [input, setInput] = useState('')
  const [errors, setErrors] = useState({})
  const receiptField = useRef(null)
  const confirming = useRef(false)
  const choices = associatedCases(state).filter(item => PENDING.has(item.status))
    .filter(item => validReceipt(normalizeReceipt(item.receiptNumber)) && matchingCases(state, normalizeReceipt(item.receiptNumber)).length === 1)

  function move(index) {
    setErrors({})
    setStep(index)
  }

  function toggle(receiptNumber) {
    setErrors({})
    setNone(false)
    setReceipts(selected => selected.includes(receiptNumber) ?
      selected.filter(receipt => receipt !== receiptNumber) : [...selected, receiptNumber])
  }

  function chooseNone(checked) {
    setErrors({})
    setNone(checked)
    if (checked) {
      setReceipts([])
      setInput('')
    }
  }

  function addReceipt() {
    const receiptNumber = normalizeReceipt(input)
    const issue = addressLabel(state, receiptNumber) || (receipts.includes(receiptNumber) ? 'That receipt is already listed.' : '')
    if (issue) {
      setErrors({ receipt: issue })
      receiptField.current?.focus()
      return
    }
    setNone(false)
    setReceipts(selected => selected.includes(receiptNumber) ? selected : [...selected, receiptNumber])
    setInput('')
    setErrors({})
  }

  function submit(event) {
    event.preventDefault()
    if (confirming.current) return
    const newPhysicalAddress = cleanAddress(physical)
    const newMailingAddress = same ? newPhysicalAddress : cleanAddress(mailing)
    if (step === 0) {
      const physicalErrors = addressErrors(newPhysicalAddress)
      const mailingErrors = same ? {} : addressErrors(newMailingAddress)
      if ([...Object.values(physicalErrors), ...Object.values(mailingErrors)].some(Boolean)) {
        setErrors({ physical: physicalErrors, mailing: mailingErrors, summary: 'Complete the required address fields.' })
        return
      }
      move(1)
      return
    }
    if (step === 1) {
      if (input.trim()) {
        setErrors({ receipt: 'Add this receipt to your list or clear the field before continuing.' })
        receiptField.current?.focus()
        return
      }
      if (!none && !receipts.length) {
        setErrors({ summary: 'Select a pending case or indicate that you have no pending cases.' })
        return
      }
      move(2)
      return
    }
    confirming.current = true
    let requestId
    let issue
    const saved = commit(current => {
      const selected = none ? [] : receipts
      issue = selected.map(receipt => addressLabel(current, receipt)).find(Boolean)
      if (issue || (!none && !selected.length)) return current
      const caseLinks = selected.map(receiptNumber => ({ receiptNumber, caseId: matchingCases(current, receiptNumber)[0].id }))
      const linked = new Set(caseLinks.map(link => link.caseId))
      const now = new Date().toISOString()
      requestId = newId('ac')
      const requests = records(current.addressChanges)
      const request = {
        id: requestId,
        confirmationNumber: nextNumber(requests, 'confirmationNumber', 'COA-', 6, 1),
        previousPhysicalAddress: current.profile?.physicalAddress ?? null,
        previousMailingAddress: current.profile?.mailingAddress ?? null,
        newPhysicalAddress, newMailingAddress, mailingSameAsPhysical: same, caseLinks,
        status: 'submitted', actorId: actorId(current), createdAt: now,
      }
      return {
        ...current,
        profile: { ...current.profile, physicalAddress: newPhysicalAddress, mailingAddress: newMailingAddress, updatedAt: now },
        cases: linked.size ? records(current.cases).map(item => linked.has(item.id) ?
          { ...item, mailingAddress: newMailingAddress, addressChangeId: requestId } : item) : current.cases,
        addressChanges: [...requests, request],
      }
    })
    if (saved) {
      navigate(recordPath('/address-change', requestId))
    } else {
      confirming.current = false
      setStep(1)
      setErrors({ summary: issue || 'Select a pending case or indicate that you have no pending cases.' })
    }
  }

  return <div className="wizard">
    <Heading title="Change your address">Update your physical and mailing addresses and select any pending cases that should use the new mailing address.</Heading>
    <StepList steps={stepLabels} current={step} />
    <Panel title={stepLabels[step]}>
      <form className="field-stack" onSubmit={submit} noValidate>
        {errors.summary && <ErrorSummary>{errors.summary}</ErrorSummary>}
        {step === 0 && <>
          <AddressFields kind="physical" address={physical} update={setPhysical} errors={errors.physical} />
          <label className="check-line"><input type="checkbox" checked={same} onChange={event => { setSame(event.target.checked); setErrors({}) }} />My mailing address is the same as my physical address</label>
          {!same && <AddressFields kind="mailing" address={mailing} update={setMailing} errors={errors.mailing} />}
        </>}
        {step === 1 && <>
          <fieldset className="field-stack">
            <legend>Eligible tracked cases</legend>
            {choices.length ? choices.map(item => {
              const receiptNumber = normalizeReceipt(item.receiptNumber)
              return <label className="check-line" key={item.id}>
                <input type="checkbox" checked={receipts.includes(receiptNumber)} onChange={() => toggle(receiptNumber)} />
                <span><strong className="numeric">{receiptNumber}</strong> <span className="meta">{item.formCode || ''}</span></span>
              </label>
            }) : <Empty>No tracked cases are eligible for an address update.</Empty>}
          </fieldset>
          <div className="inline-form">
            <Field id="address-receipt" label="Other pending receipt number" hint="Add a receipt for a pending case you do not track." disabled={none}
              value={input} ref={receiptField} error={errors.receipt}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addReceipt() } }}
              onChange={event => { setInput(event.target.value); setErrors({}) }} />
            <button className="button secondary" type="button" disabled={none} onClick={addReceipt}>Add receipt</button>
          </div>
          {receipts.length > 0 && <div className="inset">
            <h3>Selected receipts</h3>
            <ul className="record-list">{receipts.map(receiptNumber => <li className="record-row" key={receiptNumber}>
              <span className="numeric">{receiptNumber}</span>
              <button className="text-button" type="button" aria-label={'Remove ' + receiptNumber} onClick={() => toggle(receiptNumber)}>Remove</button>
            </li>)}</ul>
          </div>}
          <label className="check-line"><input type="checkbox" checked={none} onChange={event => chooseNone(event.target.checked)} />I have no pending cases</label>
        </>}
        {step === 2 && <>
          <div className="inset"><AddressPair physical={cleanAddress(physical)} mailing={same ? cleanAddress(physical) : cleanAddress(mailing)} prefix="New " /></div>
          <div><h3>Cases to update</h3><CaseLinks links={receipts.map(receiptNumber => ({ receiptNumber }))} /></div>
        </>}
        <div className="actions">
          {step > 0 && <button className="button secondary" type="button" onClick={() => move(step - 1)}>Back</button>}
          <button className="button" type="submit">{step === 2 ? 'Submit address change' : 'Continue'}</button>
          <button className="button quiet" type="button" onClick={cancel}>Cancel</button>
        </div>
      </form>
    </Panel>
  </div>
}

export function AddressDetail() {
  const { state } = useAccount()
  const { requestId } = useParams()
  const request = records(state.addressChanges).find(item => item.id === requestId && belongsToAccount(state, item))
  if (!request) return <Missing title="Address change request unavailable" to="/address-change" label="Return to address change" />
  return <div className="stack wizard">
    <div><AccountLink className="back-link" to={addressBack.to}>← {addressBack.label}</AccountLink></div>
    <Confirmation title="Address change submitted">
      <p>Your request is available in your address change history.</p>
      <dl className="details inset panel-action">
        <div><dt>Confirmation number</dt><dd className="numeric">{request.confirmationNumber || 'Confirmation unavailable'}</dd></div>
        <div><dt>Submitted</dt><dd className="numeric">{dateLabel(request.createdAt)}</dd></div>
        <div><dt>Status</dt><dd><Badge status={request.status} /></dd></div>
      </dl>
    </Confirmation>
    <Panel title="New addresses"><AddressPair physical={request.newPhysicalAddress} mailing={request.newMailingAddress} /></Panel>
    <Panel title="Cases linked to this request"><CaseLinks links={records(request.caseLinks)} state={state} /></Panel>
    <Panel title="Previous addresses"><AddressPair physical={request.previousPhysicalAddress} mailing={request.previousMailingAddress} /></Panel>
  </div>
}
