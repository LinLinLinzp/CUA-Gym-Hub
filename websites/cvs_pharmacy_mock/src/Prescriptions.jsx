import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { setVisibility } from './actions.js'
import { dateLabel, find, identified, medication, money, patientName, refillReason, storeName } from './domain.js'
import { usePharmacy } from './state.jsx'
import { Details, Dialog, Empty, ErrorMessage, Icon, Missing, PageHeader, RouteLink, SelectField, Status } from './ui.jsx'

function PatientFilter({ state, value, change }) {
  return <SelectField label="Patient" value={value} onChange={(event) => change(event.target.value)}>
    <option value="">All patients</option>
    {identified(state.patients).map((patient) => <option key={patient.id} value={patient.id}>{patientName(state, patient.id)}</option>)}
  </SelectField>
}

function Table({ columns, rows }) {
  return <table className="table">
    <thead><tr>{columns.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map(([id, ...cells]) => <tr key={id}>{cells.map((cell, index) =>
      <td key={columns[index]} data-label={columns[index]}><span>{cell}</span></td>)}</tr>)}</tbody>
  </table>
}

export function Prescriptions() {
  const { state } = usePharmacy()
  const [query, setQuery] = useState('')
  const [patient, setPatient] = useState('')
  const [visibility, setVisibility] = useState('visible')
  const term = query.trim().toLowerCase()
  const rows = identified(state.prescriptions).filter((rx) =>
    (!patient || rx.patientId === patient) &&
    (visibility === 'all' || Boolean(rx.hidden) === (visibility === 'hidden')) &&
    (!term || [rx.medication, rx.strength, rx.rxNumber].filter(Boolean).join(' ').toLowerCase().includes(term)),
  )
  return <>
    <PageHeader title="Prescriptions" description="Search and manage prescriptions for your household.">
      <RouteLink className="button" to="/prescriptions/history">Prescription history<Icon name="arrow" size={17}/></RouteLink>
    </PageHeader>
    <section className="panel">
      <div className="fields">
        <label className="field search"><span>Search prescriptions</span><div className="search-box"><Icon name="search" size={18}/>
          <input type="search" placeholder="Medication or Rx number" value={query} onChange={(event) => setQuery(event.target.value)}/>
        </div></label>
        <PatientFilter state={state} value={patient} change={setPatient}/>
        <SelectField label="Visibility" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="visible">Visible</option><option value="hidden">Hidden</option><option value="all">All prescriptions</option>
        </SelectField>
      </div>
      <p className="filter-summary" role="status">{rows.length} {rows.length === 1 ? 'prescription' : 'prescriptions'}</p>
      {rows.length ? <Table columns={['Medication', 'Patient', 'Last fill', 'Refills left', 'Pharmacy']} rows={rows.map((rx) => [
        rx.id, <><RouteLink to={'/prescriptions/' + encodeURIComponent(rx.id)}><strong>{medication(rx)}</strong></RouteLink><small>Rx {rx.rxNumber || '—'}</small></>,
        patientName(state, rx.patientId), dateLabel(rx.lastFilledOn), rx.refillsRemaining ?? '—', storeName(find(state.stores, rx.storeId)),
      ])}/> : <Empty>No prescriptions match these filters.</Empty>}
    </section>
  </>
}

export function PrescriptionDetail() {
  const { id } = useParams()
  return <PrescriptionRecord key={id} id={id}/>
}

