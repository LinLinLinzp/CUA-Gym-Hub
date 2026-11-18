import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { PageHeader } from '../components/Controls.jsx'
import { eligible, overdue, purchaseOpen } from '../utils/derived.js'
import { documentNo, formatDate, money, rows, sum, today } from '../utils/model.js'
import { listPath, queuePath, recordPath, stockPath } from '../utils/routes.js'
import { stockRows } from './Inventory.jsx'

function Portlet({ title, children, className = '' }) {
  return <section className={`panel home-portlet ${className}`}>
    <h2 className="panel-heading">{title}</h2>{children}
  </section>
}

const count = (list, predicate) => list.filter(predicate).length
const currency = (value) => '$' + money(value)
const billingPath = listPath('custinvc', { status: 'Open' })
const purchasePath = listPath('purchord')

export default function Home() {
  const { state } = useWorkspace()
  const sales = rows(state, 'salesOrders')
  const purchases = rows(state, 'purchaseOrders')
  const invoices = rows(state, 'invoices')
  const payables = rows(state, 'vendorBills')
  const reorder = stockRows(state, rows(state, 'items').filter((item) => !item.inactive)).filter((row) => row.low)
  const reminders = [
    ['Sales Orders to Approve', count(sales, (order) => order.status === 'Pending Approval'), queuePath('approvesalesorders')],
    ['Orders to Fulfill', count(sales, (order) => eligible(state, 'itemship', order)), queuePath('itemshipmanager')],
    ['Purchase Orders to Approve', count(purchases, (order) => order.status === 'Pending Supervisor Approval'), queuePath('approvetransactions', 'group=purchase')],
    ['Orders to Receive', count(purchases, (order) => eligible(state, 'itemrcpt', order)), queuePath('receiveorders')],
    ['Overdue Invoices', count(invoices, (invoice) => overdue(invoice)), listPath('custinvc', { status: 'Overdue' }), 'urgent'],
    ['Items to Reorder', reorder.length, `${stockPath}&low=1`],
  ]
  const kpis = [
    ['Open Receivables', sum(invoices.filter((invoice) => invoice.status === 'Open'), (invoice) => invoice.amountRemaining), billingPath],
    ['Open Purchase Orders', sum(purchases.filter((order) => purchaseOpen.includes(order.status) || order.status === 'Pending Supervisor Approval'), (order) => order.total), purchasePath],
    ['Overdue Receivables', sum(invoices.filter((invoice) => overdue(invoice)), (invoice) => invoice.amountRemaining), listPath('custinvc', { status: 'Overdue' })],
    ['Open Vendor Bills', sum(payables.filter((bill) => bill.status === 'Open'), (bill) => bill.amountRemaining), listPath('vendbill', { status: 'Open' })],
  ]
  const validShortcuts = rows(state, 'shortcuts').filter((row) => typeof row.path === 'string' && /^\/(?![\/\\])/.test(row.path))
  return <>
    <div className="home-heading">
      <PageHeader title="Home" />
      <time dateTime={today()}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</time>
    </div>
    <div className="dashboard">
      <Portlet title="Reminders"><div className="reminder-list">{reminders.map(([title, value, link, variant]) =>
        <AppLink key={title} to={link}><span>{title}</span><strong className={variant}>{value}</strong><span aria-hidden="true" className="chevron">›</span></AppLink>
      )}</div></Portlet>
      <Portlet title="Key Performance Indicators"><div className="kpi-grid">{kpis.map(([title, value, link]) =>
        <AppLink key={title} to={link}><span>{title}</span><strong>{currency(value)}</strong></AppLink>
      )}</div></Portlet>
      <Portlet title="Shortcuts"><div className="shortcut-list">{validShortcuts.map((row, index) => <AppLink key={row.id ?? index} to={row.path}>{row.label}<span aria-hidden="true">›</span></AppLink>)}
        {!validShortcuts.length && <p className="muted">No shortcuts saved.</p>}
        <AppLink to="/app/workspace/shortcuts">Manage Shortcuts</AppLink>
      </div></Portlet>
      <Portlet title="Recent Sales Orders"><div className="shortcut-list recent">
        {[...sales].sort((a, b) => String(b.tranDate || '').localeCompare(String(a.tranDate || ''))).slice(0, 5).map((row, index) =>
          <AppLink key={row.id ?? index} to={recordPath('salesord', row)}><span>{documentNo(row)}</span><time dateTime={row.tranDate}>{formatDate(row.tranDate)}</time></AppLink>)}
        {!sales.length && <p className="muted">No sales orders to show.</p>}
        <AppLink to={listPath('salesord')}>View Sales Orders</AppLink>
      </div></Portlet>
    </div>
  </>
}
