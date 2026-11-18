import { useState } from 'react'
import { MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, Empty, Field, Ledger, Menu, Missing, PageHead, Pick, SearchBox, Status, Tabs, sortRows, useFilters } from '../components/ui.jsx'
import { currencies, dateLabel, find, inRange, invoiceStatus, matches, money, nameOf, titleCase, visible } from '../utils/format.js'
import { InvoiceCells, invoiceColumns } from './Workspace.jsx'

import { ReceiptPreview } from '../components/Receipt.jsx'
import { InvoiceActionDialog } from '../components/InvoiceActions.jsx'

export function Invoices() {
  const { state } = useApp()
  const [params, filter] = useFilters()
  const [advanced, setAdvanced] = useState(false)
  const [selection, setSelection] = useState([])
  const [sort, setSort] = useState({ key: 'issueDate', desc: true })
  const visibility = params.get('visibility') || 'active'
  const status = params.get('status')
  const rows = sortRows(state.invoices.filter(row =>
    visible(row, visibility) && (!status || invoiceStatus(row) === status || (status === 'outstanding' && Number(row.amountDue) > 0 && !['draft', 'overdue'].includes(invoiceStatus(row)))) &&
    (!params.get('client') || row.clientId === params.get('client')) &&
    (!params.get('currency') || row.currency === params.get('currency')) &&
    inRange(row.issueDate || '', params.get('from'), params.get('to')) &&
    matches(params.get('q'), row.invoiceNumber, nameOf(state.clients, row.clientId), row.notes, row.reference, ...(row.lines || []).flatMap(line => [line.name, line.description]))
  ), sort)
  const shownSelection = selection.filter(id => rows.some(row => row.id === id))
  return <>
    <PageHead title="Invoices"><AppLink className="button primary" to="/invoices/new"><Plus size={16} />New Invoice</AppLink></PageHead>
    <section className="card ledger">
      <div className="ledger-bar">
        <h2>{visibility === 'active' ? 'All Invoices' : titleCase(visibility) + ' Invoices'} {shownSelection.length > 0 && <small>· {shownSelection.length} selected</small>}</h2>
        <div className="actions"><SearchBox value={params.get('q')} onChange={q => filter('q', q)} placeholder="Search invoices" />
          <button className="button" type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><SlidersHorizontal size={16} />Advanced Search</button></div>
      </div>
      <div className="ledger-tabs"><Tabs values={['active', 'archived', 'deleted']} value={visibility} change={value => { filter('visibility', value === 'active' ? '' : value); setSelection([]) }} /></div>
      <div className="filter-bar">
        <Field label="Client"><Pick rows={state.clients} value={params.get('client')} onChange={v => filter('client', v)} empty="All clients" /></Field>
        <Field label="Status"><select value={status || ''} onChange={e => filter('status', e.target.value)}><option value="">All statuses</option>
          {['draft', 'sent', 'outstanding', 'partial', 'paid', 'overdue'].map(value => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select></Field>
        {(advanced || params.has('currency')) && <Field label="Currency"><select value={params.get('currency') || ''} onChange={e => filter('currency', e.target.value)}>
          <option value="">All currencies</option>{currencies.map(value => <option key={value}>{value}</option>)}
        </select></Field>}
        {advanced && <>
          <Field label="Issued from"><input type="date" value={params.get('from') || ''} onChange={e => filter('from', e.target.value)} /></Field>
          <Field label="Issued through"><input type="date" value={params.get('to') || ''} onChange={e => filter('to', e.target.value)} /></Field>
        </>}
      </div>
      <Ledger rows={rows} columns={[...invoiceColumns, { label: 'Actions' }]} render={invoice => <>
        <InvoiceCells invoice={invoice} state={state} />
        <td className="row-actions"><InvoiceMenu invoice={invoice} compact /></td>
      </>} selected={shownSelection} onSelect={setSelection} sort={sort} setSort={setSort} empty={<Empty title={state.invoices.length ? 'No matching invoices' : 'No invoices yet'} />} />
    </section>
  </>
}

export function InvoiceMenu({ invoice, compact, onAction }) {
  const [localAction, setLocalAction] = useState(null)
  const setAction = onAction || setLocalAction
  const isDeleted = visible(invoice, 'deleted')
  return <>
    <Menu label={compact ? 'Invoice actions' : 'More Actions'} icon={compact && <MoreHorizontal size={19} />} className={compact ? 'icon-menu' : ''} buttonClass={compact ? 'icon-button' : 'button'}>
      {compact && <AppLink to={`/invoices/${invoice.id}`}>View invoice</AppLink>}
      {compact && !isDeleted && <AppLink to={`/invoices/${invoice.id}/edit`}>Edit</AppLink>}
      <AppLink to={`/invoices/new?duplicate=${encodeURIComponent(invoice.id)}`}>Duplicate</AppLink>
      {!isDeleted && <button type="button" onClick={() => setAction('send')}>Send To</button>}
      {!isDeleted && (invoice.status || 'draft') === 'draft' && <button type="button" onClick={() => setAction('mark')}>Mark as Sent</button>}
      {!isDeleted && Number(invoice.amountDue) > 0 && <button type="button" onClick={() => setAction('pay')}>Add a Payment</button>}
      {visible(invoice) && <button type="button" onClick={() => setAction('archived')}>Archive</button>}
      {!isDeleted && invoice.kind !== 'retainer_fee' && !Number(invoice.amountPaid) && <button type="button" className="text-danger" onClick={() => setAction('deleted')}>Delete</button>}
      {!visible(invoice) && <button type="button" onClick={() => setAction('active')}>Restore</button>}
    </Menu>
    {localAction && <InvoiceActionDialog key={localAction} invoice={invoice} action={localAction} onClose={() => setLocalAction(null)} />}
  </>
}

export function InvoiceTotals({ invoice }) {
  return <dl className="invoice-totals">
    <div><dt>Subtotal</dt><dd>{money(invoice.subtotal, invoice.currency)}</dd></div>
    <div><dt>Discount</dt><dd>{money(invoice.discountAmount, invoice.currency)}</dd></div>
    <div><dt>Tax</dt><dd>{money(invoice.taxAmount, invoice.currency)}</dd></div>
    <div><dt>Total</dt><dd>{money(invoice.total, invoice.currency)}</dd></div>
    {Number(invoice.amountPaid) > 0 && <div><dt>Payments</dt><dd>{money(invoice.amountPaid, invoice.currency)}</dd></div>}
    <div className="due-total"><dt>Amount Due</dt><dd>{money(invoice.amountDue, invoice.currency)}</dd></div>
  </dl>
}

export function InvoiceDetail() {
  const { state } = useApp()
  const { id } = useParams()
  const [action, setAction] = useState(null)
  const invoice = find(state.invoices, id)
  if (!invoice) return <Missing title="Invoice unavailable" to="/invoices" label="Back to Invoices" />
  const client = find(state.clients, invoice.clientId)
  const payments = state.payments.filter(row => row.invoiceId === id)
  return <>
    <PageHead title={invoice.invoiceNumber || 'Invoice'} back={{ to: '/invoices', label: 'Invoices' }}>
      <InvoiceMenu invoice={invoice} onAction={setAction} />
      {!visible(invoice, 'deleted') && Number(invoice.amountDue) > 0 && <button type="button" className="button" onClick={() => setAction('pay')}>Add a Payment</button>}
      {visible(invoice) && (invoice.status || 'draft') === 'draft' && <button type="button" className="button positive" onClick={() => setAction('send')}>Send To</button>}
      {!visible(invoice, 'deleted') && <AppLink className="button primary" to={`/invoices/${id}/edit`}>Edit</AppLink>}
    </PageHead>
    <div className="document-grid">
      <section className="card document">
        <div className="section-heading"><div><h2>Invoice</h2><p>{state.business?.name || 'Workspace'}</p></div><Status value={invoiceStatus(invoice)} /></div>
        <div className="form-grid document-metadata">
          <div><small>Bill To</small><p>{client ? <AppLink to={`/clients/${client.id}`}>{client.name}</AppLink> : 'Client unavailable'}</p><p>{client?.email}</p></div>
          <dl className="details"><div><dt>Invoice Number</dt><dd>{invoice.invoiceNumber || '—'}</dd></div>
            <div><dt>Issue Date</dt><dd>{dateLabel(invoice.issueDate)}</dd></div>
            <div><dt>Due Date</dt><dd>{dateLabel(invoice.dueDate)}</dd></div>
            {invoice.reference && <div><dt>Reference</dt><dd>{invoice.reference}</dd></div>}
          </dl>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Item / Description</th><th className="number">Rate</th><th className="number">Quantity</th><th className="number">Line Total</th></tr></thead>
          <tbody>{(invoice.lines || []).map(line => <tr key={line.id}>
            <td><strong>{line.name || 'Line item'}</strong><small>{line.description}</small></td><td className="number">{money(line.rate, invoice.currency)}</td><td className="number">{line.quantity ?? '—'}</td><td className="number">{money(line.lineSubtotal, invoice.currency)}</td>
          </tr>)}</tbody></table></div>
        {!invoice.lines?.length && <Empty title="No line items" />}
        <InvoiceTotals invoice={invoice} />
        {(invoice.lines || []).flatMap(line => line.sources || []).filter(source => source.type === 'expense' && source.includeReceipt).map(source => <ReceiptPreview key={source.id} receipt={find(state.expenses, source.id)?.receipt} />)}
        {invoice.notes && <div className="document-note"><h3>Notes</h3><p>{invoice.notes}</p></div>}
        {invoice.terms && <div className="document-note"><h3>Terms</h3><p>{invoice.terms}</p></div>}
      </section>
      <aside className="card settings"><h2>Invoice Details</h2><dl className="details">
        <div><dt>Currency</dt><dd>{invoice.currency || '—'}</dd></div><div><dt>Status</dt><dd><Status value={invoiceStatus(invoice)} /></dd></div>
        <div><dt>Visibility</dt><dd>{titleCase(invoice.visibility || 'active')}</dd></div>
        <div><dt>Project</dt><dd>{nameOf(state.projects, invoice.projectId)}</dd></div>
        {invoice.retainerId && <div><dt>Retainer</dt><dd><AppLink to={`/invoices/retainers/${invoice.retainerId}`}>View retainer</AppLink></dd></div>}
      </dl></aside>
    </div>
    <section className="card ledger"><div className="ledger-bar"><h2>Payment History</h2></div>
      <Ledger rows={payments} columns={[{ label: 'Payment Date' }, { label: 'Method' }, { label: 'Reference' }, { label: 'Amount', number: true }]} render={row => <>
        <td>{dateLabel(row.paymentDate)}</td><td>{titleCase(row.method) || '—'}</td><td>{row.reference || '—'}{row.notes && <small>{row.notes}</small>}</td><td className="number">{money(row.amount, row.currency)}</td>
      </>} empty={<Empty title="No payments recorded" />} />
    </section>
    {action && <InvoiceActionDialog key={id + action} invoice={invoice} action={action} onClose={() => setAction(null)} />}
  </>
}
