
import React, { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { active, AppLink, date, latest, Missing, money, orderName, records, route, Status, useAccount } from './shared.jsx'
import { OrderDetail, Orders } from './pages/Orders.jsx'
import { RentalDetail, Rentals } from './pages/Rentals.jsx'
import { ProjectDetail, Projects } from './pages/Projects.jsx'
import { NewReturn, ReturnDetail, Returns } from './pages/Returns.jsx'

const destinations = [
  ['/', 'Overview'], ['/orders', 'Orders'], ['/rentals', 'Tool Rental'],
  ['/project-lists', 'Project Lists'], ['/returns', 'Returns'],
]

function Overview() {
  const { state } = useAccount()
  const orders = latest(state.orders).slice(0, 5)
  const rentals = records(state.rentals).filter(({ status }) => status === 'reserved' || status === 'active')
    .sort((a, b) => (Date.parse(b.pickupAt) || 0) - (Date.parse(a.pickupAt) || 0)).slice(0, 2)
  const lists = latest(active(state.projectLists), 'updatedAt').slice(0, 3)

  return <div className="flow">
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {state.account?.name?.trim().split(/\s+/)[0] || 'shopper'}</h1>
        <p>Find your receipts, reserve equipment and keep materials organized for your next project.</p>
        <div className="hero-links">
          {destinations.slice(1).map(([path, name]) => <AppLink key={path} to={path}>{name}<span aria-hidden="true"> ↗</span></AppLink>)}
        </div>
      </div>
      <div className="workbench" aria-hidden="true">
        <div className="pegboard"><i className="saw" /><i className="wrench" /><i className="square" /></div>
        <div className="bench-can" /><div className="bench-pot" /><div className="bench-plank" />
        <div className="bench-top" /><div className="bench-leg left-leg" /><div className="bench-leg right-leg" />
      </div>
    </section>
    <div className="overview-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Recent orders</h2><AppLink to="/orders">View all orders</AppLink></div>
        {orders.length ? <ul className="rows">{orders.map((order) => <li className="overview-row" key={order.id}>
          <div><AppLink to={route('/orders', order.id)}>{orderName(order)}</AppLink><small>{date(order.createdAt)}</small></div>
          <Status value={order.status} /><strong>{money(order.total)}</strong>
        </li>)}</ul> : <p className="panel-body">Your purchases will appear here.</p>}
      </section>
      <div className="flow">
        <section className="panel">
          <div className="panel-heading"><h2>Reservations</h2><AppLink to="/rentals?view=reservations">View all</AppLink></div>
          {rentals.length ? <ul className="rows">{rentals.map((rental) => <li className="overview-row compact" key={rental.id}>
            <div><AppLink to={route('/rentals', rental.id)}>{rental.toolName || 'Equipment reservation'}</AppLink><small>{date(rental.pickupAt, true)}</small></div>
            <Status value={rental.status} />
          </li>)}</ul> : <p className="panel-body">You have no open reservations.</p>}
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Project lists</h2><AppLink to="/project-lists">View all</AppLink></div>
          {lists.length ? <ul className="rows">{lists.map((list) => <li className="overview-row compact" key={list.id}>
            <AppLink to={route('/project-lists', list.id)}>{list.name || 'Untitled list'}</AppLink>
            <small>{active(list.items).length} materials</small>
          </li>)}</ul> : <p className="panel-body">Your saved materials lists will appear here.</p>}
        </section>
      </div>
    </div>
  </div>
}

export default function App() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const name = state.account?.name || 'My account'

  useEffect(() => {
    window.scrollTo(0, 0)
    document.querySelector('main')?.focus({ preventScroll: true })
  }, [pathname])

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead">
      <div className="wrap masthead-inner">
        <AppLink to="/" className="wordmark">The Home Depot</AppLink>
        <div className="identity"><span className="initials" aria-hidden="true">{name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span>{name}</div>
      </div>
      <nav aria-label="Account navigation" className="account-nav">
        <div className="wrap nav-inner">{destinations.map(([path, title]) =>
          <NavLink key={path} to={withSid(path)} end={path === '/'}>{title}</NavLink>)}</div>
      </nav>
    </header>
    <main className="wrap main" id="main" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetail key={pathname} />} />
        <Route path="/rentals" element={<Rentals />} />
        <Route path="/rentals/:rentalId" element={<RentalDetail key={pathname} />} />
        <Route path="/project-lists" element={<Projects />} />
        <Route path="/project-lists/:listId" element={<ProjectDetail key={pathname} />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/returns/new/:orderId" element={<NewReturn key={pathname} />} />
        <Route path="/returns/:returnId" element={<ReturnDetail />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}
