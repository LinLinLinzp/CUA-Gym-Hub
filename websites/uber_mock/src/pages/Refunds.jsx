import { useId, useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { byId, cents, date, isChargeEligible, label, money, newId, records, relatedReceipt, refundableLines, routeId, tripLabel, useAccount } from '../account.jsx'
import { AccountLink, Badge, Confirm, Facts, Field, Ledger, Missing, PageTitle, Trail, TripPicker, useAccountNavigation, useSelectedTrip } from '../ui.jsx'
import { SupportHistory } from './SupportHistory.jsx'

const base = '/refunds'
const reasons = ['unexpected_fare', 'duplicate_charge', 'cancellation_fee', 'wait_time_fee', 'other']
const statuses = ['submitted', 'under_review', 'approved', 'declined', 'withdrawn']
const validDecimal = (value) => /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value)

function RefundHistory() {
  const { data } = useAccount()
  return <SupportHistory title="Refunds" description="Request a review of a trip charge and check your request history."
    action="Request fare review" base={base} entries={data.refundRequests} statuses={statuses} subject="reason"
    subjectLabel="Reason" empty="No fare reviews yet" extra={{ label: 'Requested', cell: (entry) =>
      <span className="mono">{money(entry.requestedAmount, entry.currency)}</span> }} />
}

