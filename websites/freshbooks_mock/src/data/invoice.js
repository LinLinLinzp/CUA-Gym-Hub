import { find, cents, validDate, today, visible, addDays, currencies } from '../utils/format.js'
import { validateExcess } from './periods.js'
import { event, newId, requireThat, stamp, upsert } from './commands.js'

export function nextNumber(state) {
  const biggest = state.invoices.reduce((max, row) => {
    const match = /^INV-(\d{1,12})$/i.exec(row.invoiceNumber || '')
    return match ? Math.max(max, Number(match[1])) : max
  }, 1000)
  return 'INV-' + (biggest + 1)
}

export function manualLine(values = {}) {
  return { id: newId('line'), kind: 'manual', serviceId: null, name: '', description: '', quantity: 1, rate: 0, taxPercent: 0, sources: [], ...values }
}

export function calculateInvoice(lines, percent, amountPaid = 0) {
  const priced = lines.map(line => {
    const sources = line.sources || []
    const subtotal = sources.length
      ? sources.reduce((sum, row) => sum + cents(row.amount), 0)
      : cents((Number(line.quantity) || 0) * (Number(line.rate) || 0))
    return { ...line, sources, lineSubtotal: subtotal / 100 }
  })
  const subtotal = priced.reduce((sum, line) => sum + cents(line.lineSubtotal), 0)
  const discount = Math.round(subtotal * (Number(percent) || 0) / 100)
  const shares = priced.map((line, index) => {
    const raw = subtotal ? discount * cents(line.lineSubtotal) / subtotal : 0
    return { index, base: Math.floor(raw), remainder: raw % 1 }
  })
  const remaining = discount - shares.reduce((sum, share) => sum + share.base, 0)
  const ranked = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  ranked.slice(0, remaining).forEach(share => { share.base += 1 })
  const tax = priced.reduce((sum, line, index) => sum +
    Math.round((cents(line.lineSubtotal) - shares[index].base) * (Number(line.taxPercent) || 0) / 100), 0)
  const total = subtotal - discount + tax
  return { lines: priced, subtotal: subtotal / 100, discountAmount: discount / 100, taxAmount: tax / 100, total: total / 100, amountPaid, amountDue: (total - cents(amountPaid)) / 100 }
}

export function paidAmount(state, invoice) {
  const rows = state.payments.filter(row => row.invoiceId === invoice.id)
  const recorded = rows.filter(row => (row.status || 'recorded') === 'recorded' && row.currency === invoice.currency).reduce((sum, row) => sum + cents(row.amount), 0)
  return Math.max(recorded, cents(invoice.amountPaid ?? 0)) / 100
}

export function newInvoice(state, { clientId, duplicate, preset } = {}) {
  const client = find(state.clients, clientId)
  const issueDate = today()
  const billing = duplicate || preset || {}
  return {
    clientId: billing.clientId || clientId || '', projectId: billing.projectId || '',
    invoiceNumber: nextNumber(state), issueDate, dueDate: addDays(issueDate, Number(state.business?.netDays ?? 30)),
    reference: billing.reference || '', currency: billing.currency || client?.currency || state.business?.currency || 'USD',
    lines: duplicate ? (duplicate.lines || []).filter(line => (line.kind || 'manual') === 'manual' && !line.sources?.length).map(line => manualLine({ ...line, id: newId('line'), sources: [] })) : preset?.lines || [],
    discountPercent: billing.discountPercent || 0, notes: billing.notes || '', terms: billing.terms || '',
    kind: preset?.kind || 'standard', retainerId: preset?.retainerId || null, retainerPeriodStart: preset?.retainerPeriodStart || null,
  }
}

