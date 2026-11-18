import { useStore } from '../store.jsx'
import { Heading, Panel, RouteLink, Status, Table } from '../ui.jsx'
import { byText, find, fmtDate, label, list, money, today, vendorName } from '../utils/format.js'

export function Overview() {
  const { state } = useStore()
  const pending = list(state.approvals).filter(record => record.status === 'pending').sort((a, b) => byText(a.createdAt, b.createdAt))
  const payable = list(state.bills).filter(record => record.status === 'approved').sort((a, b) => byText(a.dueDate, b.dueDate))
  const active = list(state.cards).filter(record => record.status === 'active')
  const scheduled = list(state.bills).filter(record => record.status === 'scheduled')
  const overdue = payable.filter(record => record.dueDate && record.dueDate < today()).length
  const recentBills = list(state.bills).slice().sort((a, b) => byText(b.updatedAt, a.updatedAt)).slice(0, 5)
  const updates = list(state.activity).slice().sort((a, b) => byText(b.createdAt, a.createdAt)).slice(0, 6)
  const attention = [
    ...pending.slice(0, 2).map(record => ({ path: '/approvals/', record, title: record.title || 'Untitled approval', caption: 'Review requested' })),
    ...payable.slice(0, 2).map(record => ({ path: '/bills/', record, title: (record.invoiceNumber || 'Untitled invoice') + ' · ' + vendorName(state, record.vendorId), caption: 'Due ' + fmtDate(record.dueDate) })),
  ]
  return <>
    <Heading title="Overview" subtitle="Track approvals, upcoming payments, and company cards." />
    <div className="overview-grid">
      <Panel title="Spend at a glance" className="summary">
        <div className="summary-primary"><strong>{pending.length}</strong><RouteLink to="/approvals?status=pending">Pending approvals <span aria-hidden="true">↗</span></RouteLink></div>
        <div className="summary-metrics">
          <div><strong>{payable.length}</strong><RouteLink to="/bills?status=approved">Bills to pay <span aria-hidden="true">↗</span></RouteLink></div>
          <div><strong>{active.length}</strong><RouteLink to="/cards?status=active">Active cards <span aria-hidden="true">↗</span></RouteLink></div>
        </div>
        <div className="summary-caption">{money(scheduled.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0), state.workspace?.currency)} scheduled <span>·</span> {overdue} overdue</div>
      </Panel>
      <Panel title="Needs attention">
        {attention.length ? <ul className="record-list">{attention.map(({ path, record, title, caption }) => <li key={record.id}>
          <span><RouteLink to={path + encodeURIComponent(record.id)}>{title}</RouteLink><small>{caption}</small></span>
          <span className="numeric">{money(record.amount, record.currency)}</span>
        </li>)}</ul> : <p className="muted">There are no approvals or bills waiting for action.</p>}
      </Panel>
    </div>
    <Panel title="Recent bills">
      <Table columns={[[ 'Invoice' ], ['Vendor'], ['Due date'], ['Amount', true], ['Status']]} empty="No bills yet."
        rows={recentBills.map(bill => [bill.id, [<RouteLink to={'/bills/' + encodeURIComponent(bill.id)}>{bill.invoiceNumber || 'Untitled invoice'}</RouteLink>,
          vendorName(state, bill.vendorId), fmtDate(bill.dueDate), money(bill.amount, bill.currency), <Status value={bill.status} />]])} />
    </Panel>
    <Panel title="Workspace activity">
      {updates.length ? <ul className="record-list">{updates.map(item => {
        const sources = { card: [state.cards, '/cards/', 'name'], bill: [state.bills, '/bills/', 'invoiceNumber'], approval: [state.approvals, '/approvals/', 'title'], spend_request: [state.approvals, '/approvals/', 'title'], policy: [state.policies, '/policy', 'name'] }
        const [records, path, field] = sources[item.objectType] || []
        const record = find(records, item.objectType === 'spend_request' ? item.related?.approvalId : item.objectId)
        return <li key={item.id}><span>{label(String(item.action || '').replace(/\./g, ' '))}
          {record && <small><RouteLink to={path === '/policy' ? path : path + encodeURIComponent(record.id)}>{record[field] || 'View record'}</RouteLink></small>}
        </span><small>{fmtDate(item.createdAt)}</small></li>
      })}</ul> : <p className="muted">No activity yet.</p>}
    </Panel>
  </>
}

