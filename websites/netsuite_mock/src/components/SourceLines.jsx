import { DataTable } from './Controls.jsx'
import { itemCell } from './RecordUI.jsx'
import { useWorkspace } from '../context/Workspace.jsx'
import { find, money, quantity, number } from '../utils/model.js'
import { onHand } from '../utils/derived.js'

export default function SourceLines({ code, lines, locationId, onChange }) {
  const { state } = useWorkspace()
  const verb = { itemship: 'Fulfill', itemrcpt: 'Receive', vendbill: 'Bill', custinvc: 'Bill' }[code]
  const set = (index, key, value) => onChange(lines.map((line, i) => i === index ? { ...line, [key]: value } : line))
  const sku = (line) => find(state, 'items', line.itemId)?.itemId || line.itemId
  const columns = [
    { key: 'select', title: verb, render: (line, i) => <input type="checkbox" aria-label={`${verb} ${sku(line)}`} checked={line.selected}
      onChange={(event) => set(i, 'selected', event.target.checked)} /> },
    { key: 'item', title: 'Item', render: (line) => itemCell(state, line) },
    { key: 'desc', title: 'Description', render: (line) => line.description || '—' },
    { key: 'remaining', title: 'Remaining Quantity', numeric: true, render: (line) => quantity(line.maximum) },
  ]
  if (code === 'itemship') columns.push({ key: 'onHand', title: 'On Hand', numeric: true, render: (line) => quantity(onHand(state, line.itemId, line.locationId || locationId)) })
  columns.push({ key: 'quantity', title: 'Quantity', numeric: true, render: (line, i) => <input className="table-input" aria-label={`${sku(line)} quantity`} type="number" min="0" step="any"
    disabled={!line.selected} value={line.quantity} onChange={(event) => set(i, 'quantity', event.target.value)} /> })
  if (code !== 'itemship') columns.push({ key: 'rate', title: 'Rate', numeric: true, render: (line) => money(line.rate) },
    { key: 'amount', title: 'Amount', numeric: true, render: (line) => money(number(line.rate) * number(line.quantity)) })
  return <DataTable columns={columns} records={lines} rowKey={(line) => line.orderLineId} empty="No eligible items remain." />
}
