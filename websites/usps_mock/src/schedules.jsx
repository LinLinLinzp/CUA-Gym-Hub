import { useState } from 'react'
import { SiteLink, useSiteNavigate } from './navigation.jsx'
import { useStore } from './store.jsx'
import { AddressFields, CancelDialog, Field, SelectField, Status, Summary, Wizard } from './ui.jsx'
import {
  actor, addressKey, addDays, byId, choices, clean, cleanAddress, created, dateDistance,
  dateRange, deliveryMethods, isDate, label, makeCode, makeId, records, replace, showAddress,
  showDate, today, updated, validAddress, validEmail,
} from './model.js'

const moveTypes = { individual: 'Individual', family: 'Family', business: 'Business' }
const forwardingTypes = { permanent: 'Permanent', temporary: 'Temporary' }
const emptyAddress = {}

function moveBasics(form) {
  if (!Object.hasOwn(moveTypes, form.moveType) || !Object.hasOwn(forwardingTypes, form.forwardingType)) return 'Choose a move type and forwarding type.'
  if (!clean(form.moverName)) return 'Enter the name of the person, family, or business moving.'
  if (!validEmail(form.contactEmail)) return 'Enter a valid contact email.'
  if (!validAddress(form.oldAddress)) return 'Enter a complete old mailing address with a valid state and ZIP Code.'
  return ''
}

function moveDestination(form) {
  if (!validAddress(form.newAddress)) return 'Enter a complete new mailing address with a valid state and ZIP Code.'
  if (addressKey(form.oldAddress) === addressKey(form.newAddress)) return 'Enter a new mailing address that differs from the old mailing address.'
  if (!isDate(form.startDate)) return 'Enter a valid forwarding start date.'
  const term = dateDistance(form.startDate, form.endDate)
  if (form.forwardingType === 'temporary' && (!isDate(form.endDate) || term < 15 || term > 185)) {
    return 'Temporary forwarding must last 15 to 185 days.'
  }
  return ''
}

function moveRows(form) {
  return [
    ['Move type', label(form.moveType)], ['Forwarding type', label(form.forwardingType)], ['Mover name', form.moverName],
    ['Contact email', form.contactEmail], ['Old mailing address', showAddress(form.oldAddress)],
    ['New mailing address', showAddress(form.newAddress)], ['Start date', showDate(form.startDate)],
    ['End date', form.forwardingType === 'permanent' ? 'Permanent forwarding' : showDate(form.endDate)],
  ]
}

