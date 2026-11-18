import { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { DataTable, Field, optionsFor, PageHeader, Section } from '../components/Controls.jsx'
import { useRecordAction } from '../components/RecordUI.jsx'
import { documentNo, label, number, quantity, rows } from '../utils/model.js'
import { orderItems, preferredVendor, suggestedQuantity } from '../utils/reorder.js'
import { listPath, recordPath } from '../utils/routes.js'
import { stockRows } from './Inventory.jsx'

export default function Reorder({ title }) {
  const { state } = useWorkspace()
  const [location, setLocation] = useState(state.preferences?.defaultLocationId || rows(state, 'locations')[0]?.id || '')
  const [selection, setSelection] = useState({})
  const action = useRecordAction('purchord')
  const candidates = location ? stockRows(state, rows(state, 'items').filter((item) => !item.inactive), location).filter((row) => row.low) : []
  const selected = candidates.filter(({ item }) => item.id in selection).map(({ item }) => ({ itemId: item.id, quantity: selection[item.id] }))
  const set = (id, amount) => setSelection((old) => {
    const next = { ...old }
    if (amount == null) delete next[id]
    else next[id] = amount
    return next
  })
  return <>
    <PageHeader title={title} before={<AppLink to={listPath('purchord')}>Purchase Orders</AppLink>}>
      <button className="primary" type="button" disabled={!selected.length} onClick={() =>
        action.run((latest) => orderItems(latest, location, selected), { go: 'list', message: 'Purchase orders successfully saved.' })}>Order Selected Items</button>
    </PageHeader>
    <Section title="Filters"><div className="fields"><Field label="Location" options={optionsFor(state, 'locations')} value={location}
      onChange={(value) => { setLocation(value); setSelection({}) }} /></div></Section>
    <section className="panel">
      <DataTable records={candidates} columns={[
        { key: 'select', title: 'Order', render: (row) => <input type="checkbox" aria-label={`Order ${documentNo(row.item)}`} checked={row.item.id in selection}
          disabled={!preferredVendor(state, row) || !!preferredVendor(state, row)?.inactive}
          onChange={(event) => set(row.item.id, event.target.checked ? suggestedQuantity(row) : null)} /> },
        { key: 'item', title: 'Item', render: (row) => <AppLink to={recordPath('item', row.item)}>{documentNo(row.item)} · {label(row.item)}</AppLink> },
        { key: 'vendor', title: 'Preferred Vendor', render: (row) => label(preferredVendor(state, row)) },
        ...[['Available', 'available'], ['On Order', 'onOrder'], ['Reorder Point', 'reorderPoint']].map(([title, key]) =>
          ({ title, key, numeric: true, render: (row) => quantity(number(row[key])) })),
        { key: 'quantity', title: 'Quantity', numeric: true, render: (row) => <input className="table-input" type="number" aria-label={`${documentNo(row.item)} order quantity`}
          value={selection[row.item.id] ?? suggestedQuantity(row)} disabled={!(row.item.id in selection)} min="0" step="any"
          onChange={(event) => set(row.item.id, event.target.value)} /> },
      ]} empty="No items are below their reorder point at this location." />
    </section>
    {action.modal}
  </>
}
