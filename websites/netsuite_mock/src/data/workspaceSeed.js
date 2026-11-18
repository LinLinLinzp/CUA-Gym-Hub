import { documentNo } from '../utils/model.js'
import { when } from './transactionSeed.js'

export function workspaceSeed(state) {
  const noteFixtures = [
    ['customer', 'cust_1001', 'Preferred receiving window', 'Deliver to the north loading dock before 2 p.m.'],
    ['customer', 'cust_1009', 'Credit review requested', 'Confirm the open installation invoice before approving a new resale order.'],
    ['customer', 'cust_1013', 'Columbus plant maintenance', 'Coordinate bearing and fastener deliveries with the maintenance supervisor.'],
    ['customer', 'cust_1038', 'Cold storage receiving', 'Provide a tracking number to receiving for all parcel shipments.'],
    ['vendor', 'vend_2001', 'Pump lead times', 'Standard cast iron units ship from Wichita in ten business days.'],
    ['salesOrder', 'so_10442', 'Anchor stock check', 'Review the expected replenishment before scheduling fulfillment.'],
    ['salesOrder', 'so_10447', 'LTL appointment', 'Call the Fresno warehouse to confirm the unloading appointment.'],
    ['purchaseOrder', 'po_4521', 'Incoming anchor shipment', 'Warehouse team will inspect the anchor and socket screw quantities on arrival.'],
  ]
  const userNotes = noteFixtures.map(([recordType, recordId, title, memo], i) => ({
    id: `note_${i + 1}`, recordType, recordId, title, memo, noteType: 'Note', direction: 'Incoming',
    authorId: `emp_${101 + i % 5}`, createdAt: '2026-11-17T18:00:00.000Z',
  }))
  const taskFixtures = [
    ['Call Reno Mining Supply re: credit limit', 'emp_104', 'High', 'cust_1009', 'so_10452'],
    ['Confirm anchor delivery date', 'emp_105', 'High', null, 'po_4521'],
    ['Schedule Fresno LTL appointment', 'emp_102', 'Medium', 'cust_1027', 'so_10447'],
    ['Review service invoice balance', 'emp_108', 'Medium', 'cust_1001', 'inv_20897'],
    ['Update pump receiving forecast', 'emp_107', 'Medium', null, 'po_4520'],
    ['Follow up with City of Bend', 'emp_108', 'Medium', 'cust_1021', 'inv_20888'],
    ['Prepare Columbus warehouse variance review', 'emp_101', 'Low', null, 'adj_1044'],
    ['Review Toledo hardware quote', 'emp_103', 'Low', 'cust_1029', 'so_10453'],
    ['Confirm carton counts for Power Transmission', 'emp_106', 'Medium', null, 'po_4517'],
    ['Check remittance for Evergreen Office', 'emp_109', 'Low', null, 'bill_1114'],
  ]
  const tasks = taskFixtures.map(([title, assignedToId, priority, companyId, transactionId], i) => ({
    id: `task_${3001 + i}`, internalId: 3001 + i, title, assignedToId, priority, companyId, transactionId,
    status: i === 9 ? 'Completed' : i % 3 === 1 ? 'In Progress' : 'Not Started', startDate: '2026-11-17',
    dueDate: `2026-11-${19 + i}`, message: '', createdAt: '2026-11-17T18:00:00.000Z', createdById: 'emp_101',
  }))

  const systemNotes = []
  function add(recordType, record, type, field, oldValue, newValue, date) {
    systemNotes.push({
      id: `sn_${systemNotes.length + 1}`, recordType, recordId: record.id, type, field, oldValue, newValue, date, createdAt: date,
      setById: type === 'Create' ? record.createdById || 'emp_101' : 'emp_101', context: 'UI',
    })
  }
  const keys = [
    ['customers', 'customer'], ['vendors', 'vendor'], ['items', 'item'], ['salesOrders', 'salesOrder'],
    ['itemFulfillments', 'itemFulfillment'], ['invoices', 'invoice'], ['customerPayments', 'customerPayment'],
    ['purchaseOrders', 'purchaseOrder'], ['itemReceipts', 'itemReceipt'], ['vendorBills', 'vendorBill'], ['vendorPayments', 'vendorPayment'],
    ['inventoryAdjustments', 'inventoryAdjustment'], ['inventoryTransfers', 'inventoryTransfer'],
  ]
  for (const [key, type] of keys) for (const record of state[key]) {
    add(type, record, 'Create', 'Record', null, documentNo(record), record.createdAt)
    const initial = { salesOrder: 'Pending Approval', purchaseOrder: 'Pending Supervisor Approval' }[type]
    if (initial && record.status !== initial) {
      const date = record.cancelledAt || record.closedAt || record.approvedAt || record.rejectedAt || when(record.tranDate, '18')
      add(type, record, 'Status', 'Status', initial, record.status, date)
    }
  }
  return { systemNotes, userNotes, tasks }
}