function PrescriptionRecord({ id }) {
  const { state, commit } = usePharmacy()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const rx = find(state.prescriptions, id)
  if (!rx) return <Missing record="Prescription" back="/prescriptions" label="Back to prescriptions"/>
  const store = find(state.stores, rx.storeId)
  const patient = patientName(state, rx.patientId)
  const reason = refillReason(state, rx, new Date())

  function update(hidden) {
    const result = commit((current) => setVisibility(current, id, hidden))
    setError(result.error || '')
    if (!result.error) {
      setConfirm(false)
      setMessage(hidden ? 'Prescription hidden.' : 'Prescription restored.')
    }
  }

  return <div className="stack">
    <PageHeader title={medication(rx)} description={'Rx ' + (rx.rxNumber || '—')} back="/prescriptions" backLabel="Back to prescriptions">
      <Status status={rx.hidden ? 'hidden' : rx.status}/>
    </PageHeader>
    {message && <div className="notice" role="status">{message}</div>}
    {!confirm && <ErrorMessage>{error}</ErrorMessage>}
    <section className="panel">
      <h2>Prescription details</h2>
      <Details entries={[
        ['Patient', patient], ['Pharmacy', storeName(store)], ['Last fill', dateLabel(rx.lastFilledOn)],
        ['Refills remaining', rx.refillsRemaining], ['Quantity', [rx.quantity, rx.unit].filter(Boolean).join(' ') || '—'],
        ['Prescription expires', dateLabel(rx.expiresOn)], ['Prescriber', rx.prescriber],
      ]}/>
    </section>
    <section className="panel">
      <h2>Refill and visibility</h2>
      <p className="muted">{reason || 'This prescription is eligible for refill.'}</p>
      <div className="actions">
        {!reason && <RouteLink className="button primary" to={'/refills?rx=' + encodeURIComponent(id)}>Request refill</RouteLink>}
        {rx.hidden ? <button className="button" onClick={() => update(false)}>Restore prescription</button> :
          <button className="button danger" onClick={() => { setError(''); setConfirm(true) }}>Hide prescription</button>}
      </div>
    </section>
    {confirm && <Dialog title="Hide prescription?" close={() => setConfirm(false)}>
      <p>{medication(rx)} · Rx {rx.rxNumber || id} · {patient}</p>
      <p>You can find and restore this prescription from the Hidden filter.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="button" autoFocus onClick={() => setConfirm(false)}>Keep visible</button>
        <button className="button primary" onClick={() => update(true)}>Hide prescription</button></div>
    </Dialog>}
  </div>
}

const MONTHS = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, index))))
export function PrescriptionHistory() {
  const { state } = usePharmacy()
  const [patient, setPatient] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const fills = identified(state.prescriptionFills)
  const years = [...new Set(fills.map((fill) => String(fill.filledOn || '').slice(0, 4)).filter((value) => /^\d{4}$/.test(value)))].sort().reverse()
  const rows = fills.filter((fill) => {
    const date = String(fill.filledOn || '')
    return (!patient || fill.patientId === patient) && (!month || date.slice(5, 7) === month) && (!year || date.slice(0, 4) === year)
  }).sort((a, b) => String(b.filledOn || '').localeCompare(String(a.filledOn || '')))
  return <>
    <PageHeader title="Prescription history" back="/prescriptions" backLabel="Back to prescriptions">
      <button className="button no-print" onClick={() => window.print()}>Print history</button>
    </PageHeader>
    <section className="panel">
      <div className="fields no-print">
        <PatientFilter state={state} value={patient} change={setPatient}/>
        <SelectField label="Month" value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="">All months</option>
          {MONTHS.map((label, index) => <option key={label} value={String(index + 1).padStart(2, '0')}>{label}</option>)}
        </SelectField>
        <SelectField label="Year" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">All years</option>{years.map((value) => <option key={value}>{value}</option>)}
        </SelectField>
      </div>
      <p className="filter-summary" role="status">{patient ? patientName(state, patient) : 'All patients'} · {month ? MONTHS[Number(month) - 1] : 'All months'} · {year || 'All years'} · {rows.length} {rows.length === 1 ? 'fill' : 'fills'}</p>
      {rows.length ? <Table columns={['Medication', 'Patient', 'Filled', 'Quantity', 'Pharmacy', 'Amount paid']} rows={rows.map((fill) => {
        const rx = find(state.prescriptions, fill.prescriptionId)
        return [fill.id, <><strong>{medication(rx)}</strong><small>{rx?.rxNumber ? 'Rx ' + rx.rxNumber : fill.prescriptionId}</small></>,
          patientName(state, fill.patientId), dateLabel(fill.filledOn), fill.quantity ?? '—', storeName(find(state.stores, fill.storeId)), money(fill.amountPaid)]
      })}/> : <Empty>No fills match these filters.</Empty>}
    </section>
  </>
}
