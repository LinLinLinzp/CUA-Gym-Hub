import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { byId, patchRecord, records, roleIn, updated, useStore } from '../store.jsx'
import {
  AppLink, Badge, Confirm, Copy, Empty, ErrorText, Heading, Icon, Info, Missing, Panel, Search, Select, Table,
  Tabs, TextField, contains, dateLabel, numberLabel, orgPath, packagePath,
} from '../ui.jsx'

const pageSize = 12
const columns = [['name', 'Package'], ['version', 'Version'], ['scope', 'Scope'], ['visibility', 'Visibility'],
  ['status', 'Status'], ['downloads', 'Weekly downloads', 'align-end'], ['published', 'Last published']]
const sorters = {
  recent: (a, b) => String(b.lastPublishedAt ?? '').localeCompare(String(a.lastPublishedAt ?? '')),
  name: (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')),
  downloads: (a, b) => (b.weeklyDownloads ?? -1) - (a.weeklyDownloads ?? -1),
}

export function PackageInventory() {
  const { world } = useStore()
  return <>
    <Heading title="Packages" description="Browse and manage the packages in your account." />
    <PackageList packages={records(world.packages)} />
  </>
}

export function PackageList({ packages }) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('')
  const [visibility, setVisibility] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const scopes = [...new Set(packages.map(pkg => pkg.scope).filter(Boolean))].sort()
  const matching = packages.filter(pkg =>
    (contains(pkg.name, search) || contains(pkg.description, search)) &&
    (!scope || (scope === 'unscoped' ? !pkg.scope : pkg.scope === scope)) &&
    (!visibility || pkg.visibility === visibility) &&
    (!status || (pkg.status ?? 'active') === status)
  ).sort(sorters[sort])
  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const updateFilter = (setter) => (value) => { setter(value); setPage(1) }
  const filtered = search || scope || visibility || status

  return <section className="inventory" aria-label="Package inventory">
    <div className="filters">
      <Search label="Search packages" placeholder="Search packages" value={search} onChange={updateFilter(setSearch)} />
      <Select hiddenLabel label="Scope" value={scope} onChange={updateFilter(setScope)} options={[[ '', 'All scopes' ], ['unscoped', 'Unscoped'], ...scopes]} />
      <Select hiddenLabel label="Visibility" value={visibility} onChange={updateFilter(setVisibility)} options={[[ '', 'All visibility' ], 'public', 'private']} />
      <Select hiddenLabel label="Package status" value={status} onChange={updateFilter(setStatus)} options={[[ '', 'All statuses' ], 'active', 'deprecated']} />
      <Select hiddenLabel label="Sort packages" value={sort} onChange={updateFilter(setSort)} options={[[ 'recent', 'Last published' ], ['name', 'Package name'], ['downloads', 'Weekly downloads']]} />
    </div>
    <div className="list-meta" aria-live="polite"><span>{numberLabel(matching.length)} {matching.length === 1 ? 'package' : 'packages'}{filtered ? ' found' : ''}</span></div>
    {matching.length ? <div className="list-surface">
      <Table label="Packages table" headers={columns}>
        {matching.slice(start, start + pageSize).map(pkg => <tr key={pkg.id}>
          <td><div className="row-name"><span className="row-glyph"><Icon name="packages" /></span><div>
            <AppLink className="row-main mono" to={packagePath(pkg.id)}>{pkg.name || 'Unnamed package'}</AppLink>
            {pkg.description && <span className="row-description">{pkg.description}</span>}
          </div></div></td>
          <td className="mono nowrap">{pkg.version ?? '—'}</td>
          <td className="mono">{pkg.scope ?? '—'}</td>
          <td><Badge value={pkg.visibility} /></td><td><Badge value={pkg.status ?? 'active'} /></td>
          <td className="align-end nowrap">{numberLabel(pkg.weeklyDownloads)}</td><td className="nowrap">{dateLabel(pkg.lastPublishedAt)}</td>
        </tr>)}
      </Table>
      <div className="pagination">
        <span>Showing {numberLabel(start + 1)}–{numberLabel(Math.min(start + pageSize, matching.length))} of {numberLabel(matching.length)}</span>
        <div className="actions" aria-label="Package pagination">
          <button type="button" className="button compact" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <span>Page {currentPage} of {pageCount}</span>
          <button type="button" className="button compact" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </div>
    </div> : <Empty title={filtered ? 'No matching packages' : 'No packages yet'}>
      {filtered ? 'Try a different search or filter.' : 'Packages in this workspace will appear here.'}
    </Empty>}
  </section>
}

