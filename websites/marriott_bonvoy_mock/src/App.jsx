import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { AccountLink, Badge, Title, balance, dates, integer, label, recordPath, records, sorted, signed, useAccountNavigation } from './ui'

import { useAccount } from './context/AccountContext'

import { Stays, StayDetail } from './pages/Stays'

import { Points } from './pages/Points'
import { NewRequest } from './pages/NewRequest'
import { Requests, RequestDetail } from './pages/Requests'

import { Folios, FolioDetail } from './pages/Folios'
import { localDay } from './model'

const destinations = [
  ['/', 'Overview', '⌂'], ['/stays', 'Stays', '▤'], ['/points', 'Points', '✦'],
  ['/folios', 'Folios', '▧'], ['/requests', 'Requests', '◫'],
]

function Overview({ data }) {
  const today = localDay()
  const upcoming = sorted(records(data.stays).filter(stay => stay.status === 'upcoming' || stay.status === 'in_progress'), stay => stay.checkIn, 'oldest')
  const next = upcoming.find(stay => stay.status === 'in_progress') || upcoming.find(stay => stay.checkIn >= today) || upcoming[0]
  const activity = sorted(records(data.pointsActivity), row => row.date).slice(0, 3)
  const active = records(data.requests).filter(row => row.status === 'submitted' || row.status === 'in_review')
  return <>
    <div className="overview-hero">
      <div className="hero-copy">
        <p className="eyebrow">{data.member?.tier || 'Member account'}</p>
        <h1>{data.member?.firstName ? 'Welcome, ' + data.member.firstName : 'Your account'}</h1>
        {data.member?.memberNumber && <p className="member-number">Member {data.member.memberNumber}</p>}
        <div className="hero-balance"><span>{integer(balance(data))}</span> points</div>
        <AccountLink to="/points">View points activity <span aria-hidden="true">↗</span></AccountLink>
      </div>
      <div className="arch-art" role="img" aria-label="Sunlight falling through layered terracotta archways"><i /><i /><i /><i /><i /></div>
    </div>
    <section className="section">
      <div className="section-heading"><h2>{next?.status === 'in_progress' ? 'Current stay' : 'Next stay'}</h2><AccountLink to="/stays">All stays</AccountLink></div>
      <div className="panel next-stay">
        {next ? <>
          <div><Badge value={next.status} /><h3>{next.propertyName || 'Hotel stay'}</h3><p>{[next.city, next.country].filter(Boolean).join(', ')}</p><p>{dates(next)}</p></div>
          {next.id && <AccountLink className="button" to={recordPath('stays', next.id)}>View stay</AccountLink>}
        </> : <p>No upcoming stays.</p>}
      </div>
    </section>
    <div className="overview-grid">
      <section className="section">
        <div className="section-heading"><h2>Recent activity</h2><AccountLink to="/points">All activity</AccountLink></div>
        <ul className="panel results">{activity.length ? activity.map((row, index) => <li key={row.id || index} className="row compact-row">
          <span>{row.description || label(row.type)}</span><strong>{signed(row.points)}</strong>
        </li>) : <li className="row">No posted activity.</li>}</ul>
      </section>
      <section className="section">
        <div className="section-heading"><h2>Stays and support</h2></div>
        <div className="panel support">
          <AccountLink to="/folios">Find a hotel folio <span aria-hidden="true">↗</span></AccountLink>
          <AccountLink to="/requests">View requests <span className="meta">{active.length} open</span></AccountLink>
        </div>
      </section>
    </div>
  </>
}

function RouteFocus({ main }) {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current !== pathname) {
      window.scrollTo(0, 0)
      main.current.focus()
      previous.current = pathname
    }
  }, [pathname, main])
  return null
}

export default function App() {
  const { data } = useAccount()
  const { path } = useAccountNavigation()
  const main = useRef(null)
  const memberName = [data.member?.firstName, data.member?.lastName].filter(Boolean).join(' ')
  return <div className="shell">
    <a className="skip" href="#account-main">Skip to content</a>
    <aside className="rail">
      <AccountLink to="/" className="brand">Marriott Bonvoy<span>My account</span></AccountLink>
      <nav aria-label="Account">
        {destinations.map(([url, title, icon]) => <NavLink end={url === '/'} key={url} to={path(url)}>
          <span className="nav-icon" aria-hidden="true">{icon}</span>{title}
        </NavLink>)}
      </nav>
      <div className="rail-member"><span className="avatar" aria-hidden="true">{(data.member?.firstName || 'M')[0]}{(data.member?.lastName || '')[0]}</span>
        <div>{memberName || 'Member'}<span>{data.member?.tier}</span></div>
      </div>
    </aside>
    <main id="account-main" tabIndex={-1} ref={main} className="canvas">
      <RouteFocus main={main} />
      <div className="content">
        <Routes>
          <Route path="/" element={<Overview data={data} />} />
          <Route path="/stays" element={<Stays />} />
          <Route path="/stays/:id" element={<StayDetail />} />
          <Route path="/points" element={<Points />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/folios" element={<Folios />} />
          <Route path="/folios/:id" element={<FolioDetail />} />
          <Route path="*" element={<Title title="Page unavailable" back={['/', 'Back to overview']} />} />
        </Routes>
      </div>
    </main>
  </div>
}
