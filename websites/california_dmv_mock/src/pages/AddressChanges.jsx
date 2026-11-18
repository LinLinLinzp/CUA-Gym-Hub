import { useId, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDraft, useStore, useTransaction } from '../context/Store'
import { blankAddress, changeableVehicles, completeAddress, postalStates, proposedAddresses, resolveTargets, submitAddressChange } from '../data/addressChanges'
import { byId, list, newestFirst, owned, showTimestamp, vehicleName } from '../data/display'
import { routes } from '../data/routes'
import { useSiteNavigate, useWizard } from '../utils/navigation'
import Introduction from '../components/Introduction'
import { MissingRecord } from '../components/RouteViews'
import { Address, ButtonLink, Empty, Field, Notice, Page, PrintButton, SiteLink, Status, Steps, Summary } from '../components/ui'

const section = { label: 'MyDMV', to: routes.account }
const steps = ['targets', 'address', 'review']
const stepLabels = ['What to update', 'New address', 'Review']
const emptyDraft = { credentialId: null, vehicleIds: [], residential: { ...blankAddress }, mailing: { ...blankAddress }, separate: false }
const processing = 'Allow up to three days for your request to be processed.'

export function AddressIntroduction() {
  return <Introduction title="Change of Address"
    description="Tell DMV when you move. Update the address on your driver’s license or ID card, vehicle registration, or both."
    action="Start Address Change" to={routes.addressStart} secondary={{ to: routes.addressStatus, label: 'Check Address Change Status' }}
    requirements={['Use MyDMV and make sure your vehicles are in the Garage.', 'Have your current and new addresses ready.', 'You can update up to three vehicles at the same current address.']}
    guidance={[
      { title: 'Who can change an address online?', answer: 'Use MyDMV to update eligible DL/ID records and vehicles already in your Garage. If you have a California commercial driver’s license, enter a California residential address.' },
      { title: 'Can I use a PO box?', answer: 'Yes, you can add a PO box as your mailing address. Enter a street address for your residence and vehicle location.' },
      { title: 'When will my address change be processed?', answer: <>{processing} <SiteLink to={routes.addressStatus}>Check the status in MyDMV</SiteLink>.</> },
    ]}
  />
}

function FormAddress({ kind, value, onChange, errors = {} }) {
  const selectId = useId()
  const residential = kind === 'residential'
  const fields = [
    { key: 'line1', label: residential ? 'Street address' : 'Mailing address', hint: residential ? 'Enter the street where you live.' : 'A PO box is accepted.', autoComplete: 'address-line1' },
    { key: 'line2', label: 'Apartment or unit (optional)', autoComplete: 'address-line2' },
    { key: 'city', label: 'City', autoComplete: 'address-level2' },
  ]
  const set = (key, next) => onChange({ ...value, [key]: next })

  return <fieldset className="choice-field address-fieldset">
    <legend>{residential ? 'New residential address' : 'New mailing address'}</legend>
    <div className="form-grid">
      {fields.map(({ key, ...field }) => <Field key={key} name={`${kind}-${key}`} value={value[key]} error={errors[key]} required={key !== 'line2'} maxLength={120} onChange={(event) => set(key, event.target.value)} {...field} />)}
      <div className="field">
        <label htmlFor={selectId}>State</label>
        <select id={selectId} name={`${kind}-state`} value={value.state} autoComplete="address-level1" required aria-invalid={errors.state ? true : undefined} aria-describedby={errors.state ? `${selectId}-error` : undefined} onChange={(event) => set('state', event.target.value)}>
          <option value="">Select state</option>
          {postalStates.map((state) => <option key={state}>{state}</option>)}
        </select>
        {errors.state && <small id={`${selectId}-error`} className="field-error">{errors.state}</small>}
      </div>
      <Field label="ZIP code" name={`${kind}-zip`} autoComplete="postal-code" value={value.zip} error={errors.zip} required maxLength={10} onChange={(event) => set('zip', event.target.value)} />
    </div>
  </fieldset>
}

function TargetChoice({ checked, disabled, onChange, title, address }) {
  return <label className="choice-card">
    <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
    <span><strong>{title}</strong><small>Current residential address</small><Address value={address} /></span>
  </label>
}

function TargetSummary({ targets }) {
  return <Summary rows={[
    ...(targets.credential ? [[`Driver’s license / ID · ${targets.credential.type || 'DL/ID'}`, <Address value={targets.credential.residentialAddress} />]] : []),
    ...targets.selected.map(({ vehicle, registration }) => [
      `${vehicleName(vehicle)} · ${vehicle.plateNumber || vehicle.id}`, <Address value={registration.residentialAddress} />,
    ]),
  ]} />
}

