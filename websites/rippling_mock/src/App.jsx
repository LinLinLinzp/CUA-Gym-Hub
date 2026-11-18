import { CalendarDays, ChevronRight, CircleDollarSign, House, Laptop, Users, ArrowUpRight, ClipboardList } from './icons.jsx'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Avatar, Heading, Panel, Related, RouteLink } from './components.jsx'
import { date, money, person, rows, today } from './data/format.js'
import { useWorkspace } from './workspace.jsx'
import { Employees, EmployeeDetail } from './employees.jsx'
import { Devices, DeviceDetail } from './devices.jsx'
import { TimeOff, TimeOffDetail } from './timeoff.jsx'
import { Payroll, PayrollDetail } from './payroll.jsx'

const destinations = [
  ['/', 'Overview', House], ['/employees', 'Employees', Users], ['/devices', 'Devices', Laptop],
  ['/time-off', 'Time Off', CalendarDays], ['/payroll', 'Payroll', CircleDollarSign],
]

function Overview() {
  const { state } = useWorkspace()
  const company = state.company?.name || 'Juniper Works'
  const employees = rows(state.employees)
  const devices = rows(state.devices)
  const requests = rows(state.ptoRequests).filter(({ status }) => status === 'pending')
    .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')))
  const drafts = rows(state.payrollRuns).filter(({ status }) => status === 'draft')
    .sort((a, b) => String(a.payDate ?? '').localeCompare(String(b.payDate ?? '')))
  const stats = [
    [employees.filter(({ status }) => status === 'active').length, 'Active employees', `${employees.length} in the directory`],
    [devices.filter(({ status }) => status === 'available').length, 'Devices available', `${devices.length} assets in inventory`],
    [requests.length, 'Pending requests', `${rows(state.ptoRequests).length} total requests`],
    [drafts.length, 'Draft pay runs', `${rows(state.payrollRuns).length} total pay runs`],
  ]
  return <>
    <div className="overview-intro"><div>
      <div className="overview-date"><CalendarDays size={15} />{date(today())}</div>
      <Heading title={company} description="Manage your people, devices, time off, and payroll." />
    </div><div className="overview-art" aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
    <div className="dashboard">
      <section className="modules" aria-label="Workspaces">
        {destinations.slice(1).map(([path, title, Icon], index) => {
          const [count, metric, context] = stats[index]
          return <RouteLink to={path} className={`module module-${index}`} key={path}>
            <div className="module-top"><span className="module-icon"><Icon size={21} strokeWidth={1.8} /></span><ArrowUpRight className="module-arrow" size={18} /></div>
            <h2>{title}</h2><div className="metric">{count}</div><strong>{metric}</strong><p>{context}</p>
          </RouteLink>
        })}
      </section>
      <aside className="panel queue">
        <div className="queue-title"><span className="queue-icon"><ClipboardList size={21} /></span><div><h2>Action queue</h2><p>Items ready for review</p></div></div>
        <section className="queue-section"><div className="queue-heading"><h3>Time-off requests</h3><span className="count">{requests.length}</span></div>
          <Related empty="No requests waiting for review." items={requests.slice(0, 3).map((record) => ({
            id: record.id, to: `/time-off/${record.id}`, title: person(state, record.employeeId), sub: date(record.startDate),
          }))} />
          {requests.length > 3 && <RouteLink className="queue-link" to="/time-off">View time off <ChevronRight size={14} /></RouteLink>}
        </section>
        <section className="queue-section"><div className="queue-heading"><h3>Payroll drafts</h3><span className="count">{drafts.length}</span></div>
          <Related empty="No payroll drafts." items={drafts.slice(0, 2).map((run) => ({
            id: run.id, to: `/payroll/${run.id}`, title: run.name, sub: [date(run.payDate), money(run.totals?.gross)].join(' · '),
          }))} />
          {drafts.length > 2 && <RouteLink className="queue-link" to="/payroll">View payroll <ChevronRight size={14} /></RouteLink>}
        </section>
      </aside>
    </div>
  </>
}

export function App() {
  const { pathname } = useLocation()
  const { state } = useWorkspace()
  const company = state.company?.name || 'Juniper Works'
  const actor = state.actor?.name || 'Maya Chen'
  return <>
    <a href="#workspace-content" className="skip-link">Skip to content</a>
    <header className="topbar"><div className="topbar-inner">
      <div className="brand"><RouteLink className="wordmark" to="/">Rippling</RouteLink><span>{company}</span></div>
      <nav aria-label="Workspace navigation">{destinations.map(([path, title, Icon]) => {
        const current = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')
        return <RouteLink key={path} to={path} aria-current={current ? 'page' : undefined}><Icon size={16} /><span>{title}</span></RouteLink>
      })}</nav>
      <div className="identity"><Avatar name={actor} /><span>{actor}<small>{state.actor?.role || 'Workspace administrator'}</small></span></div>
    </div></header>
    <main className="workspace" id="workspace-content" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/employees" element={<Employees />} /><Route path="/employees/:employeeId" element={<EmployeeDetail />} />
        <Route path="/devices" element={<Devices />} /><Route path="/devices/:deviceId" element={<DeviceDetail />} />
        <Route path="/time-off" element={<TimeOff />} /><Route path="/time-off/:requestId" element={<TimeOffDetail />} />
        <Route path="/payroll" element={<Payroll />} /><Route path="/payroll/:runId" element={<PayrollDetail />} />
        <Route path="*" element={<><Heading title="Page unavailable" /><Panel title="Workspace"><RouteLink className="button" to="/">Back to overview</RouteLink></Panel></>} />
      </Routes>
    </main>
  </>
}
