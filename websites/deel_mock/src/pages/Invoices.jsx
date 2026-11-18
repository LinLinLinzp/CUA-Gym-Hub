import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { calendarDate, compareDates, find, invoiceStatus, isPayable, label, list, money, searchMatches, workerFor } from '../data/model.js'
import { invoiceTotal, releasePayment } from '../data/invoices.js'
import {
  Badge, cols, Confirm, DateText, downloadCsv, Empty, Facts, Missing, PageTitle, PagedTable, Panel, Person,
  recordPath, RouteLink, Search, Select, Table, useFilters,
} from '../components/ui.jsx'

const defaults = { query: '', status: '', currency: '', sort: 'soon' }
const back = ['/invoices', 'Back to invoices']
const invoiceColumns = cols('Description', 'Quantity', 'Unit price', 'Amount').map((column, index) =>
  index ? { ...column, className: 'numeric' } : column)
const invoiceName = item => item.number || item.id || 'Invoice'

export function Invoices() {
  const { state } = useWorkspace()
  const [filters, set, clear] = useFilters(defaults)
  const [selectedIds, setSelectedIds] = useState([])
  const [review, setReview] = useState(null)
  const all = list(state.invoices)
  const workers = new Map(list(state.workers).map(worker => [worker.id, worker]))
  const selected = selectedIds.map(id => find(all, id)).filter(item => item && isPayable(item))
  const currency = selected[0]?.currency
  const today = calendarDate(new Date())
  const currencies = [...new Set(all.map(item => item.currency).filter(Boolean))].sort()
  const rows = all.filter(item => {
    const status = invoiceStatus(item, today)
    return (!filters.status || (filters.status === 'payable' ? isPayable(item) : status === filters.status)) &&
      (!filters.currency || item.currency === filters.currency) &&
      searchMatches(filters.query, item.number, workers.get(item.workerId)?.name)
  }).sort((a, b) => compareDates(a.dueDate, b.dueDate, filters.sort === 'soon' ? 1 : -1))

  function toggle(item, checked) {
    if (!item.id || !isPayable(item) || (currency && currency !== item.currency)) return
    setSelectedIds(previous => checked ? [...new Set([...previous, item.id])] : previous.filter(id => id !== item.id))
  }

  return <>
    <PageTitle title="Invoices" description="Review contractor charges and release payments." />
    <Panel>
      <div className="filters">
        <Search label="Search invoices" placeholder="Invoice number or contractor" value={filters.query} onChange={value => set('query', value)} />
        <Select label="Status" value={filters.status} onChange={value => set('status', value)}
          options={[[ '', 'All statuses'], ['payable', 'Payable'], ...['open', 'overdue', 'processing', 'paid'].map(status => [status, label(status)])]} />
        <Select label="Currency" value={filters.currency} onChange={value => set('currency', value)} options={[[ '', 'All currencies'], ...currencies.map(code => [code, code])]} />
        <Select label="Due date" value={filters.sort} onChange={value => set('sort', value)} options={[[ 'soon', 'Earliest first'], ['late', 'Latest first']]} />
        <button onClick={clear}>Clear filters</button>
        <button disabled={!rows.length} onClick={() => downloadCsv('invoices.csv', [
          ['Invoice', 'Contractor', 'Issue date', 'Due date', 'Status', 'Currency', 'Total'],
          ...rows.map(item => [invoiceName(item), workers.get(item.workerId)?.name, item.issueDate, item.dueDate,
            label(invoiceStatus(item, today)), item.currency, item.total]),
        ])}>Export filtered invoices</button>
      </div>
      {selected.length > 0 && <div className="selection-bar" aria-label="Selected invoices">
        <span><strong>{selected.length} selected</strong> · {money(invoiceTotal(selected), currency)} <small>· One currency per payment</small></span>
        <div className="actions"><button onClick={() => setSelectedIds([])}>Clear selection</button>
          <button className="primary" onClick={() => setReview(selected)}>Review payment</button></div>
      </div>}
      <PagedTable rows={rows} resetKey={JSON.stringify(filters)} noun="invoices" caption="Invoices"
        columns={[{ name: 'Select', content: <span className="visually-hidden">Select invoice</span> }, ...cols('Invoice', 'Contractor', 'Issued', 'Due', 'Status'),
          { name: 'Total', className: 'numeric' }]}
        render={(item, index) => <tr key={item.id ?? index}>
          <td><input type="checkbox" aria-label={'Select ' + invoiceName(item)} checked={selectedIds.includes(item.id)}
            disabled={!item.id || !isPayable(item) || Boolean(currency && currency !== item.currency)}
            onChange={event => toggle(item, event.target.checked)} /></td>
          <td>{item.id ? <RouteLink to={recordPath('/invoices', item.id)}>{invoiceName(item)}</RouteLink> : invoiceName(item)}</td>
          <td><Person name={workers.get(item.workerId)?.name} /></td>
          <td><DateText value={item.issueDate} /></td><td><DateText value={item.dueDate} /></td>
          <td><Badge status={invoiceStatus(item, today)} /></td><td className="numeric">{money(item.total, item.currency)}</td>
        </tr>} />
    </Panel>
    {review && <PaymentReview invoices={review} onClose={() => setReview(null)} onSuccess={() => { setReview(null); setSelectedIds([]) }} />}
  </>
}

