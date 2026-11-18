import { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { DataTable, Field, optionsFor, PageHeader, Section } from '../components/Controls.jsx'
import { Audit, DraftField, DraftPicker, FormHeader, RecordFields, Tabs, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import { documentNo, label, nameOf, number, quantity, money, rows } from '../utils/model.js'
import { downloadCsv } from '../utils/csv.js'
import { itemStock, stockMetrics } from '../utils/derived.js'
import { itemDraft, saveItem } from '../utils/masters.js'
import { homePath, listPath, recordPath } from '../utils/routes.js'
import { itemType, PagedTable } from './RecordList.jsx'
import { RelatedRecords } from './TransactionView.jsx'

const stockColumns = (state, report) => [
  ...(report ? [
    { key: 'sku', title: 'SKU', sortValue: ({ item }) => item.itemId, render: ({ item }) => <AppLink to={recordPath('item', item)}>{documentNo(item)}</AppLink> },
    { key: 'item', title: 'Item', sortValue: ({ item }) => label(item), render: ({ item }) => label(item) },
  ] : []),
  { key: 'location', title: 'Location', sortValue: (row) => nameOf(state, 'locations', row.locationId),
    render: (row) => nameOf(state, 'locations', row.locationId) },
  ...[['On Hand', 'onHand'], ['Committed', 'committed'], ['Available', 'available'], ['Backordered', 'backOrdered'],
    ['On Order', 'onOrder'], ['Reorder Point', 'reorderPoint'], ['Preferred Stock Level', 'preferredStockLevel']]
    .map(([title, key]) => ({ key, title, numeric: true, sortValue: (row) => number(row[key]), render: (row) => row[key] == null ? '—' : quantity(row[key]) })),
  { key: 'value', title: 'Value', numeric: true, sortValue: (row) => row.value, render: (row) => money(row.value) },
  { key: 'low', title: 'Reorder', render: (row) => row.low ? 'Below reorder point' : '—' },
]

export function stockRows(state, items, warehouse) {
  const locations = rows(state, 'locations')
  return items.filter((item) => item.type === 'inventoryItem').flatMap((item) => {
    const ids = [...new Set([...locations.map((location) => location.id), ...rows(item, 'locations').map((stock) => stock.locationId)])]
    return ids.filter((id) => id && (!warehouse || warehouse === id))
      .map((locationId) => ({ id: `${item.id}-${locationId}`, item, locationId, ...stockMetrics(state, item, locationId) }))
  })
}

export function StockReport({ title, query }) {
  const { state } = useWorkspace()
  const [search, setSearch] = useState(query.get('q') || '')
  const [locationId, setLocation] = useState(query.get('location') || '')
  const [low, setLow] = useState(query.get('low') === '1')
  const itemQuery = search.toLowerCase().trim()
  const items = rows(state, 'items').filter((item) => !item.inactive && [item.itemId, label(item)].some((field) => String(field || '').toLowerCase().includes(itemQuery)))
  const records = stockRows(state, items, locationId).filter((row) => !low || row.low)
  const columns = stockColumns(state, true)
  const exportable = columns.filter((column) => column.sortValue)
  return <>
    <PageHeader title={title} before={<AppLink to={homePath}>Home</AppLink>} />
    <Section title="Filters"><div className="fields filter-fields">
      <Field label="SKU / Name" value={search} onChange={setSearch} />
      <Field label="Location" value={locationId} options={optionsFor(state, 'locations')} onChange={setLocation} />
      <Field label="Below Reorder Point" type="checkbox" value={low} onChange={setLow} />
    </div></Section>
    <PagedTable key={`${search}:${locationId}:${low}`} records={records} columns={columns}
      tools={<button type="button" disabled={!records.length} onClick={() => downloadCsv('inventory-status',
        exportable.map((column) => column.title), records.map((row) => exportable.map((column) => column.sortValue(row))))}>Export CSV</button>}
      defaultSort={{ key: 'sku', direction: 1 }} />
  </>
}

function ItemForm({ title, code, record }) {
  const { state } = useWorkspace()
  const [draft, change, setDraft] = useDraft(() => itemDraft(state, record))
  const action = useRecordAction(code)
  const main = { draft, change }
  const inventory = draft.type === 'inventoryItem'
  const submit = () => action.run((state) => saveItem(state, draft, record?.id), { message: 'Item successfully saved.' })
  const warehouses = rows(state, 'locations')
  const changeLocation = (id, key, value) => setDraft((old) => {
    const entries = rows(old, 'locations')
    const match = entries.find((row) => row.locationId === id)
    return { ...old, locations: match ? entries.map((row) => row === match ? { ...row, [key]: value } : row) : [...entries, { locationId: id, [key]: value }] }
  })
  return <>
    <FormHeader title={record ? title : 'New Inventory Item'} code={code} record={record} submit={submit} />
    <div className="record-grid single"><Section title="Primary Information"><div className="fields">
      <DraftField {...main} title="Item Name / SKU" name="itemId" required />
      <DraftField {...main} title="Display Name" name="displayName" required />
      <Field label="Type" value={itemType(draft.type)} />
      <DraftField {...main} title="Class" name="classId" options="classes" />
      <DraftField {...main} title="Units Type" name="unitsType" />
      <DraftField {...main} title="Stock Unit" name="stockUnit" />
      <DraftField {...main} title="Sale Unit" name="saleUnit" />
      <DraftField {...main} title="Purchase Unit" name="purchaseUnit" />
      <DraftField {...main} title="Manufacturer" name="manufacturer" />
      <DraftField {...main} title="Manufacturer Part Number" name="mpn" />
      <DraftField {...main} title="UPC Code" name="upcCode" />
      <DraftField {...main} title="Inactive" name="inactive" type="checkbox" />
    </div></Section></div>
    <Tabs tabs={[
      ['Pricing', <div className="fields">
        <DraftField {...main} title="Base Price" name="basePrice" type="number" min="0" step="0.01" />
        <DraftField {...main} title="Purchase Price" name="purchasePrice" type="number" min="0" step="any" />
        <DraftPicker {...main} title="Preferred Vendor" name="preferredVendorId" entries="vendors" />
        <DraftField {...main} title="Taxable" name="taxable" type="checkbox" />
        <DraftField {...main} title="Sales Description" name="salesDescription" type="textarea" />
        <DraftField {...main} title="Purchase Description" name="purchaseDescription" type="textarea" />
      </div>],
      ['Accounting', <div className="fields">{[
        ['Income Account', 'incomeAccountId'], ['COGS Account', 'cogsAccountId'], ['Asset Account', 'assetAccountId'], ['Expense Account', 'expenseAccountId'],
      ].map(([title, name]) => <DraftField key={name} {...main} title={title} name={name} options="accounts" />)}</div>],
      ...(inventory ? [['Locations', <DataTable records={warehouses} columns={[
        { key: 'location', title: 'Location', render: label },
        ...[['On Hand', 'onHand'], ['Reorder Point', 'reorderPoint'], ['Preferred Stock Level', 'preferredStockLevel']].map(([title, key]) => ({
          key, title, numeric: true, render: (location) => key === 'onHand' && record ? quantity(itemStock(record, location.id)?.onHand) :
            <input className="table-input" aria-label={`${title} — ${label(location)}`} type="number" min="0" step="any"
              value={itemStock(draft, location.id)?.[key] ?? ''} onChange={(event) => changeLocation(location.id, key, event.target.value)} />,
        })),
      ]} />]] : []),
    ]} />
    {action.modal}
  </>
}

export default function Inventory(props) {
  const { state } = useWorkspace()
  const { title, record, editing, code } = props
  if (!record || editing) return <ItemForm {...props} />
  return <>
    <PageHeader title={itemType(record.type) === '—' ? title : itemType(record.type)} before={<AppLink to={listPath(code)}>Items</AppLink>}
      identity={`${documentNo(record)} · ${label(record)}`} status={record.inactive ? 'Inactive' : 'Active'}>
      <AppLink className="button primary" to={recordPath(code, record, true)}>Edit</AppLink><AppLink className="button" to={listPath(code)}>Back</AppLink>
      <button type="button" onClick={() => window.print()}>Print</button>
    </PageHeader>
    <div className="record-grid single"><RecordFields items={[
      ['Item Name / SKU', record.itemId], ['Display Name', record.displayName], ['Class', nameOf(state, 'classes', record.classId)],
      ['Preferred Vendor', nameOf(state, 'vendors', record.preferredVendorId)], ['Base Price', money(record.basePrice)],
      ['Purchase Price', money(record.purchasePrice)], ['Average Cost', record.averageCost == null ? '—' : quantity(record.averageCost)],
      ['Last Purchase Price', record.lastPurchasePrice == null ? '—' : money(record.lastPurchasePrice)], ['Stock Unit', record.stockUnit || record.units],
      ['Sales Description', record.salesDescription || record.description],
    ]} /></div>
    <Tabs tabs={[
      ['Locations', <DataTable records={stockRows(state, [record])} columns={stockColumns(state, false)} />],
      ['Related Records', <RelatedRecords record={record} includeItems />],
      ['System Information', <Audit record={record} type="item" />],
    ]} />
  </>
}
