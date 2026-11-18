import assert from 'node:assert/strict';
import { createInitialData } from '../src/data/seed.js';
import { reduceAction } from '../src/store/reducer.js';
import { buildReport, buildBalanceSheet, buildTrialBalance } from '../src/utils/ledger.js';
import { ruleFor } from '../src/utils/reconcile.js';
import { displayStatus } from '../src/utils/status.js';
let s = createInitialData();
const act = a => {
    s = reduceAction(s, a);
  },
  data = {
    contactId: 'con_c01',
    date: '2026-11-18',
    expiryDate: '2026-12-18',
    deliveryDate: '2026-12-01',
    reference: 'Winter project',
    lineAmountTypes: 'Exclusive',
    lineItems: [{
      description: 'Creative package',
      quantity: 1,
      unitAmount: 750,
      accountCode: '200',
      taxType: 'OUTPUT2'
    }]
  };
for (const type of ['ACCRECCREDIT', 'ACCPAYCREDIT']) {
  assert.equal(displayStatus({ type, status: 'AUTHORISED', dueDate: '2026-01-01', amountDue: 60 }, '2026-11-18'), 'Awaiting Payment');
}
assert.equal(displayStatus({ status: 'AUTHORISED', dueDate: '2026-01-01', amountDue: 60 }, '2026-11-18', 'creditNote'), 'Awaiting Payment');
assert.equal(displayStatus({ status: 'AUTHORISED', dueDate: '2026-01-01', amountDue: 60 }, '2026-11-18'), 'Overdue');
const seededPaidCredit = s.creditNotes.find(c => c.id === 'cn_0002');
assert.equal(seededPaidCredit.status, 'PAID');
assert.equal(seededPaidCredit.amountDue, 0);
assert.equal(seededPaidCredit.fullyPaidOnDate, '2026-06-10');
const legacyPaidCredit = { ...seededPaidCredit, status: 'AUTHORISED', amountDue: 60, fullyPaidOnDate: null };
assert.equal(displayStatus(legacyPaidCredit, '2026-11-18', 'creditNote'), 'Paid');
for (const [kind, key, id, link] of [['quote', 'quotes', 'qu_0005', 'invoiceId'], ['purchaseOrder', 'purchaseOrders', 'po_0004', 'billId']]) {
  for (const missingLink of [false, true]) {
    const world = structuredClone(s);
    if (missingLink) delete world[key].find(d => d.id === id)[link];
    const beforeConversion = structuredClone(world);
    assert.throws(() => reduceAction(world, {
      type: 'secondaryAction', kind, id, event: 'convert', date: '2026-11-18'
    }), /already been converted/);
    assert.deepEqual(world, beforeConversion, 'Rejected conversion must leave all state unchanged');
  }
}
act({
  type: 'secondarySave',
  kind: 'quote',
  newId: 'qu_secondary',
  data,
  status: 'DRAFT'
});
assert.equal(s.quotes.at(-1).quoteNumber, 'QU-0007');
act({
  type: 'secondaryAction',
  kind: 'quote',
  id: 'qu_secondary',
  event: 'send',
  data: {
    to: ['accounts@ridgeway.ac.uk'],
    subject: 'Winter project',
    body: 'Please review.'
  }
});
assert.equal(s.quotes.at(-1).status, 'SENT');
assert.equal(s.historyEvents.at(-1).action, 'Sent');
act({
  type: 'secondaryAction',
  kind: 'quote',
  id: 'qu_secondary',
  event: 'ACCEPTED'
});
assert.equal(s.historyEvents.at(-1).action, 'Accepted');
act({
  type: 'secondaryAction',
  kind: 'quote',
  id: 'qu_secondary',
  event: 'convert',
  newId: 'inv_from_quote',
  date: '2026-11-18'
});
assert.equal(s.quotes.at(-1).invoiceId, 'inv_from_quote');
assert.equal(s.invoices.at(-1).status, 'DRAFT');
assert.equal(s.historyEvents.at(-1).action, 'Invoiced');
assert.equal(s.historyEvents.at(-1).details, 'inv_from_quote');
assert.throws(() => reduceAction(s, { type: 'secondaryAction', kind: 'quote', id: 'qu_secondary', event: 'convert' }), /already been converted/);
act({
  type: 'secondarySave',
  kind: 'purchaseOrder',
  newId: 'po_secondary',
  data: {
    ...data,
    contactId: 'con_s06',
    lineItems: [{
      ...data.lineItems[0],
      accountCode: '453',
      taxType: 'INPUT2'
    }]
  },
  status: 'AUTHORISED'
});
assert.deepEqual(s.historyEvents.filter(h => h.entityId === 'po_secondary').map(h => h.action), ['Created', 'Approved']);
act({
  type: 'secondaryAction',
  kind: 'purchaseOrder',
  id: 'po_secondary',
  event: 'convert',
  newId: 'bill_from_po',
  date: '2026-11-18'
});
assert.equal(s.purchaseOrders.at(-1).billId, 'bill_from_po');
assert.equal(displayStatus({ ...s.bills.at(-1), status: 'AUTHORISED' }, '2026-11-18'), 'Awaiting Payment', 'Copied bills retain bill status wording despite carrying purchase order metadata');
assert.equal(s.historyEvents.at(-1).action, 'Copied to bill');
assert.equal(s.historyEvents.at(-1).details, 'bill_from_po');
assert.throws(() => reduceAction(s, { type: 'secondaryAction', kind: 'purchaseOrder', id: 'po_secondary', event: 'convert' }), /already been converted/);
act({
  type: 'secondarySave',
  kind: 'creditNote',
  newId: 'cn_secondary',
  data: {
    ...data,
    type: 'ACCRECCREDIT',
    lineItems: [{
      description: 'Courtesy credit',
      quantity: 1,
      unitAmount: 50,
      accountCode: '200',
      taxType: 'OUTPUT2'
    }]
  },
  status: 'AUTHORISED'
});
assert.deepEqual(s.historyEvents.filter(h => h.entityId === 'cn_secondary').map(h => h.action), ['Created', 'Approved']);
for (const [kind, key] of [['creditNote', 'creditNotes'], ['purchaseOrder', 'purchaseOrders']]) {
  let world = createInitialData();
  const id = `${kind}_history`;
  const save = status => {
    world = reduceAction(world, { type: 'secondarySave', kind, id, newId: id, data, status });
  };
  save('DRAFT');
  save('SUBMITTED');
  save('SUBMITTED');
  save('AUTHORISED');
  save('AUTHORISED');
  const events = world.historyEvents.filter(h => h.entityId === id);
  assert.deepEqual(events.map(h => h.action), ['Created', 'Edited', 'Submitted', 'Edited', 'Edited', 'Approved', 'Edited']);
  assert(events.every(h => h.entityType === kind && h.userId === world.currentUser.id && Number.isFinite(Date.parse(h.createdAt))));
  assert.equal(world[key].find(d => d.id === id).status, 'AUTHORISED');
}
for (const [kind, id, event, label] of [['quote', 'qu_0002', 'DECLINED', 'Declined'], ['purchaseOrder', 'po_0001', 'AUTHORISED', 'Approved'], ['creditNote', 'cn_0001', 'AUTHORISED', 'Approved'], ['quote', 'qu_0001', 'delete', 'Deleted']]) {
  const world = reduceAction(createInitialData(), { type: 'secondaryAction', kind, id, event });
  assert.equal(world.historyEvents.at(-1).action, label);
  assert.equal(world.historyEvents.at(-1).entityId, id);
}
act({
  type: 'allocateCredit',
  id: 'cn_secondary',
  date: '2026-11-18',
  allocations: [{
    invoiceId: 'inv_0031',
    amount: 20
  }]
});
assert.equal(s.creditNotes.at(-1).status, 'AUTHORISED');
assert.equal(s.creditNotes.at(-1).remainingCredit, 40);
assert.equal(s.creditNotes.at(-1).amountDue, 40);
const beforeInvalidAllocation = structuredClone(s);
assert.throws(() => reduceAction(s, {
  type: 'allocateCredit', id: 'cn_secondary', date: '2026-11-18',
  allocations: [{ invoiceId: 'inv_0031', amount: 41 }]
}), /remaining credit/);
assert.deepEqual(s, beforeInvalidAllocation);
act({
  type: 'allocateCredit', id: 'cn_secondary', date: '2026-11-19',
  allocations: [{ invoiceId: 'inv_0031', amount: 40 }]
});
assert.equal(s.invoices.find(i => i.id === 'inv_0031').amountDue, 1740);
assert.equal(s.creditNotes.at(-1).remainingCredit, 0);
assert.equal(s.creditNotes.at(-1).amountDue, 0);
assert.equal(s.creditNotes.at(-1).status, 'PAID');
assert.equal(s.creditNotes.at(-1).fullyPaidOnDate, '2026-11-19');
assert.equal(displayStatus(s.creditNotes.at(-1), '2026-11-20', 'creditNote'), 'Paid');
assert.equal(s.creditNotes.at(-1).updatedBy, s.currentUser.id);
assert(Number.isFinite(Date.parse(s.creditNotes.at(-1).updatedAt)));
const creditHistory = s.historyEvents.filter(h => h.entityType === 'creditNote' && h.entityId === 'cn_secondary' && h.action === 'Credit allocated');
assert.equal(creditHistory.length, 2);
assert(creditHistory[0].details.includes('inv_0031') && creditHistory[0].details.includes('20'));
assert(creditHistory[1].details.includes('inv_0031') && creditHistory[1].details.includes('40'));
assert(creditHistory.every(h => h.userId === s.currentUser.id && Number.isFinite(Date.parse(h.createdAt))));
assert.throws(() => reduceAction(s, {
  type: 'allocateCredit', id: 'cn_secondary', date: '2026-11-19',
  allocations: [{ invoiceId: 'inv_0031', amount: 1 }]
}), /approved sales credit note/);
act({
  type: 'secondarySave', kind: 'creditNote', newId: 'cn_copied',
  data: s.creditNotes.at(-1), status: 'DRAFT'
});
assert.equal(s.creditNotes.at(-1).status, 'DRAFT');
assert.equal(s.creditNotes.at(-1).amountDue, 60);
assert.equal(s.creditNotes.at(-1).fullyPaidOnDate, null);
assert.deepEqual(s.creditNotes.at(-1).allocations, []);
act({
  type: 'repeatingAction',
  id: 'ri_0001',
  event: 'generate',
  date: '2026-11-18',
  newId: 'inv_repeating'
});
assert.equal(s.repeatingInvoices[0].schedule.nextScheduledDate, '2027-01-01');
assert.equal(s.invoices.at(-1).id, 'inv_repeating');
act({
  type: 'saveJournal',
  newId: 'mj_secondary',
  data: {
    narration: 'Office equipment depreciation',
    date: '2026-11-18',
    status: 'POSTED',
    lines: [{
      accountCode: '416',
      debit: 100,
      credit: 0
    }, {
      accountCode: '721',
      debit: 0,
      credit: 100
    }]
  }
});
assert.equal(s.manualJournals.at(-1).status, 'POSTED');
assert.throws(() => reduceAction(s, {
  type: 'saveJournal',
  data: {
    narration: 'Unbalanced',
    date: '2026-11-18',
    lines: [{
      accountCode: '416',
      debit: 100,
      credit: 0
    }]
  }
}), /out by/);
const rule = ruleFor(s, s.bankStatementLines.find(l => l.id === 'bsl_090_U05'));
assert.equal(rule.id, 'rule_001');
act({
  type: 'reconcile',
  id: 'bsl_090_U05',
  data: {
    method: 'create',
    contactId: rule.contactId,
    accountCode: '404',
    taxType: 'NONE',
    description: 'Bank fee',
    bankRuleId: rule.id
  }
});
assert.equal(s.bankTransactions.at(-1).source, 'bank-rule');
assert.equal(s.bankTransactions.at(-1).bankRuleId, 'rule_001');
act({
  type: 'cashCode',
  rows: [{
    id: 'bsl_090_U07',
    contactName: 'Pret A Manger',
    accountCode: '420',
    taxType: 'INPUT2',
    description: 'Client meeting'
  }, {
    id: 'bsl_090_U10',
    contactName: 'LinkedIn',
    accountCode: '400',
    taxType: 'INPUT2',
    description: 'Advertising'
  }]
});
assert.equal(s.bankStatementLines.find(l => l.id === 'bsl_090_U10').status, 'reconciled');
act({
  type: 'statementStatus',
  id: 'bsl_090_U18',
  status: 'deleted'
});
act({
  type: 'statementStatus',
  id: 'bsl_090_U18',
  status: 'unreconciled'
});
const imported = {
    date: '2026-11-18',
    amount: -12.4,
    payee: 'Local Supplies',
    reference: 'LS-18',
    description: 'Stationery'
  },
  before = s.bankStatementLines.length;
