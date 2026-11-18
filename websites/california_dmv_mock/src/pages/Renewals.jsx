import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CreditCard, Landmark, ShoppingCart } from 'lucide-react'
import { useDraft, useStore, useTransaction } from '../context/Store'
import { byId, list, owned, showDate, showMoney, showTimestamp, vehicleName } from '../data/display'
import { blankIdentifiers, getRenewal, identifyVehicle, latestRenewal, paymentLabels, payRenewal, totals } from '../data/renewals'
import { routes } from '../data/routes'
import { useSiteNavigate, useWizard } from '../utils/navigation'
import Introduction from '../components/Introduction'
import { MissingRecord } from '../components/RouteViews'
import { Address, ButtonLink, Disclosure, Empty, Field, Notice, Page, PrintButton, SiteLink, Status, Steps, Summary } from '../components/ui'

const section = { label: 'Vehicle Registration', to: routes.renewal }
const steps = ['identify', 'fees', 'cart', 'payment', 'review']
const stepLabels = ['Vehicle', 'Fees and address', 'Cart', 'Payment', 'Review']
const emptyDraft = { identifiers: { ...blankIdentifiers } }

export function RenewalIntroduction() {
  return <Introduction title="Vehicle Registration Renewal" description="Renew your vehicle or vessel registration online. Have your registration information ready before you start."
    action="Start Renewal" to={routes.renewalStart} secondary={{ to: routes.renewalStatus, label: 'Check Registration Status' }}
    requirements={['Your license plate or vessel CF number.', 'The last five characters of your VIN or HIN. For a short HIN, use the last two or three characters.', 'A payment method and a confirmed mailing address.']}
    guidance={[
      { title: 'Can I renew online?', answer: 'Your vehicle or vessel needs an available renewal offer. Make sure any required insurance and smog certification are on file.' },
      { title: 'What if my mailing address has changed?', answer: <><SiteLink to={routes.address}>Change your address</SiteLink> and check its status before renewing if you need your registration mailed to a new address.</> },
      { title: 'What are the payment options?', answer: 'You can use a sample credit or debit card or a sample bank account. The card processing fee is 1.95 percent. Bank account payments have no processing fee.' },
    ]} />
}

function IdentifierFields({ values, errors, onChange, method = 'suffix' }) {
  return <div className="form-stack">
    <Field label="License plate or CF number" name="plate" value={values.plate} maxLength={12} error={errors.plate} autoCapitalize="characters" autoComplete="off" required onChange={(event) => onChange({ ...values, plate: event.target.value })} />
    {method === 'suffix'
      ? <Field label="VIN or HIN suffix" name="suffix" value={values.suffix} maxLength={8} error={errors.suffix} hint="Use the last five characters, or the last two or three for a short HIN." autoCapitalize="characters" autoComplete="off" required onChange={(event) => onChange({ ...values, suffix: event.target.value })} />
      : <Field label="Registered owner name" name="owner" value={values.owner} maxLength={120} error={errors.owner} hint="Enter a last name or the full name of a business or lessor." required onChange={(event) => onChange({ ...values, owner: event.target.value })} />}
  </div>
}

function VINHelp() {
  return <Disclosure title="Show Me How">
    <p>Find both identifiers on your renewal notice or registration card. On a vehicle, use VIN. On a vessel, use HIN and look for a plate number starting with CF.</p>
    <div className="example-registration">
      <strong>Vehicle registration card</strong>
      <Summary rows={ [['License plate', <mark>8TYC214</mark>], ['VIN', <>4T1BF1FK5M21<mark>24680</mark></>]] } />
    </div>
  </Disclosure>
}

