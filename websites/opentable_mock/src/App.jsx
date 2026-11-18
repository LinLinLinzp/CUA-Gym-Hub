import { CalendarDays, Compass, MapPin, Sparkles, Star } from 'lucide-react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AccountLink, Empty } from './ui'
import { useAccount } from './store'
import { Reservations, ReservationDetail } from './Reservations'
import { Discover, RestaurantDetail } from './Discover'
import { Points, Reviews } from './AccountPages'

const sections = [
  ['/reservations', 'Reservations', CalendarDays, '/reservations'],
  ['/discover', 'Find a table', Compass, '/restaurants'],
  ['/reviews', 'Reviews', Star, '/reviews'],
  ['/points', 'Points', Sparkles, '/points'],
]

export default function App() {
  const { state, feedback } = useAccount()
  const { pathname, search } = useLocation()
  const { firstName, lastName, city } = state.account || {}
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Diner'
  const initials = name.split(' ').slice(0, 2).map(part => part[0]).join('')

  return (
    <div className="layout">
      <aside className="rail">
        <AccountLink to="/" className="wordmark">OpenTable</AccountLink>
        <nav aria-label="Dining account">
          {sections.map(([to, label, Icon, detail]) => {
            const active = pathname === to || pathname.startsWith(detail + '/')
            return <AccountLink key={to} to={to} aria-current={active ? 'page' : undefined}><Icon size={19} />{label}</AccountLink>
          })}
        </nav>
        <div className="profile"><span className="initials" aria-hidden="true">{initials}</span><span><strong>{name}</strong><small>Dining account</small></span></div>
      </aside>
      <main className="workspace">
        <div className="frame">
          <div className="context"><span>My account</span>{city && <span><MapPin size={14} aria-hidden="true" />{city}</span>}</div>
          <Routes>
            <Route path="/" element={<Navigate to={'/reservations' + search} replace />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/reservations/:id" element={<ReservationDetail />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/points" element={<Points />} />
            <Route path="*" element={<Empty title="Page unavailable" action={<AccountLink to="/reservations" className="button">Back to reservations</AccountLink>}>This account page could not be found.</Empty>} />
          </Routes>
        </div>
      </main>
      <div aria-live="polite" className="feedback">{feedback && <div>{feedback}</div>}</div>
    </div>
  )
}
