import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ActivityTable, ButtonLink, DataTable, DefinitionList, Empty, Field, Missing, PageTitle, SearchField, SiteLink,
  Status, recordNumber, recordPath, useFeedback } from './components.jsx'
import { actionable, byId, dateLabel, editable, includes, money, payable, recentFirst, rows, today, total, userName, validDate, vendorName } from './data/selectors.js'
import { useStore } from './store.jsx'
import { ApproverDialog } from './BillEditor.jsx'
import { DecisionDialog } from './Approvals.jsx'
import { submitApproval } from './data/transactions.js'

const views = [
  ['all', 'All bills'], ['drafts', 'Drafts'], ['approval', 'For approval'], ['ready', 'Ready to pay'], ['activity', 'Payment activity'],
]
const perPage = 15
const billColumns = [
  { label: 'Vendor' }, { label: 'Invoice #' }, { label: 'Due date' },
  { label: 'Approval' }, { label: 'Payment' }, { label: 'Amount (USD)', numeric: true },
]

export function BillTable({ records, columns = billColumns, footer, empty = 'No bills found.', selection }) {
  const { state } = useStore()
  return <DataTable label="Bills ledger" records={records} columns={columns} footer={footer} empty={empty}
    rowPath={bill => recordPath('bills', bill.id)}
    render={bill => <>
      {selection && <td className="check-cell"><input type="checkbox" aria-label={`Select ${recordNumber(bill)}`}
        checked={selection.has(bill.id)} onChange={() => selection.toggle(bill.id)} /></td>}
      <td>{vendorName(state, bill.vendorId)}</td>
      <td><SiteLink className="table-link" to={recordPath('bills', bill.id)}>{recordNumber(bill)}</SiteLink></td>
      <td>{dateLabel(bill.dueDate)}</td>
      <td><Status value={bill.approvalStatus} /></td>
      <td><Status value={bill.paymentStatus} /></td>
      <td className="numeric"><strong>{money(bill.amount)}</strong></td>
    </>} />
}

function inView(state, view, bill) {
  if (view === 'drafts') return bill.approvalStatus === 'draft'
  if (view === 'approval') return bill.approvalStatus === 'pending'
  if (view === 'ready') return payable(state, bill)
  if (view === 'activity') return ['scheduled', 'processing', 'paid'].includes(bill.paymentStatus)
  return true
}

function matchesDueDate(value, filter) {
  if (!filter) return true
  if (!validDate(value)) return false
  const now = today()
  if (filter === 'overdue') return value < now
  if (filter === 'today') return value === now
  const limit = new Date(now + 'T00:00:00.000Z')
  limit.setUTCDate(limit.getUTCDate() + Number(filter))
  return value >= now && value <= limit.toISOString().slice(0, 10)
}

export function Bills() {
  const [params] = useSearchParams()
  const requested = params.get('view')
  const view = views.some(([id]) => id === requested) ? requested : 'all'
  return <>
    <PageTitle title="Bills" description="Track incoming invoices from entry through payment."
      actions={<ButtonLink to="/bills/new"><span aria-hidden="true">+</span> New bill</ButtonLink>} />
    <nav className="tabs" aria-label="Bill views">
      {views.map(([id, text]) => <SiteLink key={id} to={id === 'all' ? '/bills' : `/bills?view=${id}`}
        aria-current={view === id ? 'page' : undefined}>{text}</SiteLink>)}
    </nav>
    <BillsLedger key={view} view={view} />
  </>
}

