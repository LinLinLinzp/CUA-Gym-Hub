import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const services = [
  { path: '/', title: 'Overview', icon: 'overview' },
  { path: '/claims', title: 'Claims', icon: 'claims', hint: 'Track claims, file for compensation, and submit evidence.' },
  { path: '/appointments', title: 'Appointments', icon: 'appointments', hint: 'View your visits and request an appointment.' },
  { path: '/prescriptions', title: 'Prescriptions', icon: 'prescriptions', hint: 'Request refills and track deliveries.' },
  { path: '/payments', title: 'Payments', icon: 'payments', hint: 'View benefit payments, direct deposit, and copay bills.' },
]

export const serviceLinks = services.slice(1)
const paths = {
  overview: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
  claims: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
  appointments: 'M4 6h16v14H4z M8 3v6 M16 3v6 M4 11h16 M8 15h3 M13 15h3',
  prescriptions: 'M8 5a5 5 0 0 1 7 0l4 4a5 5 0 0 1-7 7l-4-4a5 5 0 0 1 0-7z M9 13l7-7',
  payments: 'M3 6h18v13H3z M3 10h18 M7 15h4',
}

export function Icon({ name }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function Shell({ profile = {}, children }) {
  const [menu, setMenu] = useState(false)
  const { pathname, search, key } = useLocation()
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your account'
  const section = services.find(({ path }) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')))
  const menuOpen = menu === key
  return <div className="shell">
    <a className="skip" href="#main">Skip to main content</a>
    <header className="account-header">
      <NavLink className="brand mobile-brand" to={'/' + search}>VA.gov</NavLink>
      <span className="account-label">My account{section && section.path !== '/' && <><span aria-hidden="true"> / </span>{section.title}</>}</span>
      <div className="session-profile"><span className="avatar" aria-hidden="true">{name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><span>{name}</span></div>
      <button className="button menu-button" type="button" aria-expanded={menuOpen} aria-controls="account-navigation" onClick={() => setMenu(menuOpen ? false : key)}>{menuOpen ? 'Close menu' : 'Menu'}</button>
    </header>
    <aside className={menuOpen ? 'rail menu-open' : 'rail'} id="account-navigation">
      <NavLink className="brand desktop-brand" to={'/' + search}>VA.gov</NavLink>
      <nav aria-label="Account navigation">
        {services.map(({ path, title, icon }) => <NavLink key={path} to={path + search} end={path === '/'} onClick={() => setMenu(false)}>
          <Icon name={icon} />{title}
        </NavLink>)}
      </nav>
    </aside>
    <main id="main" tabIndex={-1} className="workspace">{children}</main>
  </div>
}
