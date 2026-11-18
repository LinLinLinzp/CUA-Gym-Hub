import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { Icon, Missing, SessionLink } from './ui.jsx'
import { OrderDetails, Orders } from './orders.jsx'
import { GroupDetails, GroupGuest, Groups } from './groups.jsx'
import { RefundDetails, Refunds } from './refunds.jsx'
import { DashPass, PaymentDetails } from './dashpass.jsx'

const destinations = [
  ['/orders', 'Orders', 'bag'],
  ['/group-orders', 'Group orders', 'people'],
  ['/refunds', 'Refunds', 'receipt'],
  ['/dashpass', 'DashPass', 'pass'],
]

export default function App() {
  const { state, notice, setNotice } = useAccount()
  const { pathname, search } = useLocation()
  const name = state.account?.name || 'Your account'
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const redirect = new URLSearchParams(search).has('sid') ? '/orders' + search : withSid('/orders' + search)

  return <>
    <header className="masthead">
      <div className="frame brand-row">
        <SessionLink className="wordmark" to="/orders">DoorDash</SessionLink>
        <div className="account-name"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
      </div>
    </header>
    <nav className="account-nav" aria-label="Account">
      <div className="frame nav-row">
        {destinations.map(([path, label, icon]) => {
          const active = pathname === path || pathname.startsWith(path + '/')
          return <SessionLink key={path} to={path} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
            <Icon name={icon} />{label}
          </SessionLink>
        })}
      </div>
    </nav>
    <main className="frame main">
      <Routes>
        <Route path="/" element={<Navigate to={redirect} replace />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/group-orders" element={<Groups />} />
        <Route path="/group-orders/:groupId" element={<GroupDetails />} />
        <Route path="/group-orders/:groupId/join" element={<GroupGuest />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/refunds/:refundId" element={<RefundDetails />} />
        <Route path="/dashpass" element={<DashPass />} />
        <Route path="/dashpass/payments/:paymentId" element={<PaymentDetails />} />
        <Route path="*" element={<Missing title="Page unavailable" to="/orders" back="Orders" />} />
      </Routes>
    </main>
    <div className="notice-region" role="status" aria-live="polite">
      {notice && <div className="notice"><Icon name="check" />{notice.message}<button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  </>
}
