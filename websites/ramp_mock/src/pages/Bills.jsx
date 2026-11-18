import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { activity, append, change, update, useStore } from '../store.jsx'
import { BackLink, Button, Confirmation, Dialog, Facts, Field, FormFooter, Heading, Panel, RouteLink, RowLink, Select, Status, Table, useFilters, useForm } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import { actor, byText, cents, dateOnly, find, fmtDate, label, list, matches, money, personName, today, uid, vendorName } from '../utils/format.js'
import { newApproval, routingFor } from '../routing.js'
import { RoutingPreview } from '../RoutingPreview.jsx'

const billStatuses = ['draft', 'pending_approval', 'rejected', 'approved', 'scheduled', 'paid']
const editable = ['draft', 'rejected']
const vendorOptions = state => list(state.vendors).map(vendor => [vendor.id, vendor.name || vendor.id])
const columns = [['Invoice'], ['Vendor'], ['Due date'], ['Amount', true], ['Status']]

export function Bills() {
  const { state } = useStore()
  const filter = useFilters()
  const [creating, setCreating] = useState(false)
  const search = filter.get('q')
  const vendor = filter.get('vendor')
  const status = filter.get('status')
  const sort = filter.get('sort', 'due')
  const bills = list(state.bills)
  const rows = bills.filter(bill => (!vendor || bill.vendorId === vendor) && (!status || bill.status === status)
    && matches(search, bill.invoiceNumber, vendorName(state, bill.vendorId))).sort((a, b) =>
    sort === 'amount' ? (Number(b.amount) || 0) - (Number(a.amount) || 0) : byText(a.dueDate || '9999', b.dueDate || '9999'))
  const blocked = !actor(state) || !list(state.vendors).length
  return <>
    <Heading title="Bill Pay" subtitle="Prepare invoices, track approvals, and record vendor payments.">
      <Button variant="primary" disabled={blocked} onClick={() => setCreating(true)}>New bill</Button>
    </Heading>
    {blocked && <p className="muted">Add a vendor and a signed-in administrator before creating bills.</p>}
    <Panel className="registry">
      <div className="toolbar">
        <Field label="Search bills" type="search" placeholder="Vendor or invoice number" value={search} onChange={event => filter.set('q', event.target.value)} />
        <Select label="Vendor" value={vendor} onChange={event => filter.set('vendor', event.target.value)} options={[[ '', 'All vendors' ], ...vendorOptions(state)]} />
        <Select label="Status" value={status} onChange={event => filter.set('status', event.target.value)}
          options={[[ '', 'All statuses' ], ...[...new Set([...billStatuses, ...bills.map(bill => bill.status).filter(Boolean)])].map(value => [value, label(value)])]} />
        <Select label="Sort by" value={sort} onChange={event => filter.set('sort', event.target.value)} options={[[ 'due', 'Earliest due date' ], ['amount', 'Highest amount']]} />
      </div>
      <Table columns={columns} rows={rows.map(bill => [bill.id, [
        <RowLink to={'/bills/' + encodeURIComponent(bill.id)}>{bill.invoiceNumber || 'Untitled invoice'}</RowLink>,
        vendorName(state, bill.vendorId), fmtDate(bill.dueDate), money(bill.amount, bill.currency), <Status value={bill.status} />,
      ]])} />
    </Panel>
    {creating && <BillForm onClose={() => setCreating(false)} />}
  </>
}

const blankLine = () => ({ id: uid('line'), description: '', quantity: '1', unitAmount: '' })
const invoiceFields = ['vendorId', 'invoiceNumber', 'invoiceDate', 'dueDate', 'memo', 'lineItems', 'amount']
const quantity = value => /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(value ?? '').trim()) && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null
const lineCents = line => {
  const count = quantity(line.quantity)
  const unit = cents(line.unitAmount)
  if (!count || !unit) return null
  const [whole, fraction = ''] = String(line.quantity).trim().split('.')
  const scale = 10n ** BigInt(fraction.length)
  const unrounded = BigInt(whole + fraction) * BigInt(unit)
  const total = Number((2n * unrounded + scale) / (2n * scale))
  return total > 0 && Number.isSafeInteger(total) ? total : null
}

