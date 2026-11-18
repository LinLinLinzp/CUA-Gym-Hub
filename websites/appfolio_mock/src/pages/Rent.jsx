import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { DataTable, Dialog, Facts, Filters, Missing, PageHeader, Panel, Pill, RecordLink, options, useFilters } from '../ui.jsx'
import {
  cents, chargeBalance, chargePayments, chargePhase, choice, compare, date, dateValue, find, label, matches, money,
  numberValue, postedCharges, propertyLabel, propertyOptions, propertyOrUnit, recordPath, records, requireValue, textValue, today,
  unitLabel, writeRecord,
} from '../data/model.js'

const root = '/rent'
const back = [root, 'Rent']
const defaultFilters = { q: '', property: '', balance: '', sort: '-balance' }
const chargeTypes = ['rent', 'fee']
const paymentMethods = ['check', 'cash', 'bank_transfer', 'other']
const chargeFields = [
  { name: 'type', text: 'Charge type', entries: options(chargeTypes), required: true },
  { name: 'amount', text: 'Amount', type: 'number', required: true },
  { name: 'description', text: 'Description', required: true, wide: true },
  { name: 'postedOn', text: 'Posting date', type: 'date', required: true },
  { name: 'dueOn', text: 'Due date', type: 'date', required: true },
]

function ledgerTotals(charges, payments) {
  let billed = 0
  let received = 0
  let outstanding = 0
  for (const charge of charges) {
    billed += cents(charge.amount)
    received += chargePayments(charge, payments).reduce((sum, payment) => sum + cents(payment.amount), 0)
    outstanding += chargeBalance(charge, payments)
  }
  return { billed, received, outstanding }
}

function groupByLease(collection) {
  const groups = new Map()
  for (const record of collection) {
    if (!groups.has(record.leaseId)) groups.set(record.leaseId, [])
    groups.get(record.leaseId).push(record)
  }
  return groups
}

function ChargeForm({ lease, onClose }) {
  const { commit } = useWorkspace()
  const day = today()
  function submit(values) {
    commit((state, audit) => {
      const postedOn = dateValue(values.postedOn, 'postedOn')
      const dueOn = dateValue(values.dueOn, 'dueOn')
      requireValue(dueOn >= postedOn, 'dueOn', 'The due date must be on or after the posting date.')
      const patch = {
        leaseId: lease.id, postedOn, dueOn, status: 'posted',
        type: choice(values.type, chargeTypes, 'type', 'a charge type'),
        description: textValue(values.description, 'description', 'a description'),
        amount: numberValue(values.amount, 'amount', { positive: true }),
      }
      const result = writeRecord(state, 'rentCharges', null, patch, 'charge', audit)
      return { ...result, path: recordPath(root, lease.id), message: 'Charge posted' }
    })
  }
  return <Dialog title="Post charge" initial={{ type: 'rent', postedOn: day, dueOn: day }}
    fields={() => chargeFields} onClose={onClose} onSubmit={submit} submit="Post charge" />
}

