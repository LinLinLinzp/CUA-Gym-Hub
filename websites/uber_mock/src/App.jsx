import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { AccountLink, AccountNav, Icon, PageTitle } from './ui.jsx'
import { TripRoutes, RecentTrips } from './pages/Trips.jsx'
import { ReceiptRoutes } from './pages/Receipts.jsx'
import { ProfileRoutes } from './pages/Profiles.jsx'
import { LostRoutes } from './pages/LostItems.jsx'
import { RefundRoutes } from './pages/Refunds.jsx'

const navigation = [
  ['/', 'Overview'], ['/trips', 'Trips'], ['/receipts', 'Receipts'],
  ['/expense-profiles', 'Expense profiles'], ['/lost-items', 'Lost items'], ['/refunds', 'Refunds'],
]
const shortcuts = [
  ['/receipts', 'Receipts', 'Download or resend a receipt', 'receipts'],
  ['/expense-profiles', 'Expense profiles', 'Manage your business ride settings', 'profiles'],
  ['/lost-items', 'Lost items', 'Report an item left on a trip', 'lost'],
  ['/refunds', 'Refunds', 'Request a fare review', 'refunds'],
]

function Overview() {
  const { data } = useAccount()
  const firstName = data.rider?.name?.trim().split(/\s+/)[0]
  return <>
    <section className="overview-banner">
      <div className="banner-copy">
        {firstName && <p className="greeting">Welcome, {firstName}</p>}
        <h1>Your rider account</h1>
        <p>Review your trips, manage receipts and get help with a ride.</p>
      </div>
      <div className="route-art" aria-hidden="true"><i /><b /><span /><span /></div>
    </section>
    <div className="overview-grid">
      <section aria-labelledby="recent-heading">
        <header className="section-heading"><h2 id="recent-heading">Recent trips</h2><AccountLink to="/trips">View all trips <span aria-hidden="true">→</span></AccountLink></header>
        <RecentTrips />
      </section>
      <section aria-labelledby="tools-heading">
        <header className="section-heading"><h2 id="tools-heading">Account tools</h2></header>
        <div className="panel shortcuts">
          {shortcuts.map(([to, title, description, icon]) => <AccountLink key={to} to={to} className="shortcut">
            <span className="icon-tile"><Icon name={icon} /></span>
            <span><strong>{title}</strong><small>{description}</small></span>
            <Icon name="arrow" />
          </AccountLink>)}
        </div>
      </section>
    </div>
  </>
}

export default function App() {
  const { data, message, dismiss } = useAccount()
  const { pathname } = useLocation()
  const name = data.rider?.name || 'Rider'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'R'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead"><div className="container masthead-content">
      <AccountLink className="brand" to="/">Uber</AccountLink>
      <div className="identity"><span aria-hidden="true">{initials}</span>{name}</div>
    </div></header>
    <nav className="navigation" aria-label="Rider account"><div className="container nav-content">
      {navigation.map(([to, title]) => <AccountNav to={to} key={to} end={to === '/'}>{title}</AccountNav>)}
    </div></nav>
    <main id="main" className="container main">
      <div aria-live="polite" role="status">{message && <div className="notice"><span>{message}</span><button type="button" aria-label="Dismiss confirmation" onClick={dismiss}>×</button></div>}</div>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/trips/*" element={<TripRoutes />} />
        <Route path="/receipts/*" element={<ReceiptRoutes />} />
        <Route path="/expense-profiles/*" element={<ProfileRoutes />} />
        <Route path="/lost-items/*" element={<LostRoutes />} />
        <Route path="/refunds/*" element={<RefundRoutes />} />
        <Route path="*" element={<><PageTitle title="Page unavailable" /><AccountLink to="/">Back to overview</AccountLink></>} />
      </Routes>
    </main>
  </>
}
