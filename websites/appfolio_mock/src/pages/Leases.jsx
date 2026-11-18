import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { DataTable, Dialog, Facts, Filters, Missing, PageHeader, Panel, Pill, RecordLink, options, useFilters } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import {
  compare, date, dateValue, effectiveEnd, endingSoon, find, matches, money, numberValue, phase, propertyLabel,
  propertyOptions, propertyOrUnit, propertyUnits, recordPath, records, requireValue, shiftDate, textValue,
  today, unitLabel, unitOptions, writeRecord,
} from '../data/model.js'

const root = '/leases'
const back = [root, 'Leases']
const defaultFilters = { q: '', property: '', phase: '', sort: 'end' }
const terms = [
  { name: 'residentName', text: 'Resident name', required: true },
  { name: 'residentEmail', text: 'Resident email', type: 'email' },
  { name: 'startDate', text: 'Start date', type: 'date', required: true },
  { name: 'endDate', text: 'End date', type: 'date', required: true },
  { name: 'monthlyRent', text: 'Monthly rent', type: 'number', required: true },
  { name: 'deposit', text: 'Deposit', type: 'number', required: true },
]
const endFields = [
  { name: 'endedOn', text: 'End date', type: 'date', required: true, wide: true },
  { name: 'endReason', text: 'Reason', type: 'textarea', required: true, wide: true },
]

function saveTerm(state, audit, mode, source, values) {
  const existing = mode === 'edit' ? source : null
  const propertyId = source?.propertyId || values.propertyId
  const unitId = source?.unitId || values.unitId
  const property = find(state.properties, propertyId)
  const unit = find(state.units, unitId)
  requireValue(property?.status === 'active', 'propertyId', 'Select an active property.')
  requireValue(unit?.status === 'active' && unit.propertyId === propertyId, 'unitId', 'Select an active unit at this property.')

  const residentName = textValue(values.residentName, 'residentName', 'a resident name')
  const residentEmail = textValue(values.residentEmail)
  requireValue(!residentEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(residentEmail), 'residentEmail', 'Enter a valid email address.')
  const startDate = dateValue(values.startDate, 'startDate')
  const endDate = dateValue(values.endDate, 'endDate')
  requireValue(endDate >= startDate, 'endDate', 'The end date must be on or after the start date.')
  if (existing?.endedOn) {
    requireValue(startDate <= existing.endedOn && endDate >= existing.endedOn, 'endDate', 'Keep the recorded end date within the term.')
  }
  const leases = records(state.leases)
  if (mode === 'renew') {
    requireValue(!leases.some(lease => lease.renewedFromLeaseId === source.id), 'startDate', 'This lease already has a renewal.')
  }
  const predecessor = mode === 'renew' ? source : find(leases, existing?.renewedFromLeaseId)
  if (predecessor && effectiveEnd(predecessor)) {
    requireValue(startDate > effectiveEnd(predecessor), 'startDate', 'The renewal must start after the preceding term ends.')
  }
  const actualEnd = effectiveEnd({ endDate, endedOn: existing?.endedOn })
  const overlaps = leases.some(lease => lease.id !== existing?.id && lease.unitId === unitId &&
    lease.startDate && effectiveEnd(lease) && lease.startDate <= actualEnd && effectiveEnd(lease) >= startDate)
  requireValue(!overlaps, 'startDate', 'These dates overlap another lease for this unit.')

  const patch = {
    propertyId, unitId, residentName, residentEmail, startDate, endDate,
    monthlyRent: numberValue(values.monthlyRent, 'monthlyRent'), deposit: numberValue(values.deposit, 'deposit'),
    status: existing?.status || 'recorded',
    ...(mode === 'renew' ? { renewedFromLeaseId: source.id } : {}),
  }
  const result = writeRecord(state, 'leases', existing, patch, 'lease', audit)
  return { ...result, message: { new: 'Lease created', edit: 'Lease updated', renew: 'Renewal created' }[mode], path: recordPath(root, result.record.id) }
}

