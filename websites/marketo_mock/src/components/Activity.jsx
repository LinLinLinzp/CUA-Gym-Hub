import { useWorkspace } from '../store.jsx'
import { records } from '../data/model.js'
import { displayDate, titleCase } from '../ui.jsx'

export function Activity({ entityType, entityId }) {
  const { state } = useWorkspace()
  const entries = records(state.activityLog).filter(entry => entry.entityType === entityType && entry.entityId === entityId)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, 6)

  return <section className="card content-card activity-card">
    <h2>Recent activity</h2>
    {entries.length ? <ul className="activity-list">{entries.map(entry => <li key={entry.id}>
      <div><strong>{titleCase(entry.action?.replaceAll('_', ' ')) || 'Workspace activity'}</strong>
        {!!entry.quantity && <span className="muted"> · {entry.quantity} {entry.quantity === 1 ? 'person' : 'people'}</span>}</div>
      <time dateTime={entry.createdAt}>{displayDate(entry.createdAt, true)}</time>
    </li>)}</ul> : <p className="muted">No activity has been recorded.</p>}
  </section>
}

