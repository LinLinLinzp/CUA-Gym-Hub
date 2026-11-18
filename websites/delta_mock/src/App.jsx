import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store.jsx'
import { AccountLink, Empty, Icon } from './ui.jsx'
import { TripDetails, Trips } from './Trips.jsx'
import { ChangeFlight } from './ChangeFlight.jsx'
import { CancelTrip } from './CancelTrip.jsx'
import { MileageRequest, SkyMiles } from './SkyMiles.jsx'
import { ECredits } from './ECredits.jsx'
import { RedeemCredit } from './RedeemCredit.jsx'

const navigation = [
  { path: '/my-trips', icon: 'trips', label: 'My Trips' },
  { path: '/skymiles', icon: 'miles', label: 'SkyMiles' },
  { path: '/ecredits', icon: 'credits', label: 'eCredits' },
]

function Shell({ children }) {
  const { state } = useStore()
  const { pathname } = useLocation()
  const main = useRef(null)
  const previousPath = useRef(pathname)
  const account = state.account
  const name = [account?.firstName, account?.lastName].filter(Boolean).join(' ')
  const initials = [account?.firstName, account?.lastName].map((value) => String(value || '').slice(0, 1)).join('')

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return <div className="workspace">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="rail">
      <AccountLink to="/my-trips" className="wordmark" aria-label="Delta travel account home">DELTA</AccountLink>
      <nav aria-label="Travel account">
        {navigation.map(({ path, icon, label }) => {
          const active = pathname === path || pathname.startsWith(path + '/') || (pathname === '/' && path === '/my-trips')
          return <AccountLink key={path} to={path} aria-current={active ? 'page' : undefined}>
            <Icon name={icon} /><span>{label}</span>
          </AccountLink>
        })}
      </nav>
      <div className="member">
        {initials && <span className="initials" aria-hidden="true">{initials}</span>}
        <div><strong>{name || 'Delta member'}</strong>{account?.tier && <span>{account.tier}</span>}</div>
      </div>
    </aside>
    <main id="main-content" className="main" tabIndex={-1}><div className="content">{children}</div></main>
  </div>
}

function NotFound() {
  return <Empty title="Page unavailable"><AccountLink to="/my-trips">Return to My Trips</AccountLink></Empty>
}

export function App() {
  return <Shell><Routes>
    <Route path="/" element={<Trips />} />
    <Route path="/my-trips" element={<Trips />} />
    <Route path="/my-trips/:tripId" element={<TripDetails />} />
    <Route path="/my-trips/:tripId/change" element={<ChangeFlight />} />
    <Route path="/my-trips/:tripId/cancel" element={<CancelTrip />} />
    <Route path="/skymiles" element={<SkyMiles />} />
    <Route path="/skymiles/request" element={<MileageRequest />} />
    <Route path="/ecredits" element={<ECredits />} />
    <Route path="/ecredits/redeem" element={<RedeemCredit />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Shell>
}
