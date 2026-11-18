import React, { useState } from 'react'
import { byRecent, cents, date, dayKey, money, nameOf, ref, rows } from '../model.js'
import { useStore } from '../store.jsx'
import { Header, options, RouteLink, Select, Status, Table } from '../ui.jsx'
import { orderPath } from './Orders.jsx'
import { balanceAt, canTransferAt, TransferDialog } from './Payouts.jsx'

const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const openStatuses = new Set(['new', 'in_progress', 'ready'])
function lastSevenDays() {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index)
    return { key: dayKey(day), label: weekday.format(day), date: date(day), amount: 0 }
  })
}

export function Overview() {
  const { state } = useStore()
  const locations = rows(state.locations)
  const [selected, setSelected] = useState('')
  const [transfer, setTransfer] = useState(false)
  const locationId = locations.some((location) => location.id === selected) ? selected : locations[0]?.id || ''
  const currency = state.account?.currency || 'USD'
  const balance = balanceAt(state, locationId)
  const days = lastSevenDays()
  const sales = new Map(days.map((day) => [day.key, day]))
  if (locationId) rows(state.payments).forEach((payment) => {
    if (payment.status !== 'paid' || payment.locationId !== locationId) return
    const day = sales.get(dayKey(payment.createdAt))
    if (day) day.amount += Math.max(0, cents(payment.amount) ?? 0)
  })
  const total = days.reduce((sum, day) => sum + day.amount, 0)
  const orders = rows(state.orders).filter((order) => locationId && order.locationId === locationId).sort(byRecent)
  const open = orders.filter((order) => openStatuses.has(order.status)).length
  const transferable = canTransferAt(state, locationId)
  return <>
    <Header title="Overview" subtitle="A snapshot of sales, fulfillment and available funds." action={<Select title="Location" value={locationId} change={setSelected} options={options(locations)} empty={locations.length ? undefined : 'No locations'} disabled={!locations.length} />} />
    <div className="grid overview">
      <div className="stack">
        <section className="card sales-card">
          <div className="section-heading"><h2>Sales activity</h2><span className="muted small">Last 7 days</span></div>
          <div className="metrics">
            <div><span>Paid sales</span><p className="metric">{money(total / 100, currency)}</p></div>
            <div><span>Open orders</span><p className="metric">{open}</p></div>
          </div>
          <SalesChart days={days} currency={currency} />
        </section>
        <section className="card list-card">
          <div className="list-meta"><h2>Recent orders</h2><RouteLink to="/orders">View all orders →</RouteLink></div>
          <Table label="Recent orders" headings={['Order', 'Customer', '$Total', 'Status']} entries={orders.slice(0, 5)} empty="No orders at this location." render={(order, index) => <tr key={order.id ?? index}>
            <td>{order.id ? <RouteLink to={orderPath(order.id)}>{ref(order, 'orderNumber')}</RouteLink> : ref(order, 'orderNumber')}</td><td>{order.customerName || 'Guest'}</td>
            <td className="number">{money(order.totalAmount, order.currency)}</td><td><Status value={order.status} /></td>
          </tr>} />
        </section>
      </div>
      <aside className="stack">
        <section className="card overview-balance">
          <h2>Available balance</h2>
          <p className="metric">{money(balance?.availableAmount, balance?.currency || currency)}</p>
          <p className="muted">{nameOf(locations, locationId, 'No location selected')}</p>
          <div className="side-actions"><button className="button primary" disabled={!transferable} onClick={() => setTransfer(true)}>Transfer now</button></div>
          {!transferable && <p className="muted small transfer-hint">A linked destination and sufficient funds are required.</p>}
          <RouteLink to="/payouts">View payouts →</RouteLink>
        </section>
        <section className="card">
          <h2>Item library</h2>
          <p className="muted">Add products and manage catalog availability.</p>
          <div className="side-actions"><RouteLink className="button secondary" to="/items/new">+ Create item</RouteLink></div>
        </section>
      </aside>
    </div>
    {transfer && <TransferDialog initialLocation={locationId} close={() => setTransfer(false)} />}
  </>
}

function SalesChart({ days, currency }) {
  const ceiling = Math.max(10000, Math.ceil(Math.max(...days.map((day) => day.amount)) / 10000) * 10000)
  return <div className="chart" role="img" aria-label={'Daily paid sales. ' + days.map((day) => day.date + ' ' + money(day.amount / 100, currency)).join(', ')}>
    <div className="chart-scale" aria-hidden="true"><span>{money(ceiling / 100, currency)}</span><span>{money(ceiling / 200, currency)}</span><span>{money(0, currency)}</span></div>
    <div className="chart-display" aria-hidden="true">
      <svg viewBox="0 0 600 128" preserveAspectRatio="none" className="chart-line">
        <path d={days.map((day, index) => (index ? 'L' : 'M') + (index * 100) + ' ' + (120 - day.amount / ceiling * 112)).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {days.map((day, index) => <i className="chart-point" key={day.key} title={day.date + ' · ' + money(day.amount / 100, currency)} style={{ left: (index / 6 * 100) + '%', top: ((120 - day.amount / ceiling * 112) / 128 * 100) + '%' }} />)}
      <div className="chart-days">{days.map((day) => <span key={day.key}>{day.label}</span>)}</div>
    </div>
  </div>
}
