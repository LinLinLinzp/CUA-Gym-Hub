import { useState } from 'react'
import { ArrowUpRight, Clock3, CreditCard, FileText, LayoutDashboard, Menu as MenuIcon, Plus, ReceiptText, Users, FolderKanban, ChevronDown, ChevronRight } from 'lucide-react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { KeyboardShortcuts } from '../components/KeyboardShortcuts.jsx'
import { Timer } from '../components/Timer.jsx'
import { setProjectRetainer } from '../data/retainer.js'
import { useApp } from '../context/AppContext.jsx'
import { AppLink, ErrorNote, Empty, Field, Ledger, Pick, Menu, Missing, PageHead, RailLink, SearchBox, Status, useFilters, useGo } from '../components/ui.jsx'
import { cents, currencies, dateLabel, find, hours, invoiceStatus, matches, money, nameOf, visible } from '../utils/format.js'

const nav = [
  ['Dashboard', '/', LayoutDashboard], ['Clients', '/clients', Users],
  ['Invoices', '/invoices', FileText], ['Expenses', '/expenses', ReceiptText],
  ['Projects', '/projects', FolderKanban], ['Time Tracking', '/time-tracking', Clock3],
]
const newActions = [['Invoice', '/invoices/new'], ['Expense', '/expenses/new'], ['Retainer', '/invoices/retainers/new']]
export function CreateMenu() {
  return <Menu label="Create New" icon={<Plus size={16} />} buttonClass="button primary">
    {newActions.map(([label, to]) => <AppLink key={to} to={to}>{label}</AppLink>)}
  </Menu>
}
export function Layout() {
  const { state } = useApp()
  const { pathname } = useLocation()
  const go = useGo()
  const [rail, setRail] = useState(false)
  const [group, setGroup] = useState(null)
  const [query, setQuery] = useState(null)
  const showGroup = group ?? (pathname.startsWith('/invoices') || pathname.startsWith('/payments'))
  const me = find(state.users, state.currentUserId)
  const records = query?.trim() ? [
    ...state.clients.map(row => [row.id, row.name, 'Client', '/clients/' + row.id, row.email]),
    ...state.invoices.filter(row => !visible(row, 'deleted')).map(row => [row.id, row.invoiceNumber, 'Invoice', '/invoices/' + row.id, nameOf(state.clients, row.clientId)]),
    ...state.expenses.filter(row => !visible(row, 'deleted')).map(row => [row.id, row.merchant, 'Expense', '/expenses/' + row.id, row.description]),
    ...state.projects.map(row => [row.id, row.name, 'Project', '/projects/' + row.id, nameOf(state.clients, row.clientId)]),
  ].filter(row => matches(query, row[1], row[4])).slice(0, 12) : []
  return <div className="workspace-shell">
    {rail && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setRail(false)} />}
    <aside className={`rail ${rail ? 'open' : ''}`}>
      <AppLink to="/" className="wordmark" onClick={() => setRail(false)}><span className="brand-mark"><FileText size={17} /></span>FreshBooks</AppLink>
      <div className="rail-business"><span className="business-avatar">{state.business?.name?.slice(0, 1) || 'B'}</span><div><small>Workspace</small><strong>{state.business?.name || 'Your business'}</strong></div></div>
      <nav aria-label="Main navigation">
        {nav.map(([label, to, Icon]) => <div key={to}>
          <div className={to === '/invoices' ? 'rail-group' : undefined}>
            <RailLink to={to} end={to === '/invoices' || to === '/'} className={({ isActive }) => `rail-link ${isActive || (to === '/invoices' && pathname.startsWith('/invoices/') && !pathname.startsWith('/invoices/retainers')) ? 'active' : ''}`}
              onClick={() => { setRail(false); if (to === '/invoices') setGroup(true) }}><Icon size={18} /><span>{label}</span></RailLink>
            {to === '/invoices' && <button className="rail-chevron" aria-label="Invoice navigation" aria-expanded={showGroup} onClick={() => setGroup(!showGroup)}>{showGroup ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}
          </div>
          {to === '/invoices' && showGroup && <div className="rail-children">
            <RailLink to="/invoices/retainers" onClick={() => setRail(false)} className="rail-link">Retainers</RailLink>
            <RailLink to="/payments" onClick={() => setRail(false)} className="rail-link">Payments</RailLink>
          </div>}
        </div>)}
      </nav>
    </aside>
    <div className="workspace-main">
      <header className="utility">
        <button type="button" className="icon-button mobile-trigger" aria-label="Open navigation" onClick={() => setRail(!rail)}><MenuIcon size={23} /></button>
        <div className="toolbar-search" onKeyDown={e => {
          if (e.key === 'Escape') setQuery(null)
          if (e.target.tagName === 'INPUT' && e.key === 'Enter' && records[0]) {
            e.preventDefault(); go(records[0][3]); setQuery(null)
          }
        }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setQuery(null) }}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search records" />
          {query?.trim() && <div className="dropdown">
            {records.map(([, label, type, path]) => <button key={path} type="button" onClick={() => { go(path); setQuery(null) }}><span>{label || 'Unnamed record'}</span><small>{type}</small></button>)}
            {!records.length && <p className="picker-empty">No matching records.</p>}
          </div>}
        </div>
        <div className="identity"><span className="avatar">{(me?.name || 'Workspace').split(' ').slice(0, 2).map(part => part[0]).join('')}</span><span>{me?.name || 'Workspace'}</span></div>
      </header>
      <main className="workspace"><Outlet /></main>
    </div>
    <Timer />
    <KeyboardShortcuts />
  </div>
}