function PaymentForm({ lease, charges, payments, onClose }) {
  const { commit } = useWorkspace()
  const openCharges = charges.filter(charge => chargeBalance(charge, payments) > 0)
  function fields(values) {
    const charge = find(openCharges, values.chargeId)
    return [
      { name: 'chargeId', text: 'Open charge', required: true, wide: true, entries: [
        ['', 'Select a charge'],
        ...openCharges.map(item => [item.id, (item.description || item.id) + ' · ' + date(item.postedOn) + ' · ' + money(chargeBalance(item, payments) / 100) + ' due']),
      ] },
      { name: 'amount', text: 'Amount', type: 'number', required: true,
        hint: charge ? 'Outstanding amount ' + money(chargeBalance(charge, payments) / 100) : undefined },
      { name: 'receivedOn', text: 'Receipt date', type: 'date', required: true },
      { name: 'method', text: 'Payment method', entries: options(paymentMethods), required: true },
      { name: 'reference', text: 'Reference' },
    ]
  }
  function submit(values) {
    commit((state, audit) => {
      const charge = find(postedCharges(state), values.chargeId)
      requireValue(charge && charge.leaseId === lease.id, 'chargeId', 'Select an open charge for this lease.')
      const outstanding = chargeBalance(charge, records(state.rentPayments))
      requireValue(outstanding > 0, 'chargeId', 'This charge has been paid in full.')
      const amount = numberValue(values.amount, 'amount', { positive: true })
      requireValue(cents(amount) <= outstanding, 'amount', 'The payment cannot exceed the outstanding amount of ' + money(outstanding / 100) + '.')
      const receivedOn = dateValue(values.receivedOn, 'receivedOn')
      requireValue(!charge.postedOn || receivedOn >= charge.postedOn, 'receivedOn', 'The receipt date must be on or after the posting date.')
      const patch = {
        leaseId: lease.id, chargeId: charge.id, amount, receivedOn, status: 'recorded',
        method: choice(values.method, paymentMethods, 'method', 'a method'), reference: textValue(values.reference),
      }
      const result = writeRecord(state, 'rentPayments', null, patch, 'payment', audit)
      return { ...result, path: recordPath(root, lease.id), message: 'Payment recorded' }
    })
  }
  return <Dialog title="Record payment" initial={{ chargeId: openCharges.length === 1 ? openCharges[0].id : '', receivedOn: today(), method: 'check' }}
    fields={fields} onClose={onClose} onSubmit={submit} submit="Record payment" />
}

export function Rent() {
  const { state } = useWorkspace()
  const filters = useFilters(defaultFilters)
  const { q, property, balance, sort } = filters.values
  const chargesByLease = groupByLease(postedCharges(state))
  const paymentsByLease = groupByLease(records(state.rentPayments))
  const rows = records(state.leases).filter(lease => (!property || lease.propertyId === property) &&
    matches(q, lease.residentName, propertyLabel(state, lease.propertyId), unitLabel(state, lease.unitId)))
    .map(lease => ({ ...lease, ...ledgerTotals(chargesByLease.get(lease.id) || [], paymentsByLease.get(lease.id) || []) }))
    .filter(lease => (!balance || (balance === 'outstanding' ? lease.outstanding > 0 : lease.outstanding === 0)))
  rows.sort((a, b) => {
    const delta = sort.replace(/^-/, '') === 'resident' ? compare(a.residentName, b.residentName) : a.outstanding - b.outstanding
    return (sort.startsWith('-') ? -delta : delta) || compare(a.id, b.id)
  })
  return <>
    <PageHeader title="Rent" description="Review charges, payments and outstanding balances by lease." />
    <Panel>
      <Filters filters={filters} placeholder="Search residents, properties or units" fields={[
        ['Property', 'property', [['', 'All properties'], ...propertyOptions(records(state.properties))]],
        ['Balance', 'balance', [['', 'All balances'], ['outstanding', 'Outstanding'], ['zero', 'Zero balance']]],
        ['Sort', 'sort', [['-balance', 'Balance (highest)'], ['balance', 'Balance (lowest)'], ['resident', 'Resident (A–Z)'], ['-resident', 'Resident (Z–A)']]],
      ]} />
      <DataTable key={JSON.stringify(filters.values)} rows={rows} filters={filters} empty="No rent ledgers. Ledgers appear when leases are created."
        columns={[[ 'Resident', '', 'resident' ], [ 'Property / unit' ], [ 'Lease start' ], [ 'Monthly rent', 'numeric' ], [ 'Charges', 'numeric' ], [ 'Receipts', 'numeric' ], [ 'Outstanding', 'numeric', 'balance' ]]}
        sort={{ value: sort, update: value => filters.update('sort', value) }} row={lease => <>
          <td><RecordLink to={recordPath(root, lease.id)}>{lease.residentName || lease.id}</RecordLink></td>
          <td>{propertyOrUnit(state, lease)}</td><td className="nowrap">{date(lease.startDate)}</td>
          <td className="numeric">{money(lease.monthlyRent)}</td>
          <td className="numeric">{money(lease.billed / 100)}</td><td className="numeric">{money(lease.received / 100)}</td>
          <td className="numeric"><strong>{money(lease.outstanding / 100)}</strong></td>
        </>} />
    </Panel>
  </>
}

