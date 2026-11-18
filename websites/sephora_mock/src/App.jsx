import React, { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AccountProvider, useAccount } from './account.jsx'
import { getSessionId } from './utils/dataManager.js'
import { AccountLink, AccountNav, Badge, Empty, SectionHeading, date, list, money, newest, orderNumber, paths, points, returnNumber } from './ui.jsx'
import { OrderDetails, Orders } from './orders.jsx'
import { BeautyInsider } from './beauty.jsx'
import { NewReturn, ReturnDetails, Returns } from './returns.jsx'

const navigation = [
  [paths.overview, 'Overview'], [paths.orders, 'Orders'],
  [paths.beauty, 'Beauty Insider'], [paths.returns, 'Returns'],
]

function Overview() {
  const { state } = useAccount()
  const recent = newest(list(state.orders), 'placedAt').slice(0, 3)
  const active = newest(list(state.returns).filter((entry) => ['submitted', 'in_transit'].includes(entry.status)), 'createdAt')
  const latest = active[0]
  const member = state.account?.firstName
  return <>
    <section className="welcome">
      <div className="welcome-content">
        <p className="eyebrow">My Account</p>
        <h1>{member ? 'Welcome back, ' + member : 'Welcome to your account'}</h1>
        <p>See what’s on its way, manage your returns, and make the most of your Beauty Insider points.</p>
        <AccountLink to={paths.orders} className="button">View orders <span aria-hidden="true">→</span></AccountLink>
      </div>
      <div className="still-life" aria-hidden="true"><span className="art-platform" /><span className="art-bottle" /><span className="art-tube" /><span className="art-jar" /></div>
    </section>
    <div className="overview-grid">
      <section className="card overview-orders">
        <SectionHeading title="Recent orders"><AccountLink to={paths.orders}>All orders <span aria-hidden="true">↗</span></AccountLink></SectionHeading>
        {recent.length ? <ul className="rows">{recent.map((order, index) => (
          <li className="overview-row" key={order.id ?? index}>
            <div>{order.id ? <AccountLink className="row-id" to={paths.order(order.id)}>{orderNumber(order)}</AccountLink> : <strong>{orderNumber(order)}</strong>}
              <span className="metadata">{date(order.placedAt)}</span>
            </div>
            <Badge status={order.status} />
            <strong>{money(order.total, order.currency)}</strong>
          </li>
        ))}</ul> : <p className="muted">Your placed orders will appear here.</p>}
      </section>
      <div className="stack">
        <section className="card member-card">
          <SectionHeading title="Beauty Insider">{state.beautyInsider?.tier && <span className="badge tier">{state.beautyInsider.tier}</span>}</SectionHeading>
          <p className="balance"><strong>{points(state.beautyInsider?.pointsBalance)}</strong> points</p>
          <AccountLink to={paths.beauty}>Explore rewards <span aria-hidden="true">↗</span></AccountLink>
        </section>
        <section className="card">
          <SectionHeading title="Returns"><AccountLink to={paths.returns}>All returns <span aria-hidden="true">↗</span></AccountLink></SectionHeading>
          {latest ? <div className="compact-row"><div>
            {latest.id ? <AccountLink to={paths.request(latest.id)} className="row-id">{returnNumber(latest)}</AccountLink> : <strong>{returnNumber(latest)}</strong>}
            <span className="metadata">{active.length} active {active.length === 1 ? 'return' : 'returns'}</span>
          </div><Badge status={latest.status} /></div> : <p className="muted">You have no active returns.</p>}
        </section>
      </div>
    </div>
  </>
}

function Shell() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <>
    <header className="site-header">
      <div className="wordmark-row container">
        <AccountLink className="wordmark" to={paths.overview}>SEPHORA</AccountLink>
      </div>
      <nav aria-label="Account" className="container nav-row">
        {navigation.map(([path, label]) => <AccountNav to={path} end={path === paths.overview} key={path}>{label}</AccountNav>)}
      </nav>
    </header>
    <main className="container content">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/account/orders" element={<Orders />} />
        <Route path="/account/orders/:orderId" element={<OrderDetails />} />
        <Route path="/account/beauty-insider" element={<BeautyInsider />} />
        <Route path="/account/returns" element={<Returns />} />
        <Route path="/account/returns/new/:orderId" element={<NewReturn />} />
        <Route path="/account/returns/:returnId" element={<ReturnDetails />} />
        <Route path="*" element={<Empty title="Page unavailable"><AccountLink to={paths.overview}>Back to account overview</AccountLink></Empty>} />
      </Routes>
    </main>
  </>
}

export default function App() {
  useLocation()
  return <AccountProvider key={getSessionId()}><Shell /></AccountProvider>
}