export const invoiceColumns = [
  { label: 'Client / Invoice' }, { label: 'Description' },
  { key: 'issueDate', label: 'Issued' }, { key: 'dueDate', label: 'Due' },
  { key: 'total', label: 'Amount', number: true }, { label: 'Balance', number: true }, { label: 'Status' },
]
export function InvoiceCells({ invoice, state }) {
  return <>
    <td><AppLink className="row-link" to={`/invoices/${invoice.id}`}>{nameOf(state.clients, invoice.clientId, 'Unavailable client')}</AppLink><small>{invoice.invoiceNumber || 'Unnumbered invoice'}</small></td>
    <td className="description-cell">{invoice.lines?.[0]?.description || invoice.lines?.[0]?.name || invoice.notes || '—'}</td>
    <td>{dateLabel(invoice.issueDate)}</td><td>{dateLabel(invoice.dueDate)}</td>
    <td className="number">{money(invoice.total, invoice.currency)}</td>
    <td className="number">{money(invoice.amountDue, invoice.currency)}</td>
    <td><Status value={invoiceStatus(invoice)} /></td>
  </>
}
export function InvoiceLedger({ rows, state, empty }) {
  return <Ledger columns={invoiceColumns} rows={rows} render={invoice => <InvoiceCells invoice={invoice} state={state} />} empty={empty} />
}
export function Dashboard() {
  const { state } = useApp()
  const [currency, setCurrency] = useState(state.business?.currency || 'USD')
  const active = state.invoices.filter(row => visible(row))
  const invoiced = active.filter(row => row.currency === currency && row.status && row.status !== 'draft')
  const overdue = invoiced.filter(row => invoiceStatus(row) === 'overdue').reduce((sum, row) => sum + cents(row.amountDue ?? 0), 0) / 100
  const outstanding = invoiced.reduce((sum, row) => sum + cents(row.amountDue ?? 0), 0) / 100 - overdue
  const spending = state.expenses.filter(row => visible(row) && row.currency === currency).reduce((sum, row) => sum + cents(row.total ?? 0), 0) / 100
  const unbilled = state.timeEntries.filter(row => visible(row) && row.billable && row.status === 'unbilled' && !row.invoiceId && !row.retainerId)
  const recent = [...active].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || '')).slice(0, 6)
  return <>
    <PageHead title="Dashboard" description="A snapshot of billing and work in progress."><CreateMenu /></PageHead>
    <div className="dashboard-grid">
      <section className="card dashboard-outstanding">
        <div className="section-heading"><h2><FileText size={19} /> Outstanding Invoices</h2>
          <select aria-label="Dashboard currency" value={currency} onChange={e => setCurrency(e.target.value)}>
            {[...new Set([currency, ...currencies])].map(code => <option key={code}>{code}</option>)}
          </select>
        </div>
        <div className="metric-total">{money(overdue + outstanding, currency)}</div>
        <div className="metric-bar" aria-label="Overdue and outstanding invoice amounts">
          {overdue > 0 && <div className="overdue-bar" style={{ flexGrow: overdue }} />}
          {outstanding > 0 && <div className="outstanding-bar" style={{ flexGrow: outstanding }} />}
        </div>
        <div className="metric-legend">
          <AppLink to={`/invoices?status=overdue&currency=${currency}`}><i className="overdue-dot" />Overdue <strong>{money(overdue, currency)}</strong></AppLink>
          <AppLink to={`/invoices?status=outstanding&currency=${currency}`}><i className="outstanding-dot" />Outstanding <strong>{money(outstanding, currency)}</strong></AppLink>
        </div>
      </section>
      <section className="card spending-card">
        <div className="section-heading"><h2><CreditCard size={19} /> Spending</h2><AppLink aria-label="View spending" to={`/expenses?currency=${currency}`}><ArrowUpRight size={17} /></AppLink></div>
        <div className="metric-total">{money(spending, currency)}</div><small>Recorded expenses</small>
      </section>
      <section className="card time-card">
        <div className="section-heading"><h2><Clock3 size={19} /> Unbilled Time</h2><AppLink aria-label="View unbilled time" to="/time-tracking?view=all&status=unbilled"><ArrowUpRight size={17} /></AppLink></div>
        <div className="metric-total">{hours(unbilled.reduce((sum, row) => sum + (Number(row.durationMinutes) || 0), 0))}</div><small>{unbilled.length} billable {unbilled.length === 1 ? 'entry' : 'entries'}</small>
      </section>
    </div>
    <section className="card ledger">
      <div className="ledger-bar"><h2>Recent Invoices</h2><AppLink to="/invoices">View all invoices <ChevronRight size={15} /></AppLink></div>
      <InvoiceLedger rows={recent} state={state} empty={<Empty title="No invoices yet"><AppLink className="button primary" to="/invoices/new">New Invoice</AppLink></Empty>} />
    </section>
  </>
}

