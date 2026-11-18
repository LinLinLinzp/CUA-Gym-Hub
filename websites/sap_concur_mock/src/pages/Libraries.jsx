import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspace } from '../workspace.jsx'
import { EXPENSE, TRAVEL, activeId, approvalPath, categories, dateLabel, docs, documentPath, documentTotal, editable, inbox, isAssigned, lines, list, money, newest, rangeLabel, schemas, statuses, userById } from '../model.js'
import { amountColumn, Badge, Field, Icon, PageHeader, PageLink, Table, usePagination } from '../ui.jsx'

const filterStatuses = ['draft', 'pending_approval', 'sent_back', 'approved', 'paid']
const editableStatus = 'editable'
const documentTitle = document => document.title || document.id || 'Untitled document'

function ownDocuments(state, type) {
  return docs(state, type).filter(document => activeId(state) && document.ownerId === activeId(state))
}

export function Home() {
  const { state } = useWorkspace()
  const reports = ownDocuments(state, EXPENSE)
  const requests = ownDocuments(state, TRAVEL)
  const recent = [...reports.map(doc => ({ ...doc, type: EXPENSE })), ...requests.map(doc => ({ ...doc, type: TRAVEL }))].sort(newest).slice(0, 8)
  const counts = [
    ['/expense?status=editable', reports.filter(editable).length, 'Editable reports'],
    ['/requests?status=editable', requests.filter(editable).length, 'Editable requests'],
    ['/approvals', inbox(state).length, 'Pending approvals'],
  ]
  return <>
    <PageHeader title="Workspace" description="Manage expense reports, plan business travel, and review submissions." />
    <section className="overview">
      <div><h2>Start an expense or travel task</h2>
        <div className="actions">
          <PageLink className="button primary" to="/expense/new"><Icon name="plus" />Create Report</PageLink>
          <PageLink className="button" to="/requests/new"><Icon name="plus" />Create Request</PageLink>
          <PageLink className="button" to="/approvals">Review Approvals<Icon name="arrow" /></PageLink>
        </div>
      </div>
      <div className="waypoints" aria-hidden="true"><i /><i /><i /></div>
    </section>
    <div className="counts panel">
      {counts.map(([to, count, label]) => <PageLink key={label} to={to}><strong>{count}</strong><span>{label}</span><Icon name="arrow" /></PageLink>)}
    </div>
    <section className="stack">
      <h2>Recent documents</h2>
      <Table label="Recent documents" rows={recent} columns={['Document', 'Type', 'Updated', 'Status', amountColumn('Amount')]}
        empty="Your recent reports and requests will appear here."
        renderRow={doc => <tr key={doc.type + doc.id}>
          <td><PageLink className="row-title" to={documentPath(doc.type, doc.id)}>{documentTitle(doc)}</PageLink><small>{doc.id}</small></td>
          <td>{schemas[doc.type].label}</td><td>{dateLabel(doc.updatedAt)}</td><td><Badge status={doc.status} /></td>
          <td className="numeric">{money(documentTotal(doc.type, doc))}</td>
        </tr>} />
    </section>
  </>
}

function matchesSearch(query, ...values) {
  return values.some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
}