function BillsLedger({ view }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [vendor, setVendor] = useState('')
  const [due, setDue] = useState('')
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const vendors = rows(state.vendors)
  const bills = rows(state.bills).filter(bill => inView(state, view, bill)
    && (!vendor || bill.vendorId === vendor) && matchesDueDate(bill.dueDate, due)
    && includes(query, vendorName(state, bill.vendorId), bill.invoiceNumber, bill.memo))
  if (sort) {
    bills.sort((a, b) => {
      const comparison = sort.key === 'amount'
        ? (Number(a.amount) || 0) - (Number(b.amount) || 0)
        : String(a.dueDate || '').localeCompare(String(b.dueDate || ''))
      return comparison * sort.direction
    })
  }

  const pages = Math.max(1, Math.ceil(bills.length / perPage))
  const currentPage = Math.min(page, pages)
  const offset = (currentPage - 1) * perPage
  const visible = bills.slice(offset, offset + perPage)
  const chosen = rows(state.bills).filter(bill => selected.has(bill.id))
  const visibleSelected = visible.filter(bill => selected.has(bill.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length

  function select(ids, value) {
    setSelected(previous => {
      const next = new Set(previous)
      for (const id of ids) {
        if (value) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }
  const columns = billColumns.map(column => {
    const key = { 'Due date': 'dueDate', 'Amount (USD)': 'amount' }[column.label]
    if (!key) return column
    const direction = sort?.key === key ? sort.direction : 0
    const sortState = direction === 1 ? 'ascending' : direction === -1 ? 'descending' : 'none'
    return {
      ...column, sortState,
      content: <button type="button" className="sort" onClick={() => {
        setSort({ key, direction: direction === 1 ? -1 : 1 })
        setPage(1)
      }}>{column.label} <span aria-hidden="true">{direction === 1 ? '↑' : direction === -1 ? '↓' : '↕'}</span></button>,
    }
  })
  columns.unshift({
    label: 'Selection',
    content: <input type="checkbox" aria-label="Select all visible bills" checked={allVisibleSelected}
      disabled={!visible.length}
      ref={element => { if (element) element.indeterminate = visibleSelected > 0 && !allVisibleSelected }}
      onChange={event => select(visible.map(bill => bill.id), event.target.checked)} />,
  })

  return <>
    <div className="toolbar">
      <SearchField label="Search bills" value={query} placeholder="Vendor, invoice #, or memo" onChange={value => { setQuery(value); setPage(1) }} />
      <Field label="Vendor">{props => <select {...props} value={vendor} onChange={event => { setVendor(event.target.value); setPage(1) }}>
        <option value="">All vendors</option>
        {vendors.map(row => <option key={row.id} value={row.id}>{row.name || 'Unknown vendor'}</option>)}
      </select>}</Field>
      <Field label="Due date">{props => <select {...props} value={due} onChange={event => { setDue(event.target.value); setPage(1) }}>
        <option value="">Any date</option><option value="overdue">Overdue</option><option value="today">Due today</option>
        <option value="7">Next 7 days</option><option value="30">Next 30 days</option>
      </select>}</Field>
    </div>
    {chosen.length > 0 && <div className="selection-summary">
      <span role="status"><strong>{chosen.length} selected</strong> · {money(total(chosen))} USD</span>
      <button type="button" className="button quiet" onClick={() => setSelected(new Set())}>Clear selection</button>
    </div>}
    <BillTable records={visible} columns={columns} selection={{
      has: id => selected.has(id),
      toggle: id => select([id], !selected.has(id)),
    }} footer={<div className="table-foot">
      <span aria-live="polite">{bills.length ? `${offset + 1}–${offset + visible.length} of ${bills.length} bills` : '0 bills'}</span>
      <div className="actions">
        <button className="button secondary" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <button className="button secondary" type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div>
    </div>} />
  </>
}

export function BillDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const bill = byId(state.bills, id)
  if (!bill) return <Missing title="Bill unavailable" to="/bills" label="Back to Bills" />
  return <BillRecord key={bill.id} bill={bill} />
}

function BillRecord({ bill }) {
  const { state, transact } = useStore()
  const notify = useFeedback()
  const [params] = useSearchParams()
  const [dialog, setDialog] = useState('')
  const canEdit = editable(bill)
  const current = byId(state.approvals, bill.approvalId)
  const canDecide = current?.billId === bill.id && actionable(state, current)
  const close = () => setDialog('')
  const from = params.get('from')
  const back = from === 'approvals' ? { to: '/approvals', label: 'Approvals' }
    : from === 'decision-history' ? { to: '/approvals?view=history', label: 'Decision history' }
    : { to: '/bills', label: 'Bills' }
  const vendor = byId(state.vendors, bill.vendorId)
  const history = rows(state.approvals).filter(approval => approval.billId === bill.id).sort(recentFirst)
  const items = rows(bill.lineItems)

  return <>
    <PageTitle title={recordNumber(bill)} description={vendorName(state, bill.vendorId)}
      back={back}
      actions={<>
        {canEdit && <ButtonLink variant="secondary" to={recordPath('bills', bill.id) + '/edit'}>Edit bill</ButtonLink>}
        {canEdit && vendor && <button type="button" className="button primary" onClick={() => setDialog('submit')}>Send for approval</button>}
        {canDecide && <>
          <button type="button" className="button secondary" onClick={() => setDialog('denied')}>Deny</button>
          <button type="button" className="button primary" onClick={() => setDialog('approved')}>Approve</button>
        </>}
        {payable(state, bill) && <ButtonLink to={`/payments/new?bill=${encodeURIComponent(bill.id)}`}>Pay bill</ButtonLink>}
      </>} />
    <div className="detail-grid">
      <div className="stack">
        <section>
          <div className="section-head"><h2>Line items</h2></div>
          <DataTable label="Line items" columns={[{ label: 'Description' }, { label: 'Qty', numeric: true }, { label: 'Unit price', numeric: true }, { label: 'Amount', numeric: true }]}
            records={items} empty="No line items to show." render={item => <>
              <td>{item.description || 'Line item'}</td><td className="numeric">{item.quantity ?? '—'}</td>
              <td className="numeric">{money(item.unitPrice)}</td><td className="numeric">{money(item.amount)}</td>
            </>} />
          {bill.memo && <p className="memo">{bill.memo}</p>}
        </section>
        <section>
          <div className="section-head"><h2>Activity</h2></div>
          <ActivityTable records={rows(state.activity).filter(event => event.billId === bill.id)} />
        </section>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>Bill details</h2>
          <DefinitionList entries={[
            ['Vendor', vendor ? <SiteLink to={recordPath('vendors', vendor.id)}>{vendorName(state, vendor.id)}</SiteLink> : 'Unknown vendor'],
            ['Invoice date', dateLabel(bill.invoiceDate)], ['Due date', dateLabel(bill.dueDate)],
            ['Approval', <Status value={bill.approvalStatus} />], ['Payment', <Status value={bill.paymentStatus} />],
          ]} />
          <div className="summary-total"><span>Total (USD)</span><strong>{money(bill.amount)}</strong></div>
        </section>
        <section className="panel">
          <h2>Approval history</h2>
          {history.length ? <ul className="approval-list">{history.map(approval => <li key={approval.id}>
            <div><strong>{userName(state, approval.approverId)}</strong><Status value={approval.status} /></div>
            <small>{dateLabel(approval.decidedAt || approval.createdAt)}</small>
            {approval.decisionNote && <p>{approval.decisionNote}</p>}
          </li>)}</ul> : <Empty>No approvals to show.</Empty>}
        </section>
      </div>
    </div>
    {dialog === 'submit' && <ApproverDialog title="Send for approval" confirmLabel="Send for approval" onClose={close} onSubmit={approverId => {
      const result = transact(submitApproval, bill.id, approverId)
      if (result.state) {
        close()
        notify({ message: 'Bill sent for approval' })
      }
      return result
    }} />}
    {['approved', 'denied'].includes(dialog) && <DecisionDialog approval={current} bill={bill} decision={dialog} onClose={close} />}
  </>
}