act({
  type: 'importStatements',
  bankAccountId: 'ba_090',
  rows: [imported, imported]
});
assert.equal(s.bankStatementLines.length, before + 1);
assert.equal(s.bankStatementLines.at(-1).source, 'import');
const settings = {
  fromDate: '2026-10-01',
  toDate: '2026-10-31',
  asAtDate: '2026-10-31',
  basis: 'cash',
  compare: {
    periods: 0
  }
};
for (const type of ['VatReturn', 'ExecutiveSummary', 'GeneralLedgerSummary']) assert(buildReport(s, type, settings).rows.length > 0, type);
const bs = buildBalanceSheet(s, settings).summary,
  tb = buildTrialBalance(s, settings).summary;
assert.equal(bs.netAssets, bs.totalEquity);
assert.equal(tb.totalDebits, tb.totalCredits);
act({
  type: 'saveSettings',
  data: {
    phone: '020 7946 9999'
  }
});
assert.equal(s.organisation.phone, '020 7946 9999');
act({
  type: 'saveTaxRate',
  data: {
    name: 'Special rate',
    rate: 7.5,
    appliesTo: 'sales'
  }
});
assert.equal(s.taxRates.at(-1).rate, 7.5);
act({
  type: 'trackingOption',
  id: 'trk_dept',
  name: 'Operations'
});
assert.equal(s.trackingCategories[0].options.at(-1).name, 'Operations');
act({
  type: 'dashboardLayout',
  data: {
    widgets: ['profitLoss', 'bank_ba_090'],
    hidden: ['tasks']
  }
});
assert.equal(s.dashboardLayout.widgets[0], 'profitLoss');
act({
  type: 'attachments',
  kind: 'invoice',
  id: 'inv_0031',
  files: [{
    url: '/files/demo/receipt.pdf',
    original_name: 'receipt.pdf',
    size: 200,
    content_type: 'application/pdf'
  }]
});
assert.equal(s.invoices.find(i => i.id === 'inv_0031').attachments.length, 1);
act({
  type: 'saveAccount',
  data: {
    code: '496',
    name: 'Conference costs',
    type: 'OVERHEADS',
    class: 'EXPENSE',
    taxType: 'INPUT2'
  }
});
assert.equal(s.accounts.at(-1).code, '496');
act({
  type: 'schedule',
  id: s.bills.find(b => b.status === 'AUTHORISED').id,
  date: '2026-11-25'
});
act({
  type: 'removeBatch',
  id: 'bp_0001'
});
assert.equal(s.batchPayments[0].status, 'DELETED');
const originalBatch = createInitialData().batchPayments[0];
const deletedBatch = s.batchPayments[0];
assert.deepEqual(deletedBatch.billIds, originalBatch.billIds);
assert.deepEqual(deletedBatch.paymentIds, originalBatch.paymentIds);
assert.equal(deletedBatch.total, originalBatch.total);
assert.equal(deletedBatch.deletedBy, s.currentUser.id);
assert(Number.isFinite(Date.parse(deletedBatch.deletedAt)));
assert.equal(deletedBatch.isReconciled, false);
assert(originalBatch.paymentIds.every(id => s.payments.find(p => p.id === id).status === 'DELETED'));
assert.equal(s.bankStatementLines.find(l => l.id === originalBatch.statementLineId).status, 'unreconciled');
const repeatedRemoval = reduceAction(s, { type: 'removeBatch', id: deletedBatch.id });
assert.deepEqual(repeatedRemoval.batchPayments[0], deletedBatch);
assert.equal(repeatedRemoval.historyEvents.length, s.historyEvents.length);
const partial = reduceAction(createInitialData(), { type: 'removePayment', id: originalBatch.paymentIds[0] });
const removedPayment = partial.payments.find(p => p.id === originalBatch.paymentIds[0]);
assert.deepEqual(partial.batchPayments[0].paymentIds, originalBatch.paymentIds.slice(1));
assert.deepEqual(partial.batchPayments[0].billIds, originalBatch.billIds.filter(id => id !== removedPayment.documentId));
assert.equal(partial.batchPayments[0].total, Math.round((originalBatch.total - removedPayment.amount) * 100) / 100);
assert.notEqual(partial.batchPayments[0].status, 'DELETED');
assert(s.bills.filter(b => ['CC-Q2-2210', 'OSC-0726'].includes(b.reference)).every(b => b.status === 'AUTHORISED'));
act({
  type: 'addBankAccount',
  newId: 'ba_secondary',
  date: '2026-11-18',
  data: {
    name: 'Tax savings',
    accountNumber: '73920185'
  }
});
assert(s.accounts.some(a => a.bankAccountId === 'ba_secondary'));
console.log('PASS: quote/PO conversion, credit allocation, repeating generation, journal balancing, rule reconciliation, cash coding, import/deduplication, statement status, cash basis, VAT/summary reports, settings, tracking, dashboard, attachments, accounts, batch removal');
