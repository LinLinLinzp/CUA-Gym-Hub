import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, CarFront, MapPin, Menu, UserRound, X, LayoutGrid } from 'lucide-react'
import { routes } from '../data/routes'
import { SiteLink } from './ui'

const navigation = [
  { label: 'Online Services', to: routes.online, icon: LayoutGrid },
  { label: 'Vehicle Registration', to: routes.renewal, icon: CarFront, matches: ['/portal/vehicle-registration', '/wasapp/vrir', routes.cart] },
  { label: 'Appointments', to: routes.appointments, icon: CalendarDays },
  { label: 'Locations', to: routes.locations, icon: MapPin },
]

export default function Layout() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const trigger = useRef(null)

  function closeMenu(restoreFocus) {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const media = window.matchMedia('(min-width: 761px)')
    const onResize = (event) => { if (event.matches) closeMenu(false) }
    const onKey = (event) => { if (event.key === 'Escape') closeMenu(true) }
    media.addEventListener('change', onResize)
    window.addEventListener('keydown', onKey)
    return () => {
      media.removeEventListener('change', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const path = location.pathname.toLowerCase()
  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="site-header">
      <div className="masthead">
        <div className="container masthead-inner">
          <SiteLink to={routes.home} className="wordmark" aria-label="California DMV home">
            <span className="brand-symbol" aria-hidden="true">CA</span>
            <span><span className="brand-state">California</span><strong>DMV</strong></span>
          </SiteLink>
          <div className="header-utilities">
            <SiteLink to={routes.account} className="account-link"><UserRound size={19} aria-hidden="true" /> MyDMV</SiteLink>
            <button ref={trigger} className="menu-trigger" aria-expanded={open} aria-controls="main-navigation" onClick={() => open ? closeMenu(true) : setOpen(true)}>
              {open ? <X size={22} /> : <Menu size={22} />}<span>Menu</span>
            </button>
          </div>
        </div>
      </div>
      <nav id="main-navigation" className={`primary-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
        <div className="container nav-links">
          {navigation.map(({ label, to, icon: Icon, matches = [to] }) =>
            <SiteLink key={to} to={to} onClick={() => open && closeMenu(true)} aria-current={matches.some((match) => path.startsWith(match)) ? 'page' : undefined}>
              <Icon size={18} aria-hidden="true" />{label}
            </SiteLink>
          )}
        </div>
      </nav>
    </header>
    <Outlet />
    <footer className="site-footer">
      <div className="container footer-inner">
        <span className="footer-brand">California Department of Motor Vehicles</span>
        <nav aria-label="Footer navigation">
          <SiteLink to={routes.online}>Online Services</SiteLink>
          <SiteLink to={routes.locations}>Find a DMV Office</SiteLink>
          <SiteLink to={routes.account}>MyDMV</SiteLink>
        </nav>
      </div>
    </footer>
  </>
}