export function Directory({ type }) {
  const { state } = useApp()
  const [params, filter] = useFilters()
  const isProject = type === 'projects'
  const rows = state[type].filter(row => matches(params.get('q'), row.name, row.email, isProject && nameOf(state.clients, row.clientId)))
  const title = isProject ? 'Projects' : 'Clients'
  return <>
    <PageHead title={title} />
    <section className="card ledger"><div className="ledger-bar"><h2>All {title}</h2><SearchBox value={params.get('q')} onChange={value => filter('q', value)} placeholder={`Search ${type}`} /></div>
      <Ledger rows={rows} columns={[{ label: 'Name' }, { label: isProject ? 'Client' : 'Email' }, { label: 'Status' }]} render={row => <>
        <td><AppLink className="row-link" to={`/${type}/${row.id}`}>{row.name || 'Unnamed record'}</AppLink></td>
        <td>{isProject ? nameOf(state.clients, row.clientId) : row.email || '—'}</td><td><Status value={row.status || row.visibility || 'active'} /></td>
      </>} />
    </section>
  </>
}

export function ClientDetail() {
  const { state } = useApp()
  const { id } = useParams()
  const row = find(state.clients, id)
  if (!row) return <Missing title="Client unavailable" to="/clients" label="Back to Clients" />
  const invoices = state.invoices.filter(record => record.clientId === id && visible(record))
  const retainers = state.retainers.filter(record => record.clientId === id && visible(record))
  const projects = state.projects.filter(record => record.clientId === id)
  return <>
    <PageHead title={row.name || 'Client'} description={row.email} back={{ to: '/clients', label: 'Clients' }}>
      <AppLink className="button" to={`/invoices/retainers/new?client=${encodeURIComponent(id)}`}>New Retainer</AppLink>
      <AppLink className="button primary" to={`/invoices/new?client=${encodeURIComponent(id)}`}>New Invoice</AppLink>
    </PageHead>
    <section className="card ledger"><div className="ledger-bar"><h2>Invoices</h2></div><InvoiceLedger rows={invoices} state={state} /></section>
    <section className="card ledger"><div className="ledger-bar"><h2>Retainers</h2></div><Ledger rows={retainers} columns={[{ label: 'Retainer' }, { label: 'Fee' }, { label: 'Status' }]} render={retainer => <>
      <td><AppLink to={`/invoices/retainers/${retainer.id}`}>Retainer for {row.name || 'client'}</AppLink></td><td>{money(retainer.feePerPeriod, retainer.currency)}</td><td><Status value={retainer.status} /></td>
    </>} /></section>
    <section className="card ledger"><div className="ledger-bar"><h2>Projects</h2></div><Ledger rows={projects} columns={[{ label: 'Project' }, { label: 'Status' }]} render={project => <>
      <td><AppLink to={`/projects/${project.id}`}>{project.name}</AppLink></td><td><Status value={project.status} /></td>
    </>} /></section>
  </>
}
export function ProjectDetail() {
  const { state } = useApp()
  const { id } = useParams()
  const row = find(state.projects, id)
  if (!row) return <Missing title="Project unavailable" to="/projects" label="Back to Projects" />
  const client = find(state.clients, row.clientId)
  return <>
    <PageHead title={row.name || 'Project'} description={client?.name || 'Client unavailable'} back={{ to: '/projects', label: 'Projects' }}><Status value={row.status} /></PageHead>
    <section className="card"><h2>Project details</h2><dl className="details">
      <div><dt>Client</dt><dd>{client ? <AppLink to={`/clients/${client.id}`}>{client.name}</AppLink> : 'Unavailable client'}</dd></div>
      <div><dt>Hourly rate</dt><dd>{row.hourlyRate == null ? '—' : money(row.hourlyRate, client?.currency)}</dd></div>
      <div><dt>Time logged</dt><dd>{hours(state.timeEntries.filter(entry => entry.projectId === id && visible(entry)).reduce((sum, entry) => sum + (Number(entry.durationMinutes) || 0), 0))}</dd></div>
    </dl><ProjectRetainer key={row.id} project={row} /></section>
  </>
}
function ProjectRetainer({ project }) {
  const { state, commit } = useApp()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(project.retainerId || '')
  const [error, setError] = useState('')
  const linked = find(state.retainers, project.retainerId)
  const options = state.retainers.filter(row => row.clientId === project.clientId && row.status === 'active' && !visible(row, 'deleted')).map(row => ({
    id: row.id, name: 'Retainer for ' + nameOf(state.clients, row.clientId),
  }))
  return <div className="project-retainer form-stack"><h3>Retainer</h3>
    {editing ? <form className="form-stack" onSubmit={e => {
      e.preventDefault()
      try { commit(current => setProjectRetainer(current, project.id, value), 'Project retainer updated'); setEditing(false) }
      catch (failure) { setError(failure.message) }
    }}>
      <Field label="Apply project time to"><Pick rows={options} value={value} onChange={setValue} empty="No retainer" /></Field>
      <ErrorNote>{error}</ErrorNote>
      <div className="actions"><button type="button" className="button" onClick={() => setEditing(false)}>Cancel</button><button className="button positive" type="submit">Save</button></div>
    </form> : <div className="section-heading">
      {linked ? <AppLink to={`/invoices/retainers/${linked.id}`}>View retainer</AppLink> : <p>{project.retainerId ? 'Retainer unavailable' : 'No retainer linked'}</p>}
      <button className="button" type="button" onClick={() => { setValue(project.retainerId || ''); setError(''); setEditing(true) }}>Edit Retainer</button>
    </div>}
  </div>
}

