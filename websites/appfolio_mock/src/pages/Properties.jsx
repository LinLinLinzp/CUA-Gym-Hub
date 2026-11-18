import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { DataTable, Dialog, Facts, Filters, Missing, PageHeader, Panel, Pill, RecordLink, options, useFilters } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import {
  address, choice, compare, date, effectiveEnd, find, label, locationStatuses, matches, money, numberValue,
  phase, propertyTypes, propertyUnits, recordPath, records, requireValue, textValue, today, unitLabel, writeRecord,
} from '../data/model.js'

const root = '/properties'
const back = [root, 'Properties']
const defaultFilters = { q: '', type: '', status: '', sort: 'name' }
const propertyFields = [
  { name: 'name', text: 'Property name', required: true, wide: true },
  { name: 'address1', text: 'Street address', required: true },
  { name: 'address2', text: 'Address line 2' },
  { name: 'city', text: 'City', required: true },
  { name: 'region', text: 'State / region', required: true },
  { name: 'postalCode', text: 'Postal code', required: true },
  { name: 'type', text: 'Property type', entries: options(propertyTypes), required: true },
  { name: 'status', text: 'Status', entries: options(locationStatuses), required: true },
  { name: 'notes', text: 'Notes', type: 'textarea', wide: true },
]
const unitFields = [
  { name: 'label', text: 'Unit label', required: true, wide: true },
  { name: 'beds', text: 'Beds', type: 'number', required: true },
  { name: 'baths', text: 'Baths', type: 'number', required: true },
  { name: 'marketRent', text: 'Market rent', type: 'number', required: true },
  { name: 'status', text: 'Status', entries: options(locationStatuses), required: true },
  { name: 'rentReady', text: 'Rent-ready', type: 'checkbox' },
]

function hasLiveLease(state, matchesLocation) {
  const day = today()
  return records(state.leases).some(lease => matchesLocation(lease) &&
    phase(lease, day) !== 'ended' && effectiveEnd(lease) >= day)
}

function PropertyForm({ property, onClose }) {
  const { commit } = useWorkspace()
  const navigate = useNavigate()
  const initial = property ? { type: 'multifamily', status: 'active', ...property } : { type: 'multifamily', status: 'active' }
  function submit(values) {
    const record = commit((state, audit) => {
      const patch = {
        name: textValue(values.name, 'name', 'a property name'),
        address1: textValue(values.address1, 'address1', 'the street address'),
        address2: textValue(values.address2),
        city: textValue(values.city, 'city', 'a city'),
        region: textValue(values.region, 'region', 'a state or region'),
        postalCode: textValue(values.postalCode, 'postalCode', 'a postal code'),
        type: choice(values.type, propertyTypes, 'type', 'a property type'),
        status: choice(values.status, locationStatuses, 'status', 'a status'),
        notes: textValue(values.notes),
      }
      if (property && patch.status === 'archived' && property.status !== 'archived') {
        requireValue(!hasLiveLease(state, lease => lease.propertyId === property.id), 'status',
          'End or resolve current and future leases before archiving this property.')
      }
      const result = writeRecord(state, 'properties', property, patch, 'prop', audit)
      return { ...result, message: property ? 'Property updated' : 'Property added', path: recordPath(root, result.record.id) }
    })
    if (!property) navigate(withSid(recordPath(root, record.id)))
  }
  return <Dialog title={property ? 'Edit property' : 'Add property'} initial={initial} fields={() => propertyFields}
    onClose={onClose} onSubmit={submit} submit={property ? 'Save changes' : 'Add property'} />
}

function UnitForm({ unit, property, onClose }) {
  const { commit } = useWorkspace()
  const initial = { beds: 1, baths: 1, status: property.status === 'archived' ? 'archived' : 'active', ...unit }
  function submit(values) {
    commit((state, audit) => {
      const patch = {
        propertyId: property.id,
        label: textValue(values.label, 'label', 'a unit label'),
        beds: numberValue(values.beds, 'beds', { places: 0 }),
        baths: numberValue(values.baths, 'baths'),
        marketRent: numberValue(values.marketRent, 'marketRent'),
        rentReady: Boolean(values.rentReady),
        status: choice(values.status, locationStatuses, 'status', 'a status'),
      }
      const duplicate = propertyUnits(state, property.id).some(item => item.id !== unit?.id &&
        String(item.label ?? '').trim().toLowerCase() === patch.label.toLowerCase())
      requireValue(!duplicate, 'label', 'A unit with this label already exists at this property.')
      if (unit && patch.status === 'archived' && unit.status !== 'archived') {
        requireValue(!hasLiveLease(state, lease => lease.unitId === unit.id), 'status',
          'End or resolve current and future leases before archiving this unit.')
      }
      const result = writeRecord(state, 'units', unit, patch, 'unit', audit)
      return { ...result, message: unit ? 'Unit updated' : 'Unit added', path: recordPath(root, property.id) }
    })
  }
  return <Dialog title={unit ? 'Edit unit' : 'Add unit'} initial={initial} fields={() => unitFields} onClose={onClose}
    onSubmit={submit} submit={unit ? 'Save changes' : 'Add unit'} />
}

