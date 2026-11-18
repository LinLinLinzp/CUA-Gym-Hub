import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useAccount } from './store'
import { Trips, TripDetails } from './Trips'
import { Alerts } from './Alerts'
import { Bookings, BookingDetails } from './Bookings'
import { AccountLink, PageHeader, Symbol, useAccountPath } from './ui'

const sections = [
  ['/trip', 'Trips', 'trip'],
  ['/alerts', 'Price alerts', 'alert'],
  ['/bookings', 'Bookings', 'booking'],
]

export function App() {
  const path = useAccountPath()
  const { pathname } = useLocation()
  const { world } = useAccount()
  const name = world.user?.name || 'Traveler'
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <>
    <a className="skip" href="#workspace">Skip to content</a>
    <header className="masthead">
      <div className="masthead-inner">
        <AccountLink to="/trip" className="brand" aria-label="KAYAK home">KAYAK</AccountLink>
        <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
      </div>
    </header>
    <div className="shell">
      <aside className="rail">
        <div className="rail-title">My account</div>
        <nav aria-label="Account">
          {sections.map(([url, title, icon]) => <NavLink key={url} to={path(url)}>
            <Symbol name={icon} />{title}
          </NavLink>)}
        </nav>
      </aside>
      <main id="workspace" className="workspace" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to={path('/trip')} replace />} />
          <Route path="/trip" element={<Trips />} />
          <Route path="/trip/:id" element={<TripDetails key={pathname} />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetails key={pathname} />} />
          <Route path="*" element={<>
            <PageHeader title="Page unavailable" />
            <AccountLink to="/trip" className="back">← All trips</AccountLink>
          </>} />
        </Routes>
      </main>
    </div>
  </>
}
