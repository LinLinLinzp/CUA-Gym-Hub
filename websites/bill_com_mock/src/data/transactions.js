import { actionable, activeUser, byId, cents, editable, methods, payable, rows, today, validDate } from './selectors.js'

export function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return prefix + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const text = value => String(value ?? '').trim()
const replace = (list, updated) => rows(list).map(row => row.id === updated.id ? updated : row)
const rejected = error => ({ error })

function metadata(state) {
  return { actorId: activeUser(state)?.id, createdAt: new Date().toISOString() }
}

function updatedBill(bill, info, changes) {
  return { ...bill, ...changes, updatedBy: info.actorId, updatedAt: info.createdAt }
}

function event(type, bill, info, links = {}) {
  return {
    id: newId('evt_'), type, billId: bill.id, vendorId: bill.vendorId, approvalId: null, paymentId: null,
    ...links, ...info, amount: bill.amount, currency: bill.currency || 'USD',
  }
}

function withEvent(state, bill, activity, changes = {}) {
  return {
    ...state, ...changes, bills: replace(state.bills, bill),
    activity: [...rows(state.activity), activity],
  }
}

export function lineAmount(quantity, price) {
  const units = Number(quantity)
  const unitCents = cents(price)
  if (!Number.isFinite(units) || units < 0 || !Number.isSafeInteger(unitCents) || unitCents < 0) return null
  // Multiply the decimal quantity by integer cents before rounding half a cent up.
  const [decimal, exponent = '0'] = String(units).split('e')
  const [whole, fraction = ''] = decimal.split('.')
  const scale = Number(exponent) - fraction.length
  const raw = BigInt(whole + fraction) * BigInt(unitCents)
  const factor = 10n ** BigInt(Math.abs(scale))
  const amount = Number(scale < 0 ? (raw + factor / 2n) / factor : raw * factor)
  return Number.isSafeInteger(amount) ? amount / 100 : null
}

export function validateBill(state, form, billId) {
  const errors = {}
  const invoiceNumber = text(form.invoiceNumber)
  if (!byId(state.vendors, form.vendorId)) errors.vendorId = 'Choose a vendor.'
  if (!invoiceNumber) errors.invoiceNumber = 'Enter an invoice number.'
  else if (rows(state.bills).some(bill => bill.id !== billId
    && bill.vendorId === form.vendorId && text(bill.invoiceNumber).toLowerCase() === invoiceNumber.toLowerCase())) {
    errors.invoiceNumber = 'This vendor already has a bill with that invoice number.'
  }
  if (!validDate(form.invoiceDate)) errors.invoiceDate = 'Enter a valid invoice date.'
  if (!validDate(form.dueDate)) errors.dueDate = 'Enter a valid due date.'
  else if (validDate(form.invoiceDate) && form.dueDate < form.invoiceDate) errors.dueDate = 'Use the invoice date or a later date.'
  const lineItems = rows(form.lineItems).map((item, index) => {
    const description = text(item.description)
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)
    const amount = lineAmount(quantity, unitPrice)
    const field = suffix => `line-${index}-${suffix}`
    if (!description) errors[field('description')] = 'Enter a description.'
    if (!Number.isFinite(quantity) || quantity <= 0) errors[field('quantity')] = 'Enter a positive quantity.'
    if (!/^\d+(?:\.\d{0,2})?$|^\.\d{1,2}$/.test(text(item.unitPrice)) || !Number.isSafeInteger(cents(unitPrice))) {
      errors[field('unitPrice')] = 'Enter a price with up to two decimal places.'
    } else if (amount === null) errors[field('unitPrice')] = 'The line amount is too large.'
    return { id: item.id, description, quantity, unitPrice, amount }
  })
  const totalCents = lineItems.reduce((sum, item) => sum + cents(item.amount), 0)
  if (totalCents <= 0 || !Number.isSafeInteger(totalCents)) errors.lineItems = 'The bill total must be a positive, valid amount.'
  return {
    errors,
    fields: { vendorId: form.vendorId, invoiceNumber, invoiceDate: form.invoiceDate, dueDate: form.dueDate,
      memo: text(form.memo), lineItems, amount: totalCents / 100, currency: 'USD' },
  }
}

export function saveBill(state, form, { billId, approverId } = {}) {
  const previous = billId ? byId(state.bills, billId) : null
  if (billId && !editable(previous)) return rejected('This bill is no longer available to edit.')
  if (billId && approverId) return rejected('Save the changes before sending this bill for approval.')
  const info = metadata(state)
  if (!info.actorId) return rejected('The active user is unavailable.')
  const { errors, fields } = validateBill(state, form, billId)
  if (Object.keys(errors).length) return { errors }

  const bill = updatedBill(previous || {
    id: newId('bill_'), approvalStatus: 'draft', approvalId: null, paymentStatus: 'unpaid',
    createdBy: info.actorId, createdAt: info.createdAt,
  }, info, fields)
  const next = {
    ...state,
    bills: previous ? replace(state.bills, bill) : [bill, ...rows(state.bills)],
    activity: [...rows(state.activity), event(previous ? 'bill_updated' : 'bill_created', bill, info)],
  }
  if (approverId) return submitApproval(next, bill.id, approverId, info)
  return { state: next, id: bill.id }
}

