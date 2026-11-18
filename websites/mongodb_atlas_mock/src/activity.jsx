import { Badge, Inventory, displayDate, searchText } from './components.jsx'
import { ProjectLink, scoped, useWorkspace } from './workspace.jsx'

const entities = {
  cluster: ['Cluster', 'clusters', 'name'],
  database_user: ['Database user', 'databaseUsers', 'username'],
  project_user: ['Project user', 'projectUsers', 'email'],
  ip_access: ['IP access', 'ipAccessList', 'address'],
}
const actions = {
  'cluster.created': 'Cluster deployed', 'cluster.updated': 'Configuration updated',
  'cluster.paused': 'Cluster paused', 'cluster.resumed': 'Cluster resumed', 'cluster.terminated': 'Cluster terminated',
  'database_user.created': 'Database user added', 'database_user.updated': 'Database user updated', 'database_user.deleted': 'Database user deleted',
  'project_user.granted': 'Access granted', 'project_user.invited': 'Invitation recorded',
  'project_user.roles_updated': 'Project roles updated', 'project_user.removed': 'Project access removed',
  'project_user.invite_cancelled': 'Invitation cancelled',
  'ip_access.created': 'IP address added', 'ip_access.updated': 'IP access updated', 'ip_access.deleted': 'IP entry deleted',
}

function useActivity() {
  const { state, project } = useWorkspace()
  const records = scoped(state, 'activityLog', project.id).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const targets = Object.fromEntries(Object.entries(entities).map(([type, [, key, field]]) =>
    [type, new Map(scoped(state, key, project.id).map(row => [row.id, row[field] || row.id]))]))
  return {
    records,
    label: row => actions[row.action] || row.action || 'Project activity',
    target: row => targets[row.entityType]?.get(row.entityId) || row.entityId || '—',
    actor: row => row.actorId && row.actorId === state.account?.id ? state.account.name || row.actorId : row.actorId || '—',
  }
}

export function RecentActivity() {
  const { records, label, target, actor } = useActivity()
  return <section className="recent" aria-labelledby="recent-title">
    <div className="section-heading"><h2 id="recent-title">Recent activity</h2><ProjectLink to="/activity">View project activity</ProjectLink></div>
    {records.length ? <ul className="recent-list">
      {records.slice(0, 3).map(row => <li key={row.id}>
        <span><strong>{label(row)}</strong><small className="muted">{target(row)} · {actor(row)}</small></span>
        <time className="muted" dateTime={row.createdAt}>{displayDate(row.createdAt)}</time>
      </li>)}
    </ul> : <p className="muted">No activity in this project yet.</p>}
  </section>
}

export function Activity() {
  const { records, label, target, actor } = useActivity()
  return <Inventory title="Project Activity" description="Review changes to deployments and access in this project."
    records={records} columns={['Action', 'Target', 'Actor', 'Status', 'Time']}
    searchLabel="Search project activity" search={row => searchText(label(row), target(row), actor(row))} name={label}
    filters={[{
      label: 'Entity type', placeholder: 'All entity types',
      options: Object.entries(entities).map(([key, [name]]) => [key, name]), match: (row, value) => row.entityType === value,
    }]}
    render={row => <>
      <td><strong>{label(row)}</strong><small className="muted">{entities[row.entityType]?.[0]}</small></td>
      <td>{target(row)}</td><td>{actor(row)}</td><td><Badge status={row.status} /></td>
      <td><time dateTime={row.createdAt}>{displayDate(row.createdAt)}</time></td>
    </>} />
}
