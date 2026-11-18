import { useState } from 'react'
import { Dialog, ErrorNote, Field } from './ui.jsx'
import { changeInvoiceVisibility, paymentMethods, recordPayment, sendInvoice } from '../data/invoice.js'
import { find, money, titleCase, today } from '../utils/format.js'
import { useApp } from '../context/AppContext.jsx'

export function SendDialog({ client, invoiceNumber, onClose, onSend }) {
  const [to, setTo] = useState(client?.email || '')
  const [message, setMessage] = useState('Please find your invoice attached. Thank you for your business.')
  const [attachPdf, setAttach] = useState(true)
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const recipients = [...new Set(to.split(/[,;\s]+/).filter(Boolean))]
    if (!recipients.length || recipients.some(value => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))) {
      setError('Enter at least one valid email address. Use commas for multiple recipients.')
      return
    }
    try { onSend({ to: recipients, message, attachPdf }) } catch (failure) { setError(failure.message) }
  }
  return <Dialog title="Send Invoice" onClose={onClose}>
    <form className="form-stack" onSubmit={submit} noValidate>
      <p>Send {invoiceNumber || 'this invoice'} to your client.</p>
      <Field label="To" hint={client?.contacts?.length ? 'Additional contacts: ' + client.contacts.map(contact => contact.email).filter(Boolean).join(', ') : undefined}><input value={to} onChange={e => setTo(e.target.value)} placeholder="name@company.com" /></Field>
      <Field label="Message"><textarea value={message} onChange={e => setMessage(e.target.value)} /></Field>
      <label className="check-label"><input type="checkbox" checked={attachPdf} onChange={e => setAttach(e.target.checked)} />Attach invoice as PDF</label>
      <ErrorNote>{error}</ErrorNote>
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button positive" type="submit">Send Invoice</button></div>
    </form>
  </Dialog>
}

export function Confirm({ title, detail, label, onClose, onConfirm, danger }) {
  const [error, setError] = useState('')
  return <Dialog title={title} onClose={onClose}>
    <form className="form-stack" onSubmit={e => {
      e.preventDefault()
      try { onConfirm() } catch (failure) { setError(failure.message) }
    }}><p>{detail}</p><ErrorNote>{error}</ErrorNote>
      <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button type="submit" className={'button ' + (danger ? 'danger' : 'positive')}>{label}</button></div>
    </form>
  </Dialog>
}

function PaymentDialog({ invoice, onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', paymentDate: today(), method: 'bank_transfer', reference: '', notes: '' })
  const [error, setError] = useState('')
  const patch = (key, value) => setForm(old => ({ ...old, [key]: value }))
  const input = (key, attrs = {}) => <input {...attrs} value={form[key]} onChange={e => patch(key, e.target.value)} />
  return <Dialog title="Add a Payment" onClose={onClose}><form className="form-stack" onSubmit={e => {
    e.preventDefault()
    try { onSave(form) } catch (failure) { setError(failure.message) }
  }} noValidate>
    <p>Outstanding balance <strong>{money(invoice.amountDue, invoice.currency)}</strong></p>
    <div className="form-grid">
      <Field label="Amount">{input('amount', { type: 'number', min: '.01', max: invoice.amountDue, step: '.01' })}</Field>
      <Field label="Payment Date">{input('paymentDate', { type: 'date', max: today() })}</Field>
      <Field label="Payment Method"><select value={form.method} onChange={e => patch('method', e.target.value)}>{paymentMethods.map(method => <option key={method} value={method}>{titleCase(method)}</option>)}</select></Field>
      <Field label="Reference">{input('reference')}</Field>
      <Field label="Notes" className="span-2"><textarea value={form.notes} onChange={e => patch('notes', e.target.value)} /></Field>
    </div>
    <ErrorNote>{error}</ErrorNote>
    <div className="form-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button positive" type="submit">Record Payment</button></div>
  </form></Dialog>
}

export function InvoiceActionDialog({ invoice, action, onClose }) {
  const { state, commit } = useApp()
  if (!action) return null
  function finish(command, message) { commit(command, message); onClose() }
  if (action === 'send') return <SendDialog client={find(state.clients, invoice.clientId)} invoiceNumber={invoice.invoiceNumber} onClose={onClose} onSend={delivery => finish(current => sendInvoice(current, invoice.id, delivery), 'Invoice sent')} />
  if (action === 'pay') return <PaymentDialog invoice={invoice} onClose={onClose} onSave={form => finish(current => recordPayment(current, invoice.id, form), 'Payment recorded')} />
  if (action === 'mark') return <Confirm title="Mark as Sent" label="Mark as Sent" detail="Change this invoice to Sent without sending an email." onClose={onClose} onConfirm={() => finish(current => sendInvoice(current, invoice.id), 'Invoice marked as sent')} />
  const [label, detail] = {
    archived: ['Archive', 'Move this invoice to Archived Invoices?'],
    deleted: ['Delete', 'Move this invoice to Deleted Invoices? Any time and expenses it reserved will become available for rebilling.'],
    active: ['Restore', 'Return this invoice to Active Invoices?'],
  }[action]
  return <Confirm title={label + ' Invoice'} label={label} detail={detail} onClose={onClose} danger={action === 'deleted'}
    onConfirm={() => finish(current => changeInvoiceVisibility(current, invoice.id, action), `Invoice ${label.toLowerCase()}${label.endsWith('e') ? 'd' : 'ed'}`)} />
}