export function MoveForm({ service, record }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const editing = Boolean(record)
  const [form, setForm] = useState(() => record || ({
    moveType: 'individual', forwardingType: 'permanent', moverName: state.account?.fullName || '',
    contactEmail: state.account?.email || '', oldAddress: state.account?.mailingAddress || emptyAddress,
    newAddress: emptyAddress, startDate: '', endDate: '',
  }))
  const field = (key, value) => setForm(prior => ({ ...prior, [key]: value }))
  const backTo = editing ? service.path + '/' + encodeURIComponent(record.id) : service.path
  const steps = editing ? ['Edit forwarding', 'Review changes'] : ['Move information', 'Destination and dates', 'Review change of address']

  function validate(step) {
    if (!editing && step === 0) return moveBasics(form)
    return (editing ? '' : moveBasics(form)) || moveDestination(form)
  }

  function confirm() {
    const id = record?.id || makeId('coa')
    const time = new Date().toISOString()
    const destination = {
      newAddress: cleanAddress(form.newAddress), startDate: form.startDate,
      endDate: form.forwardingType === 'temporary' ? form.endDate : null,
    }
    commit(latest => {
      if (editing) {
        const original = requireScheduled(latest, service, id)
        const issue = moveDestination({ ...original, ...destination })
        if (issue) throw new Error(issue)
        return replace(latest, service.key, id, { ...destination, ...updated(latest, time) })
      }
      const request = {
        ...created(latest, id, time), ...destination, status: 'scheduled', confirmationCode: makeCode('coa'),
        moveType: form.moveType, forwardingType: form.forwardingType, moverName: clean(form.moverName),
        contactEmail: clean(form.contactEmail), oldAddress: cleanAddress(form.oldAddress),
      }
      return { ...latest, [service.key]: [...records(latest, service.key), request] }
    }, editing ? 'Change of address updated.' : 'Change of address scheduled.')
    navigate(service.path + '/' + encodeURIComponent(id), { replace: true })
  }

  function renderStep(step) {
    if (step === steps.length - 1) return <Summary rows={moveRows(form)} />
    if (!editing && step === 0) return <>
      <div className="field-grid">
        <SelectField title="Move type" value={form.moveType} onChange={value => field('moveType', value)} options={choices(moveTypes)} />
        <SelectField title="Forwarding type" value={form.forwardingType} onChange={value => field('forwardingType', value)} options={choices(forwardingTypes)} />
        <Field title={form.moveType === 'business' ? 'Business name' : 'Mover name'}><input value={form.moverName} onChange={event => field('moverName', event.target.value)} /></Field>
        <Field title="Contact email"><input type="email" value={form.contactEmail} onChange={event => field('contactEmail', event.target.value)} /></Field>
      </div>
      <AddressFields title="Old mailing address" value={form.oldAddress} onChange={value => field('oldAddress', value)} />
    </>
    return <>
      <AddressFields title="New mailing address" value={form.newAddress} onChange={value => field('newAddress', value)} />
      <DateFields form={form} field={field} hasEnd={form.forwardingType === 'temporary'} />
      {form.forwardingType === 'temporary' && <p>Temporary forwarding can last 15 to 185 days.</p>}
    </>
  }

  return <Wizard title={editing ? 'request details' : service.name} backTo={backTo} steps={steps} validate={validate}
    renderStep={renderStep} onConfirm={confirm} confirmLabel={editing ? 'Save changes' : 'Confirm change of address'} />
}

function DateFields({ form, field, hasEnd = true, min, max }) {
  return <div className="field-grid">
    <Field title="Start date"><input type="date" min={min} max={max} value={form.startDate || ''} onChange={event => field('startDate', event.target.value)} /></Field>
    {hasEnd && <Field title="End date"><input type="date" min={form.startDate || undefined} value={form.endDate || ''} onChange={event => field('endDate', event.target.value)} /></Field>}
  </div>
}

function requireScheduled(state, service, id) {
  const current = byId(state, service.key, id)
  if (current?.status !== 'scheduled') throw new Error('This request is no longer scheduled. Open its current details to continue.')
  return current
}

export function RecordFrame({ service, record, rows, actions, children }) {
  return <section className="detail-wrap">
    <SiteLink className="back-link" to={service.path}>← Back to {service.name}</SiteLink>
    <article className="card detail-section">
      <div className="detail-heading"><h1>{service.name}</h1><Status value={record.status} /></div>
      <Summary rows={[
        ['Confirmation reference', record.confirmationCode || record.id], ['Created', showDate(record.createdAt)],
        ...rows, ...(record.cancelledAt ? [['Cancelled', showDate(record.cancelledAt)]] : []),
      ]} />
      <div className="actions">{actions}<button className="button" type="button" onClick={() => window.print()}>Print details</button></div>
    </article>
    {children}
  </section>
}

export function ScheduleDetail({ service, record }) {
  const { commit } = useStore()
  const move = service.key === 'changeOfAddressRequests'
  const editLabel = move ? 'Edit forwarding' : 'Edit hold'
  const cancelLabel = move ? 'Cancel change of address' : 'Cancel mail hold'

  function cancel() {
    const time = new Date().toISOString()
    commit(latest => {
      requireScheduled(latest, service, record.id)
      return replace(latest, service.key, record.id, { status: 'cancelled', cancelledAt: time, cancelledBy: actor(latest), ...updated(latest, time) })
    }, move ? 'Change of address cancelled.' : 'Mail hold cancelled.')
  }

  return <RecordFrame service={service} record={record} rows={move ? moveRows(record) : holdRows(record)}
    actions={record.status === 'scheduled' && <>
      <SiteLink className="button primary" to={service.path + '/' + encodeURIComponent(record.id) + '/edit'}>{editLabel}</SiteLink>
      <CancelDialog action={cancelLabel} description="This will cancel the scheduled request. Its confirmation will remain in your history." onConfirm={cancel} />
    </>} />
}

