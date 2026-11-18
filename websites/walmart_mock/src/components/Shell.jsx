import { useState } from 'react'
import { ArrowRight, Grid2X2, History, MapPin, Search, ShoppingCart, Gift, X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteLink, SiteNavLink, routeWith, useSiteNavigate } from '../utils/navigation.jsx'

const links = [
  ['/', 'Shop', Grid2X2],
  ['/pickup/reserve', 'Pickup', MapPin],
  ['/account/purchase-history', 'Purchase history', History],
  ['/registry', 'Registry', Gift],
]

export function Shell({ cartQuantity = 0, cartSubtotal = '$0.00', pickup }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search).get('q') || ''
  return <>
    <a href="#main" className="skip">Skip to main content</a>
    <header className="site-header">
      <div className="masthead frame">
        <SiteLink className="wordmark" to="/" aria-label="Walmart home">
          Walmart <span className="wordmark-accent" aria-hidden="true">✦</span>
        </SiteLink>
        <SearchBar key={query} initialQuery={query} />
        <SiteLink className="cart-link" to="/cart" aria-label={`Cart, ${cartQuantity} items, ${cartSubtotal}`}>
          <span className="cart-icon"><ShoppingCart size={24} aria-hidden="true" /><span>{cartQuantity}</span></span>
          <span><strong>Cart</strong><small>{cartSubtotal}</small></span>
        </SiteLink>
      </div>
      <div className="nav-wrap">
        <nav className="frame site-nav" aria-label="Primary">
          {links.map(([to, label, Icon]) => <SiteNavLink key={to} to={to} end={to === '/'}><Icon size={17} aria-hidden="true" />{label}</SiteNavLink>)}
        </nav>
      </div>
    </header>
    {pickup && <div className="pickup-context"><div className="frame">
      <span><MapPin size={17} aria-hidden="true" />{pickup}</span>
      <SiteLink to="/pickup/reserve">Reserve a time <ArrowRight size={15} aria-hidden="true" /></SiteLink>
    </div></div>}
    <main className="frame main" id="main"><Outlet /></main>
    <footer className="site-footer"><div className="frame">
      <SiteLink className="wordmark" to="/">Walmart <span className="wordmark-accent" aria-hidden="true">✦</span></SiteLink>
      <nav aria-label="Shopping links">{links.map(([to, label]) => <SiteLink key={to} to={to}>{label}</SiteLink>)}</nav>
    </div></footer>
  </>
}

function SearchBar({ initialQuery }) {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useSiteNavigate()
  return <form className="global-search" role="search" onSubmit={event => {
    event.preventDefault()
    navigate(routeWith('/search', { q: query.trim() }))
  }}>
    <input aria-label="Search Walmart" placeholder="Search everything at Walmart" value={query} onChange={event => setQuery(event.target.value)} />
    {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}><X size={18} /></button>}
    <button className="submit-search" aria-label="Search"><Search size={20} /></button>
  </form>
}
