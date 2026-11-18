import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './model.js'
import { Empty, Icon, SiteLink } from './ui.jsx'
import Overview from './pages/Overview.jsx'
import { Catalog, ItemDetail, ItemSetup } from './pages/Items.jsx'
import { Orders, OrderDetail } from './pages/Orders.jsx'
import { Returns, ReturnDetail } from './pages/Returns.jsx'

const destinations = [['/', 'Overview'], ['/items', 'Catalog'], ['/orders', 'Orders'], ['/returns', 'Returns']]

export default function App({ notice, dismissNotice }) {
  const { state } = useStore()
  const { pathname } = useLocation()
  const account = state.account ?? {}
  const initials = (account.actorName || 'Seller').trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return <>
    <header className="shell">
      <div className="account-bar wrap">
        <SiteLink to="/" className="wordmark">Walmart <span>Seller Center</span></SiteLink>
        <div className="account"><div><strong>{account.storeName || 'Seller account'}</strong><span>{account.actorName || 'Seller'}</span></div><b className="avatar" aria-hidden="true">{initials}</b></div>
      </div>
      <div className="nav-strip"><nav className="main-nav wrap" aria-label="Workspace">
        {destinations.map(([path, name]) => <SiteLink key={path} to={path} nav end={path === '/'}>{name}</SiteLink>)}
      </nav></div>
    </header>
    <main id="main" className="workspace wrap">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/items" element={<Catalog />} />
        <Route path="/items/new" element={<ItemSetup />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/returns/:id" element={<ReturnDetail />} />
        <Route path="*" element={<Empty title="Page unavailable"><SiteLink to="/">Return to Overview</SiteLink></Empty>} />
      </Routes>
    </main>
    {notice && <aside className="notice"><span role="status"><Icon name="check" />{notice.message}</span><button className="button square" aria-label="Dismiss message" onClick={dismissNotice}><Icon name="close" size={16} /></button></aside>}
  </>
}
