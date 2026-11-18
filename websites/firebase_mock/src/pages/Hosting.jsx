import { useState } from 'react'
import { Badge, Confirm, DialogActions, Empty, Field, Modal, Pagination, Search, ViewHeader, usePagination } from '../components'
import { domainRecords } from '../data/seed'
import { formatDate, newId, newestFirst, searchText, useWorkspace } from '../workspace'

const statusLabels = {
  connected: ['success', 'Connected'],
  needs_setup: ['warning', 'Needs setup'],
  pending: ['warning', 'Pending'],
  minting_certificate: ['warning', 'Minting certificate'],
}
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function AddDomain({ domains, onAdd, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const hostname = searchText(value).trim()
    if (hostname.length > 253 || !domainPattern.test(hostname)) {
      setError('Enter a hostname such as field-notes.example.test.')
    } else if (domains.some((domain) => searchText(domain.hostname) === hostname)) {
      setError('This hostname is already attached to a site.')
    } else onAdd(hostname)
  }
  return <Modal title="Add custom domain" onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <Field label="Domain name" error={error}>{(props) => <input {...props} value={value} placeholder="field-notes.example.test"
        autoCapitalize="none" spellCheck={false} onChange={(event) => setValue(event.target.value)} autoFocus />}</Field>
      <DialogActions onClose={onClose} submit="Add domain" />
    </form>
  </Modal>
}

function SetupRecords({ domain, onClose }) {
  return <Modal title="DNS setup records" onClose={onClose} wide>
    <p className="dialog-copy"><strong>{domain.hostname}</strong></p>
    {domain.dnsRecords?.length ? <div className="table-wrap dns-table">
      <table>
        <thead><tr><th scope="col">Type</th><th scope="col">Host</th><th scope="col">Value</th></tr></thead>
        <tbody>{domain.dnsRecords.map((record) => <tr key={`${record.type}-${record.host}-${record.value}`}>
          <td>{record.type}</td><td><code>{record.host}</code></td><td><code>{record.value}</code></td>
        </tr>)}</tbody>
      </table>
    </div> : <Empty>No DNS records are available for this domain.</Empty>}
    <footer className="dialog-actions"><button type="button" onClick={onClose}>Done</button></footer>
  </Modal>
}

