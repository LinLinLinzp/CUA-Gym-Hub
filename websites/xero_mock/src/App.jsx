import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext.jsx';
import { ToastProvider, NotFound } from './components/UI.jsx';
import Layout, { SearchPage } from './components/Layout.jsx';
import { PrintInvoice } from './pages/PrintInvoice.jsx';
import { Settings } from './pages/Settings.jsx';
import { ManualJournals, BankRules } from './pages/Accounting.jsx';
import { SecondaryDocuments, RepeatingInvoices } from './pages/SecondaryDocuments.jsx';
import { Dashboard, Overview } from './pages/Dashboard.jsx';
import { DocumentList, DocumentEditor, DocumentView, BatchPayment } from './pages/Documents.jsx';
import { BankAccounts, BankWorkspace, BankTransactionForm, TransferForm, TransactionDetail } from './pages/Bank.jsx';
import { ReportCentre, ReportPage } from './pages/Reports.jsx';
import { ContactsList, ContactDetail, ContactForm, Products, ChartOfAccounts } from './pages/Contacts.jsx';
function Home() {
  const {
    search
  } = useLocation();
  return <Navigate to={`/dashboard${search}`} replace />;
}
function Routed() {
  const location = useLocation();
  return <Routes><Route element={<Layout />}><Route index element={<Home />} /><Route path="dashboard" element={<Dashboard />} /><Route path="sales" element={<Overview />} /><Route path="purchases" element={<Overview bill />} />{['invoices', 'bills'].map(key => <React.Fragment key={key}><Route path={key} element={<DocumentList key={key} bill={key === 'bills'} />} /><Route path={`${key}/new`} element={<DocumentEditor key={`${key}-${location.key}`} bill={key === 'bills'} />} /><Route path={`${key}/:id/edit`} element={<DocumentEditor key={`${key}-${location.pathname}`} bill={key === 'bills'} />} /><Route path={`${key}/:id`} element={<DocumentView key={`${key}-${location.pathname}`} bill={key === 'bills'} />} /></React.Fragment>)}<Route path="manual-journals" element={<ManualJournals key={location.pathname} />} /><Route path="manual-journals/new" element={<ManualJournals key={location.pathname} />} /><Route path="manual-journals/:id" element={<ManualJournals key={location.pathname} />} /><Route path="bank-rules" element={<BankRules />} /><Route path="invoices/:id/print" element={<PrintInvoice />} /><Route path="repeating-invoices" element={<RepeatingInvoices />} />{[['quotes', 'quote'], ['purchase-orders', 'purchaseOrder'], ['credit-notes', 'creditNote']].map(([path, kind]) => <React.Fragment key={path}><Route path={path} element={<SecondaryDocuments key={location.pathname} kind={kind} />} /><Route path={`${path}/new`} element={<SecondaryDocuments key={location.key} kind={kind} />} /><Route path={`${path}/:id`} element={<SecondaryDocuments key={location.pathname} kind={kind} />} /></React.Fragment>)}<Route path="bills/batch-payment" element={<BatchPayment />} /><Route path="bank-accounts" element={<BankAccounts />} /><Route path="bank-accounts/:bankAccountId/:view" element={<BankWorkspace key={location.pathname} />} /><Route path="bank-transactions/new" element={<BankTransactionForm key={location.key} />} /><Route path="bank-transactions/:id/edit" element={<BankTransactionForm key={location.pathname} />} /><Route path="bank-transfers/new" element={<TransferForm />} />{[['payments', 'payment'], ['batch-payments', 'batchPayment'], ['bank-transactions', 'bankTransaction'], ['bank-transfers', 'bankTransfer']].map(([path, kind]) => <Route key={path} path={`${path}/:id`} element={<TransactionDetail key={location.pathname} kind={kind} />} />)}<Route path="reports" element={<ReportCentre />} /><Route path="reports/saved/:id" element={<ReportPage key={location.pathname} saved />} /><Route path="reports/:type" element={<ReportPage key={`${location.pathname}-${new URLSearchParams(location.search).get('view') || ''}-${new URLSearchParams(location.search).get('contactId') || ''}`} />} /><Route path="contacts" element={<ContactsList />} /><Route path="contacts/new" element={<ContactForm key="new" />} /><Route path="contacts/:id/edit" element={<ContactForm key={location.pathname} />} /><Route path="contacts/:id" element={<ContactDetail key={location.pathname} />} /><Route path="settings" element={<Settings key={location.pathname} />} /><Route path="settings/:page" element={<Settings key={location.pathname} />} /><Route path="products" element={<Products />} /><Route path="chart-of-accounts" element={<ChartOfAccounts />} /><Route path="search" element={<SearchPage />} /><Route path="*" element={<NotFound />} /></Route></Routes>;
}
export default function App() {
  return <BrowserRouter><StoreProvider><ToastProvider><Routed /></ToastProvider></StoreProvider></BrowserRouter>;
}
