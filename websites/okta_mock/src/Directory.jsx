import { useState } from 'react'
import { Link } from 'react-router-dom'
import { directories, useRouteLink } from './routes'
import { appStatuses, groupSources, label, matches, personName, recordPath, userStatuses } from './model'
import { useWorkspace } from './state'
import { Button, Empty, PageHeader, Paged, Pill, Search, Table, Tile } from './ui'
import { RecordForm } from './RecordForm'

const options = {
  people: { filters: userStatuses, field: 'status', add: 'Add Person', subtitle: 'Manage directory profiles and account status.' },
  groups: { filters: groupSources, field: 'source', add: 'Add Group', subtitle: 'Organize people and manage access by group.' },
  apps: { filters: appStatuses, field: 'status', subtitle: 'Review integrations and manage application access.' },
}
const columns = {
  people: ['Name / username', 'Primary email', 'Department', 'Status'],
  groups: ['Group name', 'Description', 'Source', 'Members'],
  apps: ['Application', 'Category', 'Status', 'People granted directly', 'Groups granted access'],
}

function RecordRow({ kind, record, state, to }) {
  const title = kind === 'people' ? personName(record) : record.name || 'Unnamed record'
  const link = to(recordPath(directories[kind].path, record.id))
  const grants = kind === 'apps' ? state.appAssignments.filter(row => row.appId === record.id) : []
  return <tr>
    <td><div className="record-cell">
      <Tile value={title} kind={kind} category={record.category} />
      <div><Link className="record-link" to={link}>{title}</Link>
        {kind === 'people' && <small className="secondary-line">{record.username || '—'}</small>}
      </div>
    </div></td>
    {kind === 'people' && <><td>{record.email || '—'}</td><td>{record.department || '—'}</td><td><Pill value={record.status} /></td></>}
    {kind === 'groups' && <><td>{record.description || '—'}</td><td><Pill value={record.source} /></td>
      <td>{state.groupMemberships.filter(row => row.groupId === record.id).length}</td></>}
    {kind === 'apps' && <><td>{record.category || '—'}</td><td><Pill value={record.status} /></td>
      <td>{grants.filter(row => row.principalType === 'USER').length}</td>
      <td>{grants.filter(row => row.principalType === 'GROUP').length}</td></>}
  </tr>
}

function Summary({ records, filter, setFilter }) {
  return <div className="panel summary" aria-label="People by status">
    {[[ '', 'All people'], ['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended']].map(([value, title]) =>
      <button key={title} type="button" className="summary-option" aria-pressed={filter === value} onClick={() => setFilter(value)}>
        <span className="summary-label">{title}</span>
        <strong>{value ? records.filter(row => row.status === value).length : records.length}</strong>
      </button>
    )}
  </div>
}

export function Directory({ kind }) {
  const { state } = useWorkspace()
  const to = useRouteLink()
  const { title, collection } = directories[kind]
  const { filters, field, add, subtitle } = options[kind]
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const records = state[collection]
  const rows = records.filter(row => (!filter || row[field] === filter) && (
    kind === 'people' ? matches(query, personName(row), row.username, row.email, row.secondaryEmail) :
      matches(query, row.name, row.description, row.category)
  ))
  return <>
    <PageHeader title={title} subtitle={subtitle}>
      {add && <Button tone="primary" onClick={() => setCreating(true)}><span aria-hidden="true">+</span> {add}</Button>}
    </PageHeader>
    {kind === 'people' && <Summary records={records} filter={filter} setFilter={setFilter} />}
    <section className="panel directory-panel" aria-label={title + ' directory'}>
      <div className="toolbar">
        <Search title={'Search ' + title.toLowerCase()} value={query} onChange={setQuery} />
        <label className="filter"><span id="directory-filter-label">{label(field)}</span>
          <select aria-labelledby="directory-filter-label" value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="">All {field === 'status' ? 'statuses' : 'sources'}</option>
            {filters.map(value => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
      </div>
      <Paged key={JSON.stringify([query, filter])} rows={rows}>{items =>
        items.length ? <Table headers={columns[kind]}>{items.map(record =>
          <RecordRow key={record.id} kind={kind} record={record} state={state} to={to} />,
        )}</Table> : <Empty title={'No ' + title.toLowerCase() + ' found'}
          detail={query || filter ? 'Try another search or clear the filters.' : 'There are no records in this workspace yet.'}>
          {(query || filter) && <Button onClick={() => { setQuery(''); setFilter('') }}>Clear filters</Button>}
        </Empty>
      }</Paged>
    </section>
    {creating && <RecordForm kind={kind} onClose={() => setCreating(false)} />}
  </>
}
