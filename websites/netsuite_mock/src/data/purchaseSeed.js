import { itemStock, totals } from '../utils/derived.js'
import { plusDays, round, sum } from '../utils/model.js'
import { itemIdFor, vendorIdFor } from './reference.js'
import { adjustmentFixtures, purchaseFixtures } from './purchaseFixtures.js'
import { header, in2026, linkedPriceLine, priceLine, when } from './transactionSeed.js'

const partialReceived = { 4510: [4], 4515: [200, 2], 4516: [80, 0], 4517: [20, 30, 0], 4518: [2, 30], 4519: [20, 0] }
const references = { 2001: 'NPM', 2002: 'AVF', 2003: 'MBS', 2004: 'SPT', 2005: 'IFC', 2006: 'GSP', 2007: 'BED',
  2009: 'CHH', 2011: 'RFL', 2013: 'EOS', 2014: 'CIR', 2018: 'SCC', 2021: 'WSF' }
const expenseBillFixtures = [
  [2011, 1284.50, 6400, '09-30', 'Outbound LTL September', true],
  [2013, 212.38, 6600, '10-15', 'Warehouse office supplies', true],
  [2014, 1950, 6500, '10-31', 'Columbus lift rental', false],
  [2021, 640, 6500, '11-08', 'Reno forklift service', false],
]
const transferFixtures = [
  ['07-02', 'loc_1', 'loc_2', [['CNV-RLR19', 50], ['CNV-BLT24', 150]]],
  ['08-06', 'loc_1', 'loc_3', [['BRG-6205', 60]]],
  ['09-01', 'loc_2', 'loc_1', [['PPE-HH100', 40]]],
  ['09-29', 'loc_1', 'loc_3', [['PMP-1050', 4], ['SEL-5510', 10]]],
  ['10-20', 'loc_3', 'loc_2', [['FST-HB3816', 15]]],
  ['11-11', 'loc_1', 'loc_2', [['VLV-3010', 30]], 'Rebalance for SO10447'],
]