function submissionProblem(state, bill) {
  if (!find(state.vendors, bill.vendorId) || !bill.invoiceNumber || !dateOnly(bill.invoiceDate)
    || !dateOnly(bill.dueDate) || bill.dueDate < bill.invoiceDate || !list(bill.lineItems).length
    || !Number.isFinite(Number(bill.amount)) || !(Number(bill.amount) > 0)) {
    return 'Complete the invoice details before submitting this bill.'
  }
  if (!routingFor(state, 'bill', Number(bill.amount)).reviewerIds.length) return 'Add a valid reviewer before submitting this bill.'
  return null
}

function BillForm({ bill, onClose }) {
  const { state, commit } = useStore()
  const navigate = useNavigate()
  const form = useForm(() => ({
    vendorId: bill?.vendorId || '', invoiceNumber: bill?.invoiceNumber || '',
    invoiceDate: bill?.invoiceDate || today(), dueDate: bill?.dueDate || '', memo: bill?.memo || '',
    lineItems: list(bill?.lineItems).length ? list(bill.lineItems).map(line => ({ ...line, id: line.id || uid('line') })) : [blankLine()],
  }))
  const { values } = form
  const total = values.lineItems.reduce((sum, line) => sum + (lineCents(line) || 0), 0)
  const duplicate = (records, vendorId, number) => list(records).some(record => record.id !== bill?.id && record.vendorId === vendorId
    && String(record.invoiceNumber ?? '').trim().toLowerCase() === number.toLowerCase())
  function submit(event) {
    const problems = {}
    const invoiceNumber = values.invoiceNumber.trim()
    if (!find(state.vendors, values.vendorId)) problems.vendorId = 'Select a vendor.'
    if (!invoiceNumber) problems.invoiceNumber = 'Enter an invoice number.'
    else if (duplicate(state.bills, values.vendorId, invoiceNumber)) problems.invoiceNumber = 'That invoice number already exists for this vendor.'
    if (!dateOnly(values.invoiceDate)) problems.invoiceDate = 'Enter a valid invoice date.'
    if (!dateOnly(values.dueDate) || values.dueDate < values.invoiceDate) problems.dueDate = 'Enter a due date on or after the invoice date.'
    values.lineItems.forEach((line, i) => {
      if (!String(line.description ?? '').trim()) problems[i + '-description'] = 'Enter a description.'
      if (!quantity(line.quantity)) problems[i + '-quantity'] = 'Enter a positive quantity.'
      if (!cents(line.unitAmount)) problems[i + '-unitAmount'] = 'Enter a positive USD amount with up to two decimals.'
      else if (quantity(line.quantity) && !lineCents(line)) problems[i + '-unitAmount'] = 'Enter values that produce a valid line total.'
    })
    if (!Number.isSafeInteger(total)) problems.form = 'Enter a smaller invoice total.'
    form.submit(event, problems, () => {
      const id = bill?.id || uid('bill')
      commit((current, context) => {
        const before = find(current.bills, id)
        if (bill && !editable.includes(before?.status)) throw new Error('This bill can no longer be edited.')
        if (duplicate(current.bills, values.vendorId, invoiceNumber)) throw new Error('That invoice number already exists for this vendor.')
        const record = {
          ...(before || { id, currency: 'USD', status: 'draft', approvalId: null, paymentId: null, createdBy: context.actorId, createdAt: context.now, submittedAt: null }),
          ...values, invoiceNumber, memo: values.memo.trim(), amount: total / 100, updatedAt: context.now,
          lineItems: values.lineItems.map(line => ({ ...line, description: String(line.description).trim(), quantity: quantity(line.quantity),
            unitAmount: cents(line.unitAmount) / 100, amount: lineCents(line) / 100 })),
        }
        return activity({ ...current, bills: before ? update(current.bills, id, record) : append(current.bills, record) },
          context, before ? 'bill.updated' : 'bill.created', 'bill', id, {}, before ? change(before, record, invoiceFields) : {})
      }, bill ? 'Bill changes saved.' : 'Draft bill created.')
      onClose()
      if (!bill) navigate(withSid('/bills/' + encodeURIComponent(id)))
    })
  }
  function bindLine(index, key) {
    return { value: values.lineItems[index][key] ?? '', error: form.errors[index + '-' + key], onChange: event => {
      const value = event.target.value
      form.setValues(current => ({ ...current, lineItems: current.lineItems.map((line, i) => i === index ? { ...line, [key]: value } : line) }))
      form.setErrors(current => ({ ...current, [index + '-' + key]: undefined, form: undefined }))
    } }
  }
  function changeLines(lineItems) {
    form.setValues(current => ({ ...current, lineItems }))
    form.setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !/^\d+-/.test(key))))
  }
  return <Dialog title={bill ? 'Edit bill' : 'New bill'} onClose={onClose} wide>
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Select label="Vendor" {...form.bind('vendorId')} options={[[ '', 'Select a vendor' ], ...vendorOptions(state)]} />
        <Field label="Invoice number" {...form.bind('invoiceNumber')} />
        <Field label="Invoice date" type="date" {...form.bind('invoiceDate')} />
        <Field label="Due date" type="date" {...form.bind('dueDate')} />
      </div>
      <Field label="Memo" as="textarea" rows={2} {...form.bind('memo')} />
      <fieldset className="line-editor"><legend>Line items</legend>
        {values.lineItems.map((line, i) => <div key={line.id} className="line-edit">
          <Field label={'Description ' + (i + 1)} {...bindLine(i, 'description')} />
          <Field label={'Quantity ' + (i + 1)} inputMode="decimal" {...bindLine(i, 'quantity')} />
          <Field label={'Unit amount ' + (i + 1) + ' (USD)'} inputMode="decimal" {...bindLine(i, 'unitAmount')} />
          <div className="line-money"><small>Line total</small><strong>{money((lineCents(line) || 0) / 100)}</strong></div>
          <Button disabled={values.lineItems.length === 1} aria-label={'Remove line ' + (i + 1)} onClick={() => changeLines(values.lineItems.filter((_, index) => i !== index))}>Remove</Button>
        </div>)}
        <div className="line-bottom"><Button onClick={() => changeLines([...values.lineItems, blankLine()])}>Add line item</Button><strong>Invoice total {money(total / 100)}</strong></div>
      </fieldset>
      <FormFooter onClose={onClose} submit={bill ? 'Save changes' : 'Save draft'} error={form.errors.form} />
    </form>
  </Dialog>
}

