import { dateLabel, Heading, resourcePath, SiteLink, Table } from './ui.jsx'
import { useWorkspace } from './store.jsx'

export function Overview() {
  const { world } = useWorkspace()
  const resources = [
    ['Droplets', '/droplets', world.droplets.length, '▤'],
    ['Domains', '/networking/domains', world.domains.length, '◎'],
    ['Snapshots', '/snapshots', world.snapshots.length, '◇'],
  ]
  return <>
    <Heading title="Cloud workspace" subtitle={world.account?.teamName || 'Workspace'}
      action={<SiteLink to="/droplets/new" className="button primary">Create Droplet</SiteLink>} />
    <div className="overview-grid">
      <section className="stack">
        <h2>Resources</h2>
        <div className="resource-cards">
          {resources.map(([name, to, count, glyph]) => <SiteLink className="panel resource-card" to={to} key={name}>
            <span className="resource-glyph" aria-hidden="true">{glyph}</span>
            <span>{name}</span><strong>{count}</strong><span className="card-arrow" aria-hidden="true">↗</span>
          </SiteLink>)}
        </div>
        <section className="panel">
          <h2>Projects</h2>
          {!!world.projects.length && <ul className="project-list">
            {world.projects.map(project => <li key={project.id}>
              <div><SiteLink to={`/droplets?project=${encodeURIComponent(project.id)}`}>{project.name || project.id}</SiteLink>
                {project.environment && <small>{project.environment}</small>}</div>
              <span>{world.droplets.filter(droplet => droplet.projectId === project.id).length} Droplets</span>
            </li>)}
          </ul>}
          {!world.projects.length && <p className="results">There are no projects in this workspace.</p>}
        </section>
      </section>
      <div className="blue-panel" aria-hidden="true"><div className="blue-square one" /><div className="blue-square two" /><div className="blue-square three" /></div>
    </div>
    <RecentActivity world={world} />
  </>
}

const activityLabels = {
  'droplet.created': 'Created Droplet',
  'droplet.created_from_snapshot': 'Created Droplet from snapshot',
  'droplet.renamed': 'Renamed Droplet',
  'droplet.powered_on': 'Powered on Droplet',
  'droplet.powered_off': 'Powered off Droplet',
  'droplet.resized': 'Resized Droplet',
  'droplet.destroyed': 'Destroyed Droplet',
  'droplet.restored': 'Restored Droplet',
  'domain.created': 'Added domain',
  'domain.deleted': 'Removed domain',
  'dns_record.created': 'Created DNS record',
  'dns_record.updated': 'Updated DNS record',
  'dns_record.deleted': 'Deleted DNS record',
  'snapshot.created': 'Took snapshot',
  'snapshot.deleted': 'Deleted snapshot',
}

function RecentActivity({ world }) {
  const collections = {
    droplet: world.droplets, domain: world.domains, dns_record: world.dnsRecords, snapshot: world.snapshots,
  }
  const rows = world.activity.toReversed().sort((first, second) =>
    (second.createdAt || '').localeCompare(first.createdAt || '')
  ).slice(0, 12)

  function resource(action) {
    const entity = collections[action.entityType]?.find(row => row.id === action.entityId)
    const record = entity || action.details?.after || action.details?.before
    const label = record?.name || action.details?.before?.name || action.entityId || '—'
    let to
    if (entity && action.entityType === 'droplet') to = resourcePath('/droplets', entity.id)
    if (entity && action.entityType === 'domain') to = resourcePath('/networking/domains', entity.id)
    if (entity && action.entityType === 'snapshot') to = `/snapshots?snapshot=${encodeURIComponent(entity.id)}`
    if (entity && action.entityType === 'dns_record' && world.domains.some(domain => domain.id === entity.domainId)) {
      to = resourcePath('/networking/domains', entity.domainId)
    }
    return to ? <SiteLink to={to}>{label}</SiteLink> : label
  }

  return <section className="activity">
    <div className="section-heading"><h2>Recent activity</h2></div>
    <Table label="Recent activity" columns={['Action', 'Resource', 'Time (UTC)']} rows={rows} empty="Resource changes will appear here."
      renderRow={action => <>
        <td>{activityLabels[action.kind] || action.kind || 'Resource change'}</td>
        <td>{resource(action)}</td>
        <td><time dateTime={action.createdAt}>{dateLabel(action.createdAt, true)}</time></td>
      </>} />
  </section>
}