export function AddressWizard() {
  const { state } = useStore()
  const [submitChange, submitting] = useTransaction('addressChangeRequests', submitAddressChange)
  const [draft, setDraft] = useDraft('address', emptyDraft)
  const [requested, go] = useWizard('targets')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const navigate = useSiteNavigate()
  const profile = state.profile
  const credential = profile?.credential
  const vehicles = changeableVehicles(state)
  const targets = resolveTargets(state, draft)
  const proposed = proposedAddresses(draft, targets.credential)
  const addressesValid = !Object.keys(proposed.residential.errors).length && !Object.keys(proposed.mailing?.errors ?? {}).length
  const step = targets.error || !steps.includes(requested) ? 'targets' : requested === 'review' && !addressesValid ? 'address' : requested
  const isEligible = profile?.id && profile.canChangeAddressOnline === true

  function update(patch) {
    setDraft({ ...draft, ...patch })
    setError('')
  }

  function toggleVehicle(id) {
    const removing = draft.vehicleIds.includes(id)
    const vehicleIds = removing ? draft.vehicleIds.filter((value) => value !== id) : [...draft.vehicleIds, id]
    if (!removing) {
      const checked = resolveTargets(state, { ...draft, vehicleIds })
      if (checked.error) {
        setError(checked.error)
        return
      }
    }
    update({ vehicleIds })
  }

  function checkAddresses(event) {
    event.preventDefault()
    const residential = proposed.residential.errors
    const mailing = proposed.mailing?.errors ?? {}
    setFieldErrors({ residential, mailing })
    const invalidKind = Object.keys(residential).length ? 'residential' : Object.keys(mailing).length ? 'mailing' : null
    if (invalidKind) {
      const fields = invalidKind === 'residential' ? residential : mailing
      event.currentTarget.elements.namedItem(`${invalidKind}-${Object.keys(fields)[0]}`)?.focus()
      return
    }
    go('review')
  }

  async function submit() {
    setError('')
    try {
      const record = await submitChange(draft)
      if (!record) return
      setDraft(null)
      navigate(routes.addressStatus + encodeURIComponent(record.id), { replace: true })
    } catch (failure) {
      setError(failure.message)
    }
  }

  return <Page title="Change Your Address" section={section} compact>
    <Steps labels={stepLabels} step={steps.indexOf(step)} />
    {step === 'targets' && <section className="card">
      <h2>Choose what to update</h2>
      <p>Choose a driver’s license or ID card, eligible vehicle registrations, or both.</p>
      {!isEligible && <Notice kind="error">Your MyDMV account is currently ineligible for an online address change.</Notice>}
      <fieldset className="choice-field">
        <legend>Driver’s license or ID card</legend>
        {credential?.id ? <TargetChoice checked={draft.credentialId === credential.id} disabled={!isEligible || !completeAddress(credential.residentialAddress)}
          title={`${credential.type || 'DL/ID'}${credential.number ? ` · •••• ${String(credential.number).slice(-4)}` : ''}`} address={credential.residentialAddress}
          onChange={(event) => update({ credentialId: event.target.checked ? credential.id : null })} /> : <p>No driver’s license or ID card on file.</p>}
      </fieldset>
      <fieldset className="choice-field">
        <legend>Vehicle registrations</legend>
        <p className="form-intro">Select up to three vehicles at the same current residential address.</p>
        {vehicles.length ? <div className="target-list">{vehicles.map(({ vehicle, registration }) =>
          <TargetChoice key={vehicle.id} checked={draft.vehicleIds.includes(vehicle.id)} disabled={!isEligible || !registration?.id || !completeAddress(registration.residentialAddress)}
            title={`${vehicleName(vehicle)} · ${vehicle.plateNumber || 'Plate unavailable'}`} address={registration?.residentialAddress} onChange={() => toggleVehicle(vehicle.id)} />,
        )}</div> : <p>No eligible vehicles in your Garage.</p>}
      </fieldset>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions">
        <button type="button" className="button" disabled={!isEligible} onClick={() => targets.error ? setError(targets.error) : go('address')}>Continue</button>
        <SiteLink to={routes.account}>Return to MyDMV</SiteLink>
      </div>
    </section>}
    {step === 'address' && <form className="card" noValidate onSubmit={checkAddresses}>
      <h2>Enter your new address</h2>
      <FormAddress kind="residential" value={draft.residential} onChange={(residential) => update({ residential })} errors={fieldErrors.residential} />
      <label className="choice-card separate-mailing">
        <input type="checkbox" checked={draft.separate} onChange={(event) => update({ separate: event.target.checked })} />
        <span>Use a different mailing address</span>
      </label>
      {draft.separate && <FormAddress kind="mailing" value={draft.mailing} onChange={(mailing) => update({ mailing })} errors={fieldErrors.mailing} />}
      <div className="actions"><button type="submit" className="button">Continue</button><button type="button" className="button button-secondary" onClick={() => go('targets', true)}>Back</button></div>
    </form>}
    {step === 'review' && <section className="card">
      <h2>Review your change of address</h2>
      <div className="review-group">
        <div className="section-heading"><h3>Selected records and current addresses</h3><button className="text-button" type="button" disabled={submitting} onClick={() => go('targets', true)}>Edit selected records</button></div>
        <TargetSummary targets={targets} />
      </div>
      <div className="review-group">
        <div className="section-heading"><h3>New addresses</h3><button className="text-button" type="button" disabled={submitting} onClick={() => go('address', true)}>Edit new addresses</button></div>
        <Summary rows={[
          ['Residential address', <Address value={proposed.residential.address} />],
          ['Mailing address', proposed.mailing ? <Address value={proposed.mailing.address} /> : 'Same as residential address'],
        ]} />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions"><button type="button" className="button" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit Address Change'}</button><button type="button" className="button button-secondary" disabled={submitting} onClick={() => go('address', true)}>Back</button></div>
    </section>}
  </Page>
}