function BillSubmission({ bill, onClose }) {
  const { state, commit } = useStore()
  const route = routingFor(state, 'bill', Number(bill.amount))
  const form = useForm({})
  return <Dialog title="Submit for approval" onClose={onClose}>
    <form onSubmit={event => form.submit(event, {}, () => {
      commit((current, context) => {
        const before = find(current.bills, bill.id)
        if (!editable.includes(before?.status)) throw new Error('This bill can no longer be submitted.')
        const problem = submissionProblem(current, before)
        if (problem) throw new Error(problem)
        const approval = newApproval(current, context, { subjectType: 'bill', subjectId: before.id,
          title: before.invoiceNumber + ' · ' + vendorName(current, before.vendorId), requesterId: context.actorId, amount: Number(before.amount), currency: before.currency || 'USD' })
        const next = { ...before, status: 'pending_approval', approvalId: approval.id, submittedAt: context.now, updatedAt: context.now }
        return activity({ ...current, bills: update(current.bills, before.id, next), approvals: append(current.approvals, approval) },
          context, 'bill.submitted', 'bill', before.id, { approvalId: approval.id }, change(before, next, ['status', 'approvalId']))
      }, 'Bill submitted for approval.')
      onClose()
    })}>
      <p>{bill.invoiceNumber} · {money(bill.amount, bill.currency)}</p>
      <RoutingPreview state={state} route={route} />
      <FormFooter onClose={onClose} submit="Submit for approval" error={form.errors.form} disabled={!route.reviewerIds.length} />
    </form>
  </Dialog>
}

