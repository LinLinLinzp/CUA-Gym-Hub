import { useRef, useState } from 'react'
import { useSiteNavigate } from './navigation.jsx'
import { useStore } from './store.jsx'
import { AddressFields, Field, SelectField, Summary, Wizard } from './ui.jsx'
import { RecordFrame } from './schedules.jsx'
import {
  array, byId, choices, claimReasons, clean, cleanAddress, created, dateDistance, evidenceKinds, isDate,
  label, mailServices, makeCode, makeId, money, records, replace, showAddress, showDate, today, updated, validAddress,
} from './model.js'

const claimantRoles = { sender: 'Sender', recipient: 'Recipient' }
const fileTypes = ['application/pdf', 'image/jpeg', 'image/png']
const normalizeTracking = value => clean(value).replace(/[\s-]/g, '').toUpperCase()
const validTracking = value => /^[A-Z0-9]{13,34}$/.test(normalizeTracking(value))
const newItem = () => ({ id: makeId('item'), description: '', quantity: '', unitValue: '' })

function cents(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? ''))
  if (!match) return 0
  const total = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
  return Number.isSafeInteger(total) ? total : 0
}

const validQuantity = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0
const itemTotal = item => validQuantity(item.quantity) ? Number(item.quantity) * cents(item.unitValue) : 0
const claimCents = items => items.reduce((total, item) => total + itemTotal(item), 0)
const kindsFor = reason => Object.keys(evidenceKinds).filter(kind => kind !== 'proof_of_damage' || reason === 'damaged')

function shipmentIssue(form) {
  if (!validTracking(form.trackingNumber)) return 'Enter a tracking number with 13 to 34 letters and digits.'
  if (!isDate(form.mailingDate)) return 'Enter a valid mailing date.'
  if (!Object.hasOwn(mailServices, form.mailService) || !Object.hasOwn(claimantRoles, form.claimantRole) || !Object.hasOwn(claimReasons, form.reason)) {
    return 'Choose a mail service, claimant role, and claim reason.'
  }
  const elapsed = dateDistance(form.mailingDate, today())
  const minimum = form.reason === 'lost' ? (form.mailService === 'priority_mail_express' ? 7 : 15) : 0
  if (elapsed < minimum || elapsed > 60) {
    return minimum ? 'File a lost claim ' + minimum + ' to 60 days after mailing for this service.' : 'File this claim within 60 days from the mailing date.'
  }
  if (!validAddress(form.senderAddress)) return 'Enter a complete sender address with a valid state and ZIP Code.'
  if (!validAddress(form.recipientAddress)) return 'Enter a complete recipient address with a valid state and ZIP Code.'
  return ''
}

function validEvidence(entry, kind) {
  return entry.kind === kind && Boolean(clean(entry.fileName)) && fileTypes.includes(entry.mimeType) && Number.isInteger(entry.sizeBytes) && entry.sizeBytes > 0
}

function itemsIssue(form) {
  const total = claimCents(form.items)
  if (!form.items.length || !Number.isSafeInteger(total) || form.items.some(item => !clean(item.description) || !validQuantity(item.quantity) || !cents(item.unitValue))) {
    return 'Enter at least one item with a description, positive whole quantity, and positive unit value in dollars and cents.'
  }
  const missing = kindsFor(form.reason).find(kind => !form.evidence.some(entry => validEvidence(entry, kind)))
  return missing ? 'Select a PDF, JPEG, or PNG for ' + evidenceKinds[missing].toLowerCase() + '.' : ''
}

function claimRows(form) {
  return [
    ['Tracking number', form.trackingNumber], ['Mailing date', showDate(form.mailingDate)], ['Mail service', mailServices[form.mailService]],
    ['Claimant role', claimantRoles[form.claimantRole]], ['Reason', claimReasons[form.reason]],
    ['Sender address', showAddress(form.senderAddress)], ['Recipient address', showAddress(form.recipientAddress)],
    ['Claim amount', money(form.claimAmount)],
    ...(form.submittedAt ? [['Filed', showDate(form.submittedAt)]] : []),
    ...(form.resolvedAt ? [['Resolved', showDate(form.resolvedAt)]] : []),
    ...(form.approvedAmount != null ? [['Approved amount', money(form.approvedAmount)]] : []),
  ]
}

