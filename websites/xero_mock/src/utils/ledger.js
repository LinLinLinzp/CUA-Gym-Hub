import { round2, addDays, iso, fmtDate } from './money.js';
export const fyStart = (date, org = {}) => {
  const end = org.financialYearEnd || {
      month: 3,
      day: 31
    },
    d = new Date(`${date}T12:00:00`),
    year = d.getFullYear() - (d.getMonth() + 1 <= end.month ? 1 : 0);
  return iso(new Date(year, end.month, 1));
};
export function buildJournal(state, basis = 'accrual') {
  const rows = [],
    entry = (record, sourceType, code, debit = 0, credit = 0, date = record.date, tracking = []) => rows.push({
      date,
      tracking,
      accountCode: code || '850',
      debit: round2(debit),
      credit: round2(credit),
      sourceType,
      sourceName: sourceType === 'bankTransaction' ? record.type === 'SPEND' ? 'Spend Money' : 'Receive Money' : {
        invoice: 'Receivable Invoice',
        bill: 'Payable Invoice',
        payment: 'Payment',
        bankTransfer: 'Transfer',
        manualJournal: 'Manual Journal'
      }[sourceType],
      sourceId: record.id,
      contactId: record.contactId,
      description: record.contactName || record.narration || record.description || (record.lineItems || [])[0]?.description || '',
      reference: record.invoiceNumber || record.reference || ''
    });
  const bankCode = id => (state.bankAccounts || []).find(b => b.id === id)?.accountCode || '850';
  function document(d, kind, reverse = false, factor = 1, date = d.date) {
    const sales = kind === 'invoice',
      sign = reverse ? -1 : 1,
      control = sales ? '610' : '800',
      total = round2(d.total * factor) * sign;
    entry(d, kind, control, sales ? total : 0, sales ? 0 : total, date);
    const lines = d.lineItems || [],
      tax = round2(d.totalTax * factor) * sign,
      targetNet = round2(total - tax);
    let allocatedNet = 0;
    for (const [index, l] of lines.entries()) {
      const net = index === lines.length - 1 ? round2(targetNet - allocatedNet) : round2((Number(l.lineAmount || 0) - (d.lineAmountTypes === 'Inclusive' ? Number(l.taxAmount || 0) : 0)) * factor) * sign;
      allocatedNet = round2(allocatedNet + net);
      entry(d, kind, l.accountCode, sales ? 0 : net, sales ? net : 0, date, l.tracking || []);
    }
    entry(d, kind, '820', sales ? 0 : tax, sales ? tax : 0, date);
  }
  for (const [key, kind] of [['invoices', 'invoice'], ['bills', 'bill']]) for (const d of state[key] || []) if (['AUTHORISED', 'PAID'].includes(d.status)) {
    if (basis === 'cash') {
      for (const p of state.payments || []) if (p.documentId === d.id && p.status !== 'DELETED') document(d, kind, false, p.amount / d.total, p.date);
    } else document(d, kind);
  }
  for (const d of state.creditNotes || []) if (['AUTHORISED', 'PAID'].includes(d.status)) document(d, d.type === 'ACCPAYCREDIT' ? 'bill' : 'invoice', true);
  for (const p of state.payments || []) if (p.status !== 'DELETED') {
    const sales = p.type === 'ACCRECPAYMENT',
      bank = bankCode(p.bankAccountId);
    entry(p, 'payment', bank, sales ? p.amount : 0, sales ? 0 : p.amount);
    entry(p, 'payment', sales ? '610' : '800', sales ? 0 : p.amount, sales ? p.amount : 0);
  }
  for (const d of state.bankTransactions || []) if (d.status !== 'DELETED') {
    const receive = d.type === 'RECEIVE';
    entry(d, 'bankTransaction', bankCode(d.bankAccountId), receive ? d.total : 0, receive ? 0 : d.total);
    for (const l of d.lineItems || []) {
      const net = round2(Number(l.lineAmount || 0) - (d.lineAmountTypes === 'Inclusive' ? Number(l.taxAmount || 0) : 0));
      entry(d, 'bankTransaction', l.accountCode, receive ? 0 : net, receive ? net : 0, d.date, l.tracking || []);
    }
    entry(d, 'bankTransaction', '820', receive ? 0 : d.totalTax, receive ? d.totalTax : 0);
  }
  for (const t of state.bankTransfers || []) if (t.status !== 'DELETED') {
    entry(t, 'bankTransfer', bankCode(t.fromBankAccountId), 0, t.amount);
    entry(t, 'bankTransfer', bankCode(t.toBankAccountId), t.amount, 0);
  }
  for (const j of state.manualJournals || []) if (j.status === 'POSTED' && (basis !== 'cash' || j.showOnCashBasis !== false)) for (const l of j.lines || []) entry(j, 'manualJournal', l.accountCode, l.debit, l.credit);
  return rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
const balance = (journal, code, from, to) => round2(journal.filter(r => r.accountCode === code && (!from || r.date >= from) && (!to || r.date <= to)).reduce((s, r) => s + r.debit - r.credit, 0));
export const accountBalance = (state, code, asAt, from) => balance(buildJournal(state), code, from, asAt);
export function periods(settings, asAt = false) {
  const end = asAt ? settings.asAtDate || settings.toDate : settings.toDate || settings.asAtDate,
    begin = settings.fromDate || end,
    items = [{
      from: asAt ? null : begin,
      to: end
    }],
    count = Number(settings.compare?.periods || 0),
    step = {
      month: 1,
      quarter: 3,
      year: 12
    }[settings.compare?.periodType] || 1;
  for (let i = 1; i <= count; i++) {
    const shift = d => {
      const t = new Date(`${d}T12:00:00`),
        day = t.getDate();
      t.setDate(1);
      t.setMonth(t.getMonth() - step * i);
      const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      t.setDate(Math.min(day, last));
      return iso(t);
    };
    const t = new Date(`${end}T12:00:00`),
      monthEnd = t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    let to = shift(end);
    if (monthEnd) {
      const d = new Date(`${to}T12:00:00`);
      to = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }
    items.push({
      from: asAt ? null : shift(begin),
      to
    });
  }
  return items;
}
function result(columns, sections, summary) {
  return {
    columns,
    sections,
    rows: sections.flatMap(s => [...(s.heading === false ? [] : [{
      section: s.title,
      accountName: s.title,
      heading: true,
      amounts: []
    }]), ...s.rows, ...(s.totals || [])]),
    summary
  };
}
export function buildProfitAndLoss(state, settings) {
  const ps = periods(settings),
    journal = buildJournal(state, settings.basis).filter(r => !settings.trackingOptionId || (r.tracking || []).some(t => t.optionId === settings.trackingOptionId)),
    groups = [['Trading Income', ['REVENUE', 'SALES']], ['Cost of Sales', ['DIRECTCOSTS']], ['Other Income', ['OTHERINCOME']], ['Operating Expenses', ['EXPENSE', 'OVERHEADS', 'DEPRECIATN']]],
    sums = {};
  const sections = groups.map(([title, types]) => {
    const rows = (state.accounts || []).filter(a => types.includes(a.type)).map(a => ({
      section: title,
      accountCode: a.code,
      accountName: a.name,
      amounts: ps.map(p => round2(balance(journal, a.code, p.from, p.to) * (a.class === 'REVENUE' ? -1 : 1)))
    })).filter(r => settings.hideZeroRows === false || r.amounts.some(Boolean));
    const amounts = ps.map((_, i) => round2(rows.reduce((s, r) => s + r.amounts[i], 0)));
    sums[title] = amounts;
    return {
      title,
      rows,
      totals: [{
        accountName: `Total ${title}`,
        amounts,
        total: true
      }]
    };
  });
  const gross = ps.map((_, i) => round2(sums['Trading Income'][i] - sums['Cost of Sales'][i])),
    net = ps.map((_, i) => round2(gross[i] + sums['Other Income'][i] - sums['Operating Expenses'][i]));
  sections.splice(2, 0, {
    title: 'Gross Profit',
    heading: false,
    rows: [],
    totals: [{
      accountName: 'Gross Profit',
      amounts: gross,
      total: true
    }]
  });
  sections.push({
    title: 'Net Profit',
    heading: false,
    rows: [],
    totals: [{
      accountName: 'Net Profit',
      amounts: net,
      total: true
    }]
  });
  return result(ps.map(p => `${fmtDate(p.from)} – ${fmtDate(p.to)}`), sections, {
    totalTradingIncome: sums['Trading Income'][0],
    totalCostOfSales: sums['Cost of Sales'][0],
    grossProfit: gross[0],
    totalOtherIncome: sums['Other Income'][0],
    totalOperatingExpenses: sums['Operating Expenses'][0],
    netProfit: net[0]
  });
}
export function buildBalanceSheet(state, settings) {
  const ps = periods(settings, true),
    journal = buildJournal(state, settings.basis),
    groups = [['Bank', ['BANK']], ['Current Assets', ['CURRENT', 'INVENTORY', 'PREPAYMENT']], ['Fixed Assets', ['FIXED', 'NONCURRENT']], ['Current Liabilities', ['CURRLIAB']], ['Non-current Liabilities', ['LIABILITY', 'TERMLIAB']], ['Equity', ['EQUITY']]],
    sums = {},
    sections = groups.map(([title, types]) => {
      const rows = (state.accounts || []).filter(a => types.includes(a.type)).map(a => ({
        section: title,
        accountCode: a.code,
        accountName: a.name,
        amounts: ps.map(p => {
          let n = balance(journal, a.code, null, p.to) * (a.class === 'ASSET' ? 1 : -1);
          if (a.code === '960') {
            const prior = addDays(fyStart(p.to, state.organisation), -1);
            n += buildProfitAndLoss(state, {
              fromDate: '1900-01-01',
              toDate: prior,
              basis: settings.basis
            }).summary.netProfit;
          }
          return round2(n);
        })
      })).filter(r => settings.hideZeroRows === false || r.amounts.some(Boolean));
      if (title === 'Equity') rows.push({
        accountCode: 'CYE',
        accountName: 'Current Year Earnings',
        amounts: ps.map(p => buildProfitAndLoss(state, {
          fromDate: fyStart(p.to, state.organisation),
          toDate: p.to,
          basis: settings.basis
        }).summary.netProfit)
      });
      sums[title] = ps.map((_, i) => round2(rows.reduce((s, r) => s + r.amounts[i], 0)));
      return {
        title,
        rows,
        totals: [{
          accountName: `Total ${title}`,
          amounts: sums[title],
          total: true
        }]
      };
    });
  const assets = ps.map((_, i) => round2(sums.Bank[i] + sums['Current Assets'][i] + sums['Fixed Assets'][i])),
    liabilities = ps.map((_, i) => round2(sums['Current Liabilities'][i] + sums['Non-current Liabilities'][i])),
    net = assets.map((x, i) => round2(x - liabilities[i]));
  sections.splice(3, 0, {
    title: 'Total Assets',
    rows: [],
    totals: [{
      accountName: 'Total Assets',
      amounts: assets,
      total: true
    }]
  });
  sections.splice(sections.length - 1, 0, {
    title: 'Net Assets',
    rows: [],
    totals: [{
      accountName: 'Total Liabilities',
      amounts: liabilities,
      total: true
    }, {
      accountName: 'Net Assets',
      amounts: net,
      total: true
    }]
  });
  return result(ps.map(p => fmtDate(p.to)), sections, {
    totalBank: sums.Bank[0],
    totalCurrentAssets: sums['Current Assets'][0],
    totalFixedAssets: sums['Fixed Assets'][0],
    totalAssets: assets[0],
    totalCurrentLiabilities: sums['Current Liabilities'][0],
    totalLiabilities: liabilities[0],
    netAssets: net[0],
    totalEquity: sums.Equity[0]
  });
}
export function buildAged(state, settings) {
  const docs = state[settings.kind === 'payables' ? 'bills' : 'invoices'] || [],
    date = settings.asAtDate,
    groups = new Map(),
    detail = [];
  for (const d of docs) {
    if (!['AUTHORISED', 'PAID'].includes(d.status) || d.date > date || settings.contactId && d.contactId !== settings.contactId) continue;
    const paid = round2((state.payments || []).filter(p => p.documentId === d.id && p.status !== 'DELETED' && p.date <= date).reduce((s, p) => s + p.amount, 0)),
      credited = round2((state.creditNotes || []).flatMap(c => c.allocations || []).filter(a => a.invoiceId === d.id && a.date <= date).reduce((s, a) => s + a.amount, 0)),
      due = round2(d.total - paid - credited);
    if (due <= 0) continue;
    const days = Math.floor((new Date(date) - new Date(settings.ageingBy === 'invoiceDate' ? d.date : d.dueDate)) / 86400000),
      bucket = days <= 0 ? 0 : days < 30 ? 1 : days < 60 ? 2 : days < 90 ? 3 : days < 120 ? 4 : 5;
    const name = (state.contacts || []).find(c => c.id === d.contactId)?.name || d.contactName || '(Unknown contact)';
    if (!groups.has(d.contactId)) groups.set(d.contactId, {
      contactId: d.contactId,
      accountName: name,
      amounts: Array(7).fill(0)
    });
    const row = groups.get(d.contactId);
    row.amounts[bucket] = round2(row.amounts[bucket] + due);
    row.amounts[6] = round2(row.amounts[6] + due);
    detail.push({
      documentId: d.id,
      documentNumber: d.invoiceNumber || d.reference,
      contactName: name,
      contactId: d.contactId,
      accountName: `${name} · ${d.invoiceNumber || d.reference}`,
      date: d.date,
      dueDate: d.dueDate,
      reference: d.reference,
      overdueDays: Math.max(0, days),
      amounts: [d.total, paid, credited, due]
    });
  }
  const rows = settings.view === 'detail' ? detail : [...groups.values()],
    totals = Array(rows[0]?.amounts.length || 7).fill(0).map((_, i) => round2(rows.reduce((s, r) => s + r.amounts[i], 0))),
    bucketTotals = Array(7).fill(0).map((_, i) => round2([...groups.values()].reduce((s, r) => s + r.amounts[i], 0)));
  return result(settings.view === 'detail' ? ['Total', 'Paid', 'Credited', 'Due'] : ['Current', '< 1 Month', '1 Month', '2 Months', '3 Months', 'Older', 'Total'], [{
    title: 'Outstanding',
    rows,
    totals: [{
      accountName: 'Total',
      amounts: totals,
      total: true
    }, ...(settings.view === 'detail' ? [] : [{
      accountName: 'Percentage of total',
      amounts: totals.map(n => round2(totals[6] ? n / totals[6] * 100 : 0)),
      percentage: true
    }])]
  }], Object.fromEntries(['current', 'lt1Month', 'month1', 'month2', 'month3', 'older', 'total'].map((k, i) => [k, bucketTotals[i]])));
}
export function bankItems(state, bankId) {
  const bank = (state.bankAccounts || []).find(b => b.id === bankId),
    name = id => (state.contacts || []).find(c => c.id === id)?.name || '(Unknown contact)',
    rows = [];
  for (const p of state.payments || []) if (p.status !== 'DELETED' && p.bankAccountId === bankId && !p.batchPaymentId) rows.push({
    ...p,
    kind: 'payment',
    description: name(p.contactId),
    signedAmount: (p.type === 'ACCRECPAYMENT' ? 1 : -1) * p.amount,
    path: `/payments/${p.id}`
  });
  for (const p of state.batchPayments || []) if (p.status !== 'DELETED' && p.bankAccountId === bankId) rows.push({
    ...p,
    kind: 'batchPayment',
    description: 'Batch payment',
    signedAmount: -p.total,
    path: `/batch-payments/${p.id}`
  });
  for (const t of state.bankTransactions || []) if (t.status !== 'DELETED' && t.bankAccountId === bankId) rows.push({
    ...t,
    kind: 'bankTransaction',
    description: t.contactName || name(t.contactId),
    signedAmount: (t.type === 'RECEIVE' ? 1 : -1) * t.total,
    path: `/bank-transactions/${t.id}`
  });
  for (const t of state.bankTransfers || []) if (t.status !== 'DELETED' && (t.fromBankAccountId === bankId || t.toBankAccountId === bankId)) {
    const from = t.fromBankAccountId === bankId;
    rows.push({
      ...t,
      kind: 'bankTransfer',
      description: `Transfer ${from ? 'to' : 'from'} ${(state.bankAccounts || []).find(b => b.id === (from ? t.toBankAccountId : t.fromBankAccountId))?.name || 'account'}`,
      signedAmount: (from ? -1 : 1) * t.amount,
      isReconciled: from ? t.fromIsReconciled : t.toIsReconciled,
      path: `/bank-transfers/${t.id}`
    });
  }
  return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
export function buildBankRecSummary(state, {
  bankAccountId,
  asAtDate
}) {
  const b = (state.bankAccounts || []).find(b => b.id === bankAccountId),
    items = bankItems(state, bankAccountId).filter(x => !x.isReconciled && x.date <= asAtDate),
    lines = (state.bankStatementLines || []).filter(l => l.bankAccountId === bankAccountId && l.status !== 'deleted' && l.date <= asAtDate),
    balanceInXero = accountBalance(state, b?.accountCode, asAtDate),
    outstandingPayments = round2(items.filter(x => x.signedAmount < 0).reduce((s, x) => s - x.signedAmount, 0)),
    outstandingReceipts = round2(items.filter(x => x.signedAmount > 0).reduce((s, x) => s + x.signedAmount, 0)),
    unreconciledStatementLines = round2(lines.filter(l => l.status === 'unreconciled').reduce((s, l) => s + l.amount, 0)),
    statementBalance = round2(Number(b?.openingStatementBalance || 0) + lines.reduce((s, l) => s + l.amount, 0));
  return result([fmtDate(asAtDate)], [{
    title: 'Bank Reconciliation Summary',
    rows: [{
      accountName: 'Balance in Xero',
      amounts: [balanceInXero]
    }, {
      accountName: 'Plus: Outstanding payments',
      amounts: [outstandingPayments]
    }, ...items.filter(x => x.signedAmount < 0).map(x => ({
      accountName: `${fmtDate(x.date)} · ${x.description}`,
      amounts: [-x.signedAmount]
    })), {
      accountName: 'Less: Outstanding receipts',
      amounts: [-outstandingReceipts]
    }, ...items.filter(x => x.signedAmount > 0).map(x => ({
      accountName: `${fmtDate(x.date)} · ${x.description}`,
      amounts: [-x.signedAmount]
    })), {
      accountName: 'Plus: Un-reconciled bank statement lines',
      amounts: [unreconciledStatementLines]
    }, ...lines.filter(x => x.status === 'unreconciled').map(x => ({
      accountName: `${fmtDate(x.date)} · ${x.payee}`,
      amounts: [x.amount]
    }))],
    totals: [{
      accountName: 'Statement balance',
      amounts: [statementBalance],
      total: true
    }, {
      accountName: 'Difference',
      amounts: [round2(balanceInXero + outstandingPayments - outstandingReceipts + unreconciledStatementLines - statementBalance)],
      total: true
    }]
  }], {
    balanceInXero,
    outstandingPayments,
    outstandingReceipts,
    unreconciledStatementLines,
    statementBalance
  });
}
export function buildTrialBalance(state, settings) {
  const j = buildJournal(state, settings.basis),
    rows = (state.accounts || []).map(a => {
      const n = balance(j, a.code, null, settings.asAtDate),
        y = balance(j, a.code, fyStart(settings.asAtDate, state.organisation), settings.asAtDate);
      return {
        section: a.class,
        accountCode: a.code,
        accountName: `${a.code} · ${a.name}`,
        amounts: [Math.max(0, n), Math.max(0, -n), Math.max(0, y), Math.max(0, -y)]
      };
    }).filter(r => settings.hideZeroRows === false || r.amounts.some(Boolean)),
    totals = [0, 1, 2, 3].map(i => round2(rows.reduce((s, r) => s + r.amounts[i], 0)));
  return result(['Debit', 'Credit', 'YTD Debit', 'YTD Credit'], [{
    title: 'Accounts',
    rows,
    totals: [{
      accountName: 'Total',
      amounts: totals,
      total: true
    }]
  }], {
    totalDebits: totals[0],
    totalCredits: totals[1]
  });
}
export function buildAccountTransactions(state, settings) {
  const j = buildJournal(state, settings.basis),
    opening = balance(j, settings.accountCode, null, addDays(settings.fromDate, -1));
  let running = opening;
  const rows = j.filter(r => r.accountCode === settings.accountCode && r.date >= settings.fromDate && r.date <= settings.toDate).map(r => {
    running = round2(running + r.debit - r.credit);
    return {
      ...r,
      accountName: `${fmtDate(r.date)} · ${r.description} · ${r.reference}`,
      amounts: [r.debit, r.credit, running]
    };
  });
  return result(['Debit', 'Credit', 'Running balance'], [{
    title: 'Account Transactions',
    rows: [{
      accountName: 'Opening balance',
      amounts: [0, 0, opening]
    }, ...rows],
    totals: [{
      accountName: 'Closing balance',
      amounts: [0, 0, running],
      total: true
    }]
  }], {
    openingBalance: opening,
    closingBalance: running
  });
}
export const reportDefinitions = [['ProfitAndLoss', 'Profit and Loss', 'profit-and-loss', 'Financial performance'], ['BalanceSheet', 'Balance Sheet', 'balance-sheet', 'Financial statements'], ['AgedReceivablesSummary', 'Aged Receivables Summary', 'aged-receivables', 'Payables and receivables'], ['AgedReceivablesDetail', 'Aged Receivables Detail', 'aged-receivables?view=detail', 'Payables and receivables'], ['AgedPayablesSummary', 'Aged Payables Summary', 'aged-payables', 'Payables and receivables'], ['AgedPayablesDetail', 'Aged Payables Detail', 'aged-payables?view=detail', 'Payables and receivables'], ['BankReconciliationSummary', 'Bank Reconciliation Summary', 'bank-reconciliation', 'Reconciliations'], ['TrialBalance', 'Trial Balance', 'trial-balance', 'Taxes and balances'], ['AccountTransactions', 'Account Transactions', 'account-transactions', 'Transactions']];
reportDefinitions.push(['VatReturn', 'VAT Return', 'vat-return', 'Taxes and balances'], ['ExecutiveSummary', 'Executive Summary', 'executive-summary', 'Financial performance'], ['GeneralLedgerSummary', 'General Ledger Summary', 'general-ledger-summary', 'Transactions']);
export function buildVatReturn(state, settings) {
  let sales = 0,
    purchases = 0,
    output = 0,
    input = 0;
  for (const [key, direction] of [['invoices', 'sales'], ['bills', 'purchases'], ['bankTransactions', 'bank'], ['creditNotes', 'credit']]) for (const doc of state[key] || []) {
    if (!['AUTHORISED', 'PAID'].includes(doc.status) || doc.date < settings.fromDate || doc.date > settings.toDate) continue;
    const income = direction === 'sales' || direction === 'bank' && doc.type === 'RECEIVE' || direction === 'credit' && doc.type === 'ACCRECCREDIT',
      sign = direction === 'credit' ? -1 : 1;
    for (const l of doc.lineItems || []) {
      if (['820', '478', '477'].includes(l.accountCode)) continue;
      const net = Number(l.lineAmount || 0) - (doc.lineAmountTypes === 'Inclusive' ? Number(l.taxAmount || 0) : 0);
      if (income) {
        sales += net * sign;
        output += Number(l.taxAmount || 0) * sign;
      } else {
        purchases += net * sign;
        input += Number(l.taxAmount || 0) * sign;
      }
    }
  }
  const boxes = [output, 0, output, input, Math.abs(output - input), sales, purchases, 0, 0].map(round2),
    labels = ['VAT due on sales', 'VAT due on acquisitions', 'Total VAT due', 'VAT reclaimed on purchases', 'Net VAT to pay or reclaim', 'Total sales excluding VAT', 'Total purchases excluding VAT', 'Goods supplied to EU', 'Goods acquired from EU'];
  return result(['GBP'], [{
    title: 'VAT Return',
    rows: boxes.map((value, i) => ({
      accountName: `Box ${i + 1} — ${labels[i]}`,
      amounts: [value]
    }))
  }], Object.fromEntries(boxes.map((n, i) => [`box${i + 1}`, n])));
}
export function buildExecutiveSummary(state, settings) {
  const p = buildProfitAndLoss(state, settings).summary,
    b = buildBalanceSheet(state, {
      ...settings,
      asAtDate: settings.toDate
    }).summary;
  return result(['GBP'], [{
    title: 'Financial performance',
    rows: [['Income', p.totalTradingIncome + p.totalOtherIncome], ['Direct costs', p.totalCostOfSales], ['Operating expenses', p.totalOperatingExpenses], ['Net profit', p.netProfit], ['Bank balances', b.totalBank], ['Net assets', b.netAssets]].map(([accountName, value]) => ({
      accountName,
      amounts: [round2(value)]
    }))
  }], {
    ...p,
    ...b
  });
}
export function buildGeneralLedgerSummary(state, settings) {
  const j = buildJournal(state),
    rows = (state.accounts || []).map(a => {
      const opening = balance(j, a.code, null, addDays(settings.fromDate, -1)),
        period = j.filter(r => r.accountCode === a.code && r.date >= settings.fromDate && r.date <= settings.toDate),
        debit = round2(period.reduce((n, r) => n + r.debit, 0)),
        credit = round2(period.reduce((n, r) => n + r.credit, 0));
      return {
        accountCode: a.code,
        accountName: `${a.code} - ${a.name}`,
        amounts: [opening, debit, credit, round2(opening + debit - credit)]
      };
    }).filter(r => r.amounts.some(Boolean));
  return result(['Opening balance', 'Debits', 'Credits', 'Closing balance'], [{
    title: 'General Ledger Summary',
    rows
  }], {});
}
export function buildReport(state, type, settings) {
  if (type === 'VatReturn') return buildVatReturn(state, settings);
  if (type === 'ExecutiveSummary') return buildExecutiveSummary(state, settings);
  if (type === 'GeneralLedgerSummary') return buildGeneralLedgerSummary(state, settings);
  if (type === 'ProfitAndLoss') return buildProfitAndLoss(state, settings);
  if (type === 'BalanceSheet') return buildBalanceSheet(state, settings);
  if (type.startsWith('Aged')) return buildAged(state, {
    ...settings,
    kind: type.includes('Payables') ? 'payables' : 'receivables',
    view: type.endsWith('Detail') ? 'detail' : 'summary'
  });
  if (type === 'BankReconciliationSummary') return buildBankRecSummary(state, settings);
  if (type === 'TrialBalance') return buildTrialBalance(state, settings);
  return buildAccountTransactions(state, settings);
}