function applyPayment(state, context, id, action, values) {
  const before = find(state.bills, id)
  const current = find(state.payments, before?.paymentId)
  if (!['approved', 'scheduled'].includes(before?.status)) throw new Error('This bill is no longer eligible for payment.')
  if (before.status === 'scheduled' && (current?.billId !== id || current.status !== 'scheduled')) throw new Error('The scheduled payment record is missing.')
  if (before.status === 'approved' && current?.billId === id && ['scheduled', 'paid'].includes(current.status)) {
    throw new Error('This bill already has a current payment.')
  }
  if ((action === 'schedule' && before.status !== 'approved') || (action === 'unschedule' && before.status !== 'scheduled')) {
    throw new Error('The bill payment status has changed.')
  }
  if (action !== 'unschedule' && (!Number.isFinite(Number(before.amount)) || !(Number(before.amount) > 0))) throw new Error('The bill must have a positive amount.')
  const previousPayment = before.status === 'scheduled' ? current : null
  const base = previousPayment || { id: uid('payment'), billId: id, amount: Number(before.amount), currency: before.currency || 'USD',
    scheduledDate: null, paidOn: null, createdBy: context.actorId, createdAt: context.now }
  const fields = action === 'schedule' ? { status: 'scheduled', scheduledDate: values.date, method: values.method } :
    action === 'unschedule' ? { status: 'canceled' } : { status: 'paid', paidOn: values.date, method: 'external' }
  const payment = { ...base, ...fields, updatedBy: context.actorId, updatedAt: context.now }
  const bill = { ...before, status: action === 'unschedule' ? 'approved' : payment.status,
    paymentId: action === 'unschedule' ? null : payment.id, updatedAt: context.now }
  const actions = { schedule: 'bill.payment_scheduled', unschedule: 'bill.payment_unscheduled', pay: 'bill.paid' }
  const changes = { ...change(before, bill, ['status', 'paymentId']),
    paymentStatus: { from: previousPayment?.status ?? null, to: payment.status } }
  if (previousPayment?.method !== payment.method) changes.method = { from: previousPayment?.method ?? null, to: payment.method }
  return activity({ ...state, bills: update(state.bills, id, bill),
    payments: previousPayment ? update(state.payments, payment.id, payment) : append(state.payments, payment) },
  context, actions[action], 'bill', id, { paymentId: payment.id }, changes)
}

function PaymentForm({ bill, action, onClose }) {
  const { commit } = useStore()
  const form = useForm({ date: today(), method: 'ach' })
  const scheduling = action === 'schedule'
  const title = scheduling ? 'Schedule payment' : 'Mark paid externally'
  return <Dialog title={title} onClose={onClose}>
    <form noValidate onSubmit={event => {
      const problems = {}
      if (!dateOnly(form.values.date) || (scheduling ? form.values.date < today() : form.values.date > today())) {
        problems.date = scheduling ? 'Choose today or a future date.' : 'Choose today or a past date.'
      }
      if (scheduling && !['ach', 'check'].includes(form.values.method)) problems.method = 'Choose a payment method.'
      form.submit(event, problems, () => {
        commit((current, context) => applyPayment(current, context, bill.id, action, form.values),
          scheduling ? 'Payment scheduled.' : 'External payment recorded.')
        onClose()
      })
    }}>
      <p>{scheduling ? 'Schedule a payment record for ' : 'Confirm you paid '}<strong>{money(bill.amount, bill.currency)}</strong>{scheduling ? '.' : ' outside Ramp.'}</p>
      <Field label={scheduling ? 'Payment date' : 'Paid on'} type="date" {...form.bind('date')} />
      {scheduling && <Select label="Payment method" {...form.bind('method')} options={[[ 'ach', 'ACH' ], ['check', 'Check']]} />}
      <FormFooter onClose={onClose} submit={scheduling ? title : 'Confirm external payment'} error={form.errors.form} />
    </form>
  </Dialog>
}

