import { useState } from 'react'
import { actor, newId, useAccount } from '../state'
import { dateLabel, facilityName, label, money, newest, recordPath, useRecordId } from '../records'
import {
  AccountLink, Badge, Details, Field, Filter, FormActions, Notice, Page, Panel,
  RecordLink, RecordList, useFilters,
} from '../components/ui'
import Missing from '../components/Missing'

const base = '/payments'
const benefitGroups = [['benefits', 'Disability compensation and pension'], ['education', 'Education benefits']]
const groupNames = Object.fromEntries(benefitGroups)
const benefitTypes = [
  ['all', 'All benefit types'], ['disability_compensation', 'Disability compensation'], ['pension', 'Pension'], ['education', 'Education'],
]
const billStatuses = [['all', 'All bills'], ['open', 'Open'], ['paid', 'Paid']]
const paymentMethods = [['sample_debit', 'Sample debit card'], ['sample_bank', 'Sample bank account']]
const methodNames = Object.fromEntries(paymentMethods)

function paymentMethod(payment) {
  return [label(payment.method), payment.destinationLast4 && `ending in ${payment.destinationLast4}`].filter(Boolean).join(' ')
}

function destinationLabel(destination) {
  if (!destination) return 'Destination unavailable'
  return [destination.institutionName, destination.accountType && label(destination.accountType),
    destination.last4 && `ending in ${destination.last4}`].filter(Boolean).join(' · ') || destination.id
}

export function Payments() {
  const { state } = useAccount()
  const benefits = useFilters()
  const bills = useFilters()
  const [year, setYear] = useState('all')
  const years = [...new Set(state.benefitPayments.map(item => item.paidOn?.slice(0, 4)).filter(Boolean))].sort().reverse()
  const facilities = new Map(state.facilities.map(facility => [facility.id, facility]))
  const payments = state.benefitPayments.filter(item =>
    (benefits.filter === 'all' || item.benefitType === benefits.filter) &&
    (year === 'all' || item.paidOn?.slice(0, 4) === year)
  ).sort(newest('paidOn'))
  const copays = state.copayBills.filter(item =>
    bills.filter === 'all' || item.status === bills.filter
  ).sort(newest('issuedOn'))
  return <Page title="Payments" description="Review benefit deposits and VA health care bills."
    action={<AccountLink className="button" to={base + '/direct-deposit'}>Direct deposit</AccountLink>}>
    <nav className="section-links" aria-label="Payments sections"><a href="#benefit-history">Benefit payment history</a><a href="#copay-bills">Copay bills</a></nav>
    <section className="page-section" aria-labelledby="benefit-history">
      <h2 id="benefit-history" tabIndex={-1}>Benefit payment history</h2>
      <div className="filters">
        <Filter title="Benefit type" options={benefitTypes} filters={benefits} />
        <Field title="Payment year"><select value={year} onChange={event => { setYear(event.target.value); benefits.setPage(1) }}>
          <option value="all">All years</option>
          {years.map(value => <option key={value}>{value}</option>)}
        </select></Field>
      </div>
      <RecordList title="Benefit payments" filters={benefits} records={payments} empty="No benefit payments match these filters."
        columns={['Benefit payment', 'Date', 'Amount', 'Status']} cells={payment => [
          <RecordLink to={recordPath(base + '/history', payment.id)} title={label(payment.benefitType)} detail={payment.id} />,
          dateLabel(payment.paidOn), money(payment.amount, payment.currency), <Badge value={payment.status} />,
        ]} />
    </section>
    <section className="page-section" aria-labelledby="copay-bills">
      <h2 id="copay-bills" tabIndex={-1}>Copay bills</h2>
      <div className="filters"><Filter title="Bill status" options={billStatuses} filters={bills} /></div>
      <RecordList title="Copay bills" filters={bills} records={copays} empty="No copay bills match these filters."
        columns={['Bill', 'Facility', 'Due date', 'Balance', 'Status']} cells={bill => [
          <RecordLink to={recordPath(base + '/copays', bill.id)} title={bill.id} detail={`Issued ${dateLabel(bill.issuedOn)}`} />,
          facilityName(facilities.get(bill.facilityId)), dateLabel(bill.dueOn), money(bill.balance, bill.currency), <Badge value={bill.status} />,
        ]} />
    </section>
  </Page>
}