function holdRows(form) {
  return [
    ['Held address', showAddress(form.address)],
    ['Hold dates', dateRange(form.startDate, form.endDate)],
    ['Duration', form.durationDays ? form.durationDays + ' days' : 'Not provided'],
    ['Return method', deliveryMethods[form.deliveryMethod] || 'Not provided'],
  ]
}

function holdIssue(state, form, id) {
  if (!validAddress(form.address)) return 'Enter a complete mailing address with a valid state and ZIP Code.'
  const offset = dateDistance(today(), form.startDate)
  if (!isDate(form.startDate) || offset < 1 || offset > 30) return 'Choose a start date from tomorrow through 30 days from today.'
  const duration = dateDistance(form.startDate, form.endDate) + 1
  if (!isDate(form.endDate) || duration < 3 || duration > 30) return 'Hold Mail must last 3 to 30 days, including the start and end dates.'
  if (!Object.hasOwn(deliveryMethods, form.deliveryMethod)) return 'Choose how you want to receive mail after the hold.'
  const sameAddress = addressKey(form.address)
  const conflict = records(state, 'holdMailRequests').some(hold =>
    hold.id !== id && hold.status === 'scheduled' && addressKey(hold.address) === sameAddress &&
    isDate(hold.startDate) && isDate(hold.endDate) &&
    dateDistance(hold.endDate, form.startDate) < 4 && dateDistance(form.endDate, hold.startDate) < 4)
  return conflict ? 'Leave at least three full days between scheduled holds at this address.' : ''
}

export function HoldForm({ service, record }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const editing = Boolean(record)
  const [form, setForm] = useState(() => record || ({
    address: state.account?.mailingAddress || emptyAddress, startDate: '', endDate: '', deliveryMethod: 'carrier_delivery',
  }))
  const field = (key, value) => setForm(prior => ({ ...prior, [key]: value }))
  const backTo = editing ? service.path + '/' + encodeURIComponent(record.id) : service.path
  const steps = editing ? ['Edit mail hold', 'Review changes'] : ['Schedule Hold Mail', 'Review mail hold']
  const durationDays = isDate(form.startDate) && isDate(form.endDate) ? dateDistance(form.startDate, form.endDate) + 1 : 0

  function confirm() {
    const id = record?.id || makeId('hold')
    const time = new Date().toISOString()
    const schedule = { startDate: form.startDate, endDate: form.endDate, durationDays, deliveryMethod: form.deliveryMethod }
    commit(latest => {
      const address = editing ? requireScheduled(latest, service, id).address : cleanAddress(form.address)
      const issue = holdIssue(latest, { ...schedule, address }, record?.id)
      if (issue) throw new Error(issue)
      if (editing) return replace(latest, service.key, id, { ...schedule, ...updated(latest, time) })
      const request = {
        ...created(latest, id, time), ...schedule, address, status: 'scheduled', confirmationCode: makeCode('HM'),
      }
      return { ...latest, [service.key]: [...records(latest, service.key), request] }
    }, editing ? 'Mail hold updated.' : 'Mail hold scheduled.')
    navigate(service.path + '/' + encodeURIComponent(id), { replace: true })
  }

  return <Wizard title={editing ? 'request details' : service.name} backTo={backTo} steps={steps} validate={() => holdIssue(state, form, record?.id)}
    onConfirm={confirm} confirmLabel={editing ? 'Save changes' : 'Confirm mail hold'} renderStep={step => step === 1
      ? <Summary rows={holdRows({ ...form, durationDays })} />
      : <>
        {editing ? <Summary rows={[[ 'Held address', showAddress(form.address) ]]} /> : <AddressFields title="Held address" value={form.address} onChange={value => field('address', value)} />}
        <p>Start dates are available from tomorrow through 30 days ahead. Holds last 3 to 30 calendar days.</p>
        <DateFields form={form} field={field} min={addDays(today(), 1)} max={addDays(today(), 30)} />
        <SelectField title="Return method" value={form.deliveryMethod} onChange={value => field('deliveryMethod', value)} options={choices(deliveryMethods)} placeholder="Choose a return method" />
      </>} />
}