export function BillDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const bill = find(state.bills, id)
  if (!bill) return <><BackLink base="/bills">Bill Pay</BackLink><Heading title="Bill unavailable" /></>
  const approval = find(state.approvals, bill.approvalId)
  const payment = find(state.payments, bill.paymentId)
  const payments = list(state.payments).filter(record => record.billId === id).sort((a, b) => byText(b.createdAt, a.createdAt))
  const user = actor(state)
  const mayEdit = user && editable.includes(bill.status)
  const submitProblem = mayEdit && submissionProblem(state, bill)
  const scheduled = payment?.billId === id && payment.status === 'scheduled'
  const currentPayment = scheduled || (payment?.billId === id && payment.status === 'paid')
  const validAmount = Number.isFinite(Number(bill.amount)) && Number(bill.amount) > 0
  return <>
    <BackLink base="/bills">Bill Pay</BackLink>
    <Heading title={bill.invoiceNumber || 'Untitled invoice'} subtitle={vendorName(state, bill.vendorId)}>
      {mayEdit && <Button onClick={() => setModal('edit')}>Edit bill</Button>}
      {mayEdit && <Button variant="primary" disabled={Boolean(submitProblem)} onClick={() => setModal('submit')}>Submit for approval</Button>}
      {bill.status === 'pending_approval' && approval?.subjectType === 'bill' && approval?.subjectId === id
        && <RouteLink className="button primary" to={'/approvals/' + encodeURIComponent(approval.id)}>Review approval</RouteLink>}
      {user && bill.status === 'approved' && validAmount && !currentPayment && <Button variant="primary" onClick={() => setModal('schedule')}>Schedule payment</Button>}
      {user && bill.status === 'scheduled' && scheduled && <Button onClick={() => setModal('unschedule')}>Unschedule payment</Button>}
      {user && validAmount && ((bill.status === 'approved' && !currentPayment) || (bill.status === 'scheduled' && scheduled))
        && <Button onClick={() => setModal('pay')}>Mark paid externally</Button>}
    </Heading>
    {!user && <p className="muted">A signed-in administrator is required to make changes.</p>}
    {submitProblem && <p className="muted">{submitProblem}</p>}
    {bill.status === 'scheduled' && !scheduled && <p className="muted">The linked scheduled payment record is unavailable.</p>}
    {bill.status === 'approved' && !validAmount && <p className="muted">A positive invoice amount is required to record a payment.</p>}
    {bill.status === 'approved' && currentPayment && <p className="muted">This bill already has a current payment.</p>}
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Line items">
          <Table columns={[[ 'Description' ], ['Quantity', true], ['Unit amount', true], ['Line total', true]]} empty="No line items recorded."
            rows={list(bill.lineItems).map((line, i) => [line.id || i, [line.description || '—', line.quantity ?? '—', money(line.unitAmount, bill.currency), money(line.amount, bill.currency)]])} />
          <p className="invoice-total">Invoice total <strong>{money(bill.amount, bill.currency)}</strong></p>
          {bill.memo && <p className="form-preview"><strong>Memo</strong><br />{bill.memo}</p>}
        </Panel>
        <Panel title="Payment history">
          <Table columns={[[ 'Method' ], ['Scheduled for'], ['Paid on'], ['Amount', true], ['Status']]} empty="No payments recorded."
            rows={payments.map(record => [record.id, [label(record.method), fmtDate(record.scheduledDate), fmtDate(record.paidOn), money(record.amount, record.currency), <Status value={record.status} />]])} />
        </Panel>
      </div>
      <Panel title="Invoice details">
        <Facts rows={[[ 'Status', <Status value={bill.status} /> ], ['Vendor', vendorName(state, bill.vendorId)], ['Invoice date', fmtDate(bill.invoiceDate)],
          ['Due date', fmtDate(bill.dueDate)], ['Submitted', fmtDate(bill.submittedAt)], ['Created by', personName(state, bill.createdBy)],
          ['Approval', approval?.subjectType === 'bill' && approval?.subjectId === id ? <RouteLink to={'/approvals/' + encodeURIComponent(approval.id)}>{label(approval.status)}</RouteLink> : bill.approvalId ? 'Approval record unavailable' : 'Awaiting submission']]}/>
      </Panel>
    </div>
    {modal === 'edit' && <BillForm bill={bill} onClose={close} />}
    {modal === 'submit' && <BillSubmission bill={bill} onClose={close} />}
    {['schedule', 'pay'].includes(modal) && <PaymentForm bill={bill} onClose={close} action={modal} />}
    {modal === 'unschedule' && <Confirmation title="Unschedule payment" onClose={close} onConfirm={() =>
      commit((current, context) => applyPayment(current, context, id, modal), 'Payment unscheduled.')}>
      Cancel the scheduled payment and return this bill to approved.
    </Confirmation>}
  </>
}

