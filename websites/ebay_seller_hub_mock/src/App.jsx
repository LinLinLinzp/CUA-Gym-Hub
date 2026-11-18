import React, { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store.jsx'
import { Icon, LinkTo, Missing, useHrefFor } from './ui.jsx'
import { Overview } from './Overview.jsx'
import { Listings, ListingEditor } from './Listings.jsx'
import { Orders, OrderDetail } from './Orders.jsx'
import { Returns, ReturnDetail } from './Returns.jsx'
import { Promotions, PromotionEditor, PromotionDetail } from './Promotions.jsx'

const sections = [
  ['/', 'Overview', 'grid'], ['/listings', 'Listings', 'tag'], ['/orders', 'Orders', 'box'],
  ['/returns', 'Returns', 'return'], ['/promotions', 'Promotions', 'spark'],
]

export function App() {
  const { state, notice, setNotice } = useStore()
  const { pathname } = useLocation()
  const hrefFor = useHrefFor()
  const section = sections.find(([path]) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')))
  const account = state.seller?.name || 'Seller account'

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return <div className="layout">
    <a href="#workspace" className="skip">Skip to workspace</a>
    <aside className="rail">
      <LinkTo to="/" className="brand">eBay Seller Hub</LinkTo>
      <nav aria-label="Main navigation">{sections.map(([path, label, icon]) =>
        <NavLink key={path} to={hrefFor(path)} end={path === '/'}><Icon name={icon} />{label}</NavLink>)}</nav>
      <div className="rail-account"><span className="avatar">{account.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
        <div><strong>{account}</strong><small>Seller account</small></div>
      </div>
    </aside>
    <div className="workspace">
      <header className="utility">
        <div><span>Workspace</span><Icon name="chevron" />{section && (pathname === section[0] ? <strong>{section[1]}</strong> : <LinkTo to={section[0]}>{section[1]}</LinkTo>)}</div>
        <span className="utility-account"><Icon name="shop" />{account}</span>
      </header>
      <main className="content" id="workspace" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/new" element={<ListingEditor />} />
          <Route path="/listings/:id" element={<ListingEditor />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/promotions/new" element={<PromotionEditor />} />
          <Route path="/promotions/:id" element={<PromotionDetail />} />
          <Route path="/promotions/:id/edit" element={<PromotionEditor />} />
          <Route path="*" element={<Missing name="Page" to="/" label="Back to Overview" />} />
        </Routes>
      </main>
    </div>
    <div className="notices" aria-live="polite">{notice && <div className="toast"><Icon name="check" /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><Icon name="close" /></button></div>}</div>
  </div>
}
