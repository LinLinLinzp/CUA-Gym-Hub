import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { usePaths } from '../navigation.jsx'
import { Button, Icon, PagedTable, Pill, SearchBox, displayDate, titleCase } from '../ui.jsx'
import { campaignMode, findRecord, listPeople, matchesText, programMembers, records, unique } from '../data/model.js'
import { RecordForm } from '../components/RecordForm.jsx'

export const sections = {
  programs: { title: 'Programs', singular: 'program', collection: 'programs', subtitle: 'Organize initiatives and track participation across channels.' },
  lists: { title: 'Lists', singular: 'list', collection: 'lists', subtitle: 'Manage saved audiences and find people by the criteria that matter.' },
  campaigns: { title: 'Smart Campaigns', singular: 'smart campaign', collection: 'smartCampaigns', subtitle: 'Build and monitor audience automation across your programs.' },
}

const option = value => [value, value]
const optionsFor = (items, field) => unique(items.map(item => item[field]).filter(Boolean)).sort().map(option)

function Filter({ label, all, value, options, onChange }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{all}</option>
    {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
  </select>
}

export function Inventory({ section }) {
  const { state } = useWorkspace()
  const { params, path, setQuery, navigate } = usePaths()
  const [creating, setCreating] = useState(false)
  const config = sections[section]
  const items = records(state[config.collection])
  const base = '/' + section
  const programId = section === 'programs' ? null : params.get('programId')
  const scopedProgram = findRecord(state.programs, programId)
  const query = params.get('q') || ''
  const type = params.get('type') || ''
  const channel = params.get('channel') || ''
  const kind = params.get('kind') || ''
  const scope = params.get('scope') || ''
  const mode = params.get('mode') || ''
  const status = params.get('status') || ''
  const showStatus = section === 'campaigns'
  const programNames = new Map(records(state.programs).map(program => [program.id, program.name]))
  const folderNames = new Map(records(state.folders).map(folder => [folder.id, folder.name]))
  const counts = new Map()

  function peopleCount(item) {
    if (!counts.has(item.id)) {
      const people = section === 'programs' ? programMembers(state, item.id) : listPeople(state, item)
      counts.set(item.id, people.length)
    }
    return counts.get(item.id)
  }

  const nameColumn = { key: 'name', label: 'Name', sort: true, className: 'name-column', cell: row =>
    <div className="record-name"><span className={'record-icon ' + section}><Icon name={section} size={16} /></span>
      <div><Link to={path(base + '/' + encodeURIComponent(row.id), { programId })}>{row.name || 'Untitled ' + config.singular}</Link>
        {section === 'programs' && row.status === 'archived' && <span className="archived-label">Archived</span>}</div></div>,
  }
  const updatedColumn = { key: 'updatedAt', label: 'Updated', sort: true, className: 'numeric', cell: row => displayDate(row.updatedAt) }
  const columns = {
    programs: [
      { key: 'type', label: 'Type', sort: true },
      { key: 'channel', label: 'Channel', sort: true, cell: row => row.channel ? <span className="tag">{row.channel}</span> : '—' },
      { key: 'folder', label: 'Folder', sort: true, value: row => folderNames.get(row.folderId), cell: row => folderNames.get(row.folderId) || '—' },
      { key: 'members', label: 'Members', sort: true, className: 'numeric', value: peopleCount, cell: peopleCount },
    ],
    lists: [
      { key: 'kind', label: 'Kind', sort: true, cell: row => <Pill value={row.kind} /> },
      { key: 'scope', label: 'Scope', sort: true, value: row => row.programId ? programNames.get(row.programId) : 'Database',
        cell: row => row.programId ? programNames.get(row.programId) || 'Unavailable program' : 'Database' },
      { key: 'people', label: 'People', sort: true, className: 'numeric', value: peopleCount, cell: peopleCount },
    ],
    campaigns: [
      { key: 'program', label: 'Program', sort: true, value: row => programNames.get(row.programId), cell: row => programNames.get(row.programId) || '—' },
      { key: 'mode', label: 'Mode', sort: true, value: campaignMode, cell: row => <Pill value={campaignMode(row)} /> },
      { key: 'status', label: 'Status', sort: true, cell: row => <Pill value={row.status} /> },
    ],
  }
  const rows = items.filter(item =>
    (!programId || item.programId === programId) && (!type || item.type === type) &&
    (!channel || item.channel === channel) && (!kind || item.kind === kind) &&
    (!scope || (item.programId ? 'program' : 'database') === scope) &&
    (!mode || campaignMode(item) === mode) && (!status || item.status === status) &&
    matchesText(query, item.name, item.description, item.channel, folderNames.get(item.folderId), programNames.get(item.programId)),
  )
  const hasFilters = Boolean(query || type || channel || kind || scope || mode || status || programId)
  const empty = <>{hasFilters ? 'No records match your filters.' : 'No ' + config.title.toLowerCase() + ' yet.'}{' '}
    {hasFilters
      ? <Button className="text-button" onClick={() => navigate(path(base))}>Clear filters</Button>
      : <Button className="text-button" onClick={() => setCreating(true)}>Create a {config.singular}</Button>}
  </>

  return <>
    {scopedProgram && <div className="breadcrumbs">
      <Link to={path('/programs/' + encodeURIComponent(scopedProgram.id), { tab: 'assets' })}>{scopedProgram.name || 'Program'}</Link>
      <Icon name="right" size={13} /><span>{config.title}</span>
    </div>}
    <header className="page-heading">
      <div>

        <h1>{config.title}</h1>
        <p>{scopedProgram ? 'Assets for ' + (scopedProgram.name || 'this program') + '.' : config.subtitle}</p>
      </div>
      <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New {config.singular}</Button>
    </header>
    <PagedTable resetKey={params.toString()} columns={[nameColumn, ...columns[section], updatedColumn]} rows={rows} empty={empty}
      defaultSort={{ key: 'updatedAt', direction: -1 }} toolbar={<>
      <SearchBox label={'Search ' + config.title.toLowerCase()} value={query} onChange={q => setQuery({ q }, { replace: true })} />
      {section === 'programs' && <>
        <Filter label="Type" all="All types" value={type} options={optionsFor(items, 'type')} onChange={value => setQuery({ type: value })} />
        <Filter label="Channel" all="All channels" value={channel} options={optionsFor(items, 'channel')} onChange={value => setQuery({ channel: value })} />
      </>}
      {section === 'lists' && <>
        <Filter label="Kind" all="All kinds" value={kind} options={['static', 'smart'].map(value => [value, titleCase(value)])} onChange={value => setQuery({ kind: value })} />
        <Filter label="Scope" all="All scopes" value={scope} options={[['database', 'Database'], ['program', 'Program']]} onChange={value => setQuery({ scope: value })} />
      </>}
      {section !== 'programs' && <Filter label="Program" all="All programs" value={programId ?? ''} options={[...programNames]} onChange={value => setQuery({ programId: value })} />}
      {showStatus && <>
        <Filter label="Mode" all="All modes" value={mode} options={['batch', 'trigger'].map(value => [value, titleCase(value)])} onChange={value => setQuery({ mode: value })} />
        <Filter label="Status" all="All statuses" value={status} options={optionsFor(items, 'status').map(([value]) => [value, titleCase(value)])} onChange={value => setQuery({ status: value })} />
      </>}
    </>} />
    {creating && <RecordForm section={section} programId={scopedProgram?.id} onClose={() => setCreating(false)}
      onSaved={(id, owner) => navigate(path(base + '/' + encodeURIComponent(id), { programId: scopedProgram ? owner : null }))} />}
  </>
}