function LeaseForm({ mode, lease, onClose }) {
  const { state, commit } = useWorkspace()
  const navigate = useNavigate()
  const nextStart = shiftDate(lease?.endDate, 1)
  const initial = mode === 'renew' ? { ...lease, startDate: nextStart, endDate: shiftDate(nextStart, 364) }
    : lease || { startDate: today(), deposit: 0 }
  function fields(values) {
    if (mode !== 'new') return terms
    const locations = records(state.properties).filter(property => property.status === 'active')
    const units = propertyUnits(state, values.propertyId).filter(unit => unit.status === 'active')
    return [
      { name: 'propertyId', text: 'Property', entries: [['', 'Select a property'], ...propertyOptions(locations)], required: true, change: () => ({ unitId: '' }) },
      { name: 'unitId', text: 'Unit', entries: [['', 'Select a unit'], ...unitOptions(units)], required: true },
      ...terms,
    ]
  }
  function submit(values) {
    const record = commit((current, audit) => saveTerm(current, audit, mode, lease, values))
    if (mode !== 'edit') navigate(withSid(recordPath(root, record.id)))
  }
  const title = { new: 'New lease', edit: 'Edit lease', renew: 'Renew lease' }[mode]
  return <Dialog title={title} initial={initial} fields={fields} onClose={onClose} onSubmit={submit}
    submit={{ new: 'Create lease', edit: 'Save changes', renew: 'Create renewal' }[mode]} />
}

function EndForm({ lease, onClose }) {
  const { commit } = useWorkspace()
  const initial = { endedOn: today() }
  if (initial.endedOn > lease.endDate) initial.endedOn = lease.endDate
  if (initial.endedOn < lease.startDate) initial.endedOn = lease.startDate
  function submit(values) {
    commit((state, audit) => {
      const endedOn = dateValue(values.endedOn, 'endedOn')
      requireValue(endedOn >= lease.startDate && endedOn <= lease.endDate, 'endedOn', 'Choose a date within the original lease term.')
      const endReason = textValue(values.endReason, 'endReason', 'an end reason')
      const result = writeRecord(state, 'leases', lease, { status: 'ended', endedOn, endReason }, 'lease', audit)
      return { ...result, message: 'Lease end recorded', path: recordPath(root, lease.id) }
    })
  }
  return <Dialog title="End lease" initial={initial} fields={() => endFields} onClose={onClose} onSubmit={submit} submit="Confirm end lease" />
}

export function Leases() {
  const { state } = useWorkspace()
  const [add, setAdd] = useState(false)
  const filters = useFilters(defaultFilters)
  const { q, property, phase: selectedPhase, sort } = filters.values
  const day = today()
  const rows = records(state.leases).filter(lease => (!property || lease.propertyId === property) &&
    (!selectedPhase || (selectedPhase === 'ending' ? endingSoon(lease, day) : phase(lease, day) === selectedPhase)) &&
    matches(q, lease.residentName, propertyLabel(state, lease.propertyId), unitLabel(state, lease.unitId)))
  rows.sort((a, b) => (sort === '-end' ? -1 : 1) * compare(effectiveEnd(a), effectiveEnd(b)) || compare(a.id, b.id))
  return <>
    <PageHeader title="Leases" description="Review resident terms, upcoming expirations and renewals."
      actions={<button className="button" onClick={() => setAdd(true)}>New lease</button>} />
    <Panel>
      <Filters filters={filters} placeholder="Search residents, properties or units" fields={[
        ['Property', 'property', [['', 'All properties'], ...propertyOptions(records(state.properties))]],
        ['Phase', 'phase', [['', 'All phases'], ['ending', 'Ends within 30 days'], ...options(['upcoming', 'active', 'expired', 'ended'])]],
        ['Sort', 'sort', [['end', 'End date (earliest)'], ['-end', 'End date (latest)']]],
      ]} />
      <DataTable key={JSON.stringify(filters.values)} rows={rows} filters={filters} empty="No leases recorded yet."
        columns={[[ 'Resident' ], [ 'Property / unit' ], [ 'Start date' ], [ 'End date', '', 'end' ], [ 'Monthly rent', 'numeric' ], [ 'Phase' ]]}
        sort={{ value: sort, update: value => filters.update('sort', value) }} row={lease => <>
          <td><RecordLink to={recordPath(root, lease.id)}>{lease.residentName || lease.id}</RecordLink></td>
          <td>{propertyOrUnit(state, lease)}</td>
          <td className="nowrap">{date(lease.startDate)}</td><td className="nowrap">{date(effectiveEnd(lease))}</td>
          <td className="numeric">{money(lease.monthlyRent)}</td><td><Pill value={phase(lease, day)} /></td>
        </>} />
    </Panel>
    {add && <LeaseForm mode="new" onClose={() => setAdd(false)} />}
  </>
}

