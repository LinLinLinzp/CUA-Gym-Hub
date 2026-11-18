import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { withSid } from './utils/dataManager.js'

export const services = [
  { path: '/change-of-address', key: 'changeOfAddressRequests', name: 'Change of Address', action: 'Start a change of address', summary: 'Forward mail to your next address.', icon: 'move', tone: 'blue' },
  { path: '/hold-mail', key: 'holdMailRequests', name: 'Hold Mail', action: 'Schedule a mail hold', summary: 'Pause delivery while you’re away.', icon: 'hold', tone: 'red' },
  { path: '/claims', key: 'packageClaims', name: 'Package Claims', action: 'File a package claim', summary: 'Request reimbursement for an eligible shipment.', icon: 'claim', tone: 'gold' },
  { path: '/po-boxes', key: 'poBoxes', name: 'PO Boxes', action: 'Find a PO Box', summary: 'Reserve a box or renew your rental.', icon: 'box', tone: 'green' },
]

const drawings = {
  home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
  move: <><rect x="3" y="5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6m-7 14h8m-3-3 3 3-3 3"/></>,
  hold: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6m-10 8v2m4-2v2"/></>,
  claim: <><path d="m3 7 9-4 9 4v10l-9 4-9-4zm0 0 9 4 9-4m-9 4v10m-4-16 9 4"/></>,
  box: <><path d="M3 19V9a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v10zm5-15a5 5 0 0 1 5 5v10m3-9h3"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
}

export function Icon({ name }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>
}

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function Shell({ account, notice }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
    document.getElementById('main-content')?.focus()
  }, [pathname])

  const name = account?.fullName || 'Account holder'
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  return <div className="frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className={menuOpen ? 'rail open' : 'rail'}>
      <SiteLink to="/" className="wordmark" aria-label="USPS account home">USPS<span aria-hidden="true">.</span></SiteLink>
      <nav id="service-navigation" aria-label="Account navigation">
        <NavLink end to={withSid('/')}><Icon name="home" /> Account home</NavLink>
        {services.map(service => <NavLink key={service.key} to={withSid(service.path)}><Icon name={service.icon} /> {service.name}</NavLink>)}
      </nav>
      <div className="rail-caption"><span /> United States Postal Service</div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <span className="top-title">My Account</span>
        <SiteLink className="mobile-brand" to="/">USPS<span aria-hidden="true">.</span></SiteLink>
        <div className="account-chip"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="service-navigation" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="notice" role="status">{notice}</div>
        <Outlet />
      </main>
      <footer className="footer">United States Postal Service <span>Account services</span></footer>
    </div>
  </div>
}

export function StampArt() {
  return <svg className="stamp-art" viewBox="0 0 300 180" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.3">
      <path d="M6 135c43-29 79-32 116-5s85 29 166-18M6 150c43-29 79-32 116-5s85 29 166-18M6 165c43-29 79-32 116-5s85 29 166-18"/>
      <g transform="rotate(-12 191 83)">
        <rect x="128" y="16" width="125" height="126" rx="4" strokeDasharray="3 5"/>
        <rect x="138" y="26" width="105" height="106" rx="2"/>
        <rect x="153" y="56" width="74" height="47" rx="4"/>
        <path d="m155 60 35 28 35-28m-71 39 24-20m48 20-24-20"/>
      </g>
    </g>
  </svg>
}

export function Missing({ service }) {
  return <div className="card missing">
    <h1>{service ? 'Request not found' : 'Page not found'}</h1>
    <p>The record or page you opened is unavailable in this account.</p>
    <SiteLink className="button primary" to={service?.path || '/'}>{service ? 'Back to ' + service.name : 'Back to account home'}</SiteLink>
  </div>
}
