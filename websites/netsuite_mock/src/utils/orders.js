import { addressText, find, linesOf, money, number, plusDays, postingPeriod, round, rows, sum, today } from './model.js'
import { balanceOf, purchaseOpen, purchaseStatus, salesOpen, salesStatus, totals } from './derived.js'
import { ConfirmationRequired, createRecord, existing, hasChildren, recordLines, removeRecord, requireFields, requireLines, requireValue, transaction, updateRecord, validDate, validNumber } from './ledger.js'

export const isSales = (code) => code === 'salesord'
export const orderTerminal = (code, record) => (isSales(code) ? ['Billed', 'Closed', 'Cancelled'] : ['Fully Billed', 'Closed']).includes(record?.status)

export function defaultsForParty(state, code, id) {
  const purchase = code === 'purchord'
  const party = find(state, purchase ? 'vendors' : 'customers', id)
  if (!party) return {}
  if (purchase) return { termsId: party.termsId || '', shipMethodId: party.shipMethodId || '' }
  return {
    termsId: party.termsId || '', salesRepId: party.salesRepId || '', shipMethodId: party.shipMethodId || '',
    taxItemId: party.taxItemId || '', taxRate: party.taxable === false ? 0 : number(find(state, 'taxItems', party.taxItemId)?.rate),
    billAddress: addressText(party.billAddress), shipAddress: addressText(party.shipAddress),
    ...(party.defaultLocationId ? { locationId: party.defaultLocationId } : {}),
  }
}

export function orderDraft(state, code, record) {
  if (record) return { ...record, locationId: record.shipToLocationId || record.locationId || '', lines: linesOf(record) }
  const date = today()
  const actor = state.currentUser?.employeeId
  const buyer = rows(state, 'employees').find((entry) => entry.isBuyer && !entry.inactive)
  return {
    tranDate: date, locationId: state.preferences?.defaultLocationId || rows(state, 'locations')[0]?.id || '',
    status: state.preferences?.salesOrderDefaultStatus || 'Pending Approval',
    supervisorApproval: !!state.preferences?.purchaseOrderSupervisorApprovalDefault, employeeId: buyer?.id || actor || '',
    dueDate: plusDays(date, 14), shipDate: plusDays(date, 3), shippingCost: 0, taxRate: 0, discountRate: 0, lines: [],
  }
}

export function activeReference(state, key, id, priorId) {
  const record = find(state, key, id)
  return record && (!record.inactive || record.id === priorId) ? record : null
}

export function checkCredit(state, customer, total, priorId, confirmed) {
  requireValue(customer?.creditHold !== 'On' && customer?.creditHold !== true, 'This customer is on credit hold. The transaction cannot be saved.')
  if (!customer || customer.creditHold === 'Off' || state.preferences?.creditLimitHandling !== 'Warn' || number(customer.creditLimit) <= 0) return
  const outstanding = rows(state, 'salesOrders').filter((order) => order.id !== priorId && order.customerId === customer.id &&
    (salesOpen.includes(order.status) || order.status === 'Pending Approval'))
  const exposure = round(balanceOf(state, 'invoices', customer.id) + total + sum(outstanding, (order) => {
    const unbilled = linesOf(order).filter((line) => !line.isClosed).map((line) => ({
      ...line, amount: round(Math.max(0, number(line.quantity) - number(line.quantityBilled)) * number(line.rate)),
    }))
    const shippingBilled = rows(state, 'invoices').some((invoice) => invoice.createdFromId === order.id && invoice.status !== 'Voided' && number(invoice.shippingCost) > 0)
    return totals(unbilled, { ...order, shippingCost: shippingBilled ? 0 : order.shippingCost }).total
  }))
  if (exposure > number(customer.creditLimit) && !confirmed) {
    throw new ConfirmationRequired(`The customer's balance plus unbilled orders and this transaction (${money(exposure)}) exceed the customer's credit limit (${money(customer.creditLimit)}). Do you want to continue?`)
  }
}

