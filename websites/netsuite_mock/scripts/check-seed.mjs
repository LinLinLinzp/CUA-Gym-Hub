import assert from 'node:assert/strict'
import { createInitialData } from '../src/data/seed.js'
import { itemStock, overdue, purchaseStatus, salesStatus, stockMetrics, totals } from '../src/utils/derived.js'
import { round, sum } from '../src/utils/model.js'
import { validDate } from '../src/utils/ledger.js'
import { checkCredit } from '../src/utils/orders.js'

const state = createInitialData()
assert.deepEqual(state, createInitialData(), 'Seed is deterministic')
assert.deepEqual(state, JSON.parse(JSON.stringify(state)), 'All seed values round-trip through JSON')

const expected = {
  employees: 10, locations: 3, customers: 40, vendors: 22, items: 60, salesOrders: 48, itemFulfillments: 32,
  invoices: 33, customerPayments: 20, purchaseOrders: 32, itemReceipts: 18, vendorBills: 16, vendorPayments: 8,
  inventoryAdjustments: 10, inventoryTransfers: 6, userNotes: 8, tasks: 10,
}

for (const [key, count] of Object.entries(expected)) {
  const entries = state[key]
  assert.equal(entries.length, count, key)
  assert.equal(new Set(entries.map((record) => record.id)).size, count, key + ' IDs')
}

const items = new Map(state.items.map((row) => [row.id, row]))
const documents = [...Object.keys(expected).flatMap((key) => state[key])].filter((record) => record.tranId)
const transactionsById = new Map(documents.map((record) => [record.id, record]))
for (const row of documents) {
  assert(validDate(row.tranDate), row.id)
  assert(!row.dueDate || validDate(row.dueDate), row.id + ' due date')
  const order = row.createdFromId && transactionsById.get(row.createdFromId)
  if (row.createdFromId) {
    assert.equal(order?.type, row.createdFromType, row.id)
    assert.equal(order.customerId || order.vendorId, row.customerId || row.vendorId, row.id)
  }
  for (const line of row.lines || []) {
    assert(items.has(line.itemId), row.id + ' item')
    if (order) assert(order.lines.some((entry) => entry.lineId === line.orderLineId && entry.itemId === line.itemId), row.id + ' parent link')
    if (line.amount != null) assert.equal(line.amount, round(line.quantity * line.rate), row.id + ' line amount')
  }
  if (['itemReceipt', 'purchaseOrder', 'vendorBill'].includes(row.type)) {
    assert.equal(row.total, round(sum([...(row.lines || []), ...(row.expenses || [])], (line) => line.amount)), row.id + ' total')
  }
  if (['salesOrder', 'invoice'].includes(row.type)) {
    for (const [key, total] of Object.entries(totals(row.lines, row))) assert.equal(row[key], total, row.id + ' ' + key)
  }
}

const sourceQuantity = (children, order, line) => sum(children.filter((child) => child.createdFromId === order.id && child.status !== 'Voided'), (child) =>
  sum(child.lines.filter((item) => item.orderLineId === line.lineId), (item) => item.quantity))

for (const order of state.salesOrders) {
  assert.equal(order.status, salesStatus(order, state), order.id)
  for (const line of order.lines) {
    assert.equal(line.quantityFulfilled, sourceQuantity(state.itemFulfillments, order, line), order.id + ' fulfilled')
    assert.equal(line.quantityBilled, sourceQuantity(state.invoices, order, line), order.id + ' billed')
    assert(line.quantityFulfilled <= line.quantity && line.quantityBilled <= line.quantity, order.id + ' quantity')
  }
}
for (const order of state.purchaseOrders) {
  assert.equal(order.status, purchaseStatus(order), order.id)
  for (const line of order.lines) {
    assert.equal(line.quantityReceived, sourceQuantity(state.itemReceipts, order, line), order.id + ' received')
    assert.equal(line.quantityBilled, sourceQuantity(state.vendorBills, order, line), order.id + ' billed')
    assert(line.quantityBilled <= line.quantityReceived && line.quantityReceived <= line.quantity, order.id + ' quantity')
  }
}

function checkPayments(targets, payments, targetKey, partyKey) {
  const ids = new Map(targets.map((row) => [row.id, row]))
  for (const payment of payments) {
    for (const application of payment.applied) {
      const target = ids.get(application[targetKey])
      assert(target && target[partyKey] === payment[partyKey], payment.id + ' application link')
      assert(payment.tranDate >= target.tranDate, payment.id + ' application date')
    }
    const applied = round(sum(payment.applied, (row) => row.amount))
    assert.equal(applied, payment.appliedTotal ?? payment.total, payment.id + ' applied total')
    if ('unapplied' in payment) assert.equal(round(payment.payment - applied), payment.unapplied, payment.id + ' unapplied')
  }
  for (const target of targets) {
    const paid = round(sum(payments, (payment) => sum(payment.applied.filter((row) => row[targetKey] === target.id), (row) => row.amount)))
    assert.equal(target.amountPaid, paid, target.id + ' amount paid')
    assert.equal(target.amountRemaining, target.status === 'Voided' ? 0 : round(target.total - paid), target.id + ' balance')
    assert(target.amountRemaining >= 0, target.id + ' nonnegative balance')
    if (target.status !== 'Voided') assert.equal(target.status, target.amountRemaining > 0 ? 'Open' : 'Paid In Full', target.id)
  }
}

checkPayments(state.invoices, state.customerPayments, 'invoiceId', 'customerId')
checkPayments(state.vendorBills, state.vendorPayments, 'billId', 'vendorId')
assert.equal(state.invoices.filter((row) => overdue(row, '2026-11-18')).length, 6)
assert.equal(state.items.filter((item) => item.type === 'inventoryItem').length, 48)
for (const item of state.items) for (const row of item.locations) assert(row.onHand >= 0, item.id + ' nonnegative stock')
for (const row of transactionsById.values()) assert(state.counters[row.type] > row.internalId, row.id + ' counter')
assert(state.counters.customer > Math.max(...state.customers.map((row) => row.internalId)))
assert(state.counters.vendor > Math.max(...state.vendors.map((row) => row.internalId)))

const occupiedInternalIds = new Set(Object.values(state).flatMap((entries) => Array.isArray(entries) ? entries.map((row) => row.internalId) : []))
assert(!occupiedInternalIds.has(state.counters.nextInternalId))
const reno = state.customers.find((row) => row.id === 'cust_1009')
const held = state.customers.find((row) => row.id === 'cust_1025')
const pending = state.salesOrders.find((row) => row.id === 'so_10452')
assert.throws(() => checkCredit(state, reno, pending.total, pending.id, false), /21,593.00.*20,000.00/)
assert.throws(() => checkCredit(state, held, 389, undefined, false), /credit hold/)
const anchors = items.get('item_ancwdg12')
const anchorOrder = transactionsById.get('so_10442')
const inbound = transactionsById.get('po_4521')
assert(anchorOrder.lines.some((line) => line.itemId === anchors.id && line.quantity === 10))
assert(inbound.lines.some((line) => line.itemId === anchors.id && line.quantity === 60))
assert.equal(itemStock(anchors, 'loc_3').onHand, 0)
assert.equal(stockMetrics(state, anchors, 'loc_3').backOrdered, 10)
assert.equal(stockMetrics(state, anchors, 'loc_3').onOrder, 60)
assert.equal(items.get('item_pmp1050').averageCost, 232)
assert.deepEqual(items.get('item_pmp1050').locations.map((row) => row.onHand), [24,10,8])
console.log('PASS: deterministic fixtures, record links, order states, amounts, balances, credit, stock and counters')
