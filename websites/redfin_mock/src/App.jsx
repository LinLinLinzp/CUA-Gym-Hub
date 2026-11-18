import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ArrowRight, CalendarDays, ClipboardList, Compass, Heart, LayoutGrid, MessageSquare, MapPin } from 'lucide-react'
import { owned, lookup, sortNewest, timeValue, activeTour, activeOffer, unread, useReadThread, useStore } from './store'
import { appointment, Empty, homeAddress, initials, Missing, money, SiteLink, SiteNav, Status, TextLink } from './ui'
import { Browse, Listing, PropertyCard, Saved } from './homes'
import { Offers, Tours } from './transactions'
import { Messages } from './messages'

const nav = [
  ['/', 'Overview', LayoutGrid], ['/saved-homes', 'Saved homes', Heart], ['/tours', 'Tours', CalendarDays],
  ['/offers', 'Offers', ClipboardList], ['/messages', 'Messages', MessageSquare], ['/homes', 'Browse homes', Compass],
]

function Activity({ icon: Icon, label, heading, detail, status, to, attention, onClick }) {
  return <SiteLink to={to} className="activity-card" onClick={onClick}>
    <div className="activity-icon"><Icon size={19} aria-hidden="true" /></div>
    <div className="activity-copy"><span className="activity-label">{label}</span><strong>{heading}</strong>{detail && <span className="activity-detail">{detail}</span>}
      {status && <Status value={status} />}{attention && <span className="unread-label">Unread</span>}</div>
    <ArrowRight size={17} className="activity-arrow" aria-hidden="true" />
  </SiteLink>
}

function Overview() {
  const { state } = useStore()
  const readThread = useReadThread()
  const { account, homes, agents } = state
  const saved = owned(state.savedHomes, account.id).filter(row => row.status === 'saved').sort(sortNewest('updatedAt'))
  const nextTour = owned(state.tours, account.id).filter(row => activeTour(row))
    .sort((a, b) => timeValue(a.scheduledAt) - timeValue(b.scheduledAt))[0]
  const offer = owned(state.offers, account.id).filter(activeOffer).sort(sortNewest('updatedAt'))[0]
  const thread = owned(state.messageThreads, account.id).sort(sortNewest('lastMessageAt'))[0]

  return <>
    <section className="overview-intro">
      <div><div className="market-label"><MapPin size={15} aria-hidden="true" />{homes.find(home => home.city)?.city || 'Home search'}</div>
        <h1>My Redfin</h1><p>Welcome back, {account.displayName?.split(' ')[0] || 'homebuyer'}. Pick up where you left off.</p></div>
      <SiteLink className="primary" to="/homes">Browse homes <ArrowRight size={17} aria-hidden="true" /></SiteLink>
    </section>
    <div className="overview-grid">
      <section>
        <div className="section-heading"><div><h2>Saved homes</h2><p>{saved.length} {saved.length === 1 ? 'home' : 'homes'} on your shortlist</p></div><TextLink to="/saved-homes">View all</TextLink></div>
        {saved.length ? <div className="property-grid preview-grid">
          {saved.slice(0, 4).map(row => <PropertyCard key={row.id} home={lookup(homes, row.homeId)} homeId={row.homeId} />)}
        </div> : <Empty title="Start your shortlist" action={<TextLink to="/homes">Find homes to save</TextLink>} />}
      </section>
      <section>
        <div className="section-heading"><div><h2>Your activity</h2><p>Tours, offers, and agent conversations</p></div></div>
        <div className="activity-list">
          <Activity icon={CalendarDays} label="Next tour" heading={nextTour ? homeAddress(lookup(homes, nextTour.homeId)) : 'No upcoming tours'}
            detail={nextTour ? appointment(nextTour.scheduledAt, nextTour.timeZone || account.timeZone) : 'Find a home to visit'} status={nextTour?.status} to="/tours" />
          <Activity icon={ClipboardList} label="Active offer" heading={offer ? homeAddress(lookup(homes, offer.homeId)) : 'No active offers'}
            detail={offer ? money(offer.amount) : 'Review your offer requests'} status={offer?.status} to="/offers" />
          <Activity icon={MessageSquare} label="Recent conversation" heading={thread?.subject || 'No conversations yet'}
            detail={thread ? lookup(agents, thread.agentId)?.displayName || 'Redfin agent' : 'Open your inbox'} attention={thread && unread(thread, state)}
            to={thread ? '/messages/' + encodeURIComponent(thread.id) : '/messages'} onClick={thread ? event => readThread(thread.id, event) : undefined} />
        </div>
      </section>
    </div>
  </>
}

export function App() {
  const { state: { account } } = useStore()
  const { pathname } = useLocation()
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="masthead wrap">
        <SiteLink to="/" className="brand">Redfin</SiteLink>
        <div className="masthead-actions"><SiteNav className="desktop-browse" to="/homes"><Compass size={17} aria-hidden="true" /> Browse homes</SiteNav>
          <div className="account"><span className="avatar">{initials(account.displayName)}</span><span>{account.displayName || 'My account'}</span></div>
        </div>
      </div>
      <div className="nav-frame"><nav aria-label="My Redfin" className="wrap account-nav">
        {nav.map(([to, title, Icon]) => <SiteNav key={to} to={to} end={to === '/'} className={to === '/homes' ? 'mobile-browse' : undefined}><Icon size={16} aria-hidden="true" />{title}</SiteNav>)}
      </nav></div>
    </header>
    <main id="main" tabIndex={-1} className="wrap main-content" key={pathname.startsWith('/messages') ? '/messages' : pathname}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/homes" element={<Browse />} />
        <Route path="/homes/:homeId" element={<Listing />} />
        <Route path="/saved-homes" element={<Saved />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/messages/:threadId?" element={<Messages />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
    <footer className="wrap site-footer"><SiteLink to="/" className="brand">Redfin</SiteLink><span>My Redfin</span></footer>
  </>
}
