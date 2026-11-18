import React, { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { actor, businessName, dated, displayDate, find, futureSlot, own, published, saved, statusDate } from './model.js'
import { useWorld } from './store.jsx'
import { AccountLink, Empty, Icon, Row, SiteLink, bizPath, subPath } from './ui.jsx'
import { Business, Discover } from './pages/Discover.jsx'
import { Reviews } from './pages/Reviews.jsx'
import { Bookmarks, Collection } from './pages/Bookmarks.jsx'
import { Quotes, QuoteDetail } from './pages/Quotes.jsx'
import { Reservations, ReservationDetail } from './pages/Reservations.jsx'

const sections = [
  { name: 'Reviews', path: '/account/reviews', icon: 'reviews', summary: 'published review' },
  { name: 'Bookmarks', path: '/account/bookmarks', icon: 'bookmarks', summary: 'saved place' },
  { name: 'Quote requests', path: '/account/quotes', icon: 'quotes', summary: 'active request' },
  { name: 'Reservations', path: '/account/reservations', icon: 'reservations', summary: 'upcoming table' },
]

function Overview() {
  const { world } = useWorld()
  const user = actor(world)
  const reviews = published(world)
  const bookmarks = saved(world)
  const quotes = own(world, 'quoteRequests')
  const reservations = own(world, 'reservations')
  const getBusiness = id => find(world, 'businesses', id)
  const counts = [reviews.length, bookmarks.length, quotes.filter(quote => quote.status === 'submitted').length,
    reservations.filter(item => item.status === 'confirmed' && futureSlot(item, getBusiness(item.businessId))).length]
  const activity = [
    ...reviews.map(item => ({ ...item, icon: 'reviews', action: 'Published a review', path: getBusiness(item.businessId) ? bizPath(item.businessId) : sections[0].path })),
    ...bookmarks.map(item => ({ ...item, icon: 'bookmarks', action: 'Saved a place', path: subPath('bookmarks', item.collectionId) })),
    ...quotes.map(item => ({ ...item, icon: 'quotes', action: item.status === 'archived' ? 'Archived a request' : 'Requested a quote', path: subPath('quotes', item.id) })),
    ...reservations.map(item => ({ ...item, icon: 'reservations', action: item.status === 'cancelled' ? 'Cancelled a table' : 'Booked a table', path: subPath('reservations', item.id) })),
  ].sort(dated).slice(0, 5)

  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="hero-location"><Icon name="pin" size={17} />{user?.city || 'Your account'}</p>
        <h1>{user?.displayName ? `Welcome, ${String(user.displayName).trim().split(/\s/)[0]}` : 'Your account'}</h1>
        <p>Find the places you’ve saved, the reviews you’ve shared, and the plans you’ve made around town.</p>
        <SiteLink className="button primary" to="/discover">Discover businesses <Icon name="arrow" size={17} /></SiteLink>
      </div>
      <img className="hero-art" alt="" src="/art/neighborhood.webp" />
    </section>
    <section className="overview-section" aria-labelledby="activity-title">
      <h2 id="activity-title">Your activity</h2>
      <div className="summaries">{sections.map(({ name, path, icon, summary }, index) =>
        <SiteLink className={`summary summary-${icon}`} to={path} key={path}>
          <span className="summary-icon"><Icon name={icon} size={23} /></span>
          <span className="summary-text"><strong>{name}</strong><span>{counts[index]} {summary}{counts[index] === 1 ? '' : 's'}</span></span>
          <Icon name="arrow" />
        </SiteLink>)}</div>
    </section>
    <section className="overview-section" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent activity</h2>
      {activity.length ? <div className="record-list">{activity.map(item =>
        <Row key={`${item.icon}-${item.id}`} icon={item.icon}
          title={<SiteLink to={item.path}>{businessName(getBusiness(item.businessId))}</SiteLink>}
          actions={<span className="metadata">{displayDate(statusDate(item))}</span>}>
          <p className="metadata">{item.action}</p>
        </Row>)}</div> : <Empty title="No recent activity">Saved places, reviews, quote requests, and reservations will appear here.</Empty>}
    </section>
  </>
}

export function App() {
  const { world } = useWorld()
  const { pathname } = useLocation()
  const user = actor(world)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <>
    <a className="skip-link" href="#content">Skip to content</a>
    <header className="topbar">
      <SiteLink to="/" className="brand" aria-label="Yelp home">Yelp</SiteLink>
      <AccountLink to="/discover" className="discover-link"><Icon name="search" size={19} /> Discover</AccountLink>
      <SiteLink to="/" className="identity">
        <span className="avatar" aria-hidden="true">{String(user?.displayName || 'Your account').split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
        <span>{user?.displayName || 'Your account'}</span>
      </SiteLink>
    </header>
    <div className="layout">
      <aside className="rail">
        <nav aria-label="Account navigation">
          <AccountLink to="/" end><Icon name="home" /> Overview</AccountLink>
          {sections.map(section => <AccountLink to={section.path} key={section.path}>
            <Icon name={section.icon} /> {section.name}
          </AccountLink>)}
        </nav>
      </aside>
      <main id="content" className="main" tabIndex={-1}><div className="content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/biz/:businessId" element={<Business />} />
          <Route path="/account/reviews" element={<Reviews />} />
          <Route path="/account/bookmarks" element={<Bookmarks />} />
          <Route path="/account/bookmarks/:collectionId" element={<Collection />} />
          <Route path="/account/quotes" element={<Quotes />} />
          <Route path="/account/quotes/:quoteId" element={<QuoteDetail />} />
          <Route path="/account/reservations" element={<Reservations />} />
          <Route path="/account/reservations/:reservationId" element={<ReservationDetail />} />
          <Route path="*" element={<Empty title="Page unavailable" to="/" label="Back to overview">This account page could not be found.</Empty>} />
        </Routes>
      </div></main>
    </div>
  </>
}
