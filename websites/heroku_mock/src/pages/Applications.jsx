import { useState } from 'react'
import { Badge, DateLabel, DialogActions, Empty, FormError, Icon, Modal, Panel, Table, WorkspaceLink, useWorkspaceNavigate } from '../components/ui.jsx'
import { appPath, regions } from '../data/catalog.js'
import { activeApps, useStore } from '../data/store.jsx'

export function matchingApps(apps, query) {
  const term = query.trim().toLowerCase()
  return apps.filter((app) => (app.name ?? app.id).toLowerCase().includes(term))
}

export function Applications() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('name')
  const [creating, setCreating] = useState(false)
  const apps = activeApps(state)
  const results = matchingApps(apps, query).filter((app) => (!region || app.region === region) && (!status || app.status === status))
    .sort((first, second) => {
      const names = (first.name ?? first.id).localeCompare(second.name ?? second.id)
      if (sort === 'name-desc') return -names
      if (sort === 'updated') return (second.updatedAt ?? '').localeCompare(first.updatedAt ?? '') || names
      return names
    })
  const filtered = Boolean(query || region || status || sort !== 'name')
  function clear() {
    setQuery('')
    setRegion('')
    setStatus('')
    setSort('name')
  }

  return <>
    <div className="inventory-heading">
      <div className="heading-texture" aria-hidden="true" />
      <div><h1>Applications</h1><p>Manage the apps in your workspace.</p></div>
      <button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" />New app</button>
    </div>
    <Panel>
      <div className="inventory-tools">
        <label className="search-field"><span className="sr-only">Search applications</span><Icon name="search" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search applications" />
        </label>
        <div className="filter"><label htmlFor="inventory-region">Region</label>
          <select id="inventory-region" value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">All regions</option>
            {Object.entries(regions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="filter"><label htmlFor="inventory-status">Status</label>
          <select id="inventory-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option><option value="active">Active</option><option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="filter"><label htmlFor="inventory-sort">Sort</label>
          <select id="inventory-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="updated">Recently updated</option>
          </select>
        </div>
        {filtered && <button className="button clear-button" onClick={clear}>Clear filters</button>}
      </div>
      {results.length ? <Table label="Applications" columns={['Name', 'Status', 'Region', 'Stack', 'Updated']}>
        {results.map((app) => <tr key={app.id}>
          <th scope="row"><WorkspaceLink className="app-link" to={appPath(app.id)}>
            <span className="row-mark"><Icon name="layers" size={16} /></span>{app.name ?? app.id}
          </WorkspaceLink></th>
          <td><Badge status={app.status} /></td>
          <td>{regions[app.region] ?? '—'}</td>
          <td><code>{app.stack ?? '—'}</code></td>
          <td><DateLabel value={app.updatedAt} /></td>
        </tr>)}
      </Table> : apps.length
        ? <Empty title="No matching applications">Try a different name or clear your filters.</Empty>
        : <Empty title="No applications yet">Create an app to get started.</Empty>}
      <div className="inventory-footer" aria-live="polite">
        {results.length === apps.length
          ? apps.length + (apps.length === 1 ? ' application' : ' applications')
          : results.length + ' of ' + apps.length + ' applications'}
      </div>
    </Panel>
    {creating && <CreateApp onClose={() => setCreating(false)} />}
  </>
}

function CreateApp({ onClose }) {
  const { commit } = useStore()
  const navigate = useWorkspaceNavigate()
  const [name, setName] = useState('')
  const [region, setRegion] = useState('us')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const result = commit({ type: 'create', name, region }, 'Created ' + name + '.')
    if (result.error) setError(result.error)
    else {
      onClose()
      navigate(appPath(result.appId))
    }
  }
  return <Modal title="Create app" description="Choose a name and region for your new application." onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <label className="field">App name
        <input autoFocus autoComplete="off" spellCheck={false} value={name} aria-invalid={Boolean(error)}
          aria-describedby={error ? 'create-app-error' : undefined} onChange={(event) => { setName(event.target.value); setError('') }} />
      </label>
      <FormError id="create-app-error" error={error} />
      <div className="field"><label htmlFor="create-app-region">Region</label>
        <select id="create-app-region" value={region} onChange={(event) => setRegion(event.target.value)}>
          {Object.entries(regions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <DialogActions onClose={onClose} submit="Create app" />
    </form>
  </Modal>
}
