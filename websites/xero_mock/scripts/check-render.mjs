import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createInitialData } from '../src/data/seed.js';
import assert from 'node:assert/strict';
globalThis.window = {
  location: {
    search: '?sid=render-check'
  }
};
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {}
};
const server = await createServer({
    server: {
      middlewareMode: true
    },
    appType: 'custom'
  }),
  el = React.createElement;
try {
  const {
      StoreContext
    } = await server.ssrLoadModule('/src/store/StoreContext.jsx'),
    ui = await server.ssrLoadModule('/src/components/UI.jsx'),
    D = await server.ssrLoadModule('/src/pages/Documents.jsx'),
    B = await server.ssrLoadModule('/src/pages/Bank.jsx'),
    R = await server.ssrLoadModule('/src/pages/Reports.jsx'),
    C = await server.ssrLoadModule('/src/pages/Contacts.jsx'),
    H = await server.ssrLoadModule('/src/pages/Dashboard.jsx'),
    L = await server.ssrLoadModule('/src/components/Layout.jsx'),
    S = await server.ssrLoadModule('/src/pages/SecondaryDocuments.jsx'),
    A = await server.ssrLoadModule('/src/pages/Accounting.jsx'),
    Settings = await server.ssrLoadModule('/src/pages/Settings.jsx'),
    Print = await server.ssrLoadModule('/src/pages/PrintInvoice.jsx');
  const pages = [['/dashboard', H.Dashboard], ['/sales', H.Overview], ['/invoices', D.DocumentList], ['/invoices/new', D.DocumentEditor], ['/invoices/:id', '/invoices/inv_0031', D.DocumentView], ['/invoices/:id/edit', '/invoices/inv_0036/edit', D.DocumentEditor], ['/bills', D.DocumentList, {
    bill: true
  }], ['/bills/batch-payment', D.BatchPayment], ['/bank-accounts', B.BankAccounts], ['/bank-accounts/:bankAccountId/:view', '/bank-accounts/ba_090/reconcile', B.BankWorkspace], ['/bank-accounts/:bankAccountId/:view', '/bank-accounts/ba_090/statements', B.BankWorkspace], ['/bank-accounts/:bankAccountId/:view', '/bank-accounts/ba_090/transactions', B.BankWorkspace], ['/bank-transactions/new', B.BankTransactionForm], ['/bank-transfers/new', B.TransferForm], ['/payments/:id', '/payments/pay_inv0027', B.TransactionDetail, {
    kind: 'payment'
  }], ['/reports', R.ReportCentre], ...['profit-and-loss', 'balance-sheet', 'aged-receivables', 'aged-payables', 'bank-reconciliation', 'trial-balance', 'account-transactions'].map(slug => ['/reports/:type', `/reports/${slug}`, R.ReportPage]), ['/reports/saved/:id', '/reports/saved/rep_0002', R.ReportPage, {
    saved: true
  }], ['/contacts', C.ContactsList], ['/contacts/new', C.ContactForm], ['/contacts/:id', '/contacts/con_c01', C.ContactDetail], ['/contacts/:id/edit', '/contacts/con_c01/edit', C.ContactForm], ['/products', C.Products], ['/chart-of-accounts', C.ChartOfAccounts], ['/search', L.SearchPage]];
  pages.push(['/dashboard', L.default], ['/bank-accounts/:bankAccountId/:view', '/bank-accounts/ba_090/cash-coding', B.BankWorkspace], ['/repeating-invoices', S.RepeatingInvoices], ['/manual-journals', A.ManualJournals], ['/manual-journals/new', A.ManualJournals], ['/manual-journals/:id', '/manual-journals/mj_0001', A.ManualJournals], ['/bank-rules', A.BankRules], ['/invoices/:id/print', '/invoices/inv_0031/print', Print.PrintInvoice]);
  for (const [path, kind, id] of [['quotes', 'quote', 'qu_0001'], ['purchase-orders', 'purchaseOrder', 'po_0001'], ['credit-notes', 'creditNote', 'cn_0001']]) pages.push([`/${path}`, S.SecondaryDocuments, {
    kind
  }], [`/${path}/new`, S.SecondaryDocuments, {
    kind
  }], [`/${path}/:id`, `/${path}/${id}`, S.SecondaryDocuments, {
    kind
  }]);
  for (const page of ['settings', 'settings/organisation', 'settings/invoice', 'settings/financial', 'settings/tax-rates', 'settings/tracking', 'settings/users']) pages.push([`/${page}`, Settings.Settings]);
  for (const slug of ['vat-return', 'executive-summary', 'general-ledger-summary']) pages.push(['/reports/:type', `/reports/${slug}`, R.ReportPage]);
  const full = createInitialData(),
    empty = Object.fromEntries(Object.entries(full).map(([k, v]) => [k, Array.isArray(v) ? [] : v])),
    odd = structuredClone(full);
  odd.contacts = [{
    id: 'odd-contact'
  }];
  const legacyCredit = odd.creditNotes.find(c => c.id === 'cn_0002');
  legacyCredit.status = 'AUTHORISED';
  legacyCredit.amountDue = legacyCredit.total;
  delete legacyCredit.fullyPaidOnDate;
  odd.invoices = Array.from({
    length: 500
  }, (_, i) => ({
    id: `odd-${i}`,
    status: 'AUTHORISED',
    total: 0,
    amountDue: 0
  }));
  odd.bankStatementLines = Array.from({
    length: 500
  }, (_, i) => ({
    id: `odd-line-${i}`,
    bankAccountId: 'ba_090',
    status: 'unreconciled',
    amount: 0
  }));
  let count = 0;
  const single = {
    ...full,
    invoices: [full.invoices.find(d => d.id === 'inv_0031')],
    bills: [full.bills[0]],
    contacts: [full.contacts[0]],
    bankStatementLines: [full.bankStatementLines.find(l => l.id === 'bsl_090_U01')]
  };
  for (const state of [full, empty, single, odd]) for (const page of pages) {
    const [path, routeOrComponent, componentOrProps, props] = page,
      route = typeof routeOrComponent === 'string' ? routeOrComponent : path,
      component = typeof routeOrComponent === 'string' ? componentOrProps : routeOrComponent,
      componentProps = typeof routeOrComponent === 'string' ? props : componentOrProps;
    try {
      const markup = renderToString(el(StoreContext.Provider, {
        value: {
          state,
          dispatch: () => {}
        }
      }, el(ui.ToastProvider, null, el(MemoryRouter, {
        initialEntries: [`${route}?sid=render-check`]
      }, el(Routes, null, el(Route, {
        path,
        element: el(component, componentProps)
      }))))));
      if ((state === full || state === odd) && route === '/credit-notes') {
        assert(markup.includes('class="status paid">Paid</span>'));
        assert(markup.includes('class="status awaiting-payment">Awaiting Payment</span>'));
        assert(!markup.includes('class="status overdue"'));
      }
      count++;
    } catch (e) {
      throw new Error(`${route}: ${e.stack}`);
    }
  }
  console.log(`PASS: ${count} page renders across seeded, empty, single-record, and 500-record/missing-field worlds`);
} finally {
  await server.close();
}
