import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ButtonLink, Dialog, Field, Missing, PageTitle, recordNumber, recordPath, useFeedback, useSiteNavigation } from './components.jsx'
import { byId, cents, editable, money, rows, today } from './data/selectors.js'
import { lineAmount, newId, saveBill, validateBill } from './data/transactions.js'
import { useStore } from './store.jsx'

const emptyLine = () => ({ id: newId('line_'), description: '', quantity: '1', unitPrice: '' })
const initialFields = bill => ({
  vendorId: bill?.vendorId || '', invoiceNumber: bill?.invoiceNumber || '',
  invoiceDate: bill?.invoiceDate || today(), dueDate: bill?.dueDate || '', memo: bill?.memo || '',
  lineItems: rows(bill?.lineItems).length ? rows(bill.lineItems).map(item => ({
    ...item, id: item.id || newId('line_'), description: item.description || '', quantity: item.quantity ?? '', unitPrice: item.unitPrice ?? '',
  })) : [emptyLine()],
})

export function BillEditor() {
  const { id } = useParams()
  const { state } = useStore()
  const bill = id ? byId(state.bills, id) : null
  if (id && !bill) return <Missing title="Bill unavailable" to="/bills" label="Back to Bills" />
  if (id && !editable(bill)) return <Missing title="This bill is unavailable to edit" to={recordPath('bills', id)} label="Back to bill" />
  return <BillForm key={id || 'new'} bill={bill} />
}

