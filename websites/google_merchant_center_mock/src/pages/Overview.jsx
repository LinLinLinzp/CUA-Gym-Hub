import { active, rows, useStore } from '../store.jsx'
import { AppLink, DateText, Empty, Status, feedPath, issuePath, label, newest } from '../ui.jsx'

const statuses = ['approved', 'pending', 'limited', 'disapproved']
export function Overview() {
  const { state } = useStore()
  const products = active(state.products)
  const feeds = active(state.feeds)
  const issues = rows(state.issues).filter((item) => item.status === 'open')
  const counts = statuses.map((status) => ({ status, count: products.filter((product) => product.status === status).length }))
  const otherCount = products.length - counts.reduce((total, item) => total + item.count, 0)
  const breakdown = otherCount ? [...counts, { status: 'unclassified', count: otherCount }] : counts
  const open = [...issues].sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error') || newest(a, b)).slice(0, 4)
  const runs = [...feeds].filter((feed) => feed.lastRunAt).sort((a, b) => String(b.lastRunAt).localeCompare(String(a.lastRunAt))).slice(0, 4)
  const productById = new Map(products.map((product) => [product.id, product]))
  const feedById = new Map(feeds.map((feed) => [feed.id, feed]))

  return <>
    <section className="hero" aria-labelledby="overview-title">
      <div className="hero-copy">
        <p className="eyebrow">Account overview</p>
        <h1 id="overview-title">{state.account?.name || 'Northline Supply Co.'}</h1>
        <p>Manage your product catalog, monitor source updates, and resolve issues affecting your listings.</p>
        <div className="actions"><AppLink to="/products" className="button primary">View products <span aria-hidden="true">↗</span></AppLink><AppLink to="/data-sources" className="button hero-button">Manage data sources</AppLink></div>
      </div>
      <div className="merchant-art" aria-hidden="true">
        <i className="art-sun" /><i className="art-orbit orbit-one" /><i className="art-orbit orbit-two" /><i className="art-platform" />
        <i className="art-bag"><b /></i><i className="art-box"><b /></i><i className="art-vessel"><b /></i>
      </div>
    </section>

    <section className="panel catalog-health" aria-labelledby="catalog-title">
      <div className="panel-heading"><div><h2 id="catalog-title">Catalog status</h2><p>Approval across all markets</p></div><AppLink to="/products" className="text-link">All products <span aria-hidden="true">↗</span></AppLink></div>
      <div className="health-body">
        <div className="health-total"><strong>{products.length}</strong><span>Active products</span></div>
        <div className="health-detail">
          <div className="health-bar" aria-hidden="true">
            {breakdown.filter((item) => item.count).map(({ status, count }) => <span key={status} className={'bar-' + status} style={{ flex: count }} />)}
          </div>
          <div className="health-legend">
            {breakdown.map(({ status, count }) => <AppLink key={status} to={status === 'unclassified' ? '/products' : '/products?status=' + status}><i className={'bar-' + status} /><span>{label(status)}</span><strong>{count}</strong></AppLink>)}
          </div>
        </div>
      </div>
    </section>

    <div className="workspace-grid overview-grid">
      <section className="panel" aria-labelledby="attention-title">
        <div className="panel-heading"><div><h2 id="attention-title">Needs attention</h2><p>{issues.length} open {issues.length === 1 ? 'issue' : 'issues'}</p></div><AppLink to="/issues?status=open" className="text-link">View open issues <span aria-hidden="true">↗</span></AppLink></div>
        {open.length ? <ul className="compact-list">{open.map((issue) => <li key={issue.id}>
          <div><AppLink to={issuePath(issue.id)}>{issue.title || label(issue.code)}</AppLink><small>{productById.get(issue.productId)?.title || feedById.get(issue.feedId)?.name || label(issue.scope)}</small></div><Status value={issue.severity} />
        </li>)}</ul> : <Empty title="No open issues" />}
      </section>
      <section className="panel" aria-labelledby="updates-title">
        <div className="panel-heading"><div><h2 id="updates-title">Recent source updates</h2><p>{feeds.length} active {feeds.length === 1 ? 'source' : 'sources'}</p></div><AppLink to="/data-sources" className="text-link">All sources <span aria-hidden="true">↗</span></AppLink></div>
        {runs.length ? <ul className="compact-list">{runs.map((feed) => <li key={feed.id}>
          <div><AppLink to={feedPath(feed.id) + '?tab=history'}>{feed.name || 'Unnamed source'}</AppLink><small><DateText value={feed.lastRunAt} /></small></div><Status value={feed.status} />
        </li>)}</ul> : <Empty title="No source updates yet" />}
      </section>
    </div>
  </>
}

