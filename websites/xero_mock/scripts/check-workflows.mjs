import assert from 'node:assert/strict';
import { createInitialData } from '../src/data/seed.js';
import { reduceAction } from '../src/store/reducer.js';
import { suggestionFor, unreconciledCount } from '../src/utils/reconcile.js';
import { buildReport, buildBalanceSheet, buildTrialBalance, buildBankRecSummary, periods, buildJournal } from '../src/utils/ledger.js';
let s = createInitialData();
const act = a => {
    s = reduceAction(s, a);
  },
  line = id => s.bankStatementLines.find(l => l.id === id),
  checkLedger = () => {
    const b = buildBalanceSheet(s, {
        asAtDate: '2026-12-31'
      }).summary,
      t = buildTrialBalance(s, {
        asAtDate: '2026-12-31'
      }).summary;
    assert.equal(b.netAssets, b.totalEquity);
    assert.equal(t.totalDebits, t.totalCredits);
    for (const bank of s.bankAccounts) assert.equal(buildBankRecSummary(s, {
      bankAccountId: bank.id,
      asAtDate: '2026-12-31'
    }).rows.at(-1).amounts[0], 0);
  };
const doc = {
  contactId: 'con_c01',
  date: '2026-11-18',
  dueDate: '2026-12-18',
  invoiceNumber: 'INV-0047',
  reference: 'Winter campaign',
  lineAmountTypes: 'Exclusive',
  lineItems: [{
    description: 'Campaign design',
    quantity: 2,
    unitAmount: 750,
    accountCode: '200',
    taxType: 'OUTPUT2'
  }]
};
for (const [kind, key] of [['invoice', 'invoices'], ['bill', 'bills']]) {
  for (const status of ['AUTHORISED', 'SUBMITTED']) {
    const original = createInitialData();
    const document = original[key].find(d => d.status === status && !d.amountPaid);
    const prefix = status === 'AUTHORISED' ? 'approved' : 'submitted';
    document[`${prefix}At`] = '2026-08-24T10:00:00.000Z';
    document[`${prefix}By`] = 'usr_tom';
    const edited = reduceAction(original, {
      type: 'saveDocument', kind, id: document.id,
      data: { ...document, reference: 'Updated reference' }
    });
    const saved = edited[key].find(d => d.id === document.id);
    assert.equal(saved[`${prefix}At`], document[`${prefix}At`]);
    assert.equal(saved[`${prefix}By`], 'usr_tom');
    assert.equal(saved.reference, 'Updated reference');
    assert.equal(saved.updatedBy, original.currentUser.id);
    assert(Number.isFinite(Date.parse(saved.updatedAt)));
    assert.equal(edited.historyEvents.at(-1).action, 'Edited');
    assert.equal(edited.historyEvents.length, original.historyEvents.length + 1);

    for (const from of status === 'AUTHORISED' ? ['DRAFT', 'SUBMITTED'] : ['DRAFT']) {
      const document = original[key].find(d => d.status === from);
      const transitioned = reduceAction(original, {
        type: 'saveDocument', kind, id: document.id, data: document, status
      });
      const saved = transitioned[key].find(d => d.id === document.id);
      assert.equal(saved.status, status);
      assert.equal(saved[`${prefix}By`], original.currentUser.id);
      assert(Number.isFinite(Date.parse(saved[`${prefix}At`])));
      const events = transitioned.historyEvents.slice(original.historyEvents.length);
      assert.deepEqual(events.map(e => e.action), ['Edited', status === 'AUTHORISED' ? 'Approved' : 'Submitted']);
      for (const event of events) {
        assert.equal(event.entityType, kind);
        assert.equal(event.entityId, document.id);
        assert.equal(event.userId, original.currentUser.id);
        assert.equal(event.createdAt, saved[`${prefix}At`]);
      }
    }
  }
}
console.log('PASS: invoice/bill edits preserve approval/submission metadata; status transitions record their history, actor and time');
act({
  type: 'saveDocument',
  newId: 'inv_workflow',
  data: doc,
  status: 'AUTHORISED'
});
assert.equal(s.organisation.invoiceSettings.nextInvoiceNumber, 48);
act({
  type: 'email',
  id: 'inv_workflow',
  data: {
    to: ['accounts@ridgeway.ac.uk'],
    subject: 'November campaign',
    body: 'Please find your invoice attached.',
    attachPdf: true
  }
});
assert.equal(s.emailLog.at(-1).documentId, 'inv_workflow');
act({
  type: 'payment',
  data: {
    documentType: 'invoice',
    documentId: 'inv_workflow',
    bankAccountId: 'ba_090',
    date: '2026-11-18',
    amount: 1800
  }
});
assert.equal(s.invoices.at(-1).status, 'PAID');
act({
  type: 'removePayment',
  id: s.payments.at(-1).id
});
assert.equal(s.invoices.at(-1).amountDue, 1800);
for (const suffix of ['01', '02', '03', '08', '12', '13', '17']) {
  const l = line(`bsl_090_U${suffix}`),
    c = suggestionFor(s, l);
  assert(c, l.id);
  act({
    type: 'reconcile',
    id: l.id,
    data: {
      method: 'match',
      selected: [{
        id: c.id,
        kind: c.kind,
        amount: c.amount
      }]
    }
  });
}
act({
  type: 'reconcile',
  id: 'bsl_090_U04',
  data: {
    method: 'findmatch',
    selected: [{
      id: 'inv_0028',
      kind: 'invoice',
      amount: 1170
    }, {
      id: 'inv_0030',
      kind: 'invoice',
      amount: 1800
    }]
  }
});
act({
  type: 'reconcile',
  id: 'bsl_090_U09',
  data: {
    method: 'findmatch',
    selected: [{
      id: 'inv_0029',
      kind: 'invoice',
      amount: 1500
    }],
    adjustments: [{
      kind: 'bankFee',
      amount: -6
    }]
  }
});
act({
  type: 'reconcile',
  id: 'bsl_090_U11',
  data: {
    method: 'findmatch',
    selected: [{
      id: 'inv_0024',
      kind: 'invoice',
      amount: 600
    }]
  }
});
assert.equal(s.invoices.find(d => d.id === 'inv_0024').amountDue, 840);
act({
  type: 'reconcile',
  id: 'bsl_090_U05',
  data: {
    method: 'create',
    contactId: 'con_s12',
    accountCode: '404',
    taxType: 'NONE',
    description: 'November bank fee'
  }
});
act({
  type: 'reconcile',
  id: 'bsl_090_U07',
  data: {
    method: 'create',
    contactName: 'Pret A Manger',
    accountCode: '420',
    taxType: 'INPUT2',
    description: 'Client meeting'
  }
});
assert(s.contacts.some(c => c.name === 'Pret A Manger'));
act({
  type: 'reconcile',
  id: 'bsl_090_U06',
  data: {
    method: 'transfer',
    otherBankAccountId: 'ba_091',
    description: 'Savings transfer'
  }
});
let c = suggestionFor(s, line('bsl_091_U02'));
assert.equal(c.kind, 'bankTransfer');
act({
  type: 'reconcile',
  id: 'bsl_091_U02',
  data: {
    method: 'match',
    selected: [{
      id: c.id,
      kind: c.kind,
      amount: c.amount
    }]
  }
});
assert.equal(suggestionFor(s, line('bsl_090_U14')), null);
act({
  type: 'documentAction',
  kind: 'invoice',
  id: 'inv_0036',
  event: 'approve'
});
assert.equal(suggestionFor(s, line('bsl_090_U14')).id, 'inv_0036');
act({
  type: 'discuss',
  id: 'bsl_090_U14',
  note: 'Waiting for remittance'
});
assert.equal(line('bsl_090_U14').discussNote, 'Waiting for remittance');
act({
  type: 'unreconcile',
  id: 'bsl_090_U01'
});
assert.equal(line('bsl_090_U01').status, 'unreconciled');
const p = s.payments.find(p => p.documentId === 'inv_0031');
assert.equal(p.isReconciled, false);
act({
  type: 'removePayment',
  id: p.id
});
assert.equal(s.invoices.find(d => d.id === 'inv_0031').amountDue, 1800);
act({
  type: 'saveDocument',
  kind: 'bill',
  newId: 'bill_workflow',
  data: {
    ...doc,
    contactId: 'con_s01',
    invoiceNumber: 'INV-0048',
    reference: 'NC-WINTER',
    lineItems: [{
      description: 'Broadband',
      quantity: 1,
      unitAmount: 45,
      accountCode: '489',
      taxType: 'INPUT2'
    }]
  },
  status: 'AUTHORISED'
});
assert.equal(s.bills.at(-1).invoiceNumber, '');
assert.equal(s.organisation.invoiceSettings.nextInvoiceNumber, 48);
assert.equal(s.historyEvents.findLast(e => e.entityId === 'bill_workflow' && e.action === 'Created').details, 'NC-WINTER');
for (const [documentType, documentId, expected] of [['bill', 'bill_workflow', 'Payment made'], ['invoice', 'inv_workflow', 'Payment received']]) {
  const partial = reduceAction(s, {
    type: 'payment',
    data: { documentType, documentId, bankAccountId: 'ba_090', date: '2026-11-18', amount: 1 }
  });
  assert.equal(partial.historyEvents.at(-1).action, expected);
  if (documentType === 'bill') assert.equal(partial.payments.at(-1).documentNumber, 'NC-WINTER');
}
const nextInvoice = reduceAction(s, {
  type: 'saveDocument', newId: 'inv_after_bill', data: { ...doc, invoiceNumber: 'INV-0048' }, status: 'DRAFT'
});
assert.equal(nextInvoice.invoices.at(-1).invoiceNumber, 'INV-0048');
assert.equal(nextInvoice.organisation.invoiceSettings.nextInvoiceNumber, 49);
const bills = s.bills.filter(b => b.status === 'AUTHORISED').slice(-2);
act({
  type: 'batch',
  newId: 'bp_workflow',
  data: {
    bankAccountId: 'ba_090',
    date: '2026-11-18',
    reference: 'November suppliers',
    rows: bills.map(b => ({
      documentId: b.id,
      amount: b.amountDue
    }))
  }
});
assert(bills.every(b => s.bills.find(d => d.id === b.id).status === 'PAID'));
assert.equal(s.batchPayments.at(-1).paymentIds.length, 2);
const settings = {
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
    asAtDate: '2026-10-31',
    compare: {
      periods: 2,
      periodType: 'month'
    },
    basis: 'accrual'
  },
  report = buildReport(s, 'ProfitAndLoss', settings);