export function submitApproval(state, billId, approverId, info = metadata(state)) {
  const bill = byId(state.bills, billId)
  if (!editable(bill) || !byId(state.vendors, bill.vendorId)) return rejected('This bill is no longer available to submit.')
  if (!info.actorId) return rejected('The active user is unavailable.')
  if (!approverId || !byId(state.users, approverId)) return { errors: { approverId: 'Choose an approver.' } }

  const approval = {
    id: newId('apr_'), billId, approverId, status: 'pending', createdBy: info.actorId, createdAt: info.createdAt,
    decisionNote: null, decidedBy: null, decidedAt: null,
  }
  const updated = updatedBill(bill, info, { approvalStatus: 'pending', approvalId: approval.id })
  return {
    id: billId,
    state: withEvent(state, updated, event('approval_submitted', updated, info, { approvalId: approval.id }), {
      approvals: [...rows(state.approvals), approval],
    }),
  }
}

export function decideApproval(state, approvalId, decision, note) {
  const approval = byId(state.approvals, approvalId)
  const decisionNote = text(note) || null
  if (!actionable(state, approval)) return rejected('This approval is no longer assigned to you or has already been decided.')
  if (!['approved', 'denied'].includes(decision)) return rejected('Choose an approval decision.')
  if (decision === 'denied' && !decisionNote) return { errors: { note: 'Enter a reason for denying this bill.' } }

  const info = metadata(state)
  const updated = updatedBill(byId(state.bills, approval.billId), info, { approvalStatus: decision })
  const decided = { ...approval, status: decision, decisionNote, decidedBy: info.actorId, decidedAt: info.createdAt }
  return {
    id: updated.id,
    state: withEvent(state, updated, event(`approval_${decision}`, updated, info, { approvalId }), {
      approvals: replace(state.approvals, decided),
    }),
  }
}

export function validatePayment(state, form) {
  const bill = byId(state.bills, form.billId)
  const vendor = byId(state.vendors, form.vendorId)
  const errors = {}
  if (!vendor) errors.vendorId = 'Choose a vendor.'
  if (!bill || bill.vendorId !== vendor?.id || !payable(state, bill)) errors.billId = 'Choose an approved, unpaid bill.'
  if (!methods(vendor).includes(form.method)) errors.method = 'Choose a payment method available for this vendor.'
  if (!byId(state.fundingAccounts, form.fundingAccountId)) errors.fundingAccountId = 'Choose a funding account.'
  if (!validDate(form.processDate) || form.processDate < today()) errors.processDate = 'Use today or a future process date.'
  return { bill, errors }
}

export function schedulePayment(state, form) {
  const { bill, errors } = validatePayment(state, form)
  if (Object.keys(errors).length) return { errors }
  const info = metadata(state)
  if (!info.actorId) return rejected('The active user is unavailable.')
  const id = newId('pmt_')
  const payment = {
    id, reference: `PAY-${id.slice(4, 14).toUpperCase()}`, billId: bill.id, vendorId: bill.vendorId,
    fundingAccountId: form.fundingAccountId, method: form.method, processDate: form.processDate,
    amount: cents(bill.amount) / 100, currency: bill.currency || 'USD', status: 'scheduled', memo: text(form.memo),
    createdBy: info.actorId, createdAt: info.createdAt, cancelledBy: null, cancelledAt: null,
  }
  const updated = updatedBill(bill, info, { paymentStatus: 'scheduled' })
  return {
    id,
    state: withEvent(state, updated, event('payment_scheduled', updated, info, { paymentId: id }), {
      payments: [...rows(state.payments), payment],
    }),
  }
}

export function canCancelPayment(state, payment) {
  if (payment?.status !== 'scheduled') return false
  const bill = byId(state.bills, payment.billId)
  return bill?.paymentStatus === 'scheduled' && bill.vendorId === payment.vendorId
    && !rows(state.payments).some(other => other.id !== payment.id && other.billId === bill.id
      && ['scheduled', 'processing', 'paid'].includes(other.status))
}

export function cancelPayment(state, id) {
  const payment = byId(state.payments, id)
  if (!canCancelPayment(state, payment)) return rejected('This payment is no longer available to cancel.')
  const info = metadata(state)
  if (!info.actorId) return rejected('The active user is unavailable.')
  const bill = updatedBill(byId(state.bills, payment.billId), info, { paymentStatus: 'unpaid' })
  const cancelled = { ...payment, status: 'cancelled', cancelledBy: info.actorId, cancelledAt: info.createdAt }
  return {
    id,
    state: withEvent(state, bill, event('payment_cancelled', bill, info, { paymentId: id }), {
      payments: replace(state.payments, cancelled),
    }),
  }
}
