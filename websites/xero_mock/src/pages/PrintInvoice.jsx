import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { SidLink } from '../components/SidLink.jsx';
import { Button, NotFound, DocumentLines } from '../components/UI.jsx';
import { fmtDate, fmtMoney } from '../utils/money.js';
export function PrintInvoice() {
  const {
      state
    } = useStore(),
    {
      id
    } = useParams(),
    doc = (state.invoices || []).find(d => d.id === id);
  if (!doc) return <NotFound name="Invoice" back="/invoices" />;
  const org = state.organisation || {},
    contact = (state.contacts || []).find(c => c.id === doc.contactId) || {},
    theme = (state.brandingThemes || []).find(t => t.id === doc.brandingThemeId);
  return <><div className="toolbar print-toolbar"><SidLink to={`/invoices/${id}`}>← Back to invoice</SidLink><Button variant="primary" onClick={() => window.print()}>Print PDF</Button></div><article className="invoice-print"><div className="print-heading"><div><h1>{org.name || 'Brightwater Creative Ltd'}</h1><p>{Object.values(org.address || {}).filter(Boolean).join(', ')}</p><p>VAT number: {org.taxNumber || '—'}</p><small>{theme?.name || 'Standard'}</small></div><h1>TAX INVOICE</h1></div><div className="facts"><div><span>Bill to</span><strong>{contact.name || doc.contactName || '(Unknown contact)'}</strong><p>{Object.values(contact.billingAddress || {}).filter(Boolean).join(', ')}</p></div><div><span>Invoice number</span>{doc.invoiceNumber}<p>Issue date: {fmtDate(doc.date)}</p><p>Due date: {fmtDate(doc.dueDate)}</p><p>Reference: {doc.reference || '—'}</p></div></div><DocumentLines doc={doc} /><div className="payment-row"><strong>Amount due GBP</strong><strong>{fmtMoney(doc.amountDue)}</strong></div><p className="notes">{theme?.paymentTermsText || 'Payment due within 30 days.'}</p></article></>;
}
