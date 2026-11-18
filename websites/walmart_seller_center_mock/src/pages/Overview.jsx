import { date, list, openOrders, route, text, useStore } from '../model.js'
import { Empty, Icon, Panel, Pill, SiteLink } from '../ui.jsx'

export default function Overview() {
  const { state } = useStore()
  const items = list(state.items)
  const unshipped = list(state.orders).filter(openOrders)
  const received = list(state.returns).filter((record) => record.status === 'received')
  const counts = [
    { name: 'Published items', number: items.filter((item) => item.status === 'published').length, icon: 'catalog', to: '/items?status=published', link: 'View published items' },
    { name: 'Unshipped orders', number: unshipped.length, icon: 'orders', to: '/orders', link: 'Open order queue' },
    { name: 'Received returns', number: received.length, icon: 'returns', to: '/returns?view=received', link: 'Review received returns' },
  ]
  const upcoming = [...unshipped].sort((a, b) => String(a.shipByAt ?? '9999').localeCompare(String(b.shipByAt ?? '9999')))

  return <>
    <section className="hero">
      <div className="hero-copy"><div className="hero-line" aria-hidden="true" /><h1>Seller overview</h1><p>Manage listings, fulfill orders, and resolve returns for {state.account?.storeName || 'your store'}.</p></div>
      <div className="hero-art" aria-hidden="true">
        <i className="art-orbit one" /><i className="art-orbit two" /><i className="art-spark first" /><i className="art-spark second" /><i className="art-ground" />
        <i className="art-handle" /><i className="art-frame" /><i className="art-wheel rear" /><i className="art-box"><b /><em /></i><i className="art-wheel front" />
      </div>
    </section>
    <div className="overview-stats">{counts.map((card) => <Panel className="stat" key={card.name}>
      <div className="stat-heading"><span className={'stat-icon ' + card.icon}><Icon name={card.icon} /></span><h2>{card.name}</h2></div>
      <strong>{card.number}</strong>
      <SiteLink to={card.to}>{card.link}<Icon name="right" size={16} /></SiteLink>
    </Panel>)}</div>
    <div className="overview-queues">
      <Queue title="Unshipped orders" rows={upcoming} section="orders" to="/orders" dateField="shipByAt" dateLabel="Ship by" />
      <Queue title="Received returns" rows={received} section="returns" to="/returns?view=received" dateField="receivedAt" dateLabel="Received" />
    </div>
  </>
}

function Queue({ title, rows, section, to, dateField, dateLabel }) {
  return <Panel title={title} action={<SiteLink to={to} className="subtle-link">View queue <Icon name="right" size={15} /></SiteLink>}>
    {rows.length ? <ul className="queue-preview">{rows.slice(0, 4).map((row) => <li key={row.id}>
      <div><SiteLink to={route(section, row.id)}>{row.id}</SiteLink><small>{text(row.customerName)}</small></div>
      <small>{dateLabel} {date(row[dateField])}</small><Pill status={row.status} />
    </li>)}</ul> : <Empty title="Queue is empty">Records will appear here as they enter this queue.</Empty>}
  </Panel>
}