function packageRights(world, pkg) {
  if (pkg.organizationId) return { owner: roleIn(world, pkg.organizationId) === 'owner', plan: byId(world.organizations, pkg.organizationId)?.plan }
  return { owner: pkg.ownerUserId === world.account.id, plan: world.account.plan }
}

export function PackageDetail({ settings = false }) {
  const { world } = useStore()
  const { packageId } = useParams()
  const { search } = useLocation()
  const pkg = byId(world.packages, packageId)
  if (!pkg) return <Missing title="Package unavailable" to="/packages" label="Return to Packages" />
  const path = packagePath(pkg.id)
  const versions = !settings && new URLSearchParams(search).get('tab') === 'versions'
  return <>
    <Heading title={pkg.name || 'Unnamed package'} description={pkg.description} mono>
      <Badge value={pkg.visibility} /><Badge value={pkg.status ?? 'active'} />
    </Heading>
    {pkg.status === 'deprecated' && <div className="callout"><strong>Deprecated package</strong><p>{pkg.deprecationMessage || 'This package has been deprecated.'}</p></div>}
    <Tabs label="Package views" entries={[[path, 'Overview'], [path + '?tab=versions', 'Versions'], [path + '/settings', 'Settings']]} />
    {settings ? <PackageSettings key={pkg.id + ':' + pkg.visibility} pkg={pkg} /> : versions ? <Versions pkg={pkg} /> : <PackageOverview pkg={pkg} />}
  </>
}

function PackageOverview({ pkg }) {
  const { world } = useStore()
  const org = byId(world.organizations, pkg.organizationId)
  const command = pkg.name ? 'npm install ' + pkg.name : null
  return <>
    <Panel title="Package details">
      <Info entries={[
        ['Current version', pkg.version && <code>{pkg.version}</code>], ['Scope', pkg.scope && <code>{pkg.scope}</code>],
        ['Weekly downloads', numberLabel(pkg.weeklyDownloads)], ['Last published', dateLabel(pkg.lastPublishedAt)],
        ['Organization', org && <AppLink to={orgPath(org.id)}>{org.name || org.scope}</AppLink>],
      ]} />
    </Panel>
    {command && <Panel title="Install"><div className="command"><code>{command}</code><Copy value={command} label="Copy install command" /></div></Panel>}
  </>
}

function Versions({ pkg }) {
  const versions = records(pkg.versions)
  return versions.length ? <Panel title="Published versions">
    <Table label="Published versions table" headers={[[ 'version', 'Version' ], ['tag', 'Tag'], ['date', 'Published']]}>
      {versions.map((version, index) => <tr key={version.version + ':' + index}>
        <td className="mono">{version.version ?? '—'}</td><td>{version.tag ?? '—'}</td><td>{dateLabel(version.publishedAt)}</td>
      </tr>)}
    </Table>
  </Panel> : <Empty title="No versions available" />
}