export function PaymentDetail() {
  const id = useRecordId()
  const { state } = useAccount()
  const payment = state.benefitPayments.find(item => item.id === id)
  if (!payment) return <Missing title="Payment unavailable" to={base} back="Payments" />
  return <Page title="Benefit payment details" back="Payments" to={base} description={id}>
    <Panel title={label(payment.benefitType)}><Details rows={[
      ['Date', dateLabel(payment.paidOn)], ['Amount', money(payment.amount, payment.currency)],
      ['Status', <Badge value={payment.status} />], ['Payment method', paymentMethod(payment)],
    ]} /></Panel>
  </Page>
}

export function DirectDeposit() {
  const { state, apply } = useAccount()
  const [group, setGroup] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [review, setReview] = useState(false)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState('')
  const current = state.directDeposits.find(item => item.benefitGroup === group)
  const selected = state.depositDestinations.find(item => item.id === destinationId)
  const available = state.depositDestinations.filter(item => item.id !== current?.destinationId)
  const destinationFor = setting => setting
    ? destinationLabel(state.depositDestinations.find(item => item.id === setting.destinationId))
    : 'No destination set'

  function submit(event) {
    event.preventDefault()
    if (result) return
    const nextErrors = {}
    if (!groupNames[group]) nextErrors.group = 'Choose a benefit group.'
    if (!selected || selected.id === current?.destinationId) nextErrors.destination = 'Choose a different destination.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setReview(false); return }
    if (!review) { setReview(true); return }

    const saved = apply(latest => {
      const existing = latest.directDeposits.find(item => item.benefitGroup === group)
      if (existing?.destinationId !== current?.destinationId ||
          existing?.destinationId === destinationId ||
          !latest.depositDestinations.some(item => item.id === destinationId)) return
      const stableId = `deposit-${group}`
      const id = existing?.id || (latest.directDeposits.some(item => item.id === stableId)
        ? newId('deposit', latest.directDeposits) : stableId)
      const createdAt = new Date().toISOString()
      const actorId = actor(latest)
      const setting = { ...existing, id, benefitGroup: group, destinationId, status: 'active', actorId, updatedAt: createdAt }
      const change = {
        id: newId('deposit-change', latest.directDepositChanges), directDepositId: id, benefitGroup: group,
        previousDestinationId: existing?.destinationId ?? null, destinationId, status: 'saved', actorId, createdAt,
      }
      return {
        ...latest,
        directDeposits: existing ? latest.directDeposits.map(item => item === existing ? setting : item) : [...latest.directDeposits, setting],
        directDepositChanges: [...latest.directDepositChanges, change],
      }
    })
    if (saved) setResult(`${groupNames[group]} · ${destinationLabel(selected)}`)
    else { setReview(false); setErrors({ form: 'The deposit settings changed. Review the current destination and try again.' }) }
  }
  return <Page title="Direct deposit" back="Payments" to={base}>
    {result && <Notice>Direct deposit updated. {result}</Notice>}
    <Panel title="Current destinations"><Details rows={benefitGroups.map(([value, name]) => [
      name, destinationFor(state.directDeposits.find(item => item.benefitGroup === value)),
    ])} /></Panel>
    {result ? <AccountLink className="button secondary standalone" to={base}>Return to payments</AccountLink> :
      <Panel title={review ? 'Review your direct deposit change' : 'Change a destination'}>
        {state.depositDestinations.length ? <form className="form-stack" onSubmit={submit} noValidate>
          {!!Object.keys(errors).length && <Notice error>{errors.form || 'Check the highlighted direct deposit fields.'}</Notice>}
          {review ? <>
            <Details rows={[[ 'Benefit group', groupNames[group]], ['Current destination', destinationFor(current)], ['New destination', destinationLabel(selected)]]} />
            <FormActions submit="Confirm direct deposit change" onBack={() => setReview(false)} />
          </> : <>
            <Field title="Benefit group" error={errors.group}><select value={group} aria-invalid={!!errors.group} onChange={event => { setGroup(event.target.value); setDestinationId(''); setErrors({}) }}>
              <option value="">Select a benefit group</option>
              {benefitGroups.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select></Field>
            <Field title="New destination" error={errors.destination}><select value={destinationId} disabled={!group || !available.length}
              aria-invalid={!!errors.destination} onChange={event => setDestinationId(event.target.value)}>
              <option value="">{group && !available.length ? 'No other destinations available' : 'Select a destination'}</option>
              {available.map(item => <option key={item.id} value={item.id}>{destinationLabel(item)}</option>)}
            </select></Field>
            <FormActions submit="Review change" back={base} />
          </>}
        </form> : <p>There are no available destinations in this account.</p>}
      </Panel>}
  </Page>
}

export function CopayDetail() {
  const id = useRecordId()
  const { state, apply } = useAccount()
  const [method, setMethod] = useState('')
  const [review, setReview] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)
  const bill = state.copayBills.find(item => item.id === id)
  if (!bill) return <Missing title="Copay bill unavailable" to={base} back="Payments" />
  const facility = state.facilities.find(item => item.id === bill.facilityId)
  const receipt = state.copayPayments.filter(item => item.billId === id && item.status === 'paid').sort(newest('createdAt'))[0]
  const open = bill.status === 'open' && Number(bill.balance) > 0
  const balance = money(bill.balance, bill.currency)
  function submit(event) {
    event.preventDefault()
    if (!methodNames[method]) { setError('Choose a payment method.'); return }
    setError('')
    if (!review) { setReview(true); return }
    const saved = apply(latest => {
      const current = latest.copayBills.find(item => item.id === id)
      if (current?.status !== 'open' || !(Number(current.balance) > 0) ||
          Number(current.balance) !== Number(bill.balance) || current.currency !== bill.currency) return
      const createdAt = new Date().toISOString()
      const record = {
        id: newId('copay-pay', latest.copayPayments), billId: id, amount: Number(current.balance),
        currency: current.currency || 'USD', method, status: 'paid', actorId: actor(latest), createdAt,
      }
      return {
        ...latest, copayPayments: [...latest.copayPayments, record],
        copayBills: latest.copayBills.map(item => item.id === id ? { ...item, status: 'paid', balance: 0, paidAt: createdAt, updatedAt: createdAt } : item),
      }
    })
    if (saved) { setPaid(true); setPaying(false) }
    else { setReview(false); setError('The balance changed. Review the bill and try again.') }
  }
  return <Page title="Copay bill details" description={id} back="Payments" to={base}>
    {paid && receipt && <Notice>Payment complete. {money(receipt.amount, receipt.currency)} paid. Receipt ID {receipt.id}. <a href="#receipt">View receipt</a>.</Notice>}
    {!open && error && <Notice error>{error}</Notice>}
    <Panel title="Bill summary"><Details rows={[
      ['Status', <Badge value={bill.status} />], ['Facility', facilityName(facility)], ['Issued', dateLabel(bill.issuedOn)],
      ['Due date', dateLabel(bill.dueOn)], ['Balance', balance],
    ]} />
      {open && !paying && <button type="button" className="button" onClick={() => { setPaying(true); setReview(false); setMethod(''); setError('') }}>Pay copay bill</button>}
    </Panel>
    {open && paying && <Panel title={review ? 'Review your copay payment' : 'Pay full balance'}>
      <form className="form-stack" onSubmit={submit} noValidate>
        {error && <Notice error>{error}</Notice>}
        {review ? <Details rows={[[ 'Bill', id], ['Amount to pay', balance], ['Payment method', methodNames[method]]]} /> : <>
          <p>Amount to pay <strong>{balance}</strong></p>
          <Field title="Payment method" error={error}><select value={method} aria-invalid={!!error} onChange={event => setMethod(event.target.value)}>
            <option value="">Select a payment method</option>
            {paymentMethods.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select></Field>
        </>}
        <div className="button-row">
          <button type="submit" className="button">{review ? 'Confirm payment' : 'Review payment'}</button>
          {review && <button type="button" className="button secondary" onClick={() => setReview(false)}>Back</button>}
          <button type="button" className="button secondary" onClick={() => setPaying(false)}>Cancel</button>
        </div>
      </form>
    </Panel>}
    <Panel title="Charges">
      {bill.lineItems?.length ? <ul className="subrows">{bill.lineItems.map(item => <li key={item.id}>
        <div className="charge"><strong>{item.description || item.id}</strong><span>{money(item.amount, bill.currency)}</span></div>
        <small>{dateLabel(item.serviceDate)}</small>
      </li>)}</ul> : <p>No charges recorded.</p>}
    </Panel>
    {bill.status === 'paid' && <Panel><h2 id="receipt" tabIndex={-1}>Payment receipt</h2>
      {receipt ? <Details rows={[
        ['Receipt ID', receipt.id], ['Amount paid', money(receipt.amount, receipt.currency)],
        ['Paid on', dateLabel(receipt.createdAt)], ['Payment method', methodNames[receipt.method] || label(receipt.method)],
      ]} /> : <p>No receipt is available for this bill.</p>}
    </Panel>}
  </Page>
}