export default function Hosting() {
  const { state, commit } = useWorkspace()
  const sites = state.hostingSites.filter((site) => site.projectId === state.project.id)
  const [siteId, setSiteId] = useState('')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const site = sites.find((entry) => entry.id === siteId) ?? sites[0]
  const releases = site ? state.hostingReleases.filter((row) => row.siteId === site.id).sort(newestFirst) : []
  const domains = site ? state.hostingDomains.filter((row) => row.siteId === site.id) : []
  const live = releases.find((row) => row.id === site?.currentReleaseId)
  const matching = releases.filter((row) => [row.id, row.versionId, row.note, row.kind].some((value) => searchText(value).includes(searchText(query).trim())))
  const releasePager = usePagination(matching, 8)
  const domainPager = usePagination(domains, 8)
  const close = () => setDialog(null)

  function rollback(target) {
    const targetId = newId('release')
    const { id: rollbackTargetReleaseId, versionId, fileCount } = target
    const rolledBackFromReleaseId = site.currentReleaseId ?? null
    commit('hosting.release.rollback', `Rolled back to ${versionId}.`, (current, { createdAt, actorId }) => ({
      targetId, details: { siteId: site.id, rolledBackFromReleaseId, rollbackTargetReleaseId, versionId },
      patch: {
        hostingReleases: [...current.hostingReleases, {
          id: targetId, siteId: site.id, versionId, fileCount, kind: 'rollback', rolledBackFromReleaseId,
          rollbackTargetReleaseId, createdAt, createdBy: actorId,
        }],
        hostingSites: current.hostingSites.map((row) => row.id === site.id && row.projectId === site.projectId
          ? { ...row, currentReleaseId: targetId, updatedAt: createdAt, updatedBy: actorId } : row),
      },
    }))
    close()
  }

  function addDomain(hostname) {
    const targetId = newId('domain')
    const dnsRecords = domainRecords(hostname, targetId)
    commit('hosting.domain.add', `Added ${hostname}.`, (current, { createdAt, actorId }) => ({
      targetId, details: { siteId: site.id, hostname },
      patch: { hostingDomains: [...current.hostingDomains, {
        id: targetId, siteId: site.id, hostname, type: 'custom', status: 'needs_setup', dnsRecords, createdAt, createdBy: actorId,
      }] },
    }))
    domainPager.setPage(Math.ceil((domains.length + 1) / 8))
    setDialog({ type: 'setup', domain: { hostname, dnsRecords } })
  }

  function removeDomain(domain) {
    commit('hosting.domain.remove', `Removed ${domain.hostname}.`, (current) => ({
      targetId: domain.id, details: { siteId: site.id, hostname: domain.hostname },
      patch: { hostingDomains: current.hostingDomains.filter((row) => row.siteId !== site.id || row.id !== domain.id) },
    }))
    close()
  }

  return <>
    <ViewHeader title="Hosting" description="Manage site releases and connected domains.">
      <Field label="Hosting site">{(props) => <select {...props} disabled={!sites.length} value={site?.id ?? ''} onChange={(event) => {
        setSiteId(event.target.value); setQuery(''); releasePager.setPage(1); domainPager.setPage(1)
      }}>
        {!sites.length && <option value="">No sites</option>}
        {sites.map((row) => <option value={row.id} key={row.id}>{row.name || row.id}</option>)}
      </select>}</Field>
    </ViewHeader>
    <section className="panel live-panel" aria-labelledby="live-heading">
      <header className="panel-heading"><h2 id="live-heading">Live release</h2>{live && <Badge tone="success">Live</Badge>}</header>
      {live ? <dl className="live-summary">
        <div><dt>Version</dt><dd><code>{live.versionId || '—'}</code></dd></div>
        <div><dt>Release ID</dt><dd><code>{live.id}</code></dd></div>
        <div><dt>Published</dt><dd>{formatDate(live.createdAt, true)}</dd></div>
        <div><dt>Files</dt><dd>{live.fileCount ?? '—'}</dd></div>
      </dl> : <Empty>{site ? 'No live release is available for this site.' : 'No Hosting sites are available.'}</Empty>}
    </section>
    <div className="panel-stack">
      <section className="panel" aria-labelledby="releases-heading">
        <header className="panel-heading"><h2 id="releases-heading">Release history</h2><small>{releases.length} releases</small></header>
        <div className="controls"><Search label="Search releases" placeholder="Version ID, release ID or note" value={query}
          onChange={(value) => { setQuery(value); releasePager.setPage(1) }} /></div>
        <div className="table-wrap">
          <table className="hosting-table">
            <thead><tr>{['Version', 'Release', 'Type', 'Published', 'Files', 'Actions'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{releasePager.rows.map((release) => <tr key={release.id}>
              <td><code>{release.versionId || '—'}</code></td>
              <td><code>{release.id}</code>{release.note && <small className="table-note">{release.note}</small>}</td>
              <td>{release.kind === 'rollback' ? 'Rollback' : release.kind === 'deploy' ? 'Deploy' : release.kind || '—'}</td>
              <td>{formatDate(release.createdAt, true)}</td><td>{release.fileCount ?? '—'}</td>
              <td>{release.id === live?.id ? <Badge tone="success">Live</Badge> : release.versionId && release.versionId !== live?.versionId &&
                <button onClick={() => setDialog({ type: 'rollback', release })}>Roll back</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!matching.length && <Empty>{releases.length ? 'No releases match your search.' : 'No releases for this site.'}</Empty>}
        <Pagination pager={releasePager} label="releases" />
      </section>
      <section className="panel" aria-labelledby="domains-heading">
        <header className="panel-heading"><h2 id="domains-heading">Domains</h2>
          {site && <button className="primary" onClick={() => setDialog({ type: 'add' })}>Add custom domain</button>}
        </header>
        <div className="table-wrap"><table className="domains-table">
          <thead><tr>{['Domain', 'Type', 'Status', 'Actions'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{domainPager.rows.map((domain) => {
            const [tone, label] = statusLabels[domain.status] ?? ['neutral', 'Status unavailable']
            return <tr key={domain.id}>
              <td className="identifier">{domain.hostname || '—'}</td><td>{domain.type === 'default' ? 'Default' : domain.type === 'custom' ? 'Custom' : '—'}</td>
              <td><Badge tone={tone}>{label}</Badge></td>
              <td>{domain.type === 'custom' && <div className="actions">
                <button onClick={() => setDialog({ type: 'setup', domain })}>View DNS records</button>
                <button className="danger-text" onClick={() => setDialog({ type: 'remove', domain })}>Remove</button>
              </div>}</td>
            </tr>
          })}</tbody>
        </table></div>
        {!domains.length && <Empty>No domains for this site.</Empty>}
        <Pagination pager={domainPager} label="domains" />
      </section>
    </div>
    {dialog?.type === 'rollback' && <Confirm title="Roll back release"
      description={`Set ${dialog.release.versionId} live for ${site.name || site.id}? This creates a new release in the site’s history.`}
      label="Roll back" onClose={close} onConfirm={() => rollback(dialog.release)} />}
    {dialog?.type === 'add' && <AddDomain domains={state.hostingDomains} onAdd={addDomain} onClose={close} />}
    {dialog?.type === 'setup' && <SetupRecords domain={dialog.domain} onClose={close} />}
    {dialog?.type === 'remove' && <Confirm title="Remove custom domain" description={`Remove ${dialog.domain.hostname} from this site?`}
      label="Remove domain" danger onClose={close} onConfirm={() => removeDomain(dialog.domain)} />}
  </>
}