export function Properties() {
  const { state } = useWorkspace()
  const [add, setAdd] = useState(false)
  const filters = useFilters(defaultFilters)
  const { q, type, status, sort } = filters.values
  const properties = records(state.properties).filter(property =>
    (!type || property.type === type) && (!status || property.status === status) &&
    matches(q, property.name, address(property)))
  const sortKey = sort.replace(/^-/, '') === 'city' ? 'city' : 'name'
  const direction = sort.startsWith('-') ? -1 : 1
  properties.sort((a, b) => direction * compare(a[sortKey], b[sortKey]) || compare(a.name, b.name))
  const day = today()
  const occupied = new Set(records(state.leases).filter(lease => phase(lease, day) === 'active').map(lease => lease.unitId))
  return <>
    <PageHeader title="Properties" description="Manage property records, units and occupancy."
      actions={<button className="button" onClick={() => setAdd(true)}>Add property</button>} />
    <Panel>
      <Filters filters={filters} placeholder="Search properties or addresses" fields={[
        ['Type', 'type', [['', 'All types'], ...options(propertyTypes)]],
        ['Status', 'status', [['', 'All statuses'], ...options(locationStatuses)]],
        ['Sort', 'sort', [['name', 'Name (A–Z)'], ['-name', 'Name (Z–A)'], ['city', 'City (A–Z)'], ['-city', 'City (Z–A)']]],
      ]} />
      <DataTable key={JSON.stringify(filters.values)} columns={[
        ['Property', '', 'name'], ['Address'], ['City', '', 'city'], ['Type'], ['Active units', 'numeric'], ['Occupied', 'numeric'], ['Status'],
      ]} rows={properties} filters={filters} empty="No properties yet. Add a property to get started."
        sort={{ value: sort, update: value => filters.update('sort', value) }} row={property => {
          const units = propertyUnits(state, property.id).filter(unit => unit.status === 'active')
          return <>
            <td><RecordLink to={recordPath(root, property.id)}>{property.name || property.id}</RecordLink></td>
            <td>{[property.address1, property.address2].filter(Boolean).join(', ') || '—'}</td>
            <td>{property.city || '—'}</td><td>{label(property.type)}</td><td className="numeric">{units.length}</td>
            <td className="numeric">{units.filter(unit => occupied.has(unit.id)).length}</td><td><Pill value={property.status} /></td>
          </>
        }} />
    </Panel>
    {add && <PropertyForm onClose={() => setAdd(false)} />}
  </>
}

export function PropertyDetail() {
  const { id } = useParams()
  return <PropertyRecord key={id} id={id} />
}

function PropertyRecord({ id }) {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState(null)
  const property = find(state.properties, id)
  if (!property) return <Missing kind="Property" back={back} />
  const units = propertyUnits(state, id).sort((a, b) => compare(a.label, b.label))
  const leases = records(state.leases).filter(lease => lease.propertyId === id)
  const workOrders = records(state.workOrders).filter(order => order.propertyId === id)
  const day = today()
  const occupied = new Set(leases.filter(lease => phase(lease, day) === 'active').map(lease => lease.unitId))
  const close = () => setDialog(null)
  return <>
    <PageHeader title={property.name || property.id} description={address(property)} back={back}
      actions={<button className="button" onClick={() => setDialog({ kind: 'property' })}>Edit property</button>} />
    <Panel title="Property details">
      <Facts items={[['Address', address(property)], ['Type', label(property.type)], ['Status', <Pill value={property.status} />]]} />
      <div className="panel-text"><span className="note-label">Notes</span><p>{property.notes || 'No notes recorded.'}</p></div>
    </Panel>
    <Panel title="Units" action={<button className="button secondary" onClick={() => setDialog({ kind: 'unit' })}>Add unit</button>}>
      <DataTable rows={units} empty="This property has no units." columns={[
        ['Unit'], ['Beds', 'numeric'], ['Baths', 'numeric'], ['Market rent', 'numeric'], ['Rent-ready'], ['Occupancy'], ['Status'], ['Actions'],
      ]} row={unit => <>
        <td><strong>{unit.label || unit.id}</strong></td><td className="numeric">{unit.beds ?? '—'}</td><td className="numeric">{unit.baths ?? '—'}</td>
        <td className="numeric">{money(unit.marketRent)}</td><td>{unit.rentReady == null ? '—' : unit.rentReady ? 'Yes' : 'No'}</td>
        <td>{occupied.has(unit.id) ? 'Occupied' : 'Vacant'}</td><td><Pill value={unit.status} /></td>
        <td><button className="button secondary" onClick={() => setDialog({ kind: 'unit', unit })}>Edit unit</button></td>
      </>} />
    </Panel>
    <div className="overview-grid">
      <Panel title="Linked leases"><DataTable rows={leases} empty="No leases are linked to this property." columns={[
        ['Resident'], ['Unit'], ['End date'], ['Phase'],
      ]} row={lease => <>
        <td><RecordLink to={recordPath('/leases', lease.id)}>{lease.residentName || lease.id}</RecordLink></td>
        <td>{unitLabel(state, lease.unitId)}</td><td className="nowrap">{date(effectiveEnd(lease))}</td><td><Pill value={phase(lease, day)} /></td>
      </>} /></Panel>
      <Panel title="Linked work orders"><DataTable rows={workOrders} empty="No work orders are linked to this property." columns={[
        ['Work order'], ['Unit'], ['Status'],
      ]} row={order => <>
        <td><RecordLink to={recordPath('/work-orders', order.id)}>{order.title || order.id}</RecordLink><small>{order.id}</small></td>
        <td>{unitLabel(state, order.unitId)}</td><td><Pill value={order.status} /></td>
      </>} /></Panel>
    </div>
    {dialog?.kind === 'property' && <PropertyForm property={property} onClose={close} />}
    {dialog?.kind === 'unit' && <UnitForm unit={dialog.unit} property={property} onClose={close} />}
  </>
}
