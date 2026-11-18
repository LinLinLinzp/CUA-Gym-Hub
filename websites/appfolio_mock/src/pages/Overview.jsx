import { Link } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { DataTable, PageHeader, Panel, Pill, RecordLink } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import {
  activeOrder, chargeBalance, compare, date, effectiveEnd, endingSoon, money, orderNewest,
  postedCharges, propertyOrUnit, recordPath, records, today,
} from '../data/model.js'

export function Overview() {
  const { state } = useWorkspace()
  const day = today()
  const orders = records(state.workOrders)
  const urgent = orders.filter(order => order.priority === 'urgent' && order.status === 'open').sort(orderNewest)
  const leases = records(state.leases)
  const expiring = leases.filter(lease => endingSoon(lease, day))
    .sort((a, b) => compare(effectiveEnd(a), effectiveEnd(b)) || compare(a.id, b.id))
  const leaseIds = new Set(leases.map(lease => lease.id))
  const outstanding = postedCharges(state).filter(charge => leaseIds.has(charge.leaseId))
    .reduce((total, charge) => total + chargeBalance(charge, records(state.rentPayments)), 0)
  const metrics = [
    ['Properties', records(state.properties).length, records(state.units).length + ' units across the portfolio', '/properties'],
    ['Leases ending soon', expiring.length, 'Within the next 30 days', '/leases?phase=ending'],
    ['Active work orders', orders.filter(activeOrder).length, urgent.length + ' urgent and open', '/work-orders?status=active'],
    ['Outstanding rent', money(outstanding / 100), 'Across all lease ledgers', '/rent?balance=outstanding'],
  ]
  return <>
    <div className="overview-intro">
      <PageHeader title="Portfolio overview" description={state.account?.workspaceName || 'Cedarline Property Services'} />
    </div>
    <section className="metrics" aria-label="Portfolio totals">
      {metrics.map(([name, value, note, path]) => <Link className="panel metric" key={name} to={withSid(path)}>
        <span className="metric-name">{name}</span><strong className="metric-value">{value}</strong><small>{note}</small>
      </Link>)}
    </section>
    <div className="overview-grid">
      <Panel title="Urgent open orders" action={<RecordLink to="/work-orders?priority=urgent&status=open">View queue →</RecordLink>}>
        <DataTable paginate={false} columns={[[ 'Work order' ], [ 'Priority' ]]} rows={urgent.slice(0, 5)} empty="No urgent open work orders." row={order => <>
          <td><RecordLink to={recordPath('/work-orders', order.id)}>{order.title || order.id}</RecordLink><small>{propertyOrUnit(state, order)}</small></td>
          <td><Pill value={order.priority} /></td>
        </>} />
      </Panel>
      <Panel title="Upcoming lease expirations" action={<RecordLink to="/leases?phase=ending">View leases →</RecordLink>}>
        <DataTable paginate={false} columns={[[ 'Resident' ], [ 'Ends', 'nowrap' ]]} rows={expiring.slice(0, 5)} empty="No active leases end in the next 30 days." row={lease => <>
          <td><RecordLink to={recordPath('/leases', lease.id)}>{lease.residentName || lease.id}</RecordLink><small>{propertyOrUnit(state, lease)}</small></td>
          <td className="nowrap">{date(effectiveEnd(lease))}</td>
        </>} />
      </Panel>
    </div>
  </>
}
