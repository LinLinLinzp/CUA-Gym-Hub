import { Link } from 'react-router-dom'
import { dateLabel, label, latest, scoped, list } from '../data/records'
import { Empty, Icon, inspectionQuery, PageHead, Status, typeLabel } from '../ui'

export function RecentInspections({ rows, property, to, limit = 8, filterControl }) {
  return <section className="card report">
    <div className="section-heading"><div><h2>Recent inspections</h2><p>Previously inspected URLs for this property.</p></div>{filterControl}</div>
    {rows.length ? <div className="table-scroll"><table>
      <thead><tr><th>URL</th><th>Google Index</th><th>Inspected</th></tr></thead>
      <tbody>{rows.slice(0, limit).map(row => <tr key={row.id}>
        <td>{row.url ? <Link className="mono table-link" to={to('/url-inspection', inspectionQuery(property, row.url, row.id))}>{row.url}</Link> : '—'}</td>
        <td><Status value={row.index?.verdict} /></td><td>{dateLabel(row.createdAt)}</td>
      </tr>)}</tbody>
    </table></div> : <Empty title={filterControl ? 'No matching inspections' : 'No recent inspections'}>
      {filterControl ? 'Choose another verdict or inspect a URL.' : 'URLs you inspect will appear here.'}</Empty>}
  </section>
}

export function Overview({ state, property, to, openSheet }) {
  const pages = scoped(state.pages, property)
  const maps = scoped(state.sitemaps, property).filter(row => row.status !== 'removed')
  const inspections = latest(scoped(state.inspections, property))
  const statuses = [
    ['Indexed', 'indexed', 'good'], ['With issues', 'indexed_with_issues', 'warn'], ['Not indexed', 'not_indexed', 'quiet'],
  ].map(([text, status, tone]) => ({ text, status, tone, count: pages.filter(p => p.index?.verdict === status).length }))
  const other = pages.length - statuses.reduce((total, status) => total + status.count, 0)
  if (other > 0) statuses.push({ text: 'Unknown', status: 'unknown', tone: 'unknown', count: other })
  const issues = maps.filter(row => ['could_not_fetch', 'has_errors'].includes(row.status)).length
  const pending = maps.filter(row => row.status === 'pending').length
  const success = maps.filter(row => row.status === 'success').length
  const shown = list(state.properties).filter(row => row.status !== 'removed').length

  return <>
    <PageHead eyebrow="Workspace" title="Overview" description="Review indexing and sitemap activity for your property."
      actions={<Link className="button" to={to('/properties', { property: property?.id })}><Icon name="globe" />Manage properties</Link>} />
    {!property ? <section className="card"><Empty title="No verified property" icon="globe">Add a property or finish verifying an existing one to open its reports.</Empty>
      <div className="empty-actions"><button className="primary" onClick={() => openSheet()}><Icon name="plus" />Add property</button></div></section> : <>
      <section className="property-banner">
        <div className="banner-art" aria-hidden="true"><i /><i /><i /></div>
        <span className="banner-icon"><Icon size={25} name="globe" /></span>
        <div className="banner-property"><div className="banner-label">ACTIVE PROPERTY</div><h2>{label(property)}</h2></div>
        <div className="banner-meta"><span>{typeLabel(property.type)}</span><Status value="verified" /></div>
      </section>
      <div className="overview-grid">
        <section className="card metric">
          <div className="metric-heading"><span className="icon-tile"><Icon name="report" size={21} /></span><h2>Search indexing</h2></div>
          <div className="metric-total">{pages.length.toLocaleString('en-US')} <span>known URLs</span></div>
          <div className="distribution" aria-hidden="true">{statuses.filter(s => s.count).map(status =>
            <span key={status.text} className={status.tone} style={{ flexGrow: status.count }} />)}</div>
          <div className="legend">{statuses.map(status => <Link key={status.text}
            aria-label={'View recent inspections for ' + status.text.toLowerCase() + ' URLs'}
            to={to('/url-inspection', { property: property.id, verdict: status.status })}>
            <i className={status.tone} />{status.text} <strong>{status.count}</strong>
          </Link>)}</div>
          <Link className="metric-link" to={to('/url-inspection', { property: property.id })}>Open URL Inspection <Icon name="arrow" /></Link>
        </section>
        <section className="card metric">
          <div className="metric-heading"><span className="icon-tile mint"><Icon name="sitemap" size={21} /></span><h2>Sitemaps</h2></div>
          <div className="metric-total">{maps.length.toLocaleString('en-US')} <span>submitted sitemaps</span></div>
          <div className="map-summary">
            {[['Success', success, 'success'], ['Pending', pending, 'pending'], ['Issues', issues, 'issues']].map(([title, count, status]) =>
              <Link key={status} to={to('/sitemaps', { property: property.id, status })}><strong>{count}</strong><span>{title}</span></Link>)}
          </div>
          <Link className="metric-link" to={to('/sitemaps', { property: property.id })}>Open Sitemaps <Icon name="arrow" /></Link>
        </section>
      </div>
      <RecentInspections rows={inspections} property={property} to={to} limit={6} />
      <footer className="page-footer"><Icon name="globe" size={15} />{shown} {shown === 1 ? 'property' : 'properties'} in this account</footer>
    </>}
  </>
}
