import { useState } from 'react'
import { actor, newId, useAccount } from '../state'
import { dateLabel, facilityName, matches, newest, recordPath, useRecordId } from '../records'
import {
  Badge, Details, Dialog, Filter, Notice, Page, Panel, RecordLink, RecordList, Search, useFilters,
} from '../components/ui'
import Missing from '../components/Missing'

const base = '/prescriptions'
const labels = {
  available: 'Available to refill', requested: 'Refill requested', no_refills: 'No refills left',
  expired: 'Expired', discontinued: 'Discontinued',
}
const statusOptions = [['all', 'All statuses'], ...Object.entries(labels)]

function refillStatus(rx, hasPending) {
  if (hasPending) return 'requested'
  if (rx.status === 'active') return Number(rx.refillsRemaining) > 0 ? 'available' : 'no_refills'
  return rx.status
}

export function Prescriptions() {
  const { state } = useAccount()
  const filters = useFilters()
  const pending = new Set(state.refillRequests.filter(request => request.status === 'requested').map(request => request.prescriptionId))
  const records = state.prescriptions.filter(rx => {
    const status = refillStatus(rx, pending.has(rx.id))
    return (filters.filter === 'all' || filters.filter === status) && matches(filters.query, rx.medication, rx.rxNumber)
  }).sort(newest('lastFilledAt'))
  return <Page title="Prescriptions" description="Manage refills and track prescription deliveries.">
    <div className="filters"><Search title="Search prescriptions" filters={filters} /><Filter title="Prescription status" options={statusOptions} filters={filters} /></div>
    <RecordList title="Prescriptions" records={records} filters={filters} empty="No prescriptions match these filters."
      columns={['Medication', 'Status', 'Refills left', 'Last filled']} cells={rx => {
        const status = refillStatus(rx, pending.has(rx.id))
        return [
          <RecordLink to={recordPath(base, rx.id)} title={[rx.medication, rx.strength].filter(Boolean).join(' ') || rx.id} detail={rx.rxNumber} />,
          <Badge value={status} text={labels[status]} />, rx.refillsRemaining ?? '—', dateLabel(rx.lastFilledAt),
        ]
      }} />
  </Page>
}

export function PrescriptionDetail() {
  const id = useRecordId()
  const { state, apply } = useAccount()
  const [dialog, setDialog] = useState(false)
  const [result, setResult] = useState(null)
  const rx = state.prescriptions.find(record => record.id === id)
  if (!rx) return <Missing title="Prescription unavailable" to={base} back="Prescriptions" />
  const pending = state.refillRequests.filter(request => request.prescriptionId === id && request.status === 'requested').sort(newest('createdAt'))[0]
  const status = refillStatus(rx, !!pending)
  const title = [rx.medication, rx.strength].filter(Boolean).join(' ') || 'Prescription details'
  const fills = [...(rx.fillHistory || [])].sort(newest('filledAt'))
  const shipments = state.prescriptionShipments.filter(shipment => shipment.prescriptionId === id).sort(newest('shippedAt'))

  function confirm() {
    const saved = apply(current => {
      const currentRx = current.prescriptions.find(item => item.id === id)
      const hasPending = current.refillRequests.some(item => item.prescriptionId === id && item.status === 'requested')
      if (currentRx?.status !== 'active' || !(Number(currentRx.refillsRemaining) > 0) || hasPending) return
      const record = {
        id: newId('refill', current.refillRequests), prescriptionId: id, quantity: 1,
        status: 'requested', actorId: actor(current), createdAt: new Date().toISOString(),
      }
      return { ...current, refillRequests: [...current.refillRequests, record] }
    })
    setDialog(false)
    setResult(saved ? 'success' : 'error')
  }

  return <Page title={title} description={rx.rxNumber || id} back="Prescriptions" to={base}>
    {result === 'success' && <Notice>Refill requested. Reference ID {pending?.id}.</Notice>}
    {result === 'error' && <Notice error>This prescription is no longer eligible for a refill.</Notice>}
    <Panel title="Prescription details"><Details rows={[
      ['Status', <Badge value={status} text={labels[status]} />], ['Refills remaining', rx.refillsRemaining],
      ['Last filled', dateLabel(rx.lastFilledAt)], ['Facility', facilityName(state.facilities.find(facility => facility.id === rx.facilityId))],
      ...(pending ? [['Pending request ID', pending.id], ['Requested on', dateLabel(pending.createdAt)]] : []),
    ]} />
      {status === 'available' && <button type="button" className="button" onClick={() => setDialog(true)}>Request a refill</button>}
    </Panel>
    <Panel title="Fill history">
      {fills.length ? <ul className="subrows">{fills.map(fill => <li key={fill.id}>
        <strong>{dateLabel(fill.filledAt)}</strong>{fill.quantity != null && <small>Quantity {fill.quantity}</small>}
      </li>)}</ul> : <p>No fills recorded.</p>}
    </Panel>
    <Panel title="Shipment tracking">
      {shipments.length ? <div className="shipment-list">{shipments.map(shipment => <details key={shipment.id}>
        <summary>{shipment.carrier || 'Shipment'} {shipment.trackingNumber || shipment.id} <Badge value={shipment.status} /></summary>
        <Details rows={[
          ['Carrier', shipment.carrier], ['Tracking number', shipment.trackingNumber], ['Shipped on', dateLabel(shipment.shippedAt)],
          ['Estimated delivery', dateLabel(shipment.estimatedDeliveryDate)], ['Delivered on', dateLabel(shipment.deliveredAt)],
        ]} />
      </details>)}</div> : <p>No shipment tracking available.</p>}
    </Panel>
    {dialog && <Dialog title="Review your refill request" onDismiss={() => setDialog(false)}>
      <Details rows={[[ 'Medication', title], ['Prescription number', rx.rxNumber], ['Refills requested', 1]]} />
      <div className="button-row">
        <button type="button" className="button secondary" onClick={() => setDialog(false)}>Cancel</button>
        <button type="button" className="button" onClick={confirm}>Confirm refill request</button>
      </div>
    </Dialog>}
  </Page>
}