export function pricedLines(state, draft, prior, { sales, locationId, invoice = false } = {}) {
  requireLines(linesOf(draft))
  const previous = new Map(linesOf(prior).map((line) => [line.lineId, line]))
  const output = recordLines(prior, linesOf(draft)).map((line) => {
    const old = previous.get(line.lineId)
    const item = activeReference(state, 'items', line.itemId, old?.itemId)
    requireValue(item, 'Select a valid active item for each line.')
    requireValue(validNumber(line.quantity) && number(line.quantity) > 0, 'Quantity must be greater than zero.')
    requireValue(validNumber(line.rate) && number(line.rate) >= 0, 'Rate must be zero or greater.')
    const handled = Math.max(number(old?.quantityFulfilled), number(old?.quantityReceived), number(old?.quantityBilled))
    requireValue(!handled || (item.id === old.itemId && number(line.quantity) >= handled &&
      (!sales || invoice || (old.locationId || prior?.locationId) === locationId)),
      'A linked line must keep its item and location and cannot be reduced below its fulfilled, received or billed quantity.')
    const values = {
      lineId: line.lineId, line: line.line, itemId: item.id, description: line.description || (sales ? item.salesDescription : item.purchaseDescription) || item.description || item.displayName || '',
      quantity: number(line.quantity), units: (sales ? item.saleUnit : item.purchaseUnit) || item.units || 'Ea', rate: round(number(line.rate), 4),
      amount: round(number(line.quantity) * round(number(line.rate), 4)),
    }
    if (sales) values.taxable = item.taxable !== false
    if (invoice) return { ...values, orderLineId: old?.orderLineId || null }
    if (sales) return { ...values, locationId, quantityFulfilled: number(old?.quantityFulfilled), quantityBilled: number(old?.quantityBilled), isClosed: !!old?.isClosed }
    return { ...values, vendorCode: rows(item, 'vendors').find((entry) => entry.vendorId === draft.vendorId)?.vendorCode || item.vendorCode || '', expectedReceiptDate: line.expectedReceiptDate || draft.dueDate || null,
      quantityReceived: number(old?.quantityReceived), quantityBilled: number(old?.quantityBilled), isClosed: !!old?.isClosed }
  })
  if (!invoice) requireValue(linesOf(prior).every((line) => !(number(line.quantityFulfilled) || number(line.quantityReceived) || number(line.quantityBilled))
    || output.some((row) => row.lineId === line.lineId)), 'A fulfilled, received or billed line cannot be removed.')
  return output
}

