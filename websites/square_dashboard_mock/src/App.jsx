import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store.jsx'
import { Recovery, RouteLink } from './ui.jsx'
import { Overview } from './pages/Overview.jsx'
import { ItemRoute, Items } from './pages/Items.jsx'
import { OrderRoute, Orders } from './pages/Orders.jsx'
import { RefundRoute, Refunds } from './pages/Refunds.jsx'
import { PayoutRoute, Payouts } from './pages/Payouts.jsx'

const nav = [['/', 'Overview'], ['/items', 'Items'], ['/orders', 'Orders'], ['/refunds', 'Refunds'], ['/payouts', 'Payouts']]

export function App() {
  const { state } = useStore()
  const { pathname } = useLocation()
  const { merchantName, actorName } = state.account || {}
  return <>
    <a className="skip" href="#workspace">Skip to workspace</a>
    <div className="account-bar">
      <div className="bar-inner">
        <RouteLink to="/" className="brand">Square</RouteLink>
        <nav aria-label="Main navigation">{nav.map(([path, title]) => {
          const active = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')
          return <RouteLink key={path} to={path} aria-current={active ? 'page' : undefined}>{title}</RouteLink>
        })}</nav>
        <div className="account"><span className="avatar" aria-hidden="true">{actorName?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || 'S'}</span><div><strong>{merchantName || 'Seller account'}</strong><span>{actorName || 'Signed-in seller'}</span></div></div>
      </div>
    </div>
    <main id="workspace" className="workspace">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/new" element={<ItemRoute />} />
        <Route path="/items/:itemId" element={<ItemRoute />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderRoute />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/refunds/:refundId" element={<RefundRoute />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/payouts/:payoutId" element={<PayoutRoute />} />
        <Route path="*" element={<Recovery />} />
      </Routes>
    </main>
  </>
}
