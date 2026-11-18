import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BankProvider, useBank } from './bank'
import { Icon, Missing, SessionLink } from './ui'
import { Accounts, AccountDetail, TransactionDetail } from './pages/Accounts'
import Transfers from './pages/Transfers'
import BillPay from './pages/BillPay'
import { Disputes, DisputeDetail } from './pages/Disputes'
import Alerts from './pages/Alerts'

const destinations = [
  ['Accounts', '/accounts', 'accounts'],
  ['Transfers', '/transfers', 'transfer'],
  ['Bill pay', '/bill-pay', 'bill'],
  ['Disputes', '/disputes', 'dispute'],
  ['Alerts', '/alerts', 'bell'],
]

function Workspace() {
  const { state } = useBank()
  const { pathname } = useLocation()
  const active = destinations.find(([, path]) => pathname === path || pathname.startsWith(path + '/'))
    || (pathname === '/' ? destinations[0] : null)
  const name = [state.profile?.firstName, state.profile?.lastName].filter(Boolean).join(' ') || 'Account holder'
  const initials = name.split(' ').slice(0, 2).map((word) => word[0]).join('')
  return <>
    <a className="skip" href="#main-content">Skip to main content</a>
    <div className="workspace">
      <aside className="rail">
        <SessionLink className="brand" to="/">Chase</SessionLink>
        <nav aria-label="Banking">
          {destinations.map(([label, path, icon]) => (
            <SessionLink key={path} className={active?.[1] === path ? 'nav-item selected' : 'nav-item'}
              aria-current={active?.[1] === path ? 'page' : undefined} to={path}>
              <Icon name={icon} />{label}
            </SessionLink>
          ))}
        </nav>
      </aside>
      <header className="utility">
        <span>{active?.[0] || 'Banking'}</span>
        <span className="profile"><span className="avatar" aria-hidden="true">{initials}</span>{name}</span>
      </header>
      <main id="main-content" tabIndex={-1} className="main">
        <Routes>
          <Route path="/" element={<Accounts />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:accountId" element={<AccountDetail key={pathname} />} />
          <Route path="/accounts/:accountId/transactions/:transactionId" element={<TransactionDetail />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/bill-pay" element={<BillPay />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/disputes/:disputeId" element={<DisputeDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="*" element={<Missing title="Page unavailable" />} />
        </Routes>
      </main>
    </div>
  </>
}

export default function App() {
  return <BrowserRouter><BankProvider><Workspace /></BankProvider></BrowserRouter>
}