function normalizedInvoice(state, draft, old, send) {
  const client = find(state.clients, draft.clientId)
  requireThat(client && (visible(client) || old?.clientId === client.id), 'Choose a billing client.')
  requireThat(!draft.projectId || find(state.projects, draft.projectId)?.clientId === client.id, 'Choose a project belonging to the billing client.')
  requireThat(currencies.includes(draft.currency), 'Choose a valid currency.')
  const invoiceNumber = String(draft.invoiceNumber || '').trim()
  requireThat(invoiceNumber && !state.invoices.some(row => row.id !== old?.id && row.invoiceNumber?.toLowerCase() === invoiceNumber.toLowerCase()), 'Enter a unique invoice number.')
  requireThat(validDate(draft.issueDate) && validDate(draft.dueDate) && draft.dueDate >= draft.issueDate, 'Enter valid dates with the due date on or after the issue date.')
  requireThat(draft.lines?.length, 'Add at least one invoice line.')
  const discountPercent = Number(draft.discountPercent)
  requireThat(Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100, 'Enter a discount between 0 and 100%.')
  const lines = draft.lines.map(line => {
    const name = String(line.name || '').trim(), description = String(line.description || '').trim()
    const quantity = Number(line.quantity), rate = Number(line.rate), taxPercent = Number(line.taxPercent)
    requireThat(name || description, 'Give each line a name or description.')
    requireThat(Number.isFinite(quantity) && quantity > 0, 'Enter a quantity greater than zero for each line.')
    requireThat(Number.isFinite(rate) && rate >= 0 && Number.isFinite(taxPercent) && taxPercent >= 0 && taxPercent <= 100, 'Use a nonnegative rate and a tax between 0 and 100%.')
    return { ...line, serviceId: line.serviceId || null, name: name || description, description, quantity, rate: cents(rate) / 100, taxPercent }
  })
  const amountPaid = old ? paidAmount(state, old) : 0
  const hasPayments = amountPaid > 0 || (old && state.payments.some(row => row.invoiceId === old.id && (row.status || 'recorded') === 'recorded'))
  requireThat(!hasPayments || (old.currency === draft.currency && old.clientId === draft.clientId), 'Keep the currency and client on an invoice with payments.')
  const totals = calculateInvoice(lines, discountPercent, amountPaid)
  requireThat(totals.amountDue >= 0 && Number.isFinite(totals.total), 'The total must cover recorded payments.')
  const status = amountPaid ? (totals.amountDue ? 'partial' : 'paid') : old?.status === 'paid' || old?.status === 'partial'
    ? (old?.sentAt || send ? 'sent' : 'draft') : send && (!old?.status || old.status === 'draft') ? 'sent' : old?.status || 'draft'
  return {
    ...old, ...draft, ...totals, ...stamp(state, old), id: old?.id || newId('inv'), invoiceNumber,
    projectId: draft.projectId || null, kind: draft.kind || old?.kind || 'standard', retainerId: draft.retainerId || null,
    retainerPeriodStart: draft.retainerPeriodStart || null, discountPercent, status,
    visibility: old?.visibility || 'active', sentAt: old?.sentAt || (send ? new Date().toISOString() : null),
  }
}

export function timeSource(state, row) {
  const project = find(state.projects, row.projectId), service = find(state.services, row.serviceId)
  const rate = Number(project?.hourlyRate ?? service?.defaultRate) || 0
  const minutes = Number(row.durationMinutes) || 0
  return { rate, source: { type: 'time_entry', id: row.id, minutes, amount: cents(minutes * rate / 60) / 100, includeReceipt: false } }
}
export function expenseSource(row) {
  const total = cents(row.total)
  return { type: 'expense', id: row.id, minutes: null, amount: (total + Math.round(total * (Number(row.markupPercent) || 0) / 100)) / 100, includeReceipt: Boolean(row.includeReceiptOnInvoice) }
}
export function invoiceSources(invoice) {
  return (invoice?.lines || []).flatMap(line => line.sources || [])
}

function sourceRows(state, invoice, previous, restoring = false) {
  const sources = invoiceSources(invoice)
  const oldSources = invoiceSources(previous)
  const updates = { timeEntries: state.timeEntries, expenses: state.expenses }
  const getKey = source => `${source.type}:${source.id}`
  const currentKeys = new Set(sources.map(getKey))
  const oldKeys = new Set(oldSources.map(getKey))
  requireThat(sources.length === currentKeys.size, 'Each time entry or expense can only be included once.')
  for (const source of sources) {
    const key = source.type === 'expense' ? 'expenses' : 'timeEntries'
    const row = find(updates[key], source.id)
    const retained = oldKeys.has(getKey(source)) && row?.invoiceId === invoice.id
    requireThat(row && visible(row) && row.clientId === invoice.clientId && row.billable && !row.retainerId &&
      (key === 'expenses' ? row.currency === invoice.currency : (find(state.clients, row.clientId)?.currency || state.business?.currency || 'USD') === invoice.currency) &&
      (retained || (!row.invoiceId && row.status === 'unbilled')), 'An imported entry is no longer available for this client and currency. Review the import again.')
    if (!retained) {
      if (!restoring) {
        const latest = source.type === 'expense' ? expenseSource(row) : timeSource(state, row).source
        requireThat(latest.minutes === source.minutes && cents(latest.amount) === cents(source.amount) &&
          latest.includeReceipt === source.includeReceipt, 'An imported entry changed. Review the import again.')
      }
      updates[key] = upsert(updates[key], { ...row, ...stamp(state, row), invoiceId: invoice.id, status: 'billed' })
    }
  }
  for (const source of oldSources.filter(row => !currentKeys.has(getKey(row)))) {
    const key = source.type === 'expense' ? 'expenses' : 'timeEntries'
    const row = find(updates[key], source.id)
    if (row?.invoiceId === previous.id) updates[key] = upsert(updates[key], { ...row, ...stamp(state, row), invoiceId: null, status: 'unbilled' })
  }
  return updates
}

