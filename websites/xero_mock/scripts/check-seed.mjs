import assert from 'node:assert/strict';
import { createInitialData } from '../src/data/seed.js';
import { calcDocumentTotals, round2 } from '../src/utils/money.js';
import { buildBalanceSheet, buildTrialBalance, buildBankRecSummary } from '../src/utils/ledger.js';
import { unreconciledCount, suggestionFor } from '../src/utils/reconcile.js';
const s = createInitialData();
for (const [records, status, link, targets] of [[s.quotes, 'INVOICED', 'invoiceId', s.invoices], [s.purchaseOrders, 'BILLED', 'billId', s.bills]]) {
  for (const record of records.filter(d => d.status === status)) {
    const target = targets.find(d => d.id === record[link]);
    assert(target, `${record.id} must link to its converted document`);
    assert.equal(target.contactId, record.contactId);
  }
}
for (const [key, value] of Object.entries(s)) if (Array.isArray(value) && value[0]?.id) assert.equal(new Set(value.map(r => r.id)).size, value.length, key);
for (const credit of s.creditNotes) {
  assert.equal(credit.remainingCredit, round2(credit.total - credit.allocations.reduce((total, a) => total + a.amount, 0)), credit.id);
  assert.equal(credit.amountDue, credit.remainingCredit, credit.id);
  if (credit.remainingCredit === 0) {
    assert.equal(credit.status, 'PAID', credit.id);
    assert.equal(credit.fullyPaidOnDate, credit.allocations.map(a => a.date).sort().at(-1), credit.id);
  }
}
for (const d of [...s.invoices, ...s.bills]) {
  assert.equal(d.total, calcDocumentTotals(d, s.taxRates).total, d.id);
  if (d.status === 'PAID') assert.equal(round2(s.payments.filter(p => p.documentId === d.id).reduce((n, p) => n + p.amount, 0)), round2(d.total - d.amountCredited), d.id);
}
for (const l of s.bankStatementLines.filter(l => l.status === 'reconciled')) {
  assert.equal(round2(l.reconciliation.matched.reduce((n, m) => {
    const key = {
      payment: 'payments',
      bankTransaction: 'bankTransactions',
      bankTransfer: 'bankTransfers',
      batchPayment: 'batchPayments'
    }[m.kind];
    assert(s[key].some(x => x.id === m.id), m.id);
    return n + m.amount;
  }, 0)), Math.abs(l.amount), l.id);
}
const bs = buildBalanceSheet(s, {
  asAtDate: '2026-11-30'
}).summary;
assert.equal(bs.netAssets, bs.totalEquity);
const tb = buildTrialBalance(s, {
  asAtDate: '2026-11-30'
}).summary;
assert.equal(tb.totalDebits, tb.totalCredits);
for (const [id, count] of [['ba_090', 18], ['ba_091', 2], ['ba_092', 5]]) {
  assert.equal(unreconciledCount(s, id), count);
  const r = buildBankRecSummary(s, {
    bankAccountId: id,
    asAtDate: '2026-11-30'
  });
  assert.equal(r.rows.at(-1).amounts[0], 0, id);
}
for (const [suffix, expected] of [['01', 'inv_0031'], ['02', s.bills.find(b => b.reference === 'NC-88213').id], ['03', 'pay_inv0027'], ['08', s.bills.find(b => b.reference === 'RENT-NOV26').id], ['12', s.bills.find(b => b.reference === 'PD-1047721').id], ['13', s.bills.find(b => b.reference === 'CC-Q3-2291').id], ['17', 'inv_0033']]) assert.equal(suggestionFor(s, s.bankStatementLines.find(l => l.id === `bsl_090_U${suffix}`))?.id, expected);
assert.equal(suggestionFor(s, s.bankStatementLines.find(l => l.id === 'bsl_090_U14')), null);
console.log('PASS: seed IDs, document totals, payments, reconciliation links, ledger balance, bank differences and suggestions');
