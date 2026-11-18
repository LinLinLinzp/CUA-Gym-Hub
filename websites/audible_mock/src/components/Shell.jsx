import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SiteLink } from './links.jsx'
import { Icon } from './Icon.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { usableCredits } from '../state/selectors.js'
import { withSid } from '../utils/dataManager.js'

const destinations = [
  ['/library', 'Library', 'library'],
  ['/browse', 'Browse', 'browse'],
  ['/wishlist', 'Wish List', 'bookmark'],
  ['/account/credits', 'Credit summary', 'credit'],
  ['/account/purchases', 'Purchase history', 'receipt'],
]

function CatalogSearch({ initialValue }) {
  const [query, setQuery] = useState(initialValue)
  const navigate = useNavigate()

  function search(event) {
    event.preventDefault()
    const value = query.trim()
    navigate(withSid(value ? `/browse?q=${encodeURIComponent(value)}` : '/browse'))
  }

  return (
    <form className="global-search" role="search" onSubmit={search}>
      <label className="sr-only" htmlFor="catalog-search">Search catalog</label>
      <input id="catalog-search" type="search" value={query} placeholder="Search catalog" onChange={(event) => setQuery(event.target.value)} />
      <button className="icon-button search-submit" type="submit" aria-label="Submit catalog search"><Icon name="search" /></button>
    </form>
  )
}

export function Shell() {
  const { state, notice, setNotice } = useAccount()
  const { pathname, search } = useLocation()
  const balance = usableCredits(state, new Date()).length
  const name = state.account?.displayName
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  const currentSection = pathname === '/' ? '/library' : pathname.startsWith('/title/') ? '/browse' : pathname
  const catalogQuery = pathname === '/browse' ? new URLSearchParams(search).get('q') || '' : ''

  return (
    <div className="account-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="rail">
        <SiteLink className="wordmark" to="/library">Audible<span aria-hidden="true">.</span></SiteLink>
        <nav aria-label="Account navigation">
          {destinations.map(([path, label, icon]) => {
            const current = currentSection === path || currentSection.startsWith(path + '/')
            return (
              <SiteLink key={path} to={path} className={current ? 'rail-link selected' : 'rail-link'}
                aria-current={current ? 'page' : undefined}>
                <Icon name={icon} />{label}
              </SiteLink>
            )
          })}
        </nav>
        {name && <div className="member">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div><strong>{name}</strong><span>{state.account.plan}</span></div>
        </div>}
      </aside>
      <div className="workspace">
        <header className="utility">
          <div className="utility-inner">
            <CatalogSearch key={catalogQuery} initialValue={catalogQuery} />
            <SiteLink className="balance-link" to="/account/credits">
              <Icon name="credit" /><span>{balance} {balance === 1 ? 'credit' : 'credits'}</span>
            </SiteLink>
          </div>
        </header>
        <main className="content" id="main-content" tabIndex={-1}>
          <div aria-live="polite" role="status" className="notice-region">
            {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`}>
              <div>
                <strong>{notice.message}</strong>
                {notice.links?.map(({ to, label }) =>
                  <SiteLink key={to} to={to} onClick={() => setNotice(null)}>{label}</SiteLink>,
                )}
              </div>
              <button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><Icon name="close" /></button>
            </div>}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
