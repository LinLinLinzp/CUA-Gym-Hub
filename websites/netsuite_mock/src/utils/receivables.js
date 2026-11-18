import { eligible, totals } from './derived.js'
import { applySourceDelta, conversionDraft, linkedLines } from './conversions.js'
import { createRecord, existing, requireFields, requireValue, transaction, updateRecord, validDate } from './ledger.js'
import { addressText, find, linesOf, number, plusDays, postingPeriod, round, rows, today } from './model.js'
import { activeReference, defaultsForParty, pricedLines } from './orders.js'

export const canChangeInvoice = (row) => row?.status === 'Open' && number(row.amountPaid) === 0

export function invoiceDraft(state, source, record) {
  if (source) return conversionDraft(state, 'custinvc', source, record)
  if (record) return { ...record, lines: linesOf(record) }
  return {
    tranDate: today(), dueDate: today(), locationId: state.preferences?.defaultLocationId || rows(state, 'locations')[0]?.id || '',
    shippingCost: 0, taxRate: 0, discountRate: 0, lines: [],
  }
}

export function invoiceParty(state, draft, customerId) {
  const party = defaultsForParty(state, 'custinvc', customerId)
  return { ...draft, ...party, customerId, dueDate: plusDays(draft.tranDate, find(state, 'terms', party.termsId)?.days) }
}

export function saveInvoice(state, draft, { id, sourceId } = {}) {
  return transaction(state, (env) => {
    const current = id ? existing(env.state, 'custinvc', id) : null
    requireValue(!current || canChangeInvoice(current), 'Only an open, unpaid invoice can be edited.')
    const fromId = current ? current.createdFromId : sourceId
    const source = fromId ? existing(env.state, 'salesord', fromId) : null
    requireValue(!source || current || eligible(state, 'custinvc', source), 'This sales order has no billable quantities remaining.')
    const customer = activeReference(state, 'customers', source?.customerId || draft.customerId, current?.customerId || source?.customerId)
    requireFields({ Customer: customer, Date: draft.tranDate, 'Due Date': draft.dueDate })
    requireValue(validDate(draft.tranDate) && validDate(draft.dueDate), 'Enter a valid transaction date and due date.')
    const location = activeReference(state, 'locations', source?.locationId || draft.locationId, current?.locationId || source?.locationId)
    const lines = source ? linkedLines(state, 'custinvc', source, draft, current) : pricedLines(state, draft, current, { sales: true, invoice: true })
    const alreadyCharged = source && rows(state, 'invoices').some((invoice) =>
      invoice.createdFromId === source.id && invoice.status !== 'Voided' && number(invoice.shippingCost) !== 0)
    const shippingCost = source ? (current ? number(current.shippingCost) : alreadyCharged ? 0 : number(source.shippingCost)) : round(number(draft.shippingCost))
    requireValue(shippingCost >= 0, 'Shipping cost must be zero or greater.')
    const taxItemId = draft.taxItemId || null
    const taxRate = customer.taxable === false ? 0 : number(find(state, 'taxItems', taxItemId)?.rate ?? draft.taxRate)
    const discountRate = number(draft.discountRate)
    const summary = totals(lines, { taxRate, shippingCost, discountRate })
    const values = {
      customerId: customer.id, tranDate: draft.tranDate, postingPeriod: postingPeriod(draft.tranDate), dueDate: draft.dueDate,
      locationId: location?.id || null, termsId: draft.termsId || null, salesRepId: draft.salesRepId || null, memo: draft.memo || '',
      otherRefNum: draft.otherRefNum || '', shippingCost, shipDate: draft.shipDate || null, shipMethodId: draft.shipMethodId || null,
      billAddress: addressText(draft.billAddress), taxItemId, taxRate, discountRate, lines, ...summary,
      amountPaid: 0, amountRemaining: summary.total, status: summary.total > 0 ? 'Open' : 'Paid In Full',
    }
    if (source) applySourceDelta(env, 'custinvc', source, lines, linesOf(current))
    return current ? updateRecord(env, 'custinvc', current, values) : createRecord(env, 'custinvc', {
      ...values, createdFromId: source?.id || null, createdFromType: source ? 'salesOrder' : null, voidedAt: null, voidedById: null,
      lastEmailedAt: null, toBeEmailed: false, toBePrinted: false,
    })
  })
}

export function voidInvoice(state, id) {
  return transaction(state, (env) => {
    const record = existing(env.state, 'custinvc', id)
    requireValue(canChangeInvoice(record), 'Only an open, unpaid invoice can be voided.')
    const source = find(env.state, 'salesOrders', record.createdFromId)
    if (source) applySourceDelta(env, 'custinvc', source, [], linesOf(record))
    return updateRecord(env, 'custinvc', record, { status: 'Voided', amountRemaining: 0, voidedAt: env.now, voidedById: env.actor }, 'Void')
  })
}