export function Ledger() {
  const { leaseId } = useParams()
  return <LedgerRecord key={leaseId} id={leaseId} />
}

function LedgerRecord({ id }) {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState('')
  const lease = find(state.leases, id)
  if (!lease) return <Missing kind="Ledger" back={back} />
  const charges = postedCharges(state).filter(charge => charge.leaseId === id)
  const payments = records(state.rentPayments).filter(payment => payment.leaseId === id)
  const { billed, received, outstanding } = ledgerTotals(charges, payments)
  const day = today()
  const entries = charges.flatMap(charge => [
    { ...charge, transactionDate: charge.postedOn, kind: 'charge', phase: chargePhase(charge, payments, day) },
    ...chargePayments(charge, payments).map(payment => ({
      ...payment, transactionDate: payment.receivedOn, kind: 'payment', description: label(payment.method), phase: 'recorded',
    })),
  ]).sort((a, b) => compare(a.transactionDate, b.transactionDate) || compare(a.kind, b.kind) ||
    compare(a.createdAt, b.createdAt) || compare(a.id, b.id))
  let running = 0
  const rows = entries.map(entry => {
    const signed = cents(entry.amount) * (entry.kind === 'charge' ? 1 : -1)
    running += signed
    return { ...entry, signed, running }
  })
  const close = () => setDialog('')
  return <>
    <PageHeader title={(lease.residentName || lease.id) + ' · Rent ledger'} description={propertyOrUnit(state, lease)} back={back} actions={<>
      {outstanding > 0 && <button className="button secondary" onClick={() => setDialog('payment')}>Record payment</button>}
      <button className="button" onClick={() => setDialog('charge')}>Post charge</button>
    </>} />
    <Panel title="Ledger totals" action={<RecordLink to={recordPath('/leases', id)}>View lease →</RecordLink>}>
      <Facts items={[
        ['Monthly rent', <span className="ledger-total">{money(lease.monthlyRent)}</span>],
        ['Charges', <span className="ledger-total">{money(billed / 100)}</span>],
        ['Receipts', <span className="ledger-total">{money(received / 100)}</span>],
        ['Outstanding', <strong className="ledger-total">{money(outstanding / 100)}</strong>],
      ]} />
    </Panel>
    <Panel title="Transactions">
      <DataTable rows={rows} empty="No transactions yet. Post a charge to start this ledger." columns={[
        ['Date'], ['Type'], ['Description'], ['Status'], ['Amount', 'numeric'], ['Running balance', 'numeric'],
      ]} row={entry => <>
        <td className="nowrap">{date(entry.transactionDate)}</td>
        <td>{entry.kind === 'charge' ? label(entry.type) + ' charge' : 'Payment'}</td>
        <td>{entry.description || '—'}{entry.kind === 'charge' && entry.dueOn && <small>Due {date(entry.dueOn)}</small>}
          {entry.reference && <small>{entry.reference}</small>}</td>
        <td><Pill value={entry.phase} /></td><td className="numeric">{money(entry.signed / 100)}</td>
        <td className="numeric">{money(entry.running / 100)}</td>
      </>} />
    </Panel>
    {dialog === 'charge' && <ChargeForm lease={lease} onClose={close} />}
    {dialog === 'payment' && <PaymentForm lease={lease} charges={charges} payments={payments} onClose={close} />}
  </>
}
