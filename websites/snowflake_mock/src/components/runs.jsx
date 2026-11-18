import { Details, Pill, Table } from './ui.jsx'
import { formatDate, list } from '../model.js'

export function RunResult({ run }) {
  if (!run) return <div className="empty">Run a SQL statement to see its results here.</div>
  const columns = list(run.columns)
  const rows = list(run.rows)
  const rowCount = run.rowCount ?? rows.length
  return <div className="run-result">
    <div className="result-meta">
      <Pill value={run.status} /><span>{rowCount} {rowCount === 1 ? 'row' : 'rows'}</span><span>{run.durationMs == null ? '—' : run.durationMs + ' ms'}</span>
    </div>
    {run.error ? <p className="notice error" role="alert"><strong>{run.error.code ?? 'Query failed'}</strong>{' '}{run.error.message ?? 'Review the SQL and execution context, then try again.'}</p> :
      columns.length ? <Table caption="Query results" columns={columns}>
        {rows.map((row, i) => <tr key={i}>{columns.map((_, j) => <td key={j} className="mono">{row?.[j] == null ? 'NULL' : String(row[j])}</td>)}</tr>)}
      </Table> : <div className="empty">No result columns were recorded.</div>}
  </div>
}

export function RunDetails({ run, showResult = true }) {
  return <>
    <Details items={[
      ['Worksheet', run.worksheetTitle ?? run.worksheetId], ['Run time', formatDate(run.createdAt)],
      ['Role', run.context?.roleName ?? run.context?.roleId], ['Warehouse', run.context?.warehouseName ?? run.context?.warehouseId],
      ['Database', run.context?.databaseName ?? run.context?.databaseId], ['Schema', run.context?.schemaName ?? run.context?.schemaId],
    ]} />
    <pre className="sql-preview">{run.sql ?? '—'}</pre>
    {showResult && <RunResult run={run} />}
  </>
}