export function saveInvoice(state, draft, { id, duplicate, delivery } = {}) {
  const old = find(state.invoices, id)
  requireThat(!id || (old && !visible(old, 'deleted')), 'This invoice is unavailable for editing.')
  const invoice = normalizedInvoice(state, draft, old, delivery)
  const updates = invoice.kind === 'standard' ? sourceRows(state, invoice, old) : {}
  if (invoice.kind === 'retainer_excess') validateExcess(state, invoice)
  const action = !old && invoice.kind === 'retainer_excess' ? 'retainer.excess_billed' : delivery ? 'invoice.sent' : old ? 'invoice.updated' : duplicate ? 'invoice.duplicated' : 'invoice.created'
  return event({ ...state, ...updates, invoices: upsert(state.invoices, invoice) }, action, 'invoice', invoice.id,
    [invoice.clientId, invoice.projectId, invoice.retainerId, duplicate, ...invoiceSources(invoice).map(row => row.id), ...invoiceSources(old).map(row => row.id)],
    delivery && { ...delivery, invoiceId: invoice.id })
}

export function sendInvoice(state, id, delivery) {
  const old = find(state.invoices, id)
  requireThat(old && !visible(old, 'deleted'), 'This invoice is unavailable.')
  if (!delivery && old.status !== 'draft') return state
  const invoice = { ...old, ...stamp(state, old), status: !old.status || old.status === 'draft' ? 'sent' : old.status, sentAt: old.sentAt || new Date().toISOString() }
  return event({ ...state, invoices: upsert(state.invoices, invoice) }, delivery ? 'invoice.sent' : 'invoice.marked_sent', 'invoice', id,
    [invoice.clientId, invoice.retainerId], delivery && { ...delivery, invoiceId: id })
}

export const paymentMethods = ['cash', 'check', 'bank_transfer', 'credit_card', 'other']
export function recordPayment(state, id, form) {
  const invoice = find(state.invoices, id)
  requireThat(invoice && !visible(invoice, 'deleted'), 'This invoice is unavailable.')
  const already = cents(paidAmount(state, invoice))
  const balance = cents(invoice.total) - already
  const amount = cents(form.amount)
  requireThat(Number.isFinite(amount) && amount > 0 && amount <= balance, 'Enter a positive payment no greater than the outstanding balance.')
  requireThat(validDate(form.paymentDate) && form.paymentDate <= today(), 'Choose a payment date on or before today.')
  requireThat(paymentMethods.includes(form.method), 'Choose a payment method.')
  const payment = {
    ...stamp(state), id: newId('pay'), invoiceId: id, clientId: invoice.clientId,
    paymentDate: form.paymentDate, currency: invoice.currency, amount: amount / 100, method: form.method,
    reference: form.reference.trim(), notes: form.notes.trim(), status: 'recorded',
  }
  const next = { ...invoice, ...stamp(state, invoice), amountPaid: (already + amount) / 100, amountDue: (balance - amount) / 100, status: balance === amount ? 'paid' : 'partial' }
  return event({ ...state, invoices: upsert(state.invoices, next), payments: [...state.payments, payment] }, 'payment.recorded', 'payment', payment.id, [id, invoice.clientId])
}

export function changeInvoiceVisibility(state, id, visibility) {
  const invoice = find(state.invoices, id)
  requireThat(invoice, 'This invoice is unavailable.')
  if (visible(invoice, visibility)) return state
  requireThat(!visible(invoice, 'deleted') || visibility === 'active', 'Restore the invoice before making that change.')
  if (visibility === 'deleted') {
    requireThat(invoice.kind !== 'retainer_fee', 'Issued retainer fee invoices cannot be deleted.')
    requireThat(!state.payments.some(row => row.invoiceId === id && (row.status || 'recorded') === 'recorded') && !paidAmount(state, invoice), 'Invoices with recorded payments cannot be deleted.')
  }
  let updates = {}
  if ((invoice.kind || 'standard') === 'standard') {
    if (visibility === 'deleted') updates = sourceRows(state, { ...invoice, lines: [] }, invoice)
    else if (visible(invoice, 'deleted')) updates = sourceRows(state, invoice, null, true)
  }
  if (invoice.kind === 'retainer_excess' && visible(invoice, 'deleted')) validateExcess(state, invoice)
  const action = visibility === 'active' ? 'restored' : visibility
  return event({ ...state, ...updates, invoices: upsert(state.invoices, { ...invoice, visibility, ...stamp(state, invoice) }) }, 'invoice.' + action, 'invoice', id,
    [invoice.clientId, invoice.retainerId, ...invoiceSources(invoice).map(row => row.id)])
}
