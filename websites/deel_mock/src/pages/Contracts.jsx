import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { compareDates, contractTypes, find, invoiceStatus, label, list, money, searchMatches, workerFor } from '../data/model.js'
import { cancelContract } from '../data/contracts.js'
import {
  Badge, cols, Confirm, DateText, Facts, Missing, PageTitle, PagedTable, Panel, Person,
  recordPath, RouteLink, Search, Select, Table, useFilters,
} from '../components/ui.jsx'

const back = ['/contracts', 'Back to contracts']
const defaults = { query: '', status: '', type: '', sort: 'new' }
export function termsText(contract) {
  if (contract.type === 'milestone') {
    const count = list(contract.milestones).length
    return count + (count === 1 ? ' milestone' : ' milestones')
  }
  return contract.rate != null ? money(contract.rate, contract.currency) + (contract.rateUnit ? ' / ' + contract.rateUnit : '') : '—'
}

export function Contracts() {
  const { state } = useWorkspace()
  const [filters, set, clear] = useFilters(defaults)
  const workers = new Map(list(state.workers).map(worker => [worker.id, worker]))
  const rows = list(state.contracts).filter(item =>
    (!filters.status || item.status === filters.status) && (!filters.type || item.type === filters.type) &&
    searchMatches(filters.query, workers.get(item.workerId)?.name, item.title, item.number))
    .sort((a, b) => compareDates(a.startDate, b.startDate, filters.sort === 'new' ? -1 : 1))

  return <>
    <PageTitle title="Contracts" description="Find agreements, review terms, and manage signatures."
      actions={<RouteLink className="button primary" to="/contracts/new">Create contract</RouteLink>} />
    <Panel>
      <div className="filters">
        <Search label="Search contracts" value={filters.query} onChange={value => set('query', value)} placeholder="Worker, title, or contract number" />
        <Select label="Status" value={filters.status} onChange={value => set('status', value)}
          options={[[ '', 'All statuses'], ...['draft', 'pending_signature', 'active', 'cancelled'].map(status => [status, label(status)])]} />
        <Select label="Contract type" value={filters.type} onChange={value => set('type', value)} options={[[ '', 'All types'], ...Object.entries(contractTypes)]} />
        <Select label="Start date" value={filters.sort} onChange={value => set('sort', value)} options={[[ 'new', 'Newest first'], ['old', 'Oldest first']]} />
        <button onClick={clear}>Clear filters</button>
      </div>
      <PagedTable rows={rows} resetKey={JSON.stringify(filters)} noun="contracts" caption="Contracts"
        columns={[...cols('Agreement', 'Contractor', 'Type', 'Start date'), { name: 'Payment terms', className: 'numeric' }, ...cols('Status')]}
        render={(item, index) => <tr key={item.id ?? index}>
          <td>{item.id ? <RouteLink to={recordPath('/contracts', item.id)}>{item.title || item.number || 'View contract'}</RouteLink> : item.title || '—'}
            {item.number && <small className="cell-subtitle">{item.number}</small>}</td>
          <td><Person name={workers.get(item.workerId)?.name} /></td>
          <td>{label(item.type)}</td><td><DateText value={item.startDate} /></td>
          <td className="numeric">{termsText(item)}</td><td><Badge status={item.status} /></td>
        </tr>} />
    </Panel>
  </>
}

export function ContractDetail() {
  const { state, commit } = useWorkspace()
  const { id } = useParams()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const contract = find(state.contracts, id)
  if (!contract) return <Missing noun="Contract" back={back} />
  const worker = workerFor(state, contract)
  const entity = find(state.legalEntities, contract.legalEntityId)
  const invoices = list(state.invoices).filter(invoice => invoice.contractId === id)

  async function cancel() {
    const result = await commit(cancelContract(id))
    if (result.error) setError(result.error)
    else setConfirming(false)
  }

  return <>
    <PageTitle title={contract.title || contract.number || 'Contract'} back={back}
      description={contract.number} actions={<>
        <Badge status={contract.status} />
        {contract.status === 'draft' && <RouteLink className="button primary" to={recordPath('/contracts', id) + '/edit'}>Edit draft</RouteLink>}
        {contract.status === 'pending_signature' && <button className="danger-outline" onClick={() => { setError(''); setConfirming(true) }}>Cancel contract</button>}
      </>} />
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Agreement scope">
          <Facts entries={[
            ['Type', label(contract.type)], ['Billing entity', entity?.name],
            ['Start date', <DateText value={contract.startDate} />], ['End date', <DateText value={contract.endDate} />],
            ['Notice period', contract.noticeDays == null ? null : contract.noticeDays + ' days'],
          ]} />
          <p className="prose">{contract.scope || 'No scope provided.'}</p>
        </Panel>
        <Panel title="Payment terms">
          {contract.type === 'milestone' ? <Table rows={list(contract.milestones)} columns={cols('Milestone', 'Due date', 'Amount')}
            empty="No milestones" render={(item, index) => <tr key={item.id ?? index}><td>{item.title || '—'}</td>
              <td><DateText value={item.dueDate} /></td><td>{money(item.amount, contract.currency)}</td></tr>} />
            : <Facts entries={[[ 'Rate', termsText(contract)], ['Currency', contract.currency]]} />}
        </Panel>
        <Panel title="Linked invoices">
          <Table rows={invoices} columns={cols('Invoice', 'Status', 'Total')} empty="No linked invoices"
            render={(item, index) => <tr key={item.id ?? index}>
              <td>{item.id ? <RouteLink to={recordPath('/invoices', item.id)}>{item.number || 'View invoice'}</RouteLink> : item.number || '—'}</td>
              <td><Badge status={invoiceStatus(item)} /></td><td>{money(item.total, item.currency)}</td>
            </tr>} />
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Contractor">
          <Facts entries={[[ 'Name', worker?.name], ['Email', worker?.email], ['Country', worker?.country], ['Role', worker?.role]]} />
        </Panel>
        <Panel title="Signatures">
          <Facts entries={[
            ['Client', contract.clientSignedAt ? <DateText value={contract.clientSignedAt} /> : 'Awaiting signature'],
            ['Contractor', contract.contractorSignedAt ? <DateText value={contract.contractorSignedAt} /> : 'Awaiting signature'],
            ['Invitation sent', <DateText value={contract.sentAt} />], ['Cancelled', <DateText value={contract.cancelledAt} />],
          ]} />
        </Panel>
      </div>
    </div>
    {confirming && <Confirm title="Cancel contract?" confirmLabel="Confirm cancellation" danger error={error}
      onConfirm={cancel} onClose={() => setConfirming(false)}><p>This will cancel the outstanding signature invitation.</p></Confirm>}
  </>
}
