import { useState } from 'react'
import { Dialog, Field, PageTitle, Pill, Table } from '../components/ui.jsx'
import { RunDetails } from '../components/runs.jsx'
import { byId, byRecent, formatDate, list } from '../model.js'
import { useAccount } from '../store.jsx'

const warehouseFilterValue = id => id ? 'warehouse:' + id : 'no-warehouse'

export function QueryHistory() {
  const { state } = useAccount()
  const [status, setStatus] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [selected, setSelected] = useState(null)
  const runs = list(state.queryRuns)
  const warehouseOptions = new Map()
  for (const run of runs) {
    const id = run.context?.warehouseId ?? ''
    if (id) warehouseOptions.set(id, byId(state.warehouses, id)?.name ?? run.context?.warehouseName ?? id)
  }
  const options = [...warehouseOptions].sort((a, b) => a[1].localeCompare(b[1]))
  const matches = runs.filter(run => (!status || status === run.status) &&
    (!warehouse || warehouseFilterValue(run.context?.warehouseId) === warehouse)).reverse().sort(byRecent)

  return <>
    <PageTitle title="Query history" description="Inspect previous query results and execution context." back={{ to: '/worksheets', label: 'Worksheets' }} />
    <div className="toolbar">
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="SUCCEEDED">Succeeded</option><option value="FAILED">Failed</option>
      </select></Field>
      <Field label="Warehouse"><select value={warehouse} onChange={event => setWarehouse(event.target.value)}>
        <option value="">All warehouses</option><option value={warehouseFilterValue(null)}>No warehouse</option>
        {options.map(([id, name]) => <option key={id} value={warehouseFilterValue(id)}>{name}</option>)}
      </select></Field>
    </div>
    <Table caption="Query history" columns={['SQL', 'Worksheet', 'Status', 'Warehouse', 'Rows', 'Run time']}
      empty={!matches.length && (runs.length ? 'No runs match your filters.' : 'No queries have run yet.')}>
      {matches.map(run => <tr key={run.id}>
        <td><button className="link-button sql-summary" onClick={() => setSelected(run)}>{run.sql ?? 'Inspect run'}</button></td>
        <td>{run.worksheetTitle ?? '—'}</td><td><Pill value={run.status} /></td>
        <td className="mono">{run.context?.warehouseName ?? (run.context?.warehouseId ? 'Historical warehouse' : '—')}</td>
        <td className="number">{run.rowCount ?? '—'}</td><td>{formatDate(run.createdAt)}</td>
      </tr>)}
    </Table>
    <div className="list-summary">{matches.length} of {runs.length} runs</div>
    {selected && <Dialog title="Query run" onClose={() => setSelected(null)}>
      <RunDetails run={selected} />
      <div className="form-actions"><button onClick={() => setSelected(null)}>Close</button></div>
    </Dialog>}
  </>
}