function PackageSettings({ pkg }) {
  const { world, commit } = useStore()
  const [visibility, setVisibility] = useState(pkg.visibility ?? 'public')
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const { owner, plan } = packageRights(world, pkg)
  const canChange = owner && Boolean(pkg.scope)
  const deprecated = pkg.status === 'deprecated'

  function applyVisibility() {
    commit((state, actor) => {
      const current = byId(state.packages, pkg.id)
      if (!current?.scope || current.visibility === visibility) return state
      const rights = packageRights(state, current)
      if (!rights.owner || (visibility === 'private' && rights.plan !== 'private')) return state
      return patchRecord(state, 'packages', pkg.id, { visibility, ...updated(actor) })
    }, 'Package visibility updated.')
    setDialog(null)
  }

  function applyDeprecation() {
    const reason = message.trim()
    if (dialog === 'deprecate' && (!reason || confirmation !== pkg.name)) {
      setError('Enter a reason and type the exact package name.')
      return
    }
    commit((state, actor) => {
      const current = byId(state.packages, pkg.id)
      if (!current || !packageRights(state, current).owner) return state
      if (dialog === 'deprecate' && current.status !== 'deprecated' && confirmation === current.name) {
        return patchRecord(state, 'packages', pkg.id, { status: 'deprecated', deprecationMessage: reason,
          deprecatedAt: actor.at, deprecatedBy: actor.by, ...updated(actor) })
      }
      if (dialog === 'restore' && current.status === 'deprecated') {
        return patchRecord(state, 'packages', pkg.id, { status: 'active', deprecationMessage: null,
          deprecatedAt: null, deprecatedBy: null, ...updated(actor) })
      }
      return state
    }, dialog === 'restore' ? 'Package restored.' : 'Package deprecated.')
    setDialog(null)
  }

  const visibilityChanged = visibility !== (pkg.visibility ?? 'public')
  return <>
    <Panel title="Package visibility" description="Choose who can access this package.">
      {!owner && <p className="muted">Only package owners can change visibility.</p>}
      {owner && !pkg.scope && <p className="muted">Unscoped packages can only be public.</p>}
      {owner && pkg.scope && plan !== 'private' && <p className="muted">The owner’s Public packages plan does not support private packages.</p>}
      <form className="form-row form-width" onSubmit={event => {
        event.preventDefault()
        if (!canChange || !visibilityChanged || (visibility === 'private' && plan !== 'private')) return
        if (visibility === 'public' && pkg.visibility === 'private') setDialog('publish')
        else applyVisibility()
      }}>
        <Select label="Visibility" value={visibility} onChange={setVisibility} disabled={!canChange}
          options={plan === 'private' || pkg.visibility === 'private' ? ['public', 'private'] : ['public']} />
        <button className="button primary" disabled={!canChange || !visibilityChanged || (visibility === 'private' && plan !== 'private')}>Save visibility</button>
      </form>
    </Panel>
    <Panel title="Deprecation" description="Show an advisory to people who use this package.">
      {owner ? <div className="actions"><button type="button" className={'button ' + (deprecated ? '' : 'danger')} disabled={!pkg.name && !deprecated}
        onClick={() => { setError(''); setMessage(''); setConfirmation(''); setDialog(deprecated ? 'restore' : 'deprecate') }}>
        {deprecated ? 'Restore package' : 'Deprecate package'}
      </button></div> : <p className="muted">Only package owners can change deprecation status.</p>}
    </Panel>
    {dialog === 'publish' && <Confirm title="Make package public?" action="Make public" onConfirm={applyVisibility} onClose={() => setDialog(null)}>
      <p>Anyone will be able to access <code>{pkg.name}</code> after this change.</p>
    </Confirm>}
    {dialog === 'deprecate' && <Confirm title="Deprecate package" action="Confirm deprecation" onConfirm={applyDeprecation} onClose={() => setDialog(null)}>
      <p>Enter a reason and type <code>{pkg.name}</code> to confirm.</p>
      <TextField label="Deprecation message" value={message} onChange={setMessage} multiline maxLength={500} />
      <TextField label="Confirm package name" value={confirmation} onChange={setConfirmation} autoComplete="off" />
      <ErrorText>{error}</ErrorText>
    </Confirm>}
    {dialog === 'restore' && <Confirm title="Restore package?" action="Confirm restore" danger={false} onConfirm={applyDeprecation} onClose={() => setDialog(null)}>
      <p>The deprecation advisory for <code>{pkg.name}</code> will be cleared.</p>
    </Confirm>}
  </>
}