function LineItems({ invoice }) {
  return <Table columns={invoiceColumns} rows={list(invoice.lineItems)} empty="No line items provided"
    render={(item, index) => <tr key={item.id ?? index}>
      <td>{item.description || '—'}</td><td className="numeric">{item.quantity ?? '—'}</td>
      <td className="numeric">{money(item.unitPrice, invoice.currency)}</td><td className="numeric">{money(item.amount, invoice.currency)}</td>
    </tr>} />
}

function PaymentReview({ invoices, onClose, onSuccess }) {
  const { state, commit } = useWorkspace()
  const [error, setError] = useState('')
  const currency = invoices[0]?.currency
  async function confirm() {
    const result = await commit(releasePayment(invoices.map(item => item.id)))
    if (result.error) setError(result.error)
    else onSuccess()
  }
  return <Confirm title="Review payment" confirmLabel="Confirm payment" onConfirm={confirm} onClose={onClose} error={error}>
    <Facts entries={[
      ['Selected invoices', invoices.length], ['Payment method', 'Studio balance'], ['Total', money(invoiceTotal(invoices), currency)],
    ]} />
    {invoices.map(item => <section key={item.id}>
      <h3>{invoiceName(item)} · {workerFor(state, item)?.name || 'Unknown worker'} · {money(item.total, item.currency)}</h3>
      <LineItems invoice={item} />
    </section>)}
  </Confirm>
}

export function InvoiceDetail() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const [review, setReview] = useState(false)
  const invoice = find(state.invoices, id)
  if (!invoice) return <Missing noun="Invoice" back={back} />
  const worker = workerFor(state, invoice)
  const entity = find(state.legalEntities, invoice.legalEntityId)
  const contract = find(state.contracts, invoice.contractId)
  const payments = list(state.payments).filter(item => (invoice.paymentId && item.id === invoice.paymentId) ||
    (Array.isArray(item.invoiceIds) && item.invoiceIds.includes(id)) ||
    list(item.allocations).some(allocation => allocation.invoiceId === id))

  function download() {
    downloadCsv(invoiceName(invoice) + '.csv', [
      ['Invoice', 'Contractor', 'Legal entity', 'Contract', 'Issue date', 'Due date', 'Status', 'Currency', 'Total'],
      [invoiceName(invoice), worker?.name, entity?.name, contract?.number, invoice.issueDate, invoice.dueDate, label(invoiceStatus(invoice)), invoice.currency, invoice.total],
      [],
      ['Description', 'Quantity', 'Unit price', 'Amount', 'Currency'],
      ...list(invoice.lineItems).map(item => [item.description, item.quantity, item.unitPrice, item.amount, invoice.currency]),
    ])
  }

  return <>
    <PageTitle title={invoiceName(invoice)} back={back} description={worker?.name}
      actions={<>
        <Badge status={invoiceStatus(invoice)} />
        <button onClick={download}>Download invoice</button>
        {isPayable(invoice) && <button className="primary" onClick={() => setReview(true)}>Review payment</button>}
      </>} />
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Line items">
          <LineItems invoice={invoice} />
          <p className="numeric prose"><strong>Total · {money(invoice.total, invoice.currency)}</strong></p>
        </Panel>
        <Panel title="Payment history">
          {payments.length ? <Table rows={payments} columns={cols('Payment', 'Method', 'Date', 'Status', 'Invoice amount')}
            render={(item, index) => <tr key={item.id ?? index}>
              <td>{item.id || '—'}</td><td>{label(item.method)}</td><td><DateText value={item.createdAt} /></td>
              <td><Badge status={item.status} /></td><td>{money(list(item.allocations).find(allocation => allocation.invoiceId === id)?.amount, item.currency)}</td>
            </tr>} /> : <Empty title="No payment history" />}
        </Panel>
      </div>
      <Panel title="Billing details">
        <Facts entries={[
          ['Issue date', <DateText value={invoice.issueDate} />], ['Due date', <DateText value={invoice.dueDate} />],
          ['Contractor', worker?.name], ['Legal entity', entity?.name], ['Currency', invoice.currency],
          ['Contract', contract?.id ? <RouteLink to={recordPath('/contracts', contract.id)}>{contract.number || contract.title || 'View contract'}</RouteLink> : null],
        ]} />
      </Panel>
    </div>
    {review && <PaymentReview invoices={[invoice]} onClose={() => setReview(false)} onSuccess={() => setReview(false)} />}
  </>
}