function useFilters() {
  const [params, setParams] = useSearchParams()
  function set(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  function reset() {
    const next = new URLSearchParams()
    for (const key of ['sid', 'sort', 'view']) if (params.has(key)) next.set(key, params.get(key))
    setParams(next, { replace: true })
  }
  return { get: key => params.get(key) || '', set, reset }
}

export function Library({ type }) {
  const { state } = useWorkspace()
  const schema = schemas[type]
  const expense = type === EXPENSE
  const { get, set, reset } = useFilters()
  const search = get('q')
  const status = get('status')
  const sort = get('sort')
  const category = get('category')
  const from = get('from')
  const to = get('to')
  const rows = ownDocuments(state, type)
    .filter(doc => matchesSearch(search, doc.title, doc.businessPurpose, doc.id, doc.destination))
    .filter(doc => !status || (status === editableStatus ? editable(doc) : doc.status === status))
    .filter(doc => !category || lines(type, doc).some(line => line.category === category))
    .filter(doc => {
      const date = expense ? doc.reportDate : doc.startDate
      return (!from || (date && date >= from)) && (!to || (date && date <= to))
    })
    .sort((a, b) => {
      if (sort === 'total') return Number(documentTotal(type, b)) - Number(documentTotal(type, a)) || newest(a, b)
      if (sort === 'departure') return String(a.startDate ?? '9999').localeCompare(String(b.startDate ?? '9999')) || newest(a, b)
      return newest(a, b)
    })
  const { visible, footer, resetPage } = usePagination(rows)
  const update = (key, event) => { resetPage(); set(key, event.target.value) }
  return <>
    <PageHeader title={schema.plural} description={expense ? 'Track expenses and reimbursement reports.' : 'Plan trips and track estimated costs.'}
      actions={<PageLink className="button primary" to={schema.path + '/new'}><Icon name="plus" />Create {schema.noun}</PageLink>} />
    <div className="panel toolbar">
      <Field label={'Search ' + schema.plural.toLowerCase()} name="library-search"><input type="search" placeholder={expense ? 'Name, purpose or ID' : 'Name, destination, purpose or ID'} value={search} onChange={event => update('q', event)} /></Field>
      <Field label="Status" name="library-status"><select value={status} onChange={event => update('status', event)}>
        <option value="">All statuses</option><option value={editableStatus}>Editable</option>
        {filterStatuses.filter(key => expense || key !== 'paid').map(key => <option key={key} value={key}>{statuses[key]}</option>)}
      </select></Field>
      <Field label="Sort by" name="library-sort"><select value={sort} onChange={event => update('sort', event)}>
        <option value="">Recently updated</option>{!expense && <option value="departure">Earliest departure</option>}<option value="total">Highest total</option>
      </select></Field>
      {expense && <Field label="Expense type" name="library-category"><select value={category} onChange={event => update('category', event)}>
        <option value="">All types</option>{categories.map(value => <option key={value}>{value}</option>)}
      </select></Field>}
      <Field label={expense ? 'Report date from' : 'Departure from'} name="library-from"><input type="date" value={from} onChange={event => update('from', event)} /></Field>
      <Field label="Through" name="library-to"><input type="date" value={to} onChange={event => update('to', event)} /></Field>
      <button onClick={() => { resetPage(); reset() }} disabled={!(search || status || category || from || to)}>Reset</button>
    </div>
    <Table label={schema.plural} rows={visible} footer={footer}
      columns={expense ? ['Report', 'Business purpose', 'Updated', 'Status', amountColumn('Total')] : ['Request', 'Destination', 'Trip dates', 'Status', amountColumn('Estimated total')]}
      empty="No documents match your filters."
      renderRow={doc => <tr key={doc.id}>
        <td><PageLink className="row-title" to={documentPath(type, doc.id)}>{documentTitle(doc)}</PageLink><small>{doc.id}</small></td>
        {expense ? <><td>{doc.businessPurpose || '—'}</td><td>{dateLabel(doc.updatedAt)}</td></> :
          <><td>{doc.destination || '—'}</td><td>{rangeLabel(doc.startDate, doc.endDate)}</td></>}
        <td><Badge status={doc.status} /></td><td className="numeric">{money(documentTotal(type, doc))}</td>
      </tr>} />
  </>
}

export function ApprovalLibrary() {
  const { state } = useWorkspace()
  const { get, set } = useFilters()
  const history = get('view') === 'history'
  const type = get('type')
  const search = get('q')
  const sort = get('sort')
  const pending = inbox(state)
  const records = history ? list(state.approvals).filter(approval => isAssigned(state, approval) && approval.status !== 'pending') : pending
  const employee = approval => approval.submitterName || userById(state, approval.submitterId)?.name || approval.submitterId
  const rows = records.filter(approval => !type || approval.subjectType === type)
    .filter(approval => matchesSearch(search, approval.subjectTitle, employee(approval), approval.subjectId, approval.id))
    .sort((a, b) => {
      if (sort === 'amount') return Number(b.amount ?? 0) - Number(a.amount ?? 0) || newest(a, b, 'createdAt')
      return sort === 'oldest' ? newest(b, a, 'createdAt') : newest(a, b, 'createdAt')
    })
  const { visible, footer, resetPage } = usePagination(rows)
  const update = (key, value) => { resetPage(); set(key, value) }
  return <>
    <PageHeader title="Approvals" description="Review submissions assigned to you and look up past decisions." />
    <div className="view-switch" aria-label="Approval views">
      <button aria-pressed={!history} onClick={() => update('view', '')}>Pending <span>{pending.length}</span></button>
      <button aria-pressed={history} onClick={() => update('view', 'history')}>History</button>
    </div>
    <div className="panel toolbar">
      <Field label="Search approvals" name="approval-search"><input type="search" placeholder="Title, employee or ID" value={search} onChange={event => update('q', event.target.value)} /></Field>
      <Field label="Document type" name="approval-type"><select value={type} onChange={event => update('type', event.target.value)}>
        <option value="">All types</option>{Object.entries(schemas).map(([key, schema]) => <option key={key} value={key}>{schema.label}</option>)}
      </select></Field>
      <Field label="Sort by" name="approval-sort"><select value={sort} onChange={event => update('sort', event.target.value)}>
        <option value="">Newest submitted</option><option value="oldest">Oldest submitted</option><option value="amount">Highest amount</option>
      </select></Field>
    </div>
    <Table label={history ? 'Approval history' : 'Pending approvals'} rows={visible} footer={footer}
      columns={['Document', 'Type', 'Employee', 'Submitted', 'Status', amountColumn('Amount')]}
      empty={history ? 'No past decisions match your filters.' : 'No pending approvals match your filters.'}
      renderRow={approval => <tr key={approval.id}>
        <td><PageLink className="row-title" to={approvalPath(approval)}>{approval.subjectTitle || approval.subjectId}</PageLink><small>{approval.subjectId} · {approval.id}</small></td>
        <td>{schemas[approval.subjectType]?.label || '—'}</td><td>{employee(approval) || '—'}</td>
        <td>{dateLabel(approval.createdAt)}</td><td><Badge status={approval.status} /></td><td className="numeric">{money(approval.amount)}</td>
      </tr>} />
  </>
}