assert.equal(report.columns.length, 3);
act({
  type: 'saveReport',
  newId: 'rep_workflow',
  data: {
    reportType: 'ProfitAndLoss',
    title: 'October performance',
    status: 'draft',
    settings,
    columns: report.columns,
    rows: report.rows,
    summary: report.summary
  }
});
const snapshot = JSON.stringify(s.savedReports.at(-1).rows);
for (const [event, label] of [['edit', 'Edited'], ['refresh', 'Refreshed']]) {
  act({ type: 'reportAction', id: 'rep_workflow', event, data: { note: 'Reviewed October performance' } });
  assert.equal(s.historyEvents.at(-1).action, label);
}
act({
  type: 'reportAction',
  id: 'rep_workflow',
  event: 'publish'
});
assert.equal(s.savedReports.at(-1).status, 'published');
assert.equal(JSON.stringify(s.savedReports.at(-1).rows), snapshot);
assert.equal(s.historyEvents.at(-1).action, 'Published');
for (const [event, label, status] of [['archive', 'Archived', 'archived'], ['restore', 'Restored', 'published']]) {
  act({ type: 'reportAction', id: 'rep_workflow', event });
  assert.equal(s.historyEvents.at(-1).action, label);
  assert.equal(s.savedReports.at(-1).status, status);
}
act({
  type: 'exportReport',
  data: {
    reportType: 'ProfitAndLoss',
    format: 'Excel',
    settings,
    summary: report.summary
  }
});
assert.equal(s.reportExports.at(-1).format, 'Excel');
act({
  type: 'favourite',
  id: 'TrialBalance'
});
assert(s.favouriteReports.includes('TrialBalance'));
assert.throws(() => reduceAction(s, {
  type: 'payment',
  data: {
    documentType: 'invoice',
    documentId: 'inv_0031',
    bankAccountId: 'ba_090',
    amount: 1801,
    date: '2026-11-18'
  }
}), /Payment amount/);
assert.throws(() => reduceAction(s, {
  type: 'contactAction',
  id: 'con_c01',
  event: 'archive'
}), /outstanding/);
assert.throws(() => reduceAction(s, {
  type: 'saveDocument',
  data: doc,
  status: 'AUTHORISED'
}), /already exists/);
checkLedger();
assert.deepEqual(reduceAction(s, {
  type: 'unknown'
}), s);
JSON.stringify(s);
console.log('PASS: invoices, email, payments/removal, bills/batch, all reconciliation modes, partial payment, adjustment, transfer matching, discussion, report snapshots/publishing/export, validation, balanced ledger');
const reportPeriods = periods({
  fromDate: '2026-10-01',
  toDate: '2026-10-31',
  asAtDate: '2026-11-18',
  compare: {
    periods: 2,
    periodType: 'month'
  }
});
assert.equal(reportPeriods[0].to, '2026-10-31');
assert.equal(reportPeriods[1].to, '2026-09-30');
const rounding = createInitialData();
const mult = rounding.invoices.find(d => d.id === 'inv_0012');
rounding.invoices = [{
  ...mult,
  status: 'AUTHORISED'
}];
rounding.payments = [{
  id: 'rounding_payment',
  type: 'ACCRECPAYMENT',
  documentId: mult.id,
  bankAccountId: 'ba_090',
  date: '2026-11-18',
  amount: .08,
  status: 'AUTHORISED'
}];
const entries = buildJournal(rounding, 'cash').filter(r => r.sourceId === mult.id);
assert.equal(Math.round(entries.reduce((n, r) => n + r.debit - r.credit, 0) * 100), 0);
console.log('PASS: report periods ignore unrelated as-at dates; cash allocations remain balanced to the penny');

console.log('PASS: bill numbering/reference integrity, payment direction, and saved-report history labels');
