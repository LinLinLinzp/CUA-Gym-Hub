import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AppMark, Badge, Dialog, Empty, Filter, Icon, PageTitle, Pagination, RowMenu, Search, SiteLink, usePage, useSiteNavigate,
} from './ui'
import { useWorkspace } from './store'
import {
  actor, appName, byId, connectedZaps, createMeta, dateLabel, editMeta, idFor, includesText, isPublished, items, newest,
  person, replace, stepsUsing, timestamp,
} from './utils/model'

const connectionName = (record) => record.name || record.accountLabel || 'Unnamed connection'
const zapPath = (id) => '/zaps/' + encodeURIComponent(id)
const connectionPath = (id) => '/connections?app=' + encodeURIComponent(id)

function ZapLinks({ zaps }) {
  return zaps.length ? <ul className="dependency-list">{zaps.map((zap) => <li key={zap.id}><SiteLink to={zapPath(zap.id)}>{zap.name || 'Untitled Zap'}</SiteLink></li>)}</ul>
    : <p className="muted">No Zaps use this connection.</p>
}

function ConnectionDialog({ mode, record, close }) {
  const { state, dispatch } = useWorkspace()
  const [name, setName] = useState(mode === 'rename' ? record.name || '' : '')
  const [account, setAccount] = useState('')
  const [appId, setAppId] = useState(record?.appId || '')
  const [issue, setIssue] = useState('')
  const zaps = record ? connectedZaps(state, record.id) : []
  const apps = items(state.apps).filter((app) => app.requiresConnection !== false)
  const actions = {
    add: ['Add connection', 'Add connection'], rename: ['Rename connection', 'Save name'],
    delete: ['Delete connection?', 'Delete connection'], dependencies: ['Linked Zaps', null],
  }
  const [title, action] = actions[mode]

  function submit() {
    if (mode === 'add') {
      const app = byId(apps, appId)
      if (!app || !account.trim()) return setIssue('Choose an app and enter a synthetic account label.')
      dispatch((current) => ({ ...current, connections: [...items(current.connections), {
        id: idFor('con'), appId, name: name.trim() || account.trim(), accountLabel: account.trim(),
        ownerId: actor(current), status: 'active', lastTestResult: null, lastTestedAt: null, lastReconnectedAt: null,
        ...createMeta(current),
      }] }), 'Connection added.')
    }
    if (mode === 'rename') {
      if (!name.trim()) return setIssue('Enter a connection name.')
      dispatch((current) => {
        const live = byId(current.connections, record.id)
        return live ? { ...current, connections: replace(current.connections, { ...live, name: name.trim(), ...editMeta(current) }) } : current
      }, 'Connection renamed.')
    }
    if (mode === 'delete') {
      dispatch((current) => {
        if (!byId(current.connections, record.id)) return current
        const changes = editMeta(current)
        return {
          ...current,
          connections: items(current.connections).filter((entry) => entry.id !== record.id),
          zaps: items(current.zaps).map((zap) => isPublished(zap) && (zap.enabled ?? zap.status === 'on') && stepsUsing(zap.publishedSteps, record.id)
            ? { ...zap, enabled: false, status: 'off', ...changes } : zap),
        }
      }, 'Connection deleted.')
    }
    close()
  }

  return <Dialog title={title} action={action} onSubmit={submit} onClose={close} alert={issue} danger={mode === 'delete'}>
    {mode === 'add' && <>
      <label className="form-field"><span>App</span><select aria-label="App" autoFocus value={appId} onChange={(event) => setAppId(event.target.value)}>
        <option value="">Choose an app</option>{apps.map((app) => <option key={app.id} value={app.id}>{app.name || 'Unnamed app'}</option>)}
      </select></label>
      <label className="form-field"><span>Synthetic account label</span><input autoComplete="off" value={account} onChange={(event) => setAccount(event.target.value)} placeholder="operations@example.test" maxLength={120} /></label>
      <label className="form-field"><span>Display name (optional)</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></label>
    </>}
    {mode === 'rename' && <label className="form-field"><span>Connection name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></label>}
    {mode === 'dependencies' && <><p className="muted">{connectionName(record)}</p><ZapLinks zaps={zaps} /></>}
    {mode === 'delete' && <>
      <p>Remove <strong>{connectionName(record)}</strong> from the workspace? Any enabled Zap using this connection in its published version will turn off.</p>
      <ZapLinks zaps={zaps} />
    </>}
  </Dialog>
}

