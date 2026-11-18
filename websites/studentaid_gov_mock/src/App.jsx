import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { A, Glyph, Missing } from './ui.jsx'
import { personName } from './domain.js'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Dashboard, Activity } from './pages/Overview.jsx'
import { Fafsa, FafsaDetail } from './pages/Fafsa.jsx'
import { Loans, LoanDetail, Acknowledgment } from './pages/Loans.jsx'
import { Repayment, Scenario, Request } from './pages/Repayment.jsx'

const navigation = [
  ['/dashboard', 'Dashboard', 'dashboard'],
  ['/fafsa', 'FAFSA', 'forms'],
  ['/my-loans', 'My Loans', 'loans'],
  ['/repayment', 'Repayment', 'repayment'],
  ['/my-activity', 'My Activity', 'activity'],
]
const related = {
  '/my-loans': ['/loan-acknowledgment'],
  '/repayment': ['/loan-simulator', '/idr'],
}

export default function App() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const name = personName(state.profile)
  const initials = [state.profile?.firstName, state.profile?.lastName].map(part => part?.[0]).filter(Boolean).join('') || 'SA'
  return <>
    <a className="skip" href="#main">Skip to main content</a>
    <header className="mast">
      <A className="wordmark" to="/">StudentAid<span>.gov</span></A>
      <div className="identity"><div><strong>{name}</strong><small>My account</small></div><span className="avatar" aria-hidden="true">{initials}</span></div>
    </header>
    <div className="layout">
      <aside className="rail"><nav aria-label="Account">
        {navigation.map(([to, label, icon]) => {
          const alternate = (to === '/dashboard' && pathname === '/') || related[to]?.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
          return <NavLink key={to} to={withSid(to)} aria-current={alternate ? 'page' : undefined} className={({ isActive }) => isActive || alternate ? 'nav-item selected' : 'nav-item'}><Glyph name={icon} />{label}</NavLink>
        })}
      </nav></aside>
      <main id="main" className="workspace" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-activity" element={<Activity />} />
          <Route path="/fafsa" element={<Fafsa />} />
          <Route path="/fafsa/:id" element={<FafsaDetail />} />
          <Route path="/my-loans" element={<Loans />} />
          <Route path="/my-loans/:id" element={<LoanDetail />} />
          <Route path="/loan-acknowledgment" element={<Acknowledgment key="new" />} />
          <Route path="/loan-acknowledgment/:id" element={<Acknowledgment key="receipt" />} />
          <Route path="/repayment" element={<Repayment />} />
          <Route path="/loan-simulator" element={<Repayment />} />
          <Route path="/repayment/scenarios/:id" element={<Scenario />} />
          <Route path="/idr/:id" element={<Request />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </main>
    </div>
  </>
}
