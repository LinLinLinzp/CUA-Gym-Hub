import { personName } from './utils/format.js'

export function RoutingPreview({ state, route }) {
  if (!route.reviewerIds.length) return <p className="error">Add a valid reviewer or signed-in administrator before submitting.</p>
  return <div className="form-preview"><strong>Proposed reviewer chain</strong>
    <ol>{route.reviewerIds.map(id => <li key={id}>{personName(state, id)}</li>)}</ol>
    {route.fallback && <p className="muted">The signed-in administrator is the fallback first reviewer.</p>}
  </div>
}
