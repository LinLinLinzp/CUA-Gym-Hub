import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, MapPin, Package, Search, ShoppingCart } from 'lucide-react'
import { useStore } from '../store.jsx'
import { positiveInt } from '../domain/inventory.js'
import { byId, list } from '../utils/read.js'
import { ShopLink, useShopNavigate } from './ui.jsx'
import { useStorePicker } from './StorePicker.jsx'

export function categoryOptions(products) {
  return [...new Map(list(products).filter((p) => p.categoryId).map((p) => [p.categoryId, p.categoryLabel || p.categoryId]))]
}

function SiteSearch() {
  const location = useLocation()
  const navigate = useShopNavigate()
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') || '')
  return <form className="site-search" role="search" onSubmit={(event) => {
    event.preventDefault()
    navigate(`/s?q=${encodeURIComponent(query.trim())}`)
  }}>
    <input type="search" aria-label="Search products" placeholder="What can we help you find?" value={query} onChange={(event) => setQuery(event.target.value)} />
    <button className="icon-button" type="submit" aria-label="Search"><Search size={21} /></button>
  </form>
}

export default function Header() {
  const { state } = useStore()
  const location = useLocation()
  const store = byId(state.stores, state.guest?.preferredStoreId)
  const openStore = useStorePicker()
  const count = list(state.cart?.items).reduce((total, line) => total + (positiveInt(line.quantity) ? line.quantity : 0), 0)
  return <header className="site-header">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="header-main container">
      <ShopLink className="wordmark" aria-label="Target home" to="/">Target</ShopLink>
      <SiteSearch key={location.pathname + (new URLSearchParams(location.search).get('q') || '')} />
      <div className="header-actions">
        <ShopLink to="/orders"><Package size={21} /><span>Purchases</span></ShopLink>
        <ShopLink to="/cart" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}><ShoppingCart size={21} /><span>Cart</span><span className="cart-count">{count}</span></ShopLink>
      </div>
    </div>
    <div className="nav-band"><nav className="container nav-main" aria-label="Shop">
      <details className="category-menu" key={location.pathname + location.search}>
        <summary>Categories <ChevronDown size={16} /></summary>
        <div className="nav-dropdown">
          <ShopLink to="/s?q=" onClick={(event) => { event.currentTarget.closest('details').open = false }}>Shop all</ShopLink>
          {categoryOptions(state.products).map(([id, name]) => <ShopLink key={id} to={`/c/${encodeURIComponent(id)}`} onClick={(event) => { event.currentTarget.closest('details').open = false }}>{name}</ShopLink>)}
        </div>
      </details>
      <ShopLink to="/circle/dashboard">Target Circle</ShopLink>
      <button className="nav-store" onClick={() => openStore()}><MapPin size={17} /><span>My store <strong>{store?.name || 'Choose a store'}</strong></span><ChevronDown size={15} /></button>
    </nav></div>
  </header>
}
