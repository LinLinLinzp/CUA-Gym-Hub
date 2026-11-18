import { AppLink } from '../components/Navigation.jsx'
import { DataTable, PageHeader } from '../components/Controls.jsx'
import { Audit, LineTable, RecordFields, Summary, Tabs } from '../components/RecordUI.jsx'
import { RelatedLink } from '../components/Shell.jsx'
import { useWorkspace } from '../context/Workspace.jsx'
import { codeOf, documentNo, find, formatDate, locationOf, money, nameOf, partyOf, records, rows } from '../utils/model.js'
import { overdue } from '../utils/derived.js'
import { listPath, recordPath } from '../utils/routes.js'

export function RelatedRecords({ record, includeItems = false }) {
  const { state } = useWorkspace()
  const related = Object.entries(records).filter(([, config]) => !config.directory).flatMap(([code, config]) => rows(state, config.key)
    .filter((row) => row.id !== record.id && (row.createdFromId === record.id || row.id === record.createdFromId || row.customerId === record.id || row.vendorId === record.id ||
      (includeItems && rows(row, 'lines').some((line) => line.itemId === record.id)) ||
      rows(row, 'applied').some((entry) => entry.invoiceId === record.id || entry.billId === record.id) ||
      rows(record, 'applied').some((entry) => entry.invoiceId === row.id || entry.billId === row.id)))
    .map((row) => ({ ...row, code })))
  return <DataTable records={related} columns={[
    { key: 'record', title: 'Transaction', render: (row) => <AppLink to={recordPath(row.code, row)}>{documentNo(row)}</AppLink> },
    { key: 'type', title: 'Type', render: (row) => records[row.code].title },
    { key: 'date', title: 'Date', render: (row) => formatDate(row.tranDate) },
    { key: 'status', title: 'Status' }, { key: 'total', title: 'Amount', numeric: true, render: (row) => row.total != null || row.payment != null ? money(row.total ?? row.payment) : '—' },
  ]} />
}

export default function TransactionView({ title, code, config, record, actions, extraFields = [], tabs, summary }) {
  const { state } = useWorkspace()
  const source = records[codeOf(record.createdFromType)]
  const parent = source && find(state, source.key, record.createdFromId)
  const partyKey = config.party === 'vendor' ? 'vendors' : 'customers'
  const party = config.party && find(state, partyKey, record.customerId || record.vendorId)
  const partyText = config.party ? partyOf(state, record) : ''
  const location = locationOf(record)
  return <>
    <PageHeader title={title} before={<AppLink to={listPath(code)}>{config.plural}</AppLink>}
      status={record.status} badge={overdue(record) ? 'Overdue' : undefined} identity={[documentNo(record), partyText].filter(Boolean).join(' · ')}>
      {actions}<AppLink className="button" to={listPath(code)}>Back</AppLink>
      <button type="button" onClick={() => window.print()}>Print</button>
    </PageHeader>
    <div className={`record-grid ${summary || record.total != null ? '' : 'single'}`}>
      <RecordFields items={[
        ...(config.party ? [[config.party === 'vendor' ? 'Vendor' : 'Customer',
          party ? <AppLink to={recordPath(config.party === 'vendor' ? 'vendor' : 'custjob', party)}>{partyText}</AppLink> : partyText]] : []),
        ['Date', formatDate(record.tranDate)], ['Posting Period', record.postingPeriod],
        ...(record.createdFromId ? [['Created From', <RelatedLink type={record.createdFromType} record={parent}>{parent ? undefined : record.createdFromId}</RelatedLink>]] : []),
        ...(code === 'vendbill' ? [['Reference No.', record.tranId]] : []),
        ...(location ? [[code === 'invtrnfr' ? 'From Location' : 'Location', nameOf(state, 'locations', location)]] : []),
        ...(record.dueDate ? [['Due Date', formatDate(record.dueDate)]] : []),
        ...(record.termsId ? [['Terms', nameOf(state, 'terms', record.termsId)]] : []),
        ...(record.trackingNumbers ? [['Tracking Numbers', record.trackingNumbers]] : []),
        ...extraFields, ['Memo', record.memo],
      ]} />
      {(summary || record.total != null) && <Summary values={summary || [['Total', record.total, true],
        ...(record.amountRemaining != null ? [['Amount Remaining', record.amountRemaining]] : [])]} />}
    </div>
    <Tabs tabs={[
      ...(tabs || [['Items', <LineTable record={record} code={code} />]]),
      ['Related Records', <RelatedRecords record={record} />],
      ['System Information', <Audit record={record} type={config.type} />],
    ]} />
  </>
}
