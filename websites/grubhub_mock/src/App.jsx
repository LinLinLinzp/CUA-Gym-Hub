import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AccountLink, Glyph, PageHeading } from './components/ui'
import { AccountProvider, useAccount } from './store'
import { list, timingPath } from './data/format'
import { Orders, Receipt } from './pages/orders'
import { Bag, Checkout, RestaurantMenu, Restaurants } from './pages/purchase'
import { Scheduled } from './pages/scheduled'
import { RefundDetail, Refunds } from './pages/refunds'

function Shell() {
  const { state } = useAccount()
  const location = useLocation()
  const bagCount = list(state.cart?.items).reduce((count, item) => count + (Number(item.quantity) || 0), 0)
  const name = state.account?.name || 'Your account'
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  const current = location.pathname
  const ordering = /^\/(restaurants(?:\/|$)|bag$|checkout$)/.test(current)
  const params = new URLSearchParams(location.search)
  const scheduling = params.get('timing') === 'scheduled'
  const selectedDelivery = params.get('delivery')
  const addresses = list(state.account?.addresses)
  const address = addresses.find(entry => entry.id === state.account?.defaultAddressId) || addresses[0]
  const deliveryArea = [address?.city, address?.postalCode].filter(Boolean).join(' ')

  useEffect(() => {
    window.scrollTo(0, 0)
    const selected = document.querySelector('[data-delivery-selected]')
    if (selected) {
      selected.focus({ preventScroll: true })
      selected.scrollIntoView({ block: 'nearest' })
    } else document.querySelector('main h1')?.focus({ preventScroll: true })
  }, [current, selectedDelivery])

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="frame header-inner">
          <div className="header-context">
            <AccountLink className="wordmark" to="/">Grubhub</AccountLink>
            {ordering && current.startsWith('/restaurants') && deliveryArea && <span className="delivery-area"><span className="meta">Delivery area</span><strong>{deliveryArea}</strong></span>}
          </div>
          <nav className="header-nav" aria-label="Ordering">
            {ordering && <AccountLink className="header-browse" to="/orders">Orders</AccountLink>}
            <AccountLink className="header-browse" to={timingPath('/restaurants', scheduling)}>Browse restaurants</AccountLink>
            <AccountLink className="button bag-link" to={timingPath('/bag', scheduling)}><Glyph name="bag" /> Bag <span className="bag-count">{bagCount}</span></AccountLink>
          </nav>
        </div>
      </header>
      <div className={ordering ? "frame shell shopping-shell" : "frame shell"}>
        {!ordering && <aside className="account-rail">
          <div className="diner"><span className="avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><p className="meta">Diner account</p></div></div>
          <nav aria-label="Account" className="account-nav">
            <AccountLink to="/orders" className="rail-link" aria-current={current === '/' || current.startsWith('/orders') ? 'page' : undefined}><Glyph name="receipt" /> Orders</AccountLink>
            <AccountLink to="/scheduled" className="rail-link" aria-current={current === '/scheduled' ? 'page' : undefined}><Glyph name="calendar" /> <span className="wide-label">Scheduled deliveries</span><span className="short-label">Scheduled</span></AccountLink>
            <AccountLink to="/refunds" className="rail-link" aria-current={current.startsWith('/refunds') ? 'page' : undefined}><Glyph name="refund" /> Refunds</AccountLink>
          </nav>
        </aside>}
        <main className="main" id="main"><Outlet /></main>
      </div>
    </>
  )
}

function MissingPage() {
  return <><PageHeading title="Page unavailable" /><AccountLink to="/orders">Back to orders</AccountLink></>
}

export default function App({ initialState }) {
  return (
    <AccountProvider initialState={initialState}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Orders />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<Receipt />} />
            <Route path="scheduled" element={<Scheduled />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="refunds/:refundId" element={<RefundDetail />} />
            <Route path="restaurants" element={<Restaurants />} />
            <Route path="restaurants/:restaurantId" element={<RestaurantMenu />} />
            <Route path="bag" element={<Bag />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="*" element={<MissingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  )
}
