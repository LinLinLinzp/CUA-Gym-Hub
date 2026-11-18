import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Orders, OrderDetail } from './Orders.jsx'
import { Activity } from './Activity.jsx'

const links = [
  ['/orders', 'Orders'],
  ['/transfers', 'Transfers'],
  ['/listings', 'My Listings'],
  ['/refunds', 'Refunds'],
]

export function App() {
  const { world } = useAccount()
  const name = world.account?.name || 'My account'
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return <>
    <header className="global-header">
      <div className="wrap header-content">
        <NavLink to={withSid('/orders')} className="wordmark">Ticketmaster</NavLink>
        <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
      </div>
    </header>
    <div className="account-bar">
      <div className="wrap account-nav">
        <span className="account-label">My Account</span>
        <nav aria-label="Account">
          {links.map(([path, label]) => <NavLink key={path} to={withSid(path)}>{label}</NavLink>)}
        </nav>
      </div>
    </div>
    <main className="wrap workspace" id="main">
      <Routes>
        <Route path="/" element={<Navigate replace to={withSid('/orders')} />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetail key="detail" />} />
        {links.slice(1).map(([path]) => <Route key={path} path={path} element={<Activity key={path} kind={path.slice(1)} />} />)}
        <Route path="*" element={<Navigate replace to={withSid('/orders')} />} />
      </Routes>
    </main>
  </>
}
