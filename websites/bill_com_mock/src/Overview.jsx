import { ActivityTable, ButtonLink, PageTitle, SiteLink } from './components.jsx'
import { actionable, byId, money, payable, recentFirst, rows, total } from './data/selectors.js'
import { useStore } from './store.jsx'

export function Overview() {
  const { state } = useStore()
  const pending = rows(state.approvals).filter(approval => actionable(state, approval)).map(approval => byId(state.bills, approval.billId))
  const ready = rows(state.bills).filter(bill => payable(state, bill))
  const scheduled = rows(state.payments).filter(payment => payment.status === 'scheduled')
  const metrics = [
    { title: 'Pending approvals', entries: pending, to: '/approvals', kind: 'pending', label: 'assigned to you' },
    { title: 'Ready to pay', entries: ready, to: '/bills?view=ready', kind: 'ready', label: 'available to pay' },
    { title: 'Scheduled payments', entries: scheduled, to: '/payments?status=scheduled', kind: 'scheduled', label: 'scheduled' },
  ]
  const recent = rows(state.activity).sort(recentFirst).slice(0, 10)

  return <>
    <PageTitle title="Overview" description="Manage bills, review approvals, and track outgoing payments."
      actions={<ButtonLink to="/bills/new"><span aria-hidden="true">+</span> New bill</ButtonLink>} />
    <section className="metrics" aria-label="Accounts payable summary">
      {metrics.map(({ title, entries, to, kind, label }) => <SiteLink className="metric" to={to} key={kind}>
        <div className="metric-head"><span className={`metric-icon ${kind}`} aria-hidden="true" /><h2>{title}</h2><span className="metric-arrow" aria-hidden="true">↗</span></div>
        <strong>{money(total(entries))}</strong>
        <span className="metric-count">{entries.length} {kind === 'scheduled' ? (entries.length === 1 ? 'payment' : 'payments') : (entries.length === 1 ? 'bill' : 'bills')} {label} · USD</span>
      </SiteLink>)}
    </section>
    <section>
      <div className="section-head"><h2>Recent activity</h2></div>
      <ActivityTable records={recent} overview />
    </section>
  </>
}
