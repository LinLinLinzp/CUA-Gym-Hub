import React from 'react'
import { byText, date, effectivePromotion, find, money, recordPath, rows } from './model.js'
import { useStore } from './store.jsx'
import { Icon, LinkTo, Status, eventLabel } from './ui.jsx'

const areas = {
  listing: ['listings', 'title'], order: ['orders', 'orderNumber'], return: ['returns', 'id'], promotion: ['promotions', 'name'],
}

export function Overview() {
  const { state } = useStore()
  const orders = rows(state.orders)
  const listings = rows(state.listings)
  const returnCases = rows(state.returns)
  const now = new Date()
  const awaiting = orders.filter(item => item.status === 'awaiting_shipment').sort((a, b) => byText(b.createdAt, a.createdAt))
  const counts = [
    ['Listings', 'Active listings', listings.filter(item => item.status === 'active').length, '/listings?status=active', 'tag', 'plum'],
    ['Orders', 'Awaiting shipment', awaiting.length, '/orders?status=awaiting_shipment', 'box', 'gold'],
    ['Returns', 'Need a response', returnCases.filter(item => item.status === 'requested').length, '/returns?status=requested', 'return', 'rose'],
    ['Promotions', 'Active promotions', rows(state.promotions).filter(item => effectivePromotion(item, now) === 'active').length, '/promotions?status=active', 'spark', 'green'],
  ]
  const activity = rows(state.activity).sort((a, b) => byText(b.createdAt, a.createdAt)).slice(0, 8)
  return <>
    <section className="welcome">
      <div className="welcome-copy">
        <span className="welcome-date">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)}</span>
        <h1>Welcome, {state.seller?.name || 'seller'}</h1>
        <p>See what needs your attention and manage your inventory.</p>
        <LinkTo to="/listings/new" className="button primary"><Icon name="plus" />Create listing</LinkTo>
      </div>
      <img className="welcome-art" src="/dispatch.svg" alt="" width="408" height="224" />
    </section>
    <section className="section">
      <h2>Your work queues</h2>
      <div className="metrics">{counts.map(([title, caption, count, path, icon, tone]) =>
        <LinkTo to={path} className="panel metric" key={title}>
          <div className="metric-top"><span className={'metric-icon ' + tone}><Icon name={icon} /></span><span>{title}</span><Icon name="arrow" size={16} /></div>
          <strong>{count}</strong><span className="muted">{caption}</span>
        </LinkTo>)}</div>
    </section>
    <div className="overview-grid section">
      <section className="panel overview-orders">
        <div className="section-head"><div><h2>Orders to ship</h2><p>Paid orders awaiting shipment</p></div><LinkTo to="/orders?status=awaiting_shipment">View orders <Icon name="arrow" size={16} /></LinkTo></div>
        {awaiting.length ? <div className="table-scroll" role="region" aria-label="Orders to ship table" tabIndex={0}><table><thead><tr><th>Order</th><th>Buyer</th><th>Date</th><th className="numeric">Total</th></tr></thead>
          <tbody>{awaiting.slice(0, 5).map((order, index) => <tr key={order.id || index}>
            <td>{order.id ? <LinkTo to={recordPath('orders', order.id)}>{order.orderNumber || order.id}</LinkTo> : order.orderNumber || 'Order'}
              <small>{rows(order.lines)[0]?.title}</small></td>
            <td>{order.buyer?.name || '—'}</td><td>{date(order.createdAt)}</td><td className="numeric">{money(order.total)}</td>
          </tr>)}</tbody></table></div> : <div className="empty"><h3>You're caught up</h3><p>No orders are awaiting shipment.</p></div>}
      </section>
      <section className="panel padded overview-activity">
        <h2>Recent activity</h2>
        {activity.length ? <ul className="history">{activity.map((item, index) => {
          const [key, label] = areas[item.entityType] || []
          const record = key && find(state[key], item.entityId)
          return <li key={item.id || index}><span className="history-icon"><Icon name="clock" size={15} /></span><div>
            <strong>{eventLabel(item.type)}</strong>
            {record ? <LinkTo to={recordPath(key, item.entityId)}>{record[label] || item.entityId}</LinkTo> : item.entityId && <span>{item.entityId}</span>}
            <small>{date(item.createdAt, true)}</small>
          </div></li>
        })}</ul> : <p className="muted">No seller activity yet.</p>}
      </section>
    </div>
  </>
}
