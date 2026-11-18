import { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { DataTable, Field, Picker, pickerEntries } from './Controls.jsx'
import { itemCell } from './RecordUI.jsx'
import { find, formatDate, money, number, quantity, round } from '../utils/model.js'
import { validNumber } from '../utils/ledger.js'

const empty = { itemId: '', quantity: '1', rate: '', description: '', expectedReceiptDate: '' }

export default function LineEditor({ lines, onChange, purchase = false, fail, stock, locationId }) {
  const { state } = useWorkspace()
  const [entry, setEntry] = useState(empty)
  const [index, setIndex] = useState(null)
  const set = (name, value) => setEntry({ ...entry, [name]: value })
  const reset = () => { setEntry(empty); setIndex(null) }
  const edit = (row, i) => { setEntry({ ...row }); setIndex(i) }
  const item = find(state, 'items', entry.itemId)
  const itemEntries = pickerEntries(state, 'items', entry.itemId).filter((option) => !stock || find(state, 'items', option.id)?.type === 'inventoryItem')

  function choose(id) {
    const item = find(state, 'items', id)
    setEntry({ ...entry, itemId: id, rate: item ? (purchase ? item.purchasePrice ?? 0 : item.basePrice ?? 0) : '',
      description: (purchase ? item?.purchaseDescription : item?.salesDescription) || item?.description || item?.displayName || '' })
  }

  function add() {
    if (!item) { fail('Select an item for this line.'); return }
    if (!validNumber(entry.quantity) || (stock?.signed ? number(entry.quantity) === 0 : number(entry.quantity) <= 0)) {
      fail(stock?.signed ? 'Enter a nonzero adjustment quantity.' : 'Quantity must be greater than zero.'); return
    }
    if (!stock && (!validNumber(entry.rate) || number(entry.rate) < 0)) { fail('Rate must be zero or greater.'); return }
    const line = { ...entry, quantity: number(entry.quantity), rate: number(entry.rate),
      amount: round(number(entry.quantity) * number(entry.rate)), taxable: item.taxable !== false }
    onChange(index == null ? [...lines, line] : lines.map((row, i) => i === index ? line : row))
    reset()
  }

  const columns = [
    { key: 'edit', title: 'Line', render: (row, i) => <button className="line-link" type="button" onClick={() => edit(row, i)}>{i + 1} · Edit</button> },
    { key: 'item', title: 'Item', render: (line) => itemCell(state, line) },
    { key: 'quantity', title: stock?.signed ? 'Adjust Qty. By' : 'Quantity', numeric: true, render: (line) => quantity(line.quantity) },
  ]
  if (!stock) columns.push({ key: 'description', title: 'Description' },
    { key: 'rate', title: 'Rate', numeric: true, render: (line) => money(line.rate) },
    { key: 'amount', title: 'Amount', numeric: true, render: (line) => money(line.amount) })
  if (purchase) columns.push({ key: 'expectedReceiptDate', title: 'Expected Receipt Date', render: (line) => formatDate(line.expectedReceiptDate) })
  if (stock) columns.push(...stock.columns)
  return <>
    <DataTable columns={columns} records={lines} rowKey={(line, i) => line.lineId || i} empty="No items added." />
    <div className="line-editor">
      <div className="line-fields">
        <Picker title="Item" entries={itemEntries} value={entry.itemId} onChange={choose} required />
        <Field label={stock?.signed ? 'Adjust Qty. By' : 'Quantity'} type="number" step="any" value={entry.quantity} onChange={(value) => set('quantity', value)} required />
        {!stock && <Field label="Rate" type="number" min="0" step="any" value={entry.rate} onChange={(value) => set('rate', value)} required />}
        {purchase && <Field label="Expected Receipt Date" type="date" value={entry.expectedReceiptDate} onChange={(value) => set('expectedReceiptDate', value)} />}
        {stock?.entry && stock.entry(entry, locationId)}
      </div>
      <div className="toolbar">
        <button type="button" className="primary" onClick={add}>{index == null ? 'Add' : 'OK'}</button>
        {index != null && <><button type="button" onClick={reset}>Cancel Line</button>
          <button type="button" onClick={() => { onChange(lines.filter((_, i) => i !== index)); reset() }}>Remove</button></>}
      </div>
    </div>
  </>
}
