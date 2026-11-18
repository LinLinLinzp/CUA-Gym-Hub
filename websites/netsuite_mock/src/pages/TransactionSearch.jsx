import { useState } from 'react'
import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { Field, optionsFor, PageHeader, Section, Status } from '../components/Controls.jsx'
import { documentNo, formatDate, linesOf, locationOf, money, nameOf, partyOf, rows, transactions } from '../utils/model.js'
import { homePath, recordPath } from '../utils/routes.js'
import { downloadCsv } from '../utils/csv.js'
import { PagedTable } from './RecordList.jsx'

const blank = { text: '', type: '', start: '', end: '', location: '', status: '', item: '' }
const normalize = (value) => String(value ?? '').toLowerCase()
const csvHeaders = ['Type', 'Document Number', 'Reference No.', 'Date', 'Company', 'Status', 'Location', 'Amount']
const amount = (row) => row.total ?? row.payment ?? row.estimatedTotalValue

export default function TransactionSearch({ title, query }) {
  const { state } = useWorkspace()
  const [draft, setDraft] = useState({ ...blank, text: query.get('q') || '' })
  const [applied, setApplied] = useState(query.get('q') ? draft : null)
  const all = Object.entries(transactions).flatMap(([code, config]) => rows(state, config.key).map((row) => ({ ...row, code })))
  const statuses = [...new Set(all.map((row) => row.status).filter(Boolean))].sort()
  const results = applied && all.filter((row) => {
    if (applied.type && row.code !== applied.type) return false
    if (applied.status && row.status !== applied.status) return false
    if (applied.location && ![locationOf(row), row.toLocationId].includes(applied.location)) return false
    if (applied.item && !linesOf(row).some((line) => line.itemId === applied.item)) return false
    if ((applied.start && (row.tranDate || '') < applied.start) || (applied.end && (row.tranDate || '') > applied.end)) return false
    const text = normalize(applied.text.trim())
    return [documentNo(row), row.tranId, row.otherRefNum, partyOf(state, row), row.memo].some((value) => normalize(value).includes(text))
  })
  const change = (key) => (value) => setDraft({ ...draft, [key]: value })
  const exportRows = () => downloadCsv('transaction-search', csvHeaders, results.map((row) =>
    [transactions[row.code].title, documentNo(row), row.otherRefNum || (row.code === 'vendbill' ? row.tranId : ''), row.tranDate,
      partyOf(state, row), row.status, nameOf(state, 'locations', locationOf(row)), amount(row)]))
  const columns = [
    { key: 'type', title: 'Type', sortValue: (row) => transactions[row.code].title, render: (row) => transactions[row.code].title },
    { key: 'document', title: 'Document Number', sortValue: documentNo, render: (row) => <AppLink to={recordPath(row.code, row)}>{documentNo(row)}</AppLink> },
    { key: 'party', title: 'Company', sortValue: (row) => partyOf(state, row), render: (row) => partyOf(state, row) },
    { key: 'date', title: 'Date', sortValue: (row) => row.tranDate, render: (row) => formatDate(row.tranDate) },
    { key: 'status', title: 'Status', sortValue: (row) => row.status, render: (row) => row.status ? <Status value={row.status} /> : '—' },
    { key: 'total', title: 'Amount', numeric: true, sortValue: amount, render: (row) => amount(row) == null ? '—' : money(amount(row)) },
  ]
  return <>
    <PageHeader title={title} before={<AppLink to={homePath}>Home</AppLink>} />
    <Section title="Criteria"><form onSubmit={(event) => { event.preventDefault(); setApplied({ ...draft }) }}>
      <div className="fields filter-fields">
        <Field label="Number, Company or Memo" value={draft.text} onChange={change('text')} />
        <Field label="Transaction Type" value={draft.type} onChange={change('type')} options={Object.entries(transactions).map(([id, row]) => ({ id, text: row.title }))} />
        <Field label="Status" value={draft.status} onChange={change('status')} options={statuses.map((id) => ({ id, text: id }))} />
        <Field label="Item" value={draft.item} onChange={change('item')} options={optionsFor(state, 'items')} />
        <Field label="Location" value={draft.location} onChange={change('location')} options={optionsFor(state, 'locations')} />
        <Field label="From Date" type="date" value={draft.start} onChange={change('start')} />
        <Field label="To Date" type="date" value={draft.end} onChange={change('end')} />
      </div>
      <div className="toolbar panel-body"><button className="primary">Search</button><button type="button" onClick={() => { setDraft(blank); setApplied(null) }}>Reset</button></div>
    </form></Section>
    {results && <><h2 className="results-title">Results</h2><PagedTable key={JSON.stringify(applied)} records={results} columns={columns}
      rowKey={(row, index) => `${row.code}-${row.id ?? index}`} defaultSort={{ key: 'date', direction: -1 }}
      tools={<button type="button" onClick={exportRows} disabled={!results.length}>Export CSV</button>} /></>}
  </>
}
