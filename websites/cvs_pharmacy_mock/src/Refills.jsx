import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitRefill } from './actions.js'
import {
  address, find, identified, lineItem, medication, money, patientName, pickupSlots,
  pickupWindow, refillReason, storeName, totalFor, windowLabel,
} from './domain.js'
import { usePharmacy } from './state.jsx'
import { Details, Empty, ErrorMessage, Items, PageHeader, Receipt, SelectField } from './ui.jsx'

export function Refills() {
  const [params] = useSearchParams()
  return <RefillFlow key={params.get('rx') || ''} initialRx={params.get('rx')}/>
}

function RefillFlow({ initialRx }) {
  const { state, commit } = usePharmacy()
  const now = new Date()
  const rx = find(state.prescriptions, initialRx)
  const patients = identified(state.patients)
  const stores = identified(state.stores)
  const [patient, setPatient] = useState(rx?.patientId || patients[0]?.id || '')
  const [ids, setIds] = useState(() => rx && !refillReason(state, rx, now) ? [rx.id] : [])
  const [storeId, setStoreId] = useState(find(state.stores, rx?.storeId)?.id || find(state.stores, state.account?.preferredStoreId)?.id || '')
  const [startsAt, setStartsAt] = useState('')
  const [review, setReview] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  if (result) return <Receipt title="Refill request submitted" to={'/pickup/' + encodeURIComponent(result.pickupOrderId)} label="View pickup details">
    <p>Order reference <strong>{result.id}</strong></p><p>Your pharmacy is preparing this order.</p>
  </Receipt>

  const store = find(state.stores, storeId)
  const prescriptions = identified(state.prescriptions).filter((item) => item.patientId === patient)
  const items = ids.map((id) => find(state.prescriptions, id)).filter(Boolean).map(lineItem)
  const slots = pickupSlots(store, now)
  const validDraft = Boolean(find(state.patients, patient) && ids.length &&
    ids.every((id) => {
      const item = find(state.prescriptions, id)
      return item?.patientId === patient && !refillReason(state, item, now)
    }) && slots.some((slot) => slot.instant === startsAt))

  function submit(event) {
    event.preventDefault()
    setError('')
    if (!review) {
      if (validDraft) setReview(true)
      else setError('Choose a patient, an eligible prescription, and an available pickup window.')
      return
    }
    const result = commit((current) => submitRefill(current, { patientId: patient, ids, storeId, startsAt }))
    if (result.error) setError(result.error)
    else setResult(result.refill)
  }

  return <>
    <PageHeader title={review ? 'Review refill request' : 'Request refills'} description={review
      ? 'Confirm the prescriptions and pickup details below.' : 'Choose prescriptions for one patient and select a pharmacy pickup window.'}/>
    <div className="flow-grid">
      <form className="panel flow-form" onSubmit={submit}>
        {review ? <>
          <h2>Pickup details</h2>
          <Details entries={[[ 'Patient', patientName(state, patient)], ['Pharmacy', storeName(store)], ['Address', address(store)], ['Pickup window', windowLabel(pickupWindow(startsAt), store)]]}/>
          <h3>Prescriptions</h3><Items items={items}/>
        </> : <>
          <SelectField label="Patient" required value={patient} onChange={(event) => { setPatient(event.target.value); setIds([]) }}>
            <option value="">Choose a patient</option>
            {patients.map((entry) => <option key={entry.id} value={entry.id}>{patientName(state, entry.id)}</option>)}
          </SelectField>
          <fieldset><legend>Prescriptions</legend>
            {prescriptions.length ? prescriptions.map((item) => {
              const reason = refillReason(state, item, now)
              return <label className="choice" key={item.id}>
                <input type="checkbox" disabled={!!reason} checked={ids.includes(item.id)} onChange={(event) => setIds(event.target.checked
                  ? [...ids, item.id] : ids.filter((id) => id !== item.id))}/>
                <span><strong>{medication(item)}</strong><small>Rx {item.rxNumber || '—'} · {item.quantity ?? '—'} {item.unit}</small>
                  {reason && <small>{reason}</small>}</span>
                <span className="choice-extra">{money(item.estimatedCopay)}</span>
              </label>
            }) : <Empty>No prescriptions are available for this patient.</Empty>}
          </fieldset>
          <SelectField label="Pickup pharmacy" value={storeId} required onChange={(event) => { setStoreId(event.target.value); setStartsAt('') }}>
            <option value="">Choose a pharmacy</option>
            {stores.map((entry) => <option key={entry.id} value={entry.id}>{storeName(entry)}</option>)}
          </SelectField>
          {store && <small>{address(store)}</small>}
          <SelectField label="Pickup window" required disabled={!slots.length} value={startsAt} onChange={(event) => setStartsAt(event.target.value)}>
            <option value="">Choose a pickup window</option>
            {slots.map(({ instant }) => <option key={instant} value={instant}>{windowLabel(pickupWindow(instant), store)}</option>)}
          </SelectField>
          {store && !slots.length && <Empty>No pickup windows are available at this pharmacy.</Empty>}
        </>}
        <ErrorMessage>{error}</ErrorMessage>
        <div className="actions">
          {review && <button className="button" type="button" onClick={() => { setReview(false); setError('') }}>Edit request</button>}
          <button className="button primary" type="submit">{review ? 'Confirm refill request' : 'Review refill request'}</button>
        </div>
      </form>
      <aside className="panel summary">
        <h2>Order summary</h2>
        <Details entries={[[ 'Patient', patientName(state, patient)], ['Pickup pharmacy', storeName(store)], ['Pickup window', startsAt ? windowLabel(pickupWindow(startsAt), store) : 'Choose a window']]}/>
        {items.length > 0 && <Items items={items}/>}
        <p className="review-total"><strong>Estimated total</strong><strong>{money(totalFor(items))}</strong></p>
      </aside>
    </div>
  </>
}