export function saveOrderIn(env, code, draft, id, confirmed = false) {
  const { state } = env
  const sales = isSales(code)
  const current = id ? existing(state, code, id) : null
  requireValue(current?.status !== 'Cancelled', 'Cancelled orders cannot be edited.')
  if (orderTerminal(code, current)) return updateRecord(env, code, current, { memo: draft.memo || '', otherRefNum: draft.otherRefNum || '' })
  const partyField = sales ? 'customerId' : 'vendorId'
  const party = activeReference(state, sales ? 'customers' : 'vendors', draft[partyField], current?.[partyField])
  const location = activeReference(state, 'locations', draft.locationId, current?.shipToLocationId || current?.locationId)
  const linked = current && hasChildren(state, current.id)
  requireFields({ [sales ? 'Customer' : 'Vendor']: party, Date: draft.tranDate, Location: location })
  requireValue(validDate(draft.tranDate), 'Enter a valid transaction date.')
  requireValue(!linked || (current[partyField] === party.id && (current.shipToLocationId || current.locationId) === location.id),
    'An order with linked transactions must keep its original company and location.')
  const lines = pricedLines(state, draft, current, { sales, locationId: location.id })
  const common = {
    [partyField]: party.id, tranDate: draft.tranDate, postingPeriod: postingPeriod(draft.tranDate), locationId: location.id,
    memo: draft.memo || '', otherRefNum: draft.otherRefNum || '', termsId: draft.termsId || null, shipMethodId: draft.shipMethodId || null,
    departmentId: draft.departmentId || null, classId: draft.classId || null, lines,
  }
  let data
  if (sales) {
    requireValue(!draft.shippingCost || number(draft.shippingCost) >= 0, 'Shipping cost must be zero or greater.')
    const shipping = {
      salesRepId: draft.salesRepId || null, shipDate: draft.shipDate || null, shipAddress: draft.shipAddress || '',
      billAddress: draft.billAddress || '', shippingCost: round(number(draft.shippingCost)), taxItemId: draft.taxItemId || null,
      taxRate: party.taxable === false ? 0 : number(find(state, 'taxItems', draft.taxItemId)?.rate ?? draft.taxRate),
      discountRate: number(draft.discountRate),
    }
    const summary = totals(lines, shipping)
    checkCredit(state, party, summary.total, current?.id, confirmed)
    const status = current?.status || (draft.status === 'Pending Fulfillment' ? 'Pending Fulfillment' : 'Pending Approval')
    data = { ...common, ...shipping, ...summary, status: salesStatus({ status, lines }, state) }
    if (!current) Object.assign(data, { approvedById: status === 'Pending Fulfillment' ? env.actor : null, approvedAt: status === 'Pending Fulfillment' ? env.now : null, cancelledAt: null, closedAt: null })
  } else {
    const approved = current ? !!current.supervisorApproval : !!draft.supervisorApproval
    const status = current?.status || (approved ? 'Pending Receipt' : 'Pending Supervisor Approval')
    data = { ...common, employeeId: draft.employeeId || null, shipToLocationId: location.id, dueDate: draft.dueDate || null,
      supervisorApproval: approved, status: purchaseStatus({ status, lines }), ...totals(lines) }
    delete data.discountTotal
    if (!current) Object.assign(data, { approvedById: approved ? env.actor : null, approvedAt: approved ? env.now : null,
      rejectedById: null, rejectedAt: null, rejectionReason: '', closedAt: null })
  }
  return current ? updateRecord(env, code, current, data) : createRecord(env, code, data)
}

export const saveOrder = (state, code, draft, id, confirmed) => transaction(state, (env) => saveOrderIn(env, code, draft, id, confirmed))

export function orderAction(state, code, id, action, { confirmed, reason } = {}) {
  return transaction(state, (env) => {
    const row = existing(env.state, code, id)
    const sales = isSales(code)
    const open = sales ? salesOpen : purchaseOpen
    const pending = sales ? 'Pending Approval' : 'Pending Supervisor Approval'
    if (action === 'Approve') {
      requireValue(row.status === pending, 'This order is no longer pending approval.')
      if (sales) checkCredit(state, find(state, 'customers', row.customerId), number(row.total), row.id, confirmed)
      const status = sales ? salesStatus({ ...row, status: 'Pending Fulfillment' }, state) : purchaseStatus({ ...row, status: 'Pending Receipt' })
      return updateRecord(env, code, row, { status, approvedById: env.actor, approvedAt: env.now,
        ...(!sales && { supervisorApproval: true }) }, action)
    }
    if (action === 'Reject') {
      requireValue(!sales && row.status === pending, 'This order is no longer pending approval.')
      requireFields({ 'Rejection Reason': reason?.trim() })
      return updateRecord(env, code, row, { status: 'Rejected by Supervisor', supervisorApproval: false,
        rejectionReason: reason.trim(), rejectedById: env.actor, rejectedAt: env.now }, action)
    }
    if (action === 'Delete') {
      requireValue(!orderTerminal(code, row), 'This order cannot be deleted.')
      return removeRecord(env, code, row)
    }
    const cancelling = action === 'Cancel'
    requireValue(cancelling ? sales && row.status === pending : open.includes(row.status) || (!sales && [pending, 'Rejected by Supervisor'].includes(row.status)),
      'This order is no longer eligible for this action.')
    return updateRecord(env, code, row, { status: cancelling ? 'Cancelled' : 'Closed', [cancelling ? 'cancelledAt' : 'closedAt']: env.now,
      lines: linesOf(row).map((line) => ({ ...line, isClosed: true })) }, action)
  })
}

