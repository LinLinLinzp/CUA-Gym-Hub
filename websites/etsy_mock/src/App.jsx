import React, { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, Heart, House, LayoutGrid, Mail, Package, Search as SearchIcon, Shield, ShoppingBag } from 'lucide-react'
import { LocalLink, LocalNav, pathFor, useLocalNavigate, useStore } from './store.jsx'
import { byId, date, list, newest, owned } from './model.js'
import { Art, ButtonLink, Empty, ListingGrid, Missing, Status, TextLink, artist } from './ui.jsx'
import { Cart, Checkout, Listing, Marketplace, Shop } from './shopping.jsx'
import { Cases, Case, Help, Purchase, Purchases } from './support.jsx'
import { ConversationLink, Messages } from './messages.jsx'
import { Collection, Favorites } from './favorites.jsx'

const navigation = [
  ['/', 'Overview', House], ['/purchases', 'Purchases', Package], ['/messages', 'Messages', Mail],
  ['/cases', 'Cases', Shield], ['/favorites', 'Favorites', Heart],
]

function Shell({ children }) {
  const { state } = useStore()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const navigate = useLocalNavigate()
  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') || '') }, [location.pathname, location.search])
  useEffect(() => {
    document.title = 'Etsy'
    window.scrollTo(0, 0)
  }, [location.pathname])
  const cart = owned(state.cartItems, state.buyer).reduce((total, line) => total + (Number(line.quantity) || 0), 0)
  return <>
    <a className="skip" href="#content">Skip to content</a>
    <header className="masthead"><div className="masthead-inner">
      <LocalLink className="wordmark" to="/" aria-label="Etsy overview">Etsy</LocalLink>
      <form className="market-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate('/search' + (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : '')) }}>
        <SearchIcon size={18} aria-hidden="true" /><input aria-label="Search marketplace" placeholder="Search items or shops" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit" aria-label="Search"><ArrowRight size={21} aria-hidden="true" /></button>
      </form>
      <LocalLink className="cart-link" to="/cart"><ShoppingBag size={20} aria-hidden="true" /> Cart <span>{cart}</span></LocalLink>
    </div></header>
    <div className="shell">
      <aside className="account-rail">
        <div className="profile"><span className="initials" aria-hidden="true">{String(state.buyer.name || 'Buyer').split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span><div><strong>{state.buyer.name || 'Your account'}</strong><small>Buyer account</small></div></div>
        <nav aria-label="Account">
          {navigation.map(([to, label, Icon]) => <LocalNav key={to} to={to} end={to === '/'}><Icon size={18} aria-hidden="true" />{label}</LocalNav>)}
        </nav>
        <div className="rail-divider" />
        <LocalNav className="browse-nav" to="/search"><LayoutGrid size={18} aria-hidden="true" /> Browse marketplace</LocalNav>
      </aside>
      <main id="content" tabIndex={-1}>{children}</main>
    </div>
  </>
}

function Overview() {
  const { state } = useStore()
  const orders = newest(owned(state.orders, state.buyer))
  const threads = newest(owned(state.threads, state.buyer), 'updatedAt')
  const unread = threads.filter((row) => row.unread).length
  const saved = newest(owned(state.favorites, state.buyer)).filter((row) => row.targetType === 'listing')
    .map((row) => byId(state.listings, row.targetId)).filter(Boolean)
  const featured = ['listing_oat_mug', 'listing_7', 'listing_13', 'listing_19']
    .map((id) => saved.find((row) => row.id === id)).filter(Boolean)
  const preview = [...featured, ...saved.filter((row) => !featured.includes(row))].slice(0, 4)
  const latest = orders[0]
  const item = list(latest?.items)[0]
  return <>
    <section className="hero">
      <div className="hero-content"><p className="hero-label">Your Etsy account</p><h1>Welcome back{state.buyer.name ? ', ' + state.buyer.name.split(' ')[0] : ''}.</h1>
        <p>{unread ? 'You have ' + unread + ' unread shop ' + (unread === 1 ? 'message.' : 'messages.') : 'Keep track of your purchases and everything you’ve saved.'}</p>
        <ButtonLink to="/search">Browse marketplace <ArrowRight size={18} aria-hidden="true" /></ButtonLink>
      </div><div className="hero-art" aria-hidden="true" />
    </section>
    <div className="activity-grid">
      <section className="panel activity"><header><span className="section-icon"><Package size={19} aria-hidden="true" /></span><h2>Latest purchase</h2></header>
        {latest ? <div className="order-preview"><Art src={item?.image} /><div><small>{latest.shopName || artist(state, latest.shopId)}</small><strong>{item?.title || latest.orderNumber || 'Order receipt'}</strong><small>{date(latest.createdAt)} <Status value={latest.status} /></small></div></div> : <p>No purchases yet.</p>}
        <TextLink to={latest ? pathFor('purchases', latest.id) : '/purchases'}>{latest ? 'View receipt' : 'View purchases'}</TextLink>
      </section>
      <section className="panel activity"><header><span className="section-icon"><Mail size={19} aria-hidden="true" /></span><h2>Recent messages</h2></header>
        {threads.length ? <div className="message-preview">{threads.slice(0, 2).map((thread) => <ConversationLink id={thread.id} key={thread.id}>
          <strong>{artist(state, thread.shopId)}</strong><small>{byId(state.messages, thread.lastMessageId)?.body || thread.subject || 'Conversation'}</small>
        </ConversationLink>)}</div> : <p>No conversations yet.</p>}
        <TextLink to="/messages">Open inbox</TextLink>
      </section>
    </div>
    <section className="saved-preview"><header className="section-heading"><h2>Saved for later</h2><TextLink to="/favorites">View favorites</TextLink></header>
      {preview.length ? <ListingGrid listings={preview} /> : <Empty title="No saved items"><ButtonLink to="/search" secondary>Explore listings <ArrowDownRight size={17} /></ButtonLink></Empty>}
    </section>
  </>
}

export function App() {
  return <Shell><Routes>
    <Route path="/" element={<Overview />} />
    <Route path="/search" element={<Marketplace />} />
    <Route path="/listing/:listingId" element={<Listing />} />
    <Route path="/shop/:shopId" element={<Shop />} />
    <Route path="/cart" element={<Cart />} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/purchases" element={<Purchases />} />
    <Route path="/purchases/:orderId" element={<Purchase />} />
    <Route path="/purchases/:orderId/help" element={<Help />} />
    <Route path="/messages" element={<Messages />} />
    <Route path="/messages/:threadId" element={<Messages />} />
    <Route path="/cases" element={<Cases />} />
    <Route path="/cases/:caseId" element={<Case />} />
    <Route path="/favorites" element={<Favorites />} />
    <Route path="/favorites/collections/:collectionId" element={<Collection />} />
    <Route path="*" element={<Missing />} />
  </Routes></Shell>
}