function AppsView({ appOptions, records, state, onPick }) {
  if (!appOptions.length) return <div className="panel"><Empty title="No apps available" /></div>
  const totals = new Map()
  for (const record of records) totals.set(record.appId, (totals.get(record.appId) || 0) + 1)
  return <div className="apps-grid">{appOptions.map(([id, name]) => {
    const count = totals.get(id) || 0
    return <section className="panel pad apps-card" key={id}>
      <AppMark app={byId(state.apps, id)} /><div><h2>{name}</h2><p className="muted small">{count} {count === 1 ? 'connection' : 'connections'}</p></div>
      <SiteLink className="icon-button apps-link" to={connectionPath(id)} aria-label={'View ' + name + ' connections'} onClick={onPick}><Icon name="right" /></SiteLink>
    </section>
  })}</div>
}
export default function Connections() {
  const { state, dispatch } = useWorkspace()
  const [route] = useSearchParams()
  const navigate = useSiteNavigate()
  const appId = route.get('app') || ''
  const showApps = route.get('view') === 'apps'
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState(null)
  const all = items(state.connections)
  const catalog = new Map(items(state.apps).filter((app) => app.requiresConnection !== false || all.some((record) => record.appId === app.id))
    .map((app) => [app.id, app.name || 'Unnamed app']))
  for (const record of all) if (record.appId && !catalog.has(record.appId)) catalog.set(record.appId, appName(state, record.appId))
  const appOptions = [...catalog].sort((a, b) => a[1].localeCompare(b[1]))
  const filtered = newest(all.filter((record) => (!query.trim() || includesText(query, connectionName(record), record.accountLabel, appName(state, record.appId)))
    && (!status || record.status === status) && (!appId || record.appId === appId)), 'updatedAt')
  const page = usePage(filtered)
  const change = (setter) => (value) => { setter(value); page.setPage(1) }
  const pickApp = change((id) => navigate(id ? connectionPath(id) : '/connections', { replace: true }))

  function maintain(record, mode) {
    const at = timestamp()
    dispatch((current) => {
      const live = byId(current.connections, record.id)
      if (!live) return current
      const patch = mode === 'test'
        ? { lastTestedAt: at, lastTestResult: live.status === 'active' ? 'active' : 'expired' }
        : { lastReconnectedAt: at, status: 'active' }
      return { ...current, connections: replace(current.connections, { ...live, ...patch, ...editMeta(current, at) }) }
    }, mode === 'test' ? 'Connection tested. Result: ' + (record.status === 'active' ? 'Active.' : 'Expired.') : 'Connection reconnected.')
  }

  return <>
    <PageTitle title="App connections" description="Manage the accounts your Zaps use."><button className="primary" onClick={() => setDialog({ mode: 'add' })}><Icon name="plus" />Add connection</button></PageTitle>
    <nav className="tabs" aria-label="Connection views">
      <SiteLink to={appId ? connectionPath(appId) : '/connections'} aria-current={!showApps ? 'page' : undefined}>Connections</SiteLink>
      <SiteLink to={appId ? connectionPath(appId) + '&view=apps' : '/connections?view=apps'} aria-current={showApps ? 'page' : undefined}>Apps</SiteLink>
    </nav>
    {showApps ? <AppsView appOptions={appOptions} records={all} state={state} onPick={() => { setQuery(''); setStatus(''); page.setPage(1) }} /> : <>
    <div className="toolbar">
      <Search label="Search connections" placeholder="Search by connection, account, or app" value={query} onChange={change(setQuery)} />
      <Filter label="Filter by app" first="All apps" options={appOptions} value={appId} onChange={pickApp} />
      <Filter label="Connection status" first="All statuses" options={ [['active', 'Active'], ['expired', 'Expired']] } value={status} onChange={change(setStatus)} />
      {(query || appId || status) && <button onClick={() => { setQuery(''); setStatus(''); pickApp('') }}>Clear filters</button>}
    </div>
    <section className="panel" aria-label="Connection inventory">
      {page.rows.length ? <div className="table-frame connections-table"><table>
        <thead><tr><th scope="col">Connection</th><th scope="col">App</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Linked Zaps</th><th scope="col">Last modified</th><th scope="col" aria-label="Actions" /></tr></thead>
        <tbody>{page.rows.map((record) => {
          const app = byId(state.apps, record.appId)
          const linked = connectedZaps(state, record.id)
          return <tr key={record.id}>
            <td><strong>{connectionName(record)}</strong>{record.accountLabel && record.accountLabel !== connectionName(record) && <div className="muted small">{record.accountLabel}</div>}</td>
            <td><span className="app-token"><AppMark app={app} />{appName(state, record.appId)}</span></td>
            <td><Badge status={record.status} />{record.lastTestedAt && <div className="muted small row-subtitle">Tested {dateLabel(record.lastTestedAt)}{record.lastTestResult ? ' · ' + record.lastTestResult : ''}</div>}</td>
            <td>{person(state, record.ownerId)}</td>
            <td><button type="button" className="text-button" aria-label={'Linked Zaps for ' + connectionName(record)} onClick={() => setDialog({ mode: 'dependencies', record })}>{linked.length} {linked.length === 1 ? 'Zap' : 'Zaps'}</button></td>
            <td className="table-date">{dateLabel(record.updatedAt)}</td>
            <td className="table-actions"><RowMenu label={'Actions for ' + connectionName(record)} actions={[
              ['Rename', () => setDialog({ mode: 'rename', record })],
              ['Test connection', () => maintain(record, 'test')],
              ['Reconnect', () => maintain(record, 'reconnect')],
              ['Delete', () => setDialog({ mode: 'delete', record }), true],
            ]} /></td>
          </tr>
        })}</tbody>
      </table></div> : <Empty title={all.length ? 'No matching connections' : 'No connections yet'}>{all.length ? 'Try a different search or clear your filters.' : 'Add an account connection to use it in a Zap.'}</Empty>}
      <Pagination page={page} label="connections" />
    </section>
    </>}
    {dialog && <ConnectionDialog {...dialog} close={() => setDialog(null)} />}
  </>
}