function BillForm({ bill }) {
  const { state, transact } = useStore()
  const navigate = useSiteNavigation()
  const notify = useFeedback()
  const [form, setForm] = useState(() => initialFields(bill))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const back = bill ? recordPath('bills', bill.id) : '/bills'

  function change(key, value) {
    setForm(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
  }
  function changeLine(index, key, value) {
    setForm(previous => ({
      ...previous, lineItems: previous.lineItems.map((item, i) => i === index ? { ...item, [key]: value } : item),
    }))
    setErrors(previous => ({ ...previous, [`line-${index}-${key}`]: undefined, lineItems: undefined }))
  }
  async function save(approverId) {
    const result = await transact(saveBill, form, { billId: bill?.id, approverId })
    if (result.error || result.errors) {
      setErrors(result.errors || {})
      setError(result.error || '')
      if (!result.errors?.approverId) setSending(false)
      return result
    }
    const to = recordPath('bills', result.id)
    notify({ message: approverId ? 'Bill sent for approval' : bill ? 'Bill updated' : 'Draft bill saved', path: to })
    navigate(to, { replace: true })
    return result
  }
  function prepareToSend() {
    const validation = validateBill(state, form)
    setErrors(validation.errors)
    setError('')
    if (Object.keys(validation.errors).length === 0) setSending(true)
  }
  const totalCents = form.lineItems.reduce((sum, item) => sum + cents(lineAmount(item.quantity, item.unitPrice)), 0)
  const vendors = rows(state.vendors)

  return <>
    <PageTitle title={bill ? 'Edit bill' : 'New bill'}
      description={bill ? recordNumber(bill) : undefined} back={{ to: back, label: bill ? 'Bill details' : 'Bills' }} />
    <form className="stack" noValidate onSubmit={event => { event.preventDefault(); save() }}>
      <section className="panel">
        <h2>Invoice details</h2>
        <div className="form-grid">
          <Field label="Vendor" error={errors.vendorId}>{props => <select {...props} value={form.vendorId} required onChange={event => change('vendorId', event.target.value)}>
            <option value="">Choose a vendor</option>
            {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name || 'Unknown vendor'}</option>)}
          </select>}</Field>
          <Field label="Invoice number" error={errors.invoiceNumber}>{props => <input {...props} required
            value={form.invoiceNumber} onChange={event => change('invoiceNumber', event.target.value)} />}</Field>
          <Field label="Invoice date" error={errors.invoiceDate}>{props => <input {...props} required type="date"
            value={form.invoiceDate} onChange={event => change('invoiceDate', event.target.value)} />}</Field>
          <Field label="Due date" error={errors.dueDate}>{props => <input {...props} required type="date"
            value={form.dueDate} onChange={event => change('dueDate', event.target.value)} />}</Field>
          <div className="form-wide"><Field label="Description (optional)" error={errors.memo}>{props => <textarea {...props}
            value={form.memo} onChange={event => change('memo', event.target.value)} />}</Field></div>
        </div>
      </section>
      <section className="panel">
        <h2>Line items</h2>
        <div>
          {form.lineItems.map((item, index) => <div className="line-editor" key={item.id} role="group" aria-label={`Line item ${index + 1}`}>
            <Field label="Item description" error={errors[`line-${index}-description`]}>{props => <input {...props} required
              value={item.description} onChange={event => changeLine(index, 'description', event.target.value)} />}</Field>
            <Field label="Quantity" error={errors[`line-${index}-quantity`]}>{props => <input {...props} required type="number" step="any" min="0"
              value={item.quantity} onChange={event => changeLine(index, 'quantity', event.target.value)} />}</Field>
            <Field label="Unit price (USD)" error={errors[`line-${index}-unitPrice`]}>{props => <input {...props} required type="number" step=".01" min="0"
              value={item.unitPrice} onChange={event => changeLine(index, 'unitPrice', event.target.value)} />}</Field>
            <div className="field"><span>Amount (USD)</span><output className="line-amount">{money(lineAmount(item.quantity, item.unitPrice))}</output></div>
            <button type="button" className="icon-button" aria-label={`Remove line item ${index + 1}`}
              disabled={form.lineItems.length <= 1} onClick={() => {
                setErrors({})
                change('lineItems', form.lineItems.filter((_, i) => i !== index))
              }}>×</button>
          </div>)}
        </div>
        <div className="line-controls"><button type="button" className="button secondary"
          onClick={() => change('lineItems', [...form.lineItems, emptyLine()])}>+ Add line item</button></div>
        {errors.lineItems && <p role="alert" className="error">{errors.lineItems}</p>}
        <div className="summary-total"><span>Bill total (USD)</span><strong>{money(totalCents / 100)}</strong></div>
      </section>
      {error && <p role="alert" className="error form-error">{error}</p>}
      {Object.values(errors).some(Boolean) && !sending && <p role="status" className="error">Check the highlighted invoice fields.</p>}
      <div className="form-actions">
        <ButtonLink variant="secondary" to={back}>Cancel</ButtonLink>
        <button className={`button ${bill ? 'primary' : 'secondary'}`} type="submit">{bill ? 'Save changes' : 'Save draft'}</button>
        {!bill && <button className="button primary" type="button" onClick={prepareToSend}>Save and send for approval</button>}
      </div>
    </form>
    {sending && <ApproverDialog title="Save and send for approval" confirmLabel="Save and send"
      onClose={() => setSending(false)} onSubmit={save} />}
  </>
}

export function ApproverDialog({ title, confirmLabel, onClose, onSubmit }) {
  const { state } = useStore()
  const [approver, setApprover] = useState('')
  const [result, setResult] = useState({})
  return <Dialog title={title} onClose={onClose}>
    <form noValidate onSubmit={event => {
      event.preventDefault()
      setResult(approver ? onSubmit(approver) : { errors: { approverId: 'Choose an approver.' } })
    }}>
      <Field label="Approver" error={result.errors?.approverId}>{props => <select {...props} autoFocus required value={approver} onChange={event => setApprover(event.target.value)}>
        <option value="">Choose an approver</option>
        {rows(state.users).map(user => <option value={user.id} key={user.id}>{user.name || 'Unknown user'}</option>)}
      </select>}</Field>
      {result.error && <p className="error" role="alert">{result.error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="button primary">{confirmLabel}</button>
      </div>
    </form>
  </Dialog>
}