export function purchaseSeed(state) {
  const purchaseOrders = purchaseFixtures.map(([num, date, vendorNum, locationId, status, items, memo = '', rejectionReason = '']) => {
    const vendor = state.vendors.find((row) => row.id === vendorIdFor(vendorNum))
    const tranDate = in2026(date)
    const dueDate = plusDays(tranDate, 14)
    const supervisorApproval = !['Pending Supervisor Approval', 'Rejected by Supervisor'].includes(status)
    const lines = items.map((item, i) => {
      const base = priceLine(state, item, i, true)
      const quantityReceived = partialReceived[num]?.[i] ?? (['Fully Billed', 'Pending Bill'].includes(status) ? base.quantity : 0)
      const quantityBilled = ['Fully Billed', 'Partially Received', 'Closed'].includes(status) ? quantityReceived : 0
      return { ...base, expectedReceiptDate: dueDate, quantityReceived, quantityBilled, isClosed: status === 'Closed' }
    })
    const { subtotal, taxTotal, total } = totals(lines)
    return header('purchaseOrder', num, tranDate, {
      vendorId: vendor.id, employeeId: 'emp_105', createdById: 'emp_105', status, supervisorApproval, memo, otherRefNum: '',
      dueDate, termsId: vendor.termsId, shipToLocationId: locationId, locationId, shipMethodId: null, departmentId: 'dept_3',
      approvedById: supervisorApproval ? 'emp_101' : null, approvedAt: supervisorApproval ? when(tranDate, '18') : null,
      rejectedById: rejectionReason ? 'emp_101' : null, rejectedAt: rejectionReason ? when(tranDate, '19') : null, rejectionReason,
      closedAt: status === 'Closed' ? when(plusDays(tranDate, num === 4510 ? 14 : 1)) : null, lines, subtotal, taxTotal, total,
    })
  })
  const itemReceipts = purchaseOrders.filter((order) => order.lines.some((line) => line.quantityReceived > 0)).map((order, i) => {
    const lines = order.lines.filter((line) => line.quantityReceived > 0).map((line, index) =>
      ({ ...linkedPriceLine(line, line.quantityReceived, index), locationId: order.locationId }))
    return header('itemReceipt', 3301 + i, plusDays(order.tranDate, 10), {
      vendorId: order.vendorId, createdFromId: order.id, createdFromType: 'purchaseOrder', status: 'Received',
      locationId: order.locationId, departmentId: 'dept_2', lines, total: round(sum(lines, (line) => line.amount)),
    })
  })
  const linkedBills = purchaseOrders.filter((order) => order.lines.some((line) => line.quantityBilled > 0)).map((order) => {
    const receipt = itemReceipts.find((row) => row.createdFromId === order.id)
    const lines = order.lines.filter((line) => line.quantityBilled > 0).map((line, i) => linkedPriceLine(line, line.quantityBilled, i))
    return {
      vendorId: order.vendorId, date: plusDays(receipt.tranDate, 3), locationId: order.locationId, lines, expenses: [],
      total: round(sum(lines, (line) => line.amount)), paid: order.internalId <= 4506, createdFromId: order.id,
    }
  })
  const expenseBills = expenseBillFixtures.map(([vendorNum, total, account, date, memo, paid]) => ({
    vendorId: vendorIdFor(vendorNum), date: in2026(date), locationId: 'loc_1', lines: [],
    expenses: [{ lineId: 'l1', accountId: `acct_${account}`, amount: total, memo }], total, paid,
  }))
  const vendorBills = [...linkedBills, ...expenseBills].map((bill, i) => {
    const vendor = state.vendors.find((row) => row.id === bill.vendorId)
    const reference = references[vendor.internalId] || vendor.entityId
    const terms = state.terms.find((row) => row.id === vendor.termsId)
    return header('vendorBill', 1101 + i, bill.date, {
      vendorId: vendor.id, locationId: bill.locationId, departmentId: 'dept_4', transactionNumber: `BILL${1101 + i}`,
      tranId: `${reference}-${88412 + (i - 1) * 71}`, createdFromId: bill.createdFromId || null, createdFromType: bill.createdFromId ? 'purchaseOrder' : null,
      termsId: terms.id, dueDate: plusDays(bill.date, terms.days), apAccountId: 'acct_2000',
      status: bill.paid ? 'Paid In Full' : 'Open', lines: bill.lines, expenses: bill.expenses, total: bill.total,
      amountPaid: bill.paid ? bill.total : 0, amountRemaining: bill.paid ? 0 : bill.total,
    })
  })
  const vendorPayments = vendorBills.filter((bill) => bill.status === 'Paid In Full').map((bill, i) =>
    header('vendorPayment', 1201 + i, plusDays(bill.tranDate, 25), {
      vendorId: bill.vendorId, locationId: bill.locationId, accountId: 'acct_1000', paymentMethodId: 'pm_ach',
      checkNum: '', status: 'Cleared', total: bill.total, applied: [{ billId: bill.id, amount: bill.total }],
    }))
  const itemBySku = (sku) => state.items.find((item) => item.id === itemIdFor(sku))
  const inventoryAdjustments = adjustmentFixtures.map(([num, date, locationId, account, items, memo]) => {
    const lines = items.map(([sku, adjustQtyBy], i) => {
      const item = itemBySku(sku)
      const newQuantity = itemStock(item, locationId).onHand
      return {
        lineId: `l${i + 1}`, line: i + 1, itemId: item.id, locationId, units: item.stockUnit,
        quantityOnHandBefore: newQuantity - adjustQtyBy, adjustQtyBy, newQuantity, unitCost: item.averageCost, memo: '',
      }
    })
    return header('inventoryAdjustment', num, in2026(date), {
      status: 'Posted', accountId: `acct_${account}`, adjustmentLocationId: locationId, locationId, customerId: null, memo,
      lines, estimatedTotalValue: round(sum(lines, (line) => line.adjustQtyBy * line.unitCost)),
    })
  })
  const inventoryTransfers = transferFixtures.map(([date, from, to, items, memo = ''], index) =>
    header('inventoryTransfer', 1011 + index, in2026(date), {
      status: 'Posted', fromLocationId: from, toLocationId: to, locationId: from, memo,
      lines: items.map(([sku, quantity], i) => {
        const item = itemBySku(sku)
        return {
          lineId: `l${i + 1}`, line: i + 1, itemId: item.id, description: item.displayName, units: item.stockUnit,
          quantityOnHandFrom: Math.max(quantity, itemStock(item, from).onHand), quantity,
        }
      }),
    }))
  return { purchaseOrders, itemReceipts, vendorBills, vendorPayments, inventoryAdjustments, inventoryTransfers }
}