function FeeTable({ lines, amounts, showProcessing = false }) {
  return <table className="fee-table">
    <caption className="sr-only">Registration fees</caption>
    <thead><tr><th scope="col">Fee</th><th scope="col">Amount</th></tr></thead>
    <tbody>
      {list(lines).filter(Boolean).map((line, index) => <tr key={line.code || index}><th scope="row">{line.label || 'Registration fee'}</th><td>{showMoney(line.amount)}</td></tr>)}
      {showProcessing && <>
        <tr><th scope="row">Subtotal</th><td>{showMoney(amounts.subtotal)}</td></tr>
        <tr><th scope="row">Processing fee</th><td>{showMoney(amounts.processingFee)}</td></tr>
      </>}
    </tbody>
    <tfoot><tr><th scope="row">{showProcessing ? 'Total' : 'Subtotal'}</th><td>{showMoney(showProcessing ? amounts.total : amounts.subtotal)}</td></tr></tfoot>
  </table>
}

function RegistrationSummary({ renewal }) {
  return <Summary rows={[
    ['Vehicle', vehicleName(renewal.vehicle)],
    ['License plate or CF', renewal.vehicle.plateNumber],
    ['Current expiration', showDate(renewal.registration.expirationDate)],
    ['New expiration', showDate(renewal.offer.termEndDate)],
    ['Confirmed mailing address', <Address value={renewal.mailingAddress} />],
  ]} />
}

