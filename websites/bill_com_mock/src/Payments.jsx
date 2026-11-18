import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ActivityTable, ButtonLink, DefinitionList, Dialog, Empty, Field, Missing, PageTitle, SearchField,
  SiteLink, Status, methodLabel, paymentNumber, recordNumber, recordPath, statusLabel, useFeedback, useSiteNavigation } from './components.jsx'
import { byId, dateLabel, fundingLabel, includes, methods, money, payable, recentFirst, rows, today, userName, vendorName } from './data/selectors.js'
import { cancelPayment, canCancelPayment, schedulePayment, validatePayment } from './data/transactions.js'
import { PaymentTable } from './PaymentTable.jsx'
import { useStore } from './store.jsx'

const paymentStatuses = ['scheduled', 'processing', 'paid', 'cancelled']

export function Payments() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const fromLink = params.get('status')
  return <PaymentsLedger key={fromLink} state={state} initialStatus={paymentStatuses.includes(fromLink) ? fromLink : ''} />
}

function PaymentsLedger({ state, initialStatus }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [method, setMethod] = useState('')
  const records = rows(state.payments).filter(payment => (!status || payment.status === status)
    && (!method || payment.method === method)
    && includes(query, vendorName(state, payment.vendorId), byId(state.bills, payment.billId)?.invoiceNumber, payment.reference))
    .sort(recentFirst)

  return <>
    <PageTitle title="Payments" description="Track outgoing vendor payments and their processing status."
      actions={<ButtonLink to="/payments/new"><span aria-hidden="true">+</span> Schedule payment</ButtonLink>} />
    <div className="toolbar">
      <SearchField label="Search payments" value={query} onChange={setQuery} placeholder="Vendor, invoice #, or reference" />
      <Field label="Status">{props => <select {...props} value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        {paymentStatuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
      </select>}</Field>
      <Field label="Payment method">{props => <select {...props} value={method} onChange={event => setMethod(event.target.value)}>
        <option value="">All methods</option><option value="ach">ACH</option><option value="check">Check</option>
      </select>}</Field>
    </div>
    <PaymentTable records={records} />
  </>
}

function defaultMethod(vendor) {
  const allowed = methods(vendor)
  return allowed.includes(vendor?.defaultPaymentMethod) ? vendor.defaultPaymentMethod : allowed[0] || ''
}

export function PaymentEditor() {
  const [params] = useSearchParams()
  const billId = params.get('bill')
  const vendorId = params.get('vendor')
  return <PaymentForm key={JSON.stringify([billId, vendorId])} billId={billId} vendorId={vendorId} />
}

function PaymentForm({ billId, vendorId }) {
  const { state, transact } = useStore()
  const navigate = useSiteNavigation()
  const notify = useFeedback()
  const eligible = rows(state.bills).filter(bill => payable(state, bill))
  const vendors = rows(state.vendors)
  const initiatingBill = byId(state.bills, billId)
  const initiatingVendor = byId(state.vendors, vendorId)
  const [form, setForm] = useState(() => {
    const selectedVendor = byId(vendors, initiatingBill?.vendorId) || initiatingVendor
    return { vendorId: selectedVendor?.id || '', billId: billId || '', method: defaultMethod(selectedVendor), fundingAccountId: '', processDate: today(), memo: '' }
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [review, setReview] = useState(false)
  const vendor = byId(vendors, form.vendorId)
  const bills = eligible.filter(bill => bill.vendorId === form.vendorId)
  const selectedBill = byId(bills, form.billId)
  const funding = byId(state.fundingAccounts, form.fundingAccountId)
  const source = initiatingBill ? { to: recordPath('bills', billId), label: 'Bill details' }
    : initiatingVendor ? { to: recordPath('vendors', vendorId), label: 'Vendor details' }
    : { to: '/payments', label: 'Payments' }

  function change(key, value) {
    setForm(previous => ({ ...previous, [key]: value }))
  }
  function prepare(event) {
    event.preventDefault()
    const result = validatePayment(state, form)
    setErrors(result.errors)
    setError('')
    if (Object.keys(result.errors).length === 0) setReview(true)
  }
  async function confirm() {
    const result = await transact(schedulePayment, form)
    if (!result.state) {
      setReview(false)
      setErrors(result.errors || {})
      setError(result.error || '')
      return
    }
    const to = recordPath('payments', result.id)
    notify({ message: 'Payment scheduled', path: to, to, label: 'View payment' })
    navigate(to, { replace: true })
  }

  return <>
    <PageTitle title="Schedule payment" back={source} />
    {!eligible.length ? <section className="panel empty">
      <p>No approved, unpaid bills are available to pay.</p><ButtonLink variant="secondary" to="/bills">View bills</ButtonLink>
    </section> : <form className="detail-grid" noValidate onSubmit={prepare}>
      <section className="panel">
        <h2>Payment details</h2>
        <div className="form-grid">
          <Field label="Vendor" error={errors.vendorId}>{props => <select {...props} required value={form.vendorId} onChange={event => {
            const value = event.target.value
            setForm(previous => ({ ...previous, vendorId: value, billId: '', method: defaultMethod(byId(vendors, value)) }))
          }}>
            <option value="">Choose a vendor</option>
            {vendors.map(row => <option key={row.id} value={row.id}>{row.name || 'Unknown vendor'}</option>)}
          </select>}</Field>
          <Field label="Bill" error={errors.billId} hint={vendor && !bills.length ? 'This vendor has no eligible bills.' : undefined}>
            {props => <select {...props} required value={selectedBill?.id || ''} onChange={event => change('billId', event.target.value)}>
              <option value="">Choose a bill</option>
              {bills.map(bill => <option key={bill.id} value={bill.id}>{recordNumber(bill)} · {money(bill.amount)}</option>)}
            </select>}
          </Field>
          <Field label="Payment method" error={errors.method}>{props => <select {...props} required value={form.method} onChange={event => change('method', event.target.value)}>
            <option value="">Choose a method</option>
            {methods(vendor).map(method => <option key={method} value={method}>{methodLabel(method)}</option>)}
          </select>}</Field>
          <Field label="Funding account" error={errors.fundingAccountId}>{props => <select {...props} required value={form.fundingAccountId} onChange={event => change('fundingAccountId', event.target.value)}>
            <option value="">Choose a funding account</option>
            {rows(state.fundingAccounts).map(row => <option key={row.id} value={row.id}>{fundingLabel(row)}</option>)}
          </select>}</Field>
          <Field label="Process date" error={errors.processDate}>{props => <input {...props} required type="date" min={today()}
            value={form.processDate} onChange={event => change('processDate', event.target.value)} />}</Field>
          <div className="form-wide"><Field label="Memo (optional)">{props => <textarea {...props}
            value={form.memo} onChange={event => change('memo', event.target.value)} />}</Field></div>
        </div>
      </section>
      <section className="panel">
        <h2>Payment summary</h2>
        {selectedBill ? <DefinitionList entries={[
          ['Invoice #', recordNumber(selectedBill)], ['Due date', dateLabel(selectedBill.dueDate)], ['Vendor', vendorName(state, vendor?.id)],
        ]} /> : <Empty>Choose a bill to see the amount due.</Empty>}
        <div className="summary-total"><span>Amount due (USD)</span><strong>{money(selectedBill?.amount)}</strong></div>
        {error && <p role="alert" className="error form-error">{error}</p>}
        {Object.keys(errors).length > 0 && !review && <p role="status" className="error">Check the highlighted payment fields.</p>}
        <div className="form-actions payment-actions">
          <ButtonLink variant="secondary" to={source.to}>Cancel</ButtonLink>
          <button type="submit" className="button primary">Review payment</button>
        </div>
      </section>
    </form>}
    {review && <Dialog title="Review payment" onClose={() => setReview(false)}>
      <div className="dialog-content">
        <div className="review">
          <DefinitionList entries={[
            ['Vendor', vendorName(state, form.vendorId)], ['Invoice #', recordNumber(selectedBill)], ['Method', methodLabel(form.method)],
            ['Funding account', fundingLabel(funding)], ['Process date', dateLabel(form.processDate)], ...(form.memo.trim() ? [['Memo', form.memo.trim()]] : []),
          ]} />
          <div className="summary-total"><span>Amount (USD)</span><strong>{money(selectedBill?.amount)}</strong></div>
        </div>
        <div className="form-actions">
          <button autoFocus type="button" className="button secondary" onClick={() => setReview(false)}>Back to details</button>
          <button type="button" className="button primary" onClick={confirm}>Confirm payment</button>
        </div>
      </div>
    </Dialog>}
  </>
}

export function PaymentDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const payment = byId(state.payments, id)
  if (!payment) return <Missing title="Payment unavailable" to="/payments" label="Back to Payments" />
  return <PaymentRecord key={id} payment={payment} />
}

function PaymentRecord({ payment }) {
  const { state, transact } = useStore()
  const notify = useFeedback()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const vendor = byId(state.vendors, payment.vendorId)
  const bill = byId(state.bills, payment.billId)
  const funding = byId(state.fundingAccounts, payment.fundingAccountId)

  async function cancel() {
    const result = await transact(cancelPayment, payment.id)
    if (result.error) {
      setError(result.error)
      return
    }
    setConfirming(false)
    notify({ message: 'Payment cancelled' })
  }

  return <>
    <PageTitle title={paymentNumber(payment)} description={vendorName(state, payment.vendorId)} back={{ to: '/payments', label: 'Payments' }}
      actions={canCancelPayment(state, payment) && <button className="button secondary" type="button" onClick={() => {
        setError('')
        setConfirming(true)
      }}>Cancel payment</button>} />
    <div className="detail-grid">
      <section className="panel">
        <h2>Payment details</h2>
        <DefinitionList entries={[
          ['Status', <Status value={payment.status} />],
          ['Vendor', vendor ? <SiteLink to={recordPath('vendors', vendor.id)}>{vendorName(state, vendor.id)}</SiteLink> : 'Unknown vendor'],
          ['Invoice #', bill ? <SiteLink to={recordPath('bills', bill.id)}>{recordNumber(bill)}</SiteLink> : 'Invoice unavailable'],
          ['Payment method', methodLabel(payment.method)], ['Funding account', fundingLabel(funding)],
          ['Process date', dateLabel(payment.processDate)], ['Created by', userName(state, payment.createdBy)],
          ...(payment.cancelledAt ? [['Cancelled on', dateLabel(payment.cancelledAt)], ['Cancelled by', userName(state, payment.cancelledBy)]] : []),
        ]} />
        {payment.memo && <p className="memo">{payment.memo}</p>}
        <div className="summary-total"><span>Amount (USD)</span><strong>{money(payment.amount)}</strong></div>
      </section>
      <section>
        <div className="section-head"><h2>Activity</h2></div>
        <ActivityTable records={rows(state.activity).filter(event => event.paymentId === payment.id)} />
      </section>
    </div>
    {confirming && <Dialog title="Cancel payment" onClose={() => setConfirming(false)}>
      <div className="dialog-content">
        <p>Cancel {paymentNumber(payment)} for {money(payment.amount)} USD? The bill will be available to pay again.</p>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="form-actions">
          <button autoFocus className="button secondary" type="button" onClick={() => setConfirming(false)}>Keep payment</button>
          <button className="button danger" type="button" onClick={cancel}>Confirm cancellation</button>
        </div>
      </div>
    </Dialog>}
  </>
}