function ClaimContents({ form }) {
  const items = array(form.items)
  const evidence = array(form.evidence)
  return <>
    <h2>Claimed items</h2>
    {items.length ? <ul className="data-list">{items.map((item, i) => <li key={item.id || i}>
      <span>{item.description || 'Description unavailable'}</span><span>{item.quantity ?? '—'} × {money(item.unitValue)}</span>
    </li>)}</ul> : <p>No items listed.</p>}
    <h2>Evidence</h2>
    {evidence.length ? <ul className="data-list">{evidence.map((entry, i) => <li key={entry.id || i}>
      <span>{evidenceKinds[entry.kind] || label(entry.kind)}</span><span>{entry.fileName || 'File name unavailable'}</span>
    </li>)}</ul> : <p>No evidence listed.</p>}
  </>
}

export function ClaimDetail({ service, record }) {
  return <RecordFrame service={service} record={record} rows={claimRows(record)}>
    <section className="card detail-section claim-contents" aria-label="Claimed items and evidence"><ClaimContents form={record} /></section>
  </RecordFrame>
}

export function ClaimForm({ service, record }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const [form, setForm] = useState(() => ({
    trackingNumber: '', mailingDate: '', mailService: '', claimantRole: 'recipient', reason: '',
    senderAddress: {}, recipientAddress: state.account?.mailingAddress || {},
    ...record, items: Array.isArray(record?.items) ? array(record.items) : [newItem()],
    evidence: array(record?.evidence),
  }))
  const [fileError, setFileError] = useState('')
  const savingDraft = useRef(false)
  const field = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const updateItem = (index, key, value) => field('items', form.items.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const amount = claimCents(form.items) / 100
  const steps = [record ? 'Resume package claim' : 'Shipment and claimant', 'Items and evidence', 'Review package claim']

  async function save(final) {
    if (savingDraft.current) return
    savingDraft.current = true
    try {
      await saveClaim(final)
    } catch (error) {
      savingDraft.current = false
      throw error
    }
  }

  async function saveClaim(final) {
    const id = record?.id || makeId('claim')
    const time = new Date().toISOString()
    const values = {
      trackingNumber: normalizeTracking(form.trackingNumber), mailingDate: form.mailingDate || '',
      mailService: form.mailService || '', claimantRole: form.claimantRole || '', reason: form.reason || '',
      senderAddress: cleanAddress(form.senderAddress), recipientAddress: cleanAddress(form.recipientAddress),
      items: form.items.map(item => ({
        ...item, id: item.id || makeId('item'), description: clean(item.description),
        quantity: validQuantity(item.quantity) ? Number(item.quantity) : item.quantity || '',
        unitValue: cents(item.unitValue) ? cents(item.unitValue) / 100 : item.unitValue || '',
      })),
      evidence: final ? form.evidence.filter(entry => kindsFor(form.reason).includes(entry.kind)) : form.evidence,
      claimAmount: Number.isSafeInteger(claimCents(form.items)) ? amount : 0, currency: 'USD',
      status: final ? 'submitted' : 'draft',
      ...(final ? { confirmationCode: makeCode('CL'), submittedAt: time } : {}),
    }
    await commit(latest => {
      if (record) {
        if (byId(latest, service.key, id)?.status !== 'draft') throw new Error('This claim is no longer an editable draft.')
        return replace(latest, service.key, id, { ...values, ...updated(latest, time) })
      }
      return { ...latest, [service.key]: [...records(latest, service.key), { ...created(latest, id, time), ...values }] }
    }, final ? 'Package claim filed.' : 'Claim draft saved. You can reopen it from the request history.')
    navigate(final ? service.path + '/' + encodeURIComponent(id) : service.path, { replace: true })
  }

  function selectFile(kind, event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!fileTypes.includes(file.type) || file.size < 1) {
      setFileError('Choose a nonempty PDF, JPEG, or PNG file for ' + evidenceKinds[kind].toLowerCase() + '.')
      event.target.value = ''
      return
    }
    setFileError('')
    const prior = form.evidence.find(entry => entry.kind === kind)
    field('evidence', [
      ...form.evidence.filter(entry => entry.kind !== kind),
      { id: prior?.id || makeId('evidence'), kind, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    ])
  }

  function renderStep(step) {
    if (step === 0) return <>
      <div className="field-grid">
        <Field title="Tracking number"><input value={form.trackingNumber ?? ''} onChange={event => field('trackingNumber', event.target.value)} /></Field>
        <Field title="Mailing date"><input type="date" max={today()} value={form.mailingDate || ''} onChange={event => field('mailingDate', event.target.value)} /></Field>
        <SelectField title="Mail service" value={form.mailService} onChange={value => field('mailService', value)} options={choices(mailServices)} placeholder="Choose a service" />
        <SelectField title="Claimant role" value={form.claimantRole} onChange={value => field('claimantRole', value)} options={choices(claimantRoles)} placeholder="Choose a role" />
        <SelectField title="Claim reason" value={form.reason} onChange={value => field('reason', value)} options={choices(claimReasons)} placeholder="Choose a reason" />
      </div>
      <AddressFields title="Sender address" value={form.senderAddress} onChange={value => field('senderAddress', value)} />
      <AddressFields title="Recipient address" value={form.recipientAddress} onChange={value => field('recipientAddress', value)} />
    </>
    if (step === 2) {
      const reviewed = { ...form, trackingNumber: normalizeTracking(form.trackingNumber), claimAmount: amount, evidence: form.evidence.filter(entry => kindsFor(form.reason).includes(entry.kind)) }
      return <><Summary rows={claimRows(reviewed)} /><ClaimContents form={reviewed} /></>
    }
    return <>
      <h2>Claimed items</h2>
      {form.items.map((item, index) => <fieldset className="field-group" key={item.id || index}><legend>Item {index + 1}</legend>
        <div className="field-grid">
          <div className="full"><Field title="Item description"><input value={item.description ?? ''} onChange={event => updateItem(index, 'description', event.target.value)} /></Field></div>
          <Field title="Quantity"><input type="number" min="1" step="1" value={item.quantity ?? ''} onChange={event => updateItem(index, 'quantity', event.target.value)} /></Field>
          <Field title="Unit value (USD)"><input inputMode="decimal" value={item.unitValue ?? ''} onChange={event => updateItem(index, 'unitValue', event.target.value)} /></Field>
          <div className="full"><button className="button" type="button" aria-label={'Remove item ' + (index + 1)} onClick={() => field('items', form.items.filter((_, i) => i !== index))}>Remove item</button></div>
        </div>
      </fieldset>)}
      <div className="amount-line"><button className="button" type="button" onClick={() => field('items', [...form.items, newItem()])}>Add item</button>
        <strong role="status">Claim total {money(amount)}</strong></div>
      <fieldset className="field-group evidence-fields"><legend>Supporting evidence</legend>
        <p>Choose a PDF, JPEG, or PNG. Your account stores the file details.</p>
        {kindsFor(form.reason).map(kind => {
          const selected = form.evidence.find(entry => entry.kind === kind)
          return <div key={kind} className="evidence-field">
            <Field title={evidenceKinds[kind]}><input type="file" accept={fileTypes.join(',')} onChange={event => selectFile(kind, event)} /></Field>
            {selected && <small>{selected.fileName} · {selected.sizeBytes} bytes</small>}
          </div>
        })}
        {fileError && <p className="problem" role="alert">{fileError}</p>}
      </fieldset>
    </>
  }

  async function saveDraft(setMessage) {
    if (savingDraft.current) return
    if (!validTracking(form.trackingNumber)) {
      setMessage('Enter a tracking number with 13 to 34 letters and digits before saving a draft.')
      return
    }
    try {
      await save(false)
    } catch (error) {
      savingDraft.current = false
      setMessage(error.message)
    }
  }

  return <Wizard title={service.name} backTo={service.path} steps={steps}
    validate={step => shipmentIssue(form) || (step > 0 ? itemsIssue(form) : '')} renderStep={renderStep}
    onConfirm={() => save(true)} confirmLabel="File claim"
    extra={({ setMessage, busy }) => <button className="button" type="button" disabled={busy} onClick={() => saveDraft(setMessage)}>Save draft</button>} />
}