function RefundForm() {
  const { data, commit } = useAccount()
  const navigate = useAccountNavigation()
  const selectedTrip = useSelectedTrip()
  const trips = records(data.trips).filter((trip) => trip.id && isChargeEligible(data, trip))
  const [tripId, setTripId] = useState(() => byId(trips, selectedTrip)?.id ?? '')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState({})
  const [errors, setErrors] = useState({})
  const chargeErrorId = useId()
  const trip = byId(trips, tripId)
  const receipt = relatedReceipt(data, trip)
  const lines = refundableLines(receipt)
  const currency = receipt?.currency || trip?.currency || 'USD'
  const back = byId(trips, selectedTrip) ? '/trips/' + routeId(selectedTrip) : base
  const choices = lines.filter((line) => Object.hasOwn(selected, line.id))
  const requestedCents = choices.reduce((sum, line) => sum + (validDecimal(selected[line.id]) ? cents(selected[line.id]) : 0), 0)
  const offeredReasons = trip?.status === 'canceled' ? ['cancellation_fee', ...reasons.filter((entry) => entry !== 'cancellation_fee')] : reasons

  function clearError(key) {
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  function changeTrip(value) {
    setTripId(value)
    setSelected({})
    setErrors({})
  }

  function toggleLine(line, checked) {
    setSelected((previous) => {
      if (checked) return { ...previous, [line.id]: (cents(line.amount) / 100).toFixed(2) }
      const next = { ...previous }
      delete next[line.id]
      return next
    })
    clearError('charges')
    clearError('line-' + line.id)
  }

  function updateAmount(line, value) {
    setSelected((previous) => ({ ...previous, [line.id]: value }))
    clearError('charges')
    clearError('line-' + line.id)
  }

  function submit(event) {
    event.preventDefault()
    const notes = description.trim()
    const invalid = {}
    if (!trip || !receipt) invalid.tripId = 'Select a trip with an eligible charge.'
    if (!reasons.includes(reason)) invalid.reason = 'Select a reason for the review.'
    if (!notes) invalid.description = 'Explain why you want the fare reviewed.'
    if (!choices.length) invalid.charges = 'Select at least one charge.'
    else if (requestedCents > cents(receipt?.total)) invalid.charges = 'The requested total cannot exceed ' + money(receipt.total, currency) + '.'
    for (const line of choices) {
      const amount = cents(selected[line.id])
      if (!validDecimal(selected[line.id]) || amount <= 0 || amount > cents(line.amount)) {
        invalid['line-' + line.id] = 'Enter an amount from ' + money(0.01, currency) + ' to ' + money(line.amount, currency) + ' with up to two decimal places.'
      }
    }
    if (Object.keys(invalid).length) {
      setErrors(invalid)
      return
    }

    const lineItems = choices.map((line) => ({
      receiptLineId: line.id, label: line.label || 'Charge',
      quantity: Number(line.quantity) > 0 ? Number(line.quantity) : 1,
      chargedAmount: cents(line.amount) / 100, requestedAmount: cents(selected[line.id]) / 100,
    }))
    const id = newId('refund')
    commit((state, { now, actorId }) => ({
      ...state,
      refundRequests: [...records(state.refundRequests), {
        id, tripId, receiptId: receipt.id, requesterId: actorId, reason, description: notes,
        lineItems, requestedAmount: requestedCents / 100, currency, status: 'submitted', createdAt: now, updatedAt: now,
      }],
    }), 'Fare review submitted.')
    navigate(base + '/' + routeId(id))
  }

  return <>
    <Trail to={back}>{back === base ? 'All refunds' : 'Back to trip'}</Trail>
    <PageTitle title="Request fare review" description="Select the receipt charges you’d like reviewed." />
    {trips.length ? <form className="panel form-panel form" onSubmit={submit} noValidate>
      <TripPicker trips={trips} value={tripId} onChange={changeTrip} error={errors.tripId} />
      <Field label="Reason" error={errors.reason}>{(props) => <select {...props} value={reason} onChange={(event) => { setReason(event.target.value); clearError('reason') }} required>
        <option value="" disabled>Select a reason</option>
        {offeredReasons.map((entry) => <option key={entry} value={entry}>{label(entry)}</option>)}
      </select>}</Field>
      <Field label="Explanation" error={errors.description}>{(props) => <textarea {...props} value={description} onChange={(event) => { setDescription(event.target.value); clearError('description') }} rows={4} required />}</Field>
      {receipt && <>
        <fieldset className="charge-list" aria-describedby={errors.charges ? chargeErrorId : undefined}>
          <legend>Receipt charges</legend>
          {lines.map((line) => <div className="charge" key={line.id}>
            <label><input type="checkbox" checked={Object.hasOwn(selected, line.id)} onChange={(event) => toggleLine(line, event.target.checked)} />
              <span>{line.label || 'Charge'} <span className="stacked">{money(line.amount, currency)} · Qty {line.quantity ?? 1}</span></span>
            </label>
            {Object.hasOwn(selected, line.id) && <Field label={'Requested amount for ' + (line.label || 'charge')} error={errors['line-' + line.id]}>
              {(props) => <input {...props} type="number" inputMode="decimal" step="0.01" min="0.01" max={line.amount}
                value={selected[line.id]} onChange={(event) => updateAmount(line, event.target.value)} required />}
            </Field>}
          </div>)}
          {errors.charges && <p className="field-error" id={chargeErrorId}>{errors.charges}</p>}
        </fieldset>
        <div className="request-total"><strong>Requested total</strong><output className="mono total" aria-live="polite">{money(requestedCents / 100, currency)}</output></div>
      </>}
      <div className="form-actions"><AccountLink className="button secondary" to={back}>Cancel</AccountLink><button className="button">Submit fare review</button></div>
    </form> : <section className="panel detail-panel"><h2>No eligible charges</h2><p>A trip with a positive receipt charge is required to request a fare review.</p></section>}
  </>
}

function RefundDetail() {
  const { refundId } = useParams()
  const { data, commit } = useAccount()
  const [confirm, setConfirm] = useState(false)
  const entry = byId(data.refundRequests, refundId)
  if (!entry) return <Missing title="Fare review unavailable" to={base} back="All refunds" />
  const trip = byId(data.trips, entry.tripId)
  const receipt = byId(data.receipts, entry.receiptId)
  const rows = records(entry.lineItems).map((line, index) => ({
    id: line.receiptLineId ?? index,
    cells: [
      line.label || 'Charge', line.quantity ?? '—',
      <span className="mono">{money(line.chargedAmount, entry.currency)}</span>,
      <span className="mono">{money(line.requestedAmount, entry.currency)}</span>,
    ],
  }))

  function withdraw() {
    commit((state, { now, actorId }) => {
      if (byId(state.refundRequests, refundId)?.status !== 'submitted') return state
      return {
        ...state,
        refundRequests: records(state.refundRequests).map((refund) => refund.id === refundId ? {
          ...refund, status: 'withdrawn', updatedAt: now, withdrawnAt: now, withdrawnBy: actorId,
        } : refund),
      }
    }, 'Fare review withdrawn.')
    setConfirm(false)
  }

  return <>
    <Trail to={base}>All refunds</Trail>
    <PageTitle title="Fare review request" description={entry.id} action={<Badge status={entry.status} />} />
    <div className="detail-grid">
      <div>
        <section className="panel detail-panel">
          <h2>{label(entry.reason)}</h2>
          <p className="description">{entry.description || 'No explanation available.'}</p>
          <Facts items={[
            ['Trip', trip?.id ? <AccountLink to={'/trips/' + routeId(trip.id)}>{tripLabel(trip)}</AccountLink> : entry.tripId],
            ['Receipt', receipt?.id ? <AccountLink to={'/receipts/' + routeId(receipt.id)}>{receipt.number || receipt.id}</AccountLink> : entry.receiptId],
          ]} />
        </section>
        <section className="panel detail-panel">
          <h2>Charges under review</h2>
          <Ledger rows={rows} headers={['Charge', 'Quantity', 'Charged', 'Requested']} empty="No charge lines available" caption="Requested charges" showCount={false} />
        </section>
      </div>
      <section className="panel detail-panel">
        <h2>Requested total</h2>
        <div className="mono total">{money(entry.requestedAmount, entry.currency)}</div>
        <Facts items={[
          ['Submitted', date(entry.createdAt, data.rider?.timeZone)],
          ['Last updated', date(entry.updatedAt, data.rider?.timeZone)],
          ...(entry.withdrawnAt ? [['Withdrawn', date(entry.withdrawnAt, data.rider?.timeZone)]] : []),
          ...(entry.approvedAmount != null ? [['Approved amount', money(entry.approvedAmount, entry.currency)]] : []),
        ]} />
        {entry.status === 'submitted' && <p><button className="button secondary" onClick={() => setConfirm(true)}>Withdraw request</button></p>}
      </section>
    </div>
    {confirm && <Confirm title="Withdraw fare review?" action="Confirm withdrawal" onClose={() => setConfirm(false)} onConfirm={withdraw} destructive>
      Close this fare review request?
    </Confirm>}
  </>
}

export function RefundRoutes() {
  return <Routes>
    <Route index element={<RefundHistory />} />
    <Route path="new" element={<RefundForm />} />
    <Route path=":refundId" element={<RefundDetail />} />
    <Route path="*" element={<Missing title="Fare review unavailable" to={base} back="All refunds" />} />
  </Routes>
}