export function RenewalWizard() {
  const { state } = useStore()
  const [submitPayment, paying] = useTransaction('registrationRenewals', payRenewal)
  const [draft, setDraft] = useDraft('renewal', emptyDraft)
  const [requestedStep, go] = useWizard('identify')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const navigate = useSiteNavigate()
  const renewal = draft.vehicleId ? getRenewal(state, draft.vehicleId, draft.offerId) : null
  const valid = renewal && !renewal.error
  let step = 'identify'
  if (valid && requestedStep === 'fees') step = 'fees'
  if (valid && draft.inCart && ['payment', 'review'].includes(requestedStep)) {
    step = requestedStep === 'review' && Object.hasOwn(paymentLabels, draft.method) ? 'review' : 'payment'
  }

  function lookup(event) {
    event.preventDefault()
    const identified = identifyVehicle(state, draft.identifiers)
    setErrors(identified.errors)
    const first = Object.keys(identified.errors)[0]
    if (first) {
      setError('')
      event.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    if (!identified.vehicle) {
      setError('No vehicle matched those identifiers. Check your plate and VIN or HIN and try again.')
      return
    }
    const found = getRenewal(state, identified.vehicle.id)
    if (found.error) {
      setError(found.error)
      return
    }
    setError('')
    const unchanged = draft.vehicleId === found.vehicle.id && draft.offerId === found.offer.id
    setDraft({
      ...(unchanged ? draft : { identifiers: draft.identifiers }),
      vehicleId: found.vehicle.id, registrationId: found.registration.id, offerId: found.offer.id,
    })
    go('fees')
  }

  function cancel() {
    setDraft(null)
    navigate(routes.renewal, { replace: true })
  }

  async function pay() {
    setError('')
    try {
      const record = await submitPayment(draft)
      if (!record) return
      setDraft(null)
      navigate(routes.receipt + encodeURIComponent(record.id), { replace: true })
    } catch (failure) {
      setError(failure.message)
    }
  }

  return <Page title="Online Registration Renewal" section={section} compact>
    <Steps labels={stepLabels} step={steps.indexOf(step)} />
    {step === 'identify' && <form className="card" noValidate onSubmit={lookup}>
      <h2>Enter vehicle or vessel information</h2>
      <IdentifierFields values={draft.identifiers} errors={errors} onChange={(identifiers) => {
        setDraft({ ...draft, identifiers })
        setError('')
      }} />
      <div className="inline-help"><VINHelp /></div>
      {(error || renewal?.error) && <Notice kind="error">{error || renewal.error} {(!error || error.includes('already been renewed')) && <SiteLink to={routes.renewalStatus}>Check Registration Status</SiteLink>}</Notice>}
      <div className="actions"><button type="submit" className="button">Continue</button><button type="button" className="button button-secondary" onClick={cancel}>Cancel</button></div>
    </form>}
    {step === 'fees' && <section className="card">
      <h2>Review your fees and mailing address</h2>
      <RegistrationSummary renewal={renewal} />
      <p className="inline-help">Moved recently? <SiteLink to={routes.address}>Change your address</SiteLink> before renewing.</p>
      <FeeTable lines={renewal.feeLines} amounts={totals(renewal)} />
      <div className="actions">
        <button className="button" type="button" onClick={() => { setDraft({ ...draft, inCart: true }); navigate(routes.cart) }}><ShoppingCart size={19} aria-hidden="true" />Add to Cart</button>
        <button className="button button-secondary" type="button" onClick={() => go('identify', true)}>Back</button>
        <button className="text-button" type="button" onClick={cancel}>Cancel renewal</button>
      </div>
    </section>}
    {step === 'payment' && <section className="card">
      <h2>Select a payment method</h2>
      <p>Choose a sample payment method for this transaction.</p>
      <fieldset className="choice-field"><legend>Payment method</legend>
        <div className="choice-grid">
          {Object.entries(paymentLabels).map(([key, label]) => {
            const Icon = key === 'card' ? CreditCard : Landmark
            return <label className="choice-card" key={key}>
              <input type="radio" name="payment" value={key} checked={draft.method === key} onChange={() => setDraft({ ...draft, method: key })} />
              <Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{key === 'card' ? '1.95% processing fee' : 'No processing fee'}</small></span>
            </label>
          })}
        </div>
      </fieldset>
      <FeeTable lines={renewal.feeLines} amounts={totals(renewal, draft.method)} showProcessing={Boolean(draft.method)} />
      <div className="actions"><button className="button" type="button" disabled={!draft.method} onClick={() => go('review')}>Review Payment</button><ButtonLink secondary to={routes.cart}>Back to Cart</ButtonLink><button className="text-button" type="button" onClick={cancel}>Cancel renewal</button></div>
    </section>}
    {step === 'review' && <section className="card">
      <h2>Review and pay</h2>
      <RegistrationSummary renewal={renewal} />
      <Summary rows={ [['Payment method', paymentLabels[draft.method]]] } />
      <FeeTable lines={renewal.feeLines} amounts={totals(renewal, draft.method)} showProcessing />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="actions"><button className="button" type="button" disabled={paying} onClick={pay}>{paying ? 'Submitting payment…' : 'Confirm and Pay'}</button><button className="button button-secondary" type="button" disabled={paying} onClick={() => go('payment', true)}>Back</button><button className="text-button" type="button" disabled={paying} onClick={cancel}>Cancel renewal</button></div>
    </section>}
  </Page>
}

export function RenewalCart() {
  const { state } = useStore()
  const [draft, setDraft] = useDraft('renewal', emptyDraft)
  const renewal = draft.inCart ? getRenewal(state, draft.vehicleId, draft.offerId) : null
  return <Page title="Shopping Cart" section={section} compact>
    <section className="card">
      {renewal && !renewal.error ? <>
        <h2>Vehicle registration renewal</h2>
        <p>{vehicleName(renewal.vehicle)} · {renewal.vehicle.plateNumber}</p>
        <FeeTable lines={renewal.feeLines} amounts={totals(renewal)} />
        <p className="muted">Your payment total will include any applicable card processing fee.</p>
        <div className="actions"><ButtonLink to={`${routes.renewalStart}?step=payment`}>Begin Checkout</ButtonLink><ButtonLink secondary to={`${routes.renewalStart}?step=fees`}>Back</ButtonLink><button className="text-button" type="button" onClick={() => setDraft(null)}>Remove renewal</button></div>
      </> : <>
        <Empty title="Your shopping cart is empty" />
        {renewal?.error && <Notice kind="error">{renewal.error}</Notice>}
        <div className="actions"><ButtonLink to={routes.renewalStart}>Start Renewal</ButtonLink></div>
      </>}
    </section>
  </Page>
}

export function RenewalReceipt() {
  const { id } = useParams()
  const { state } = useStore()
  const record = byId(owned(state, 'registrationRenewals'), id)
  if (!record) return <MissingRecord title="Registration Renewal Receipt" message="Receipt unavailable" to={routes.renewalStatus} action="Check Registration Status" />
  const vehicle = byId(state.vehicles, record.vehicleId)
  return <Page title="Registration Renewal Receipt" section={section} compact>
    <section className="card">
      <Notice kind="success"><strong>Confirmation code</strong><div className="reference-code">{record.confirmationCode || 'Unavailable'}</div></Notice>
      <Summary rows={[
        ['Status', <Status value={record.status} />], ['Vehicle', vehicleName(vehicle)], ['License plate or CF', vehicle?.plateNumber],
        ['Previous expiration', showDate(record.previousExpirationDate)], ['New expiration', showDate(record.newExpirationDate)],
        ['Payment method', paymentLabels[record.paymentMethod]], ['Payment date', showTimestamp(record.createdAt)],
        ['Mailing address', <Address value={record.mailingAddress} />],
      ]} />
      <FeeTable lines={record.feeLines} amounts={record} showProcessing />
      <div className="actions"><ButtonLink to={routes.renewalStatus}>Check Registration Status</ButtonLink><PrintButton /></div>
    </section>
  </Page>
}

export function RenewalStatus() {
  const { state } = useStore()
  const [identifiers, setIdentifiers] = useState({ ...blankIdentifiers })
  const [method, setMethod] = useState('suffix')
  const [errors, setErrors] = useState({})
  const [lookup, setLookup] = useState(null)
  const vehicle = byId(state.vehicles, lookup?.vehicleId)
  const record = latestRenewal(state, vehicle?.id)
  const receiptId = record?.actorId && record.actorId === state.profile?.id ? record.id : null

  function submit(event) {
    event.preventDefault()
    const result = identifyVehicle(state, identifiers, method)
    setErrors(result.errors)
    const first = Object.keys(result.errors)[0]
    if (first) {
      setLookup(null)
      event.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    setLookup({ vehicleId: result.vehicle?.id })
  }

  return <Page title="Vehicle Registration Status" section={section} compact>
    <p className="lead">Check the status of an online vehicle or vessel registration renewal.</p>
    <form className="card" noValidate onSubmit={submit}>
      <h2>Look up your renewal</h2>
      <fieldset className="choice-field"><legend>Look up by</legend>
        <div className="option-list">
          {[['suffix', 'VIN or HIN suffix'], ['owner', 'Registered owner name']].map(([value, label]) => <label key={value} className="choice-pill">
            <input type="radio" name="lookupMethod" checked={method === value} onChange={() => { setMethod(value); setErrors({}); setLookup(null) }} />{label}
          </label>)}
        </div>
      </fieldset>
      <div className="inline-help"><IdentifierFields values={identifiers} errors={errors} onChange={(value) => { setIdentifiers(value); setLookup(null) }} method={method} /></div>
      <div className="actions"><button className="button" type="submit">Check Status</button><SiteLink to={routes.renewal}>Renew Registration</SiteLink></div>
    </form>
    {lookup && <div className="content-section" aria-live="polite">
      {!vehicle ? <Empty title="No matching vehicle">Check your plate or CF number and the other identifier, then try again.</Empty>
        : !record ? <Empty title="No renewal on file">No online renewal was found for {vehicleName(vehicle)}. <SiteLink to={routes.renewal}>Start a registration renewal</SiteLink>.</Empty>
          : <section className="card">
            <h2>Latest renewal</h2>
            <Summary rows={[
              ['Vehicle', vehicleName(vehicle)], ['Status', <Status value={record.status} />],
              ['Confirmation code', record.confirmationCode], ['Payment date', showTimestamp(record.createdAt)],
              ['New expiration', showDate(record.newExpirationDate)],
            ]} />
            {receiptId && <div className="actions"><ButtonLink secondary to={routes.receipt + encodeURIComponent(receiptId)}>View Receipt</ButtonLink></div>}
          </section>}
    </div>}
  </Page>
}
