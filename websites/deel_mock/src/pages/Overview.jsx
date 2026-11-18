import { useWorkspace } from '../context/Workspace.jsx'
import { calendarDate, cents, compareDates, invoiceStatus, isPayable, list, money, workerFor } from '../data/model.js'
import { DateText, Empty, PageTitle, Panel, recordPath, RouteLink } from '../components/ui.jsx'

export default function Overview() {
  const { state } = useWorkspace()
  const today = calendarDate(new Date())
  const contracts = list(state.contracts)
  const active = contracts.filter(item => item.status === 'active').length
  const invoices = list(state.invoices).filter(isPayable)
  const requests = list(state.timeOffRequests)
  const pending = requests.filter(item => item.status === 'pending')
  const upcoming = requests.filter(item => item.status === 'approved' && item.id && item.endDate >= today)
    .sort((a, b) => compareDates(a.startDate, b.startDate)).slice(0, 4)
  const totals = new Map()
  for (const invoice of invoices) totals.set(invoice.currency, (totals.get(invoice.currency) || 0) + cents(Number(invoice.total)))
  const queue = [
    ['Time off requests', 'Pending team reviews', pending.length, '/time-off?status=pending', 'calendar'],
    ['Invoices to pay', 'Open and overdue invoices', invoices.length, '/invoices?status=payable', 'invoice'],
    ['Contracts awaiting signature', 'Invitations awaiting a response', contracts.filter(item => item.status === 'pending_signature').length, '/contracts?status=pending_signature', 'contract'],
  ]
  const overdue = invoices.filter(item => invoiceStatus(item, today) === 'overdue').length

  return <>
    <PageTitle title="Overview" description="Manage agreements, billing, and team leave." />
    <div className="dashboard">
      <Panel title="Work queue">
        <ul className="queue">{queue.map(([title, subtitle, count, to, icon]) =>
          <li key={title}><RouteLink to={to} className="queue-link">
            <span aria-hidden="true" className={'queue-icon ' + icon} />
            <span><strong>{title}</strong><small>{subtitle}</small></span>
            <b>{count}</b><span aria-hidden="true" className="arrow">→</span>
          </RouteLink></li>)}</ul>
      </Panel>
      <Panel title="Account summary" className="summary">
        <div className="paper-art" aria-hidden="true"><span /><i /></div>
        <RouteLink to="/contracts?status=active" className="summary-active"><strong>{active}</strong> active agreements <span aria-hidden="true">↗</span></RouteLink>
        <div className="totals-title">Outstanding invoices <small>{overdue} overdue</small></div>
        <dl className="totals">
          {[...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, total]) =>
            <div key={currency}><dt>{currency}</dt><dd>{money(total / 100)}</dd></div>)}
          {!totals.size && <div>No outstanding totals.</div>}
        </dl>
      </Panel>
      <Panel title="Pending leave reviews" action={<RouteLink to="/time-off?status=pending">View all</RouteLink>}>
        {pending.length ? <ul className="compact-list">{pending.slice(0, 4).map((item, index) =>
          <li key={item.id ?? index}>
            {item.id ? <RouteLink to={recordPath('/time-off', item.id)}>{workerFor(state, item)?.name || 'Unknown worker'}</RouteLink> : workerFor(state, item)?.name || 'Unknown worker'}
            <DateText value={item.startDate} />
          </li>)}</ul> : <Empty title="No pending requests" />}
      </Panel>
      <Panel title="Upcoming time off" action={<RouteLink to="/time-off?view=calendar">Team calendar</RouteLink>}>
        {upcoming.length ? <ul className="compact-list">{upcoming.map(item =>
          <li key={item.id}><RouteLink to={recordPath('/time-off', item.id)}>{workerFor(state, item)?.name || 'Unknown worker'}</RouteLink><DateText value={item.startDate} /></li>
        )}</ul> : <Empty title="No upcoming approved leave" />}
      </Panel>
    </div>
  </>
}
