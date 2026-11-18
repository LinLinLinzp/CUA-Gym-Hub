import React from 'react'
import { ArrowUpRight, Armchair, ChevronRight, ClipboardList, House, PackageOpen, ShoppingBag, Truck, UserRound } from 'lucide-react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { AccountLink, Empty, OrderRow, Page, Photo } from './components.jsx'
import { byId, future, list, newest, serviceLabel, slotText, statusLabel } from './utils/account.js'
import { Cart, Catalog, Checkout } from './pages/Shopping.jsx'
import { OrderDetail, Orders } from './pages/Orders.jsx'
import { ReturnDetail, ReturnForm, Returns } from './pages/Returns.jsx'
import { ServiceDetail, Services } from './pages/Services.jsx'

const navigation = [
  ['/', 'Overview', House], ['/products', 'Products', Armchair], ['/cart', 'Cart', ShoppingBag],
  ['/orders', 'Purchases', ClipboardList], ['/services', 'Delivery & assembly', Truck], ['/returns', 'Returns', PackageOpen],
]

function quantity(cart) {
  return list(cart?.lines).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
}

function Shell() {
  const { state } = useAccount()
  const itemCount = quantity(state.cart)
  return <>
    <header className="site-header">
      <div className="header-inner">
        <AccountLink to="/" className="wordmark" aria-label="IKEA account home">IKEA<span>.</span></AccountLink>
        <div className="header-actions">
          <AccountLink to="/cart" className="header-cart" aria-label={'Cart, ' + itemCount + (itemCount === 1 ? ' item' : ' items')}>
            <ShoppingBag size={20} aria-hidden="true" /> <span>Cart</span><strong>{itemCount}</strong>
          </AccountLink>
          <div className="profile"><span className="avatar"><UserRound size={18} aria-hidden="true" /></span>
            <span>{state.profile?.name || 'Your account'}</span></div>
        </div>
      </div>
    </header>
    <div className="workspace">
      <aside className="rail">
        <nav aria-label="Account navigation">
          <p className="rail-title">Your account</p>
          {navigation.map(([to, label, Icon]) => <AccountLink key={to} to={to} nav end={to === '/'}
            className={({ isActive }) => 'rail-link' + (isActive ? ' active' : '')}>
            <Icon size={19} strokeWidth={1.75} aria-hidden="true" /> {label}
          </AccountLink>)}
        </nav>
      </aside>
      <main className="content" id="main"><Outlet /></main>
    </div>
  </>
}

function Overview() {
  const { state } = useAccount()
  const firstName = state.profile?.name?.trim()?.split(/\s+/)[0]
  const nextBooking = list(state.bookings).filter((booking) => booking.status === 'scheduled' && future(booking.slot?.startsAt))
    .sort((a, b) => Date.parse(a.slot.startsAt) - Date.parse(b.slot.startsAt))[0]
  const latestReturn = newest(state.returns)[0]
  const recentOrders = newest(state.orders).slice(0, 3)
  const itemCount = quantity(state.cart)
  const shortcuts = [
    ['/cart', 'Your cart', itemCount ? itemCount + (itemCount === 1 ? ' item ready to review' : ' items ready to review') : 'Your cart is empty', ShoppingBag],
    ['/services', 'Delivery & assembly', nextBooking ? serviceLabel(nextBooking.type) + ' · ' + slotText(nextBooking.slot) : 'No upcoming appointments', Truck],
    ['/returns', 'Returns', latestReturn ? (latestReturn.reference || latestReturn.id) + ' · ' + statusLabel(latestReturn.status) : 'No return requests yet', PackageOpen],
  ]
  return <div className="stack">
    <section className="hero">
      <div className="hero-copy">
        <h1>{firstName ? 'Hi, ' + firstName + '.' : 'Your account'}</h1>
        <p>Pick up where you left off. Manage your orders, home services and returns in one place.</p>
        <AccountLink className="button hero-button" to="/orders">View purchases <ArrowUpRight size={17} aria-hidden="true" /></AccountLink>
      </div>
      <Photo imageKey="living-room" className="hero-art" />
    </section>
    <section aria-label="Account shortcuts" className="shortcut-grid">
      {shortcuts.map(([to, title, description, Icon]) => <AccountLink key={to} to={to} className="card shortcut">
        <span className="tile-icon"><Icon size={21} aria-hidden="true" /></span>
        <span className="shortcut-title">{title}</span>
        <span className="muted shortcut-description">{description}</span>
        <ChevronRight className="shortcut-arrow" size={19} aria-hidden="true" />
      </AccountLink>)}
    </section>
    <section>
      <div className="section-heading"><h2>Recent purchases</h2><AccountLink to="/orders">All purchases <ChevronRight size={16} aria-hidden="true" /></AccountLink></div>
      {recentOrders.length ? <div className="card rows">{recentOrders.map((order) =>
        <OrderRow key={order.id} order={order} product={byId(state.products, list(order.lines)[0]?.productId)} />)}
      </div> : <Empty title="No purchases yet" action={<AccountLink to="/products">Browse products</AccountLink>} />}
    </section>
  </div>
}

function NotFound() {
  return <Page title="Page unavailable"><Empty title="This page couldn’t be found" action={<AccountLink to="/">Back to overview</AccountLink>} /></Page>
}

export function App() {
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<Overview />} />
      <Route path="products" element={<Catalog />} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="orders" element={<Orders />} />
      <Route path="orders/:orderId" element={<OrderDetail />} />
      <Route path="services" element={<Services />} />
      <Route path="services/:bookingId" element={<ServiceDetail />} />
      <Route path="returns" element={<Returns />} />
      <Route path="returns/new" element={<ReturnForm />} />
      <Route path="returns/:returnId" element={<ReturnDetail />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
}