export function LeaseDetail() {
  const { id } = useParams()
  return <LeaseRecord key={id} id={id} />
}

function LeaseRecord({ id }) {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState('')
  const lease = find(state.leases, id)
  if (!lease) return <Missing kind="Lease" back={back} />
  const property = find(state.properties, lease.propertyId)
  const unit = find(state.units, lease.unitId)
  const hasActiveLocation = property?.status === 'active' && unit?.status === 'active' && unit.propertyId === property.id
  const successor = records(state.leases).find(item => item.renewedFromLeaseId === id)
  const predecessor = find(state.leases, lease.renewedFromLeaseId)
  const close = () => setDialog('')
  return <>
    <PageHeader title={lease.residentName || lease.id} description={propertyOrUnit(state, lease)} back={back} actions={<>
      {!lease.endedOn && lease.status !== 'ended' && lease.startDate && lease.endDate &&
        <button className="button secondary" onClick={() => setDialog('end')}>End lease</button>}
      {hasActiveLocation && !successor && lease.endDate && <button className="button secondary" onClick={() => setDialog('renew')}>Renew lease</button>}
      {hasActiveLocation && <button className="button" onClick={() => setDialog('edit')}>Edit lease</button>}
    </>} />
    <div className="detail-grid">
      <Panel title="Lease term">
        <Facts items={[
          ['Lease ID', lease.id], ['Phase', <Pill value={phase(lease)} />], ['Resident email', lease.residentEmail || '—'],
          ['Start date', date(lease.startDate)], ['Original end date', date(lease.endDate)], ['Recorded end date', date(lease.endedOn)],
          ['Monthly rent', money(lease.monthlyRent)], ['Deposit', money(lease.deposit)],
          ...(lease.endReason ? [['End reason', lease.endReason]] : []),
        ]} />
      </Panel>
      <Panel title="Related records">
        <Facts items={[
          ['Property', property ? <RecordLink to={recordPath('/properties', property.id)}>{property.name || property.id}</RecordLink> : propertyLabel(state, lease.propertyId)],
          ['Unit', unitLabel(state, lease.unitId)],
          ['Rent', <RecordLink to={recordPath('/rent', lease.id)}>View rent ledger</RecordLink>],
          ...(lease.renewedFromLeaseId ? [['Renewed from', predecessor ? <RecordLink to={recordPath(root, predecessor.id)}>{predecessor.id}</RecordLink> : lease.renewedFromLeaseId]] : []),
          ...(successor ? [['Renewal', <RecordLink to={recordPath(root, successor.id)}>{successor.id}</RecordLink>]] : []),
        ]} />
      </Panel>
    </div>
    {(dialog === 'edit' || dialog === 'renew') && <LeaseForm mode={dialog} lease={lease} onClose={close} />}
    {dialog === 'end' && <EndForm lease={lease} onClose={close} />}
  </>
}