export function Payments() {
  const { state } = useApp()
  const [params, filter] = useFilters()
  const rows = [...state.payments].filter(row => matches(params.get('q'), row.reference, nameOf(state.clients, row.clientId), find(state.invoices, row.invoiceId)?.invoiceNumber)).sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))
  return <><PageHead title="Payments" /><section className="card ledger"><div className="ledger-bar"><h2>Payment History</h2><SearchBox value={params.get('q')} onChange={q => filter('q', q)} placeholder="Search payments" /></div>
    <Ledger rows={rows} columns={[{ label: 'Date' }, { label: 'Client / Invoice' }, { label: 'Method' }, { label: 'Reference' }, { label: 'Amount', number: true }, { label: 'Status' }]} render={row => {
      const invoice = find(state.invoices, row.invoiceId)
      return <><td>{dateLabel(row.paymentDate)}</td><td>{nameOf(state.clients, row.clientId)}<small>{invoice ? <AppLink to={`/invoices/${invoice.id}`}>{invoice.invoiceNumber || 'View invoice'}</AppLink> : 'Invoice unavailable'}</small></td>
        <td>{(row.method || '—').replaceAll('_', ' ')}</td><td>{row.reference || '—'}</td><td className="number">{money(row.amount, row.currency)}</td><td><Status value={row.status || 'recorded'} /></td></>
    }} />
  </section></>
}
