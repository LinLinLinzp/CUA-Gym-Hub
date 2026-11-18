import { Outlet } from 'react-router-dom'
import { usePharmacy } from './state.jsx'
import { find, identified, initials, instantLabel, isUpcoming, medication, patientName, refillReason, storeName, windowLabel } from './domain.js'
import { Empty, Icon, RecordLink, RouteLink, Status } from './ui.jsx'

const sections = [
  ['Overview', '/', 'overview'],
  ['Prescriptions', '/prescriptions', 'prescriptions'],
  ['Refills', '/refills', 'refills'],
  ['Pickup', '/pickup', 'pickup'],
  ['Vaccines', '/vaccines', 'vaccines'],
]

export function Account() {
  const { state } = usePharmacy()
  const member = state.account?.name || 'Pharmacy member'
  const preferred = find(state.stores, state.account?.preferredStoreId)
  return <div className="layout">
    <a className="skip button" href="#workspace">Skip to account content</a>
    <aside className="sidebar">
      <RouteLink className="brand" to="/">CVS Pharmacy</RouteLink>
      <nav aria-label="Pharmacy account">
        {sections.map(([label, path, icon]) => <RouteLink nav end={path === '/'} key={path} to={path}><Icon name={icon}/>{label}</RouteLink>)}
      </nav>
      {preferred && <div className="sidebar-footer"><small>Preferred pharmacy</small><small><strong>{storeName(preferred)}</strong></small></div>}
    </aside>
    <div>
      <header className="utility">
        <span className="utility-title">Pharmacy account</span>
        <div className="account-chip"><span className="avatar" aria-hidden="true">{initials(member)}</span>{member}</div>
      </header>
      <main id="workspace" className="workspace" tabIndex={-1}><Outlet/></main>
    </div>
  </div>
}

function Preview({ title, to, action, children }) {
  return <section className="panel">
    <div className="panel-heading"><h2>{title}</h2><RouteLink className="text-link" to={to}>{action}<Icon name="arrow" size={16}/></RouteLink></div>
    {children}
  </section>
}

export function Overview() {
  const { state } = usePharmacy()
  const now = new Date()
  const ready = identified(state.pickupOrders).filter((order) => order.status === 'ready').slice(0, 2)
  const refills = identified(state.prescriptions).filter((rx) => !refillReason(state, rx, now)).slice(0, 3)
  const visits = identified(state.vaccineAppointments).filter((visit) => isUpcoming(visit, now))
    .sort((a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor)).slice(0, 3)
  const first = typeof state.account?.name === 'string' ? state.account.name.trim().split(/\s+/)[0] : ''
  return <div className="stack">
    <section className="welcome">
      <div><h1>{first ? 'Welcome, ' + first : 'Pharmacy overview'}</h1>
        <p>Manage your household’s prescriptions, pharmacy pickups, and vaccine visits in one place.</p>
        <RouteLink className="button primary" to="/prescriptions">View prescriptions<Icon name="arrow" size={17}/></RouteLink></div>
      <img src="/pharmacy-desk.svg" alt="" width="350" height="190"/>
    </section>
    <div className="overview-grid">
      <div className="stack">
        <Preview title="Ready for pickup" to="/pickup" action="All pickups">
          {ready.length ? ready.map((order) => {
            const store = find(state.stores, order.storeId)
            return <RecordLink key={order.id} to={'/pickup/' + encodeURIComponent(order.id)} icon="pickup"
              title={patientName(state, order.patientId)} meta={storeName(store) + ' · ' + windowLabel(order.pickupWindow, store)}
              end={<Status status="ready"/>}/>
          }) : <Empty>No prescriptions are ready for pickup.</Empty>}
        </Preview>
        <Preview title="Available for refill" to="/refills" action="Request refills">
          {refills.length ? refills.map((rx) => <RecordLink key={rx.id} to={'/prescriptions/' + encodeURIComponent(rx.id)} icon="prescriptions"
            title={medication(rx)} meta={patientName(state, rx.patientId)} end={<small>{rx.refillsRemaining} left</small>}/>)
            : <Empty>No prescriptions are eligible for refill.</Empty>}
        </Preview>
      </div>
      <Preview title="Upcoming visits" to="/vaccines" action="All visits">
        {visits.length ? visits.map((visit) => <RecordLink key={visit.id} to={'/vaccines/' + encodeURIComponent(visit.id)} icon="vaccines"
          title={patientName(state, visit.patientId)} meta={instantLabel(visit.scheduledFor, find(state.stores, visit.storeId))}/>)
          : <Empty>No upcoming vaccine visits.</Empty>}
      </Preview>
    </div>
  </div>
}
