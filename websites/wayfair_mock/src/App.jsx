import { Box, ClipboardList, House, RotateCcw, Truck, UserRound } from 'lucide-react'
import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { AccountLink, Missing, useSidPath } from './components/Navigation.jsx'
import { ToastProvider } from './components/Feedback.jsx'
import { useAccount } from './context/Account.jsx'
import { Overview, OrderList, OrderDetail } from './pages/Orders.jsx'
import { DeliveryList, DeliveryDetail } from './pages/Deliveries.jsx'
import { ClaimList, ClaimDetail, ReturnList, ReturnDetail } from './pages/Service.jsx'

const sections = [
  ['/', 'Overview', House],
  ['/orders', 'Orders', Box],
  ['/deliveries', 'Deliveries', Truck],
  ['/claims', 'Damage claims', ClipboardList],
  ['/returns', 'Returns', RotateCcw],
]

function Layout() {
  const path = useSidPath()
  const { state } = useAccount()
  const name = state.account?.name || 'My account'
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <>
    <header className="site-header">
      <div className="header-inner">
        <AccountLink className="wordmark" to="/" aria-label="Wayfair account overview">Wayfair<span>.</span></AccountLink>
        <AccountLink className="header-account" to="/"><UserRound size={18} /> My account</AccountLink>
      </div>
    </header>
    <div className="account-frame">
      <aside className="rail">
        <div className="profile">
          <span className="initials" aria-hidden="true">{initials}</span>
          <strong>{name}</strong>
        </div>
        <nav aria-label="Account">
          {sections.map(([to, label, Icon]) => <NavLink end={to === '/'} key={to} to={path(to)}>
            <Icon size={19} aria-hidden="true" /> <span>{label}</span>
          </NavLink>)}
        </nav>
      </aside>
      <main className="main-content" id="main"><Outlet /></main>
    </div>
  </>
}

export default function App() {
  return <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
          <Route path="deliveries" element={<DeliveryList />} />
          <Route path="deliveries/:shipmentId" element={<DeliveryDetail />} />
          <Route path="claims" element={<ClaimList />} />
          <Route path="claims/:claimId" element={<ClaimDetail />} />
          <Route path="returns" element={<ReturnList />} />
          <Route path="returns/:returnId" element={<ReturnDetail />} />
          <Route path="*" element={<Missing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
}
