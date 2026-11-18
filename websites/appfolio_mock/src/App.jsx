import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { PageHeader } from './ui.jsx'
import { Overview } from './pages/Overview.jsx'
import { Properties, PropertyDetail } from './pages/Properties.jsx'
import { Leases, LeaseDetail } from './pages/Leases.jsx'
import { WorkOrders, WorkOrderDetail } from './pages/WorkOrders.jsx'
import { Rent, Ledger } from './pages/Rent.jsx'

const sections = [
  ['/', 'Overview'], ['/properties', 'Properties'], ['/leases', 'Leases'],
  ['/work-orders', 'Work Orders'], ['/rent', 'Rent'],
]

export default function App() {
  const { state, notice, dismiss } = useWorkspace()
  const name = state.account?.name || 'Jordan Ellis'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead">
      <div className="masthead-inner">
        <Link className="brand" to={withSid('/')}>AppFolio</Link>
        <nav aria-label="Main navigation">
          {sections.map(([path, label]) => <NavLink key={path} to={withSid(path)} end={path === '/'}>{label}</NavLink>)}
        </nav>
        <div className="account">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div><strong>{name}</strong><small>{state.account?.workspaceName || 'Cedarline Property Services'}</small></div>
        </div>
      </div>
    </header>
    <main id="main" className="workspace" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/leases" element={<Leases />} />
        <Route path="/leases/:id" element={<LeaseDetail />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/rent" element={<Rent />} />
        <Route path="/rent/:leaseId" element={<Ledger />} />
        <Route path="*" element={<PageHeader title="Page unavailable" description="This page could not be found." actions={<Link className="button" to={withSid('/')}>Go to overview</Link>} />} />
      </Routes>
    </main>
    {notice && <div className="toast"><div role="status"><strong>{notice.message}</strong>{notice.path && <Link to={withSid(notice.path)}>View record</Link>}</div>
      <button className="icon-button" type="button" onClick={dismiss} aria-label="Dismiss confirmation">×</button>
    </div>}
  </>
}
