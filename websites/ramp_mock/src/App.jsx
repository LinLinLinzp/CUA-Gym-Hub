import { Route, Routes } from 'react-router-dom'
import { useStore } from './store.jsx'
import { Heading, RouteLink } from './ui.jsx'
import { actor, initials, label } from './utils/format.js'
import { Overview } from './pages/Overview.jsx'
import { Cards, CardDetail } from './pages/Cards.jsx'
import { Bills, BillDetail } from './pages/Bills.jsx'
import { Approvals, ApprovalDetail } from './pages/Approvals.jsx'
import { Policy } from './pages/Policy.jsx'

export function App() {
  const { state } = useStore()
  const user = actor(state)
  return <>
    <a href="#content" className="skip">Skip to content</a>
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand"><RouteLink to="/" aria-label="Ramp home">Ramp</RouteLink><span>{state.workspace?.name || 'Workspace'}</span></div>
        <nav aria-label="Workspace">
          {[['/', 'Overview'], ['/cards', 'Cards'], ['/bills', 'Bill Pay'], ['/approvals', 'Approvals'], ['/policy', 'Policy']].map(([path, name]) =>
            <RouteLink key={path} to={path} nav end={path === '/'}>{name}</RouteLink>)}
        </nav>
        <div className="identity"><span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
          <span><strong>{user?.name || 'Workspace user'}</strong><small>{label(user?.role)}</small></span>
        </div>
      </div>
    </header>
    <main id="content" className="content">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="cards" element={<Cards />} />
        <Route path="cards/:id" element={<CardDetail />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/:id" element={<BillDetail />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="approvals/:id" element={<ApprovalDetail />} />
        <Route path="policy" element={<Policy />} />
        <Route path="*" element={<><Heading title="Page unavailable" /><RouteLink to="/">Return to Overview</RouteLink></>} />
      </Routes>
    </main>
  </>
}
