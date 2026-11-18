import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { AccountLink, Icon, Missing, Status, dateLabel } from './ui.jsx'
import { PlanWorkspace, PlanDetails, ComparePlans, PlanSelectionProvider } from './pages/Plans.jsx'
import { Claims, ClaimDetails, memberClaims } from './pages/Claims.jsx'
import { Enrollment, Apply, RequestDetails } from './pages/Enrollment.jsx'

const destinations = [
  { to: '/', title: 'Overview', icon: 'overview' },
  { to: '/plans', title: 'Compare plans', icon: 'plans', summary: 'Find and compare plans available in your ZIP code.' },
  { to: '/claims', title: 'Claims', icon: 'claims', summary: 'Check what Medicare paid and review services.' },
  { to: '/enrollment', title: 'Enrollment', icon: 'enrollment', summary: 'Find a plan or track an enrollment request.' },
]

function Shell({ children }) {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const main = useRef(null)
  const previousPath = useRef(pathname)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    main.current.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])
  const fullName = [state.account?.firstName, state.account?.lastName].filter(Boolean).join(' ')
  return <div className="shell">
    <a className="skip" href="#content">Skip to main content</a>
    <aside className="sidebar">
      <AccountLink className="wordmark" to="/">Medicare.gov</AccountLink>
      <div className="sidebar-inner">
        <nav aria-label="Account navigation">
          {destinations.map(({ to, title, icon }) => {
            const active = to === '/' ? pathname === to : pathname === to || pathname.startsWith(to + '/')
            return <AccountLink key={to} className="nav-link" to={to} aria-current={active ? 'page' : undefined}><Icon name={icon} />{title}</AccountLink>
          })}
        </nav>
        <div className="rail-member"><Icon name="shield" /><div><strong>{fullName || 'Medicare member'}</strong><small>Your Medicare account</small></div></div>
      </div>
    </aside>
    <main ref={main} id="content" className="main" tabIndex={-1}>{children}</main>
  </div>
}

function Overview() {
  const { state } = useAccount()
  const account = state.account ?? {}
  const coverage = account.coverage ?? {}
  const memberName = [account.firstName, account.lastName].filter(Boolean).join(' ')
  const claims = memberClaims(state).slice(0, 3)
  const window = account.enrollmentWindow
  return <>
    <section className="hero">
      <div><h1>{account.firstName ? 'Welcome, ' + account.firstName : 'Your Medicare account'}</h1>
      <p>Manage your coverage, see recent claims and explore plans in your area.</p></div>
      <img src="/coverage-illustration.svg" alt="" width="320" height="204" />
    </section>
    <section className="workflow-grid" aria-label="Account tools">
      {destinations.slice(1).map(({ to, title, icon, summary }) => <AccountLink key={to} to={to} className="workflow panel">
        <span className="icon-tile"><Icon name={icon} /></span>
        <h2>{title}</h2><p>{summary}</p><span className="workflow-arrow"><Icon name="arrow" /></span>
      </AccountLink>)}
    </section>
    <div className="overview-grid">
      <section className="panel recent">
        <div className="section-head"><h2>Recent claims</h2><AccountLink to="/claims">View all claims</AccountLink></div>
        {claims.length ? <ul className="clean-list">{claims.map((claim) => <li key={claim.id}>
          <div><AccountLink to={'/claims/' + encodeURIComponent(claim.id)}>{claim.providerName || claim.claimNumber || 'Claim details'}</AccountLink>
          <small>{dateLabel(claim.serviceDate)}{claim.part ? ' · Part ' + claim.part : ''}</small></div><Status value={claim.status} />
        </li>)}</ul> : <p>No claims are available for this member.</p>}
      </section>
      <section className="panel coverage">
        <h2>Current coverage</h2>
        <strong>{coverage.type || 'Coverage unavailable'}</strong>
        <dl>
          <div className="coverage-member"><dt>Member</dt><dd>{memberName || 'Unavailable'}</dd></div>
          <div><dt>Part A started</dt><dd>{dateLabel(coverage.partAStartDate)}</dd></div>
          <div><dt>Part B started</dt><dd>{dateLabel(coverage.partBStartDate)}</dd></div>
          <div><dt>Medicare number</dt><dd>{account.medicareNumberMasked || 'Unavailable'}</dd></div>
        </dl>
        {window?.label && <div className="coverage-window"><AccountLink to="/enrollment">{window.label}</AccountLink><small>{dateLabel(window.opensOn)} – {dateLabel(window.closesOn)}</small></div>}
      </section>
    </div>
  </>
}

export default function App() {
  return <PlanSelectionProvider><Shell><Routes>
    <Route path="/" element={<Overview />} />
    <Route path="/plans" element={<PlanWorkspace />} />
    <Route path="/plans/compare" element={<ComparePlans key="preview" />} />
    <Route path="/plans/compare/:comparisonId" element={<ComparePlans key="saved" />} />
    <Route path="/plans/:planId" element={<PlanDetails />} />
    <Route path="/claims" element={<Claims />} />
    <Route path="/claims/:claimId" element={<ClaimDetails />} />
    <Route path="/enrollment" element={<Enrollment />} />
    <Route path="/enrollment/apply/:planId" element={<Apply />} />
    <Route path="/enrollment/:enrollmentId" element={<RequestDetails />} />
    <Route path="*" element={<Missing />} />
  </Routes></Shell></PlanSelectionProvider>
}
