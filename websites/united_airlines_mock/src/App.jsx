import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { useStore } from './store.jsx'
import { AppLink, Empty, Heading, RouteFocus, count, money, routeTitle, segmentDay, time, tripPath } from './ui.jsx'
import { credits, eligibleCredit, future, list, person, trips } from './data/account.js'
import { withSid } from './utils/dataManager.js'
import { BookingPage } from './pages/Booking.jsx'
import { TripsPage, TripPage } from './pages/Trips.jsx'
import { SeatsPage } from './pages/Seats.jsx'
import { MileagePage } from './pages/Mileage.jsx'
import { CreditsPage } from './pages/Credits.jsx'

const navigation = [
  ['/', '⌂', 'Overview'], ['/book', '↗', 'Book a flight'], ['/trips', '▤', 'My trips'],
  ['/mileageplus', '◇', 'MileagePlus'], ['/credits', '▱', 'Travel credits'],
]

function Shell() {
  const { world } = useStore()
  const initials = [world.account?.firstName, world.account?.lastName].map(name => String(name ?? '').slice(0, 1)).join('')
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead">
      <AppLink to="/" className="wordmark">United Airlines</AppLink>
      <div className="identity"><span aria-hidden="true" className="avatar">{initials || 'UA'}</span><strong>{person(world.account) || 'My account'}</strong></div>
    </header>
    <div className="workspace">
      <aside className="rail"><nav aria-label="Account">
        <p className="rail-label">My account</p>
        {navigation.map(([path, symbol, label]) => <NavLink key={path} to={withSid(path)} end={path === '/'}>
          <span aria-hidden="true" className="nav-icon">{symbol}</span>{label}
        </NavLink>)}
      </nav></aside>
      <main id="main" className="main" tabIndex={-1}><RouteFocus /><Outlet /></main>
    </div>
  </>
}

function Overview() {
  const { world } = useStore()
  const next = trips(world).filter(booking => booking.status === 'confirmed').flatMap(booking =>
    list(booking.segments).filter(segment => future(segment)).map(segment => ({ booking, segment })))
    .sort((a, b) => Date.parse(a.segment.departureAt) - Date.parse(b.segment.departureAt))[0]
  const openCredits = credits(world).filter(credit => eligibleCredit(world, credit))
  const balance = openCredits.reduce((sum, credit) => sum + Math.round(credit.remainingAmount * 100), 0) / 100
  const segment = next?.segment
  return <>
    <Heading title={world.account?.firstName ? 'Welcome, ' + world.account.firstName : 'Account overview'}
      actions={<AppLink to="/book" className="button primary">Book a flight <span aria-hidden="true">↗</span></AppLink>}>
      Manage your trips, MileagePlus activity and travel credits.
    </Heading>
    <div className="overview-grid">
      <section className="hero" aria-labelledby="next-trip">
        <div className="route-art" aria-hidden="true"><i><b /><b /><span>✈</span></i></div>
        <div className="hero-content">
          <div className="hero-top"><h2 id="next-trip">Next trip</h2>{segment && <span className="hero-tag">Confirmed</span>}</div>
          {segment ? <>
            <div className="hero-codes"><span>{segment.origin?.code || '—'}</span><span className="hero-arrow" aria-hidden="true">→</span><span>{segment.destination?.code || '—'}</span></div>
            <p className="hero-cities">{routeTitle(segment)}</p>
            <div className="hero-details"><div><span>Departure</span><strong>{segmentDay(segment)} · {time(segment.departureAt, segment.origin)}</strong></div>
              <div><span>Confirmation</span><strong>{next.booking.confirmationCode || '—'}</strong></div></div>
            {next.booking.id && <AppLink to={tripPath(next.booking)} className="button amber">View trip <span aria-hidden="true">→</span></AppLink>}
          </> : <>
            <h3>No upcoming trips</h3><p>Search for a flight to plan your next trip.</p>
            <AppLink className="button amber" to="/book">Search flights</AppLink>
          </>}
        </div>
      </section>
      <div className="summary-stack">
        <section className="panel summary"><div><h2>MileagePlus</h2><div className="metric">{count(world.mileagePlus?.awardMiles)}</div><p>Award miles{world.mileagePlus?.tier ? ' · ' + world.mileagePlus.tier : ''}</p></div>
          <AppLink to="/mileageplus">View MileagePlus <span aria-hidden="true">→</span></AppLink>
        </section>
        <section className="panel summary"><div><h2>Travel credits</h2><div className="metric">{money(balance)}</div><p>{openCredits.length} eligible {openCredits.length === 1 ? 'credit' : 'credits'}</p></div>
          <AppLink to="/credits">View travel credits <span aria-hidden="true">→</span></AppLink>
        </section>
      </div>
    </div>
  </>
}

function Missing() {
  return <><Heading title="Page unavailable" /><Empty title="This page could not be found."><AppLink to="/">Back to overview</AppLink></Empty></>
}

export default function App() {
  return <Routes><Route element={<Shell />}>
    <Route index element={<Overview />} />
    <Route path="book" element={<BookingPage />} />
    <Route path="trips" element={<TripsPage />} />
    <Route path="trips/:bookingId" element={<TripPage />} />
    <Route path="trips/:bookingId/seats" element={<SeatsPage />} />
    <Route path="mileageplus" element={<MileagePage />} />
    <Route path="credits" element={<CreditsPage />} />
    <Route path="credits/:creditId" element={<CreditsPage />} />
    <Route path="account" element={<Navigate replace to={withSid('/')} />} />
    <Route path="*" element={<Missing />} />
  </Route></Routes>
}
