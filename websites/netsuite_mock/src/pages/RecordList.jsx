import { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { choices, DataTable, Field, optionsFor, PageHeader, Section, Status } from '../components/Controls.jsx'
import { documentNo, entities, formatDate, label, linesOf, locationOf, money, nameOf, number, partyOf, quantity, records as recordTypes, rows, sum, today } from '../utils/model.js'
import { downloadCsv } from '../utils/csv.js'
import { balanceOf, eligible, overdue } from '../utils/derived.js'
import { homePath, recordPath, sourcePath } from '../utils/routes.js'

const queueConfig = {
  approveSales: { verb: 'Approve', match: (_, row) => row.status === 'Pending Approval' },
  fulfill: { verb: 'Fulfill', child: 'itemship' },
  receive: { verb: 'Receive', child: 'itemrcpt' },
  approvePurchase: { verb: 'Review', match: (_, row) => row.status === 'Pending Supervisor Approval' },
  billSales: { verb: 'Bill', child: 'custinvc' },
  billPurchase: { verb: 'Bill', child: 'vendbill' },
}

const fieldSort = (key) => (row) => row[key]
const numericSort = (read) => (row) => number(read(row))
const text = (value) => String(value ?? '').toLowerCase()
const matches = (needle, ...values) => !needle || values.some((value) => text(value).includes(text(needle)))
const dueDays = (row) => overdue(row) ? Math.round((Date.parse(today()) - Date.parse(row.dueDate)) / 86400000) : 0
const quantityFor = (row) => sum(linesOf(row), (line) => line.adjustQtyBy ?? line.quantity)
const amountFor = (row) => row.total ?? row.payment ?? row.estimatedTotalValue
const hasAmount = (code) => !['itemship', 'invtrnfr'].includes(code)

function documentColumn(code) {
  return { key: 'number', title: 'Document Number', sortValue: documentNo,
    render: (row) => <AppLink to={recordPath(code, row)}>{documentNo(row)}</AppLink> }
}

function transactionColumns(state, code) {
  const config = recordTypes[code]
  const columns = [
    documentColumn(code),
    { key: 'date', title: 'Date', sortValue: fieldSort('tranDate'), render: (row) => formatDate(row.tranDate) },
  ]
  if (config.party) columns.push({ key: 'party', title: config.party === 'customer' ? 'Customer' : 'Vendor',
    sortValue: (row) => partyOf(state, row), render: (row) => partyOf(state, row) })
  columns.push({ key: 'status', title: 'Status', sortValue: fieldSort('status'), render: (row) => row.status ? <Status value={row.status} /> : '—' })
  columns.push({ key: 'location', title: code === 'invtrnfr' ? 'From Location' : 'Location',
    sortValue: (row) => nameOf(state, 'locations', locationOf(row)), render: (row) => nameOf(state, 'locations', locationOf(row)) })
  if (code === 'invtrnfr') columns.push({ key: 'toLocation', title: 'To Location', sortValue: (row) => nameOf(state, 'locations', row.toLocationId),
    render: (row) => nameOf(state, 'locations', row.toLocationId) })
  if (!['custpymt', 'vendpymt', 'vendbill', 'custinvc'].includes(code)) columns.push({ key: 'quantity', title: 'Quantity', numeric: true, sortValue: quantityFor, render: (row) => quantity(quantityFor(row)) })
  if (hasAmount(code)) columns.push({ key: 'total', title: 'Amount', numeric: true, sortValue: numericSort(amountFor), render: (row) => money(amountFor(row)) })
  if (['custinvc', 'vendbill'].includes(code)) {
    columns.push({ key: 'balance', title: 'Amount Remaining', numeric: true, sortValue: numericSort(fieldSort('amountRemaining')), render: (row) => money(row.amountRemaining) })
    columns.push({ key: 'due', title: 'Due Date', sortValue: fieldSort('dueDate'), render: (row) => formatDate(row.dueDate) })
    columns.push({ key: 'overdue', title: 'Days Overdue', numeric: true, sortValue: dueDays, render: (row) => dueDays(row) ? <Status value={`${dueDays(row)} overdue`} /> : '—' })
  }
  return columns
}

function entityColumns(state, code) {
  const item = code === 'item'
  const columns = [
    { key: 'entityId', title: item ? 'SKU' : 'ID', sortValue: documentNo, render: (row) => <AppLink to={recordPath(code, row)}>{documentNo(row)}</AppLink> },
    { key: 'name', title: item ? 'Display Name' : 'Company', sortValue: label, render: label },
  ]
  if (item) {
    columns.push({ key: 'type', title: 'Type', sortValue: fieldSort('type'), render: (row) => itemType(row.type) })
    columns.push({ key: 'onHand', title: 'On Hand', numeric: true, sortValue: (row) => sum(rows(row, 'locations'), (stock) => stock.onHand), render: (row) => quantity(sum(rows(row, 'locations'), (stock) => stock.onHand)) })
    columns.push({ key: 'basePrice', title: 'Base Price', numeric: true, sortValue: numericSort(fieldSort('basePrice')), render: (row) => money(row.basePrice) })
  } else {
    const balance = (row) => balanceOf(state, code === 'vendor' ? 'vendorBills' : 'invoices', row.id)
    columns.push({ key: 'contact', title: 'Contact', sortValue: fieldSort('primaryContact'), render: (row) => row.primaryContact || row.email || '—' })
    columns.push({ key: 'terms', title: 'Terms', sortValue: (row) => nameOf(state, 'terms', row.termsId), render: (row) => nameOf(state, 'terms', row.termsId) })
    columns.push({ key: 'balance', title: 'Balance', numeric: true, sortValue: balance, render: (row) => money(balance(row)) })
  }
  columns.push({ key: 'active', title: 'Status', sortValue: fieldSort('inactive'), render: (row) => <Status value={row.inactive ? 'Inactive' : 'Active'} /> })
  return columns
}

export const itemType = (kind) => ({ inventoryItem: 'Inventory Item', nonInventoryItem: 'Non-Inventory Item', service: 'Service', serviceItem: 'Service' }[kind] || kind || '—')
export const canEdit = (code, row) => !!entities[code] || (['salesord', 'purchord'].includes(code) && row.status !== 'Cancelled')
  || (code === 'custinvc' && row.status === 'Open' && number(row.amountPaid) === 0)

export function PagedTable({ columns, records, defaultSort, rowSize = 50, tools, rowKey, empty }) {
  const [sort, setSort] = useState(defaultSort)
  const [page, setPage] = useState(0)
  const ordered = [...records]
  const sortValue = columns.find((column) => column.key === sort?.key)?.sortValue
  if (sortValue) ordered.sort((a, b) => {
    const left = sortValue(a)
    const right = sortValue(b)
    return sort.direction * (typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'en', { numeric: true }))
  })
  const count = Math.max(1, Math.ceil(records.length / rowSize))
  const activePage = Math.min(count - 1, page)
  const offset = activePage * rowSize
  return <div className="panel">
    <div className="table-toolbar toolbar spread">
      <div className="toolbar">{tools}<span className="muted">{records.length} {records.length === 1 ? 'record' : 'records'}</span></div>
      <div className="toolbar pager">
        <button type="button" aria-label="Previous page" disabled={!activePage} onClick={() => setPage(activePage - 1)}>‹</button>
        <select aria-label="Page" value={activePage} onChange={(event) => setPage(+event.target.value)}>
          {Array.from({ length: count }, (_, i) => <option key={i} value={i}>{records.length ? `${i * rowSize + 1}–${Math.min(records.length, (i + 1) * rowSize)} of ${records.length}` : '0 records'}</option>)}
        </select>
        <button type="button" aria-label="Next page" disabled={activePage + 1 >= count} onClick={() => setPage(activePage + 1)}>›</button>
      </div>
    </div>
    <DataTable columns={columns} records={ordered.slice(offset, offset + rowSize)} rowKey={rowKey} sort={sort} empty={empty}
      onSort={(key) => { setSort({ key, direction: sort?.key === key ? -sort.direction : 1 }); setPage(0) }} />
  </div>
}