function SavedTargets({ record, state }) {
  const snapshots = list(record.previousAddresses)
  const registrationIds = list(record.registrationIds)
  const vehicleIds = list(record.vehicleIds)
  const credential = state.profile?.credential
  const targetRows = []
  if (record.credentialId) {
    const type = credential?.id === record.credentialId ? credential.type : null
    targetRows.push([`Driver’s license / ID${type ? ` · ${type}` : ''}`, snapshots.find((item) => item?.type === 'credential' && item.id === record.credentialId)])
  }
  registrationIds.forEach((id, index) => {
    const registration = byId(state.registrations, id)
    const vehicle = byId(state.vehicles, vehicleIds[index] ?? registration?.vehicleId)
    targetRows.push([vehicle ? `${vehicleName(vehicle)} · ${vehicle.plateNumber || vehicle.id}` : `Vehicle registration · ${id}`,
      snapshots.find((item) => item?.type === 'registration' && item.id === id)])
  })
  return targetRows.length ? <Summary rows={targetRows.map(([label, snapshot]) => [label, <Address value={snapshot?.residentialAddress} />])} /> : <p>Target details unavailable.</p>
}

export function AddressHistory() {
  const { state } = useStore()
  const records = owned(state, 'addressChangeRequests').sort(newestFirst)
  return <Page title="Change of Address Status" section={section} compact>
    <p className="lead">View your submitted address changes. {processing}</p>
    {records.length ? <div className="history-list">{records.map((record) => <article className="card" key={record.id}>
      <div className="section-heading"><h3>{record.confirmationCode || 'Address change request'}</h3><Status value={record.status} /></div>
      <p>Submitted {showTimestamp(record.createdAt)}</p>
      <p>{[record.credentialId ? 'Driver’s license / ID' : null, list(record.registrationIds).length ? `${record.registrationIds.length} vehicle registration${record.registrationIds.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' and ') || 'Targets unavailable'}</p>
      {record.id && <div className="actions"><SiteLink to={routes.addressStatus + encodeURIComponent(record.id)}>View request details</SiteLink></div>}
    </article>)}</div> : <Empty title="No address change requests">Your submitted requests will appear here.</Empty>}
    <div className="actions"><ButtonLink to={routes.addressStart}>Start Address Change</ButtonLink></div>
  </Page>
}

export function AddressRequest() {
  const { id } = useParams()
  const { state } = useStore()
  const record = byId(owned(state, 'addressChangeRequests'), id)
  if (!record) return <MissingRecord title="Address Change Details" message="Address change request unavailable" to={routes.addressStatus} action="View Address Change History" />
  return <Page title={record.status === 'submitted' ? 'Address Change Confirmation' : 'Address Change Details'} section={section} compact>
    <section className="card">
      <Notice kind={record.status === 'completed' ? 'success' : 'info'}><strong>Confirmation code</strong><div className="reference-code">{record.confirmationCode || 'Unavailable'}</div></Notice>
      <Summary rows={[
        ['Status', <Status value={record.status} />], ['Date submitted', showTimestamp(record.createdAt)],
        ...(record.completedAt ? [['Date completed', showTimestamp(record.completedAt)]] : []),
        ['New residential address', <Address value={record.newResidentialAddress} />],
        ['New mailing address', record.newMailingAddress ? <Address value={record.newMailingAddress} /> : 'Same as residential address'],
      ]} />
      <div className="review-group"><h3>Affected records and previous addresses</h3><SavedTargets record={record} state={state} /></div>
      {record.status === 'submitted' && <p className="inline-help">{processing}</p>}
      <div className="actions"><ButtonLink to={routes.addressStatus}>View Address Change History</ButtonLink><PrintButton /></div>
    </section>
  </Page>
}