export default function RecordList({ title, config, code, queue, query }) {
  const { state } = useWorkspace()
  const entity = !!entities[code]
  const action = queueConfig[queue]
  const [filter, setFilter] = useState({
    status: query.get('status') || '', search: query.get('q') || '', location: query.get('location') || '',
    party: '', start: '', end: '', itemType: '', active: '',
  })
  const [view, setView] = useState('All Records')
  const [revision, setRevision] = useState(0)
  const update = (key, value) => { setFilter({ ...filter, [key]: value }); setRevision(revision + 1) }
  const entries = rows(state, config.key)
  const partyKey = config.party === 'vendor' ? 'vendors' : 'customers'
  const statuses = [...new Set(entries.map((row) => row.status).filter(Boolean))].sort()
  const filtered = entries.filter((row) => {
    if (action && !(action.match ? action.match(state, row) : eligible(state, action.child, row))) return false
    if (!matches(filter.search, documentNo(row), label(row), row.tranId, row.otherRefNum, entity ? row.email : partyOf(state, row))) return false
    if (entity) {
      if ((filter.active === 'Active' || view === 'Active Records') && row.inactive) return false
      if (filter.active === 'Inactive' && !row.inactive) return false
      if (filter.itemType && row.type !== filter.itemType && !(filter.itemType === 'serviceItem' && row.type === 'service')) return false
      return !filter.location || rows(row, 'locations').some((stock) => stock.locationId === filter.location)
    }
    if (filter.status === 'Overdue' && !overdue(row)) return false
    if (filter.status && filter.status !== 'Overdue' && text(row.status) !== text(filter.status)) return false
    if (view === 'Open Records' && ['Cancelled', 'Closed', 'Voided', 'Paid In Full', 'Billed', 'Fully Billed', 'Rejected by Supervisor', 'Cleared', 'Deposited', 'Posted', 'Shipped', 'Received'].includes(row.status)) return false
    if (filter.location && ![locationOf(row), row.toLocationId].includes(filter.location)) return false
    if (filter.party && (row.customerId || row.vendorId) !== filter.party) return false
    return (!filter.start || (row.tranDate || '') >= filter.start) && (!filter.end || (row.tranDate || '') <= filter.end)
  })
  const columns = [
    { key: 'actions', title: action ? 'Action' : 'Edit / View', render: (row) => action
      ? <><AppLink to={action.child ? sourcePath(action.child, row) : recordPath(code, row)}>{action.verb}</AppLink>{action.child && <> · <AppLink to={recordPath(code, row)}>View</AppLink></>}</>
      : <>{canEdit(code, row) && <><AppLink to={recordPath(code, row, true)}>Edit</AppLink> · </>}<AppLink to={recordPath(code, row)}>View</AppLink></> },
    ...(entity ? entityColumns(state, code) : transactionColumns(state, code)),
  ]
  const listRows = Math.max(1, Math.min(200, Math.floor(number(state.preferences?.listRowsPerPage)) || 50))
  const canCreate = entity || ['salesord', 'purchord', 'custinvc', 'custpymt', 'invadjst', 'invtrnfr'].includes(code)
  const exportable = columns.filter((column) => column.sortValue)
  const exportRows = () => downloadCsv(title.toLowerCase().replaceAll(' ', '-'), exportable.map((column) => column.title),
    filtered.map((row) => exportable.map((column) => column.sortValue(row))))
  return <>
    <PageHeader title={title} before={<AppLink to={homePath}>Home</AppLink>}>
      {!action && canCreate && <AppLink className="button primary" to={recordPath(code)}>{code === 'item' ? 'New Inventory Item' : `New ${config.title}`}</AppLink>}
      <Field label="View" options={choices('All Records', entity ? 'Active Records' : 'Open Records')} value={view}
        onChange={(value) => { setView(value || 'All Records'); setRevision(revision + 1) }} />
    </PageHeader>
    <Section title="Filters" className="list-filters">
      <div className="fields filter-fields">
        <Field label={entity ? (code === 'item' ? 'SKU / Name' : 'Company / ID') : 'Document Number'} value={filter.search} onChange={(value) => update('search', value)} />
        {!entity && <Field label="Status" value={filter.status} onChange={(value) => update('status', value)} options={choices(...statuses, ...(['custinvc', 'vendbill'].includes(code) ? ['Overdue'] : []))} />}
        {!entity && config.party && <Field label={config.party === 'customer' ? 'Customer' : 'Vendor'} value={filter.party} onChange={(value) => update('party', value)} options={optionsFor(state, partyKey)} />}
        {(!entity || code === 'item') && <Field label="Location" value={filter.location} onChange={(value) => update('location', value)} options={optionsFor(state, 'locations')} />}
        {!entity && <><Field label="From Date" type="date" value={filter.start} onChange={(value) => update('start', value)} /><Field label="To Date" type="date" value={filter.end} onChange={(value) => update('end', value)} /></>}
        {entity && <Field label="Active Status" value={filter.active} onChange={(value) => update('active', value)} options={choices('Active', 'Inactive')} />}
        {code === 'item' && <Field label="Type" value={filter.itemType} onChange={(value) => update('itemType', value)} options={['inventoryItem','nonInventoryItem','serviceItem'].map((id) => ({ id, text: itemType(id) }))} />}
      </div>
    </Section>
    <PagedTable key={revision} columns={columns} records={filtered} rowSize={listRows}
      tools={<button type="button" onClick={exportRows} disabled={!filtered.length}>Export CSV</button>}
      defaultSort={{ key: entity ? 'entityId' : 'date', direction: entity ? 1 : -1 }} />
  </>
}
