import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CircleUserRound, Search, X } from 'lucide-react'
import { titleName } from './catalog.js'
import { DeleteList, ListForm, ListPicker, RatingDialog, TitlePicker } from './dialogs.jsx'
import { ActivityPage, collectionLinks, ListPage, ListsPage, Missing, RatingsPage, SearchPage, TitlePage, WatchlistPage } from './pages.jsx'
import { useAccount } from './store.jsx'
import { listPath, SiteLink } from './ui.jsx'
import { withSid } from './utils/dataManager.js'

function Rail() {
  const { user } = useAccount()
  const { pathname } = useLocation()
  const name = user.displayName || 'IMDb member'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')
  const links = [{ path: '/', label: 'Your Activity', icon: CircleUserRound }, ...collectionLinks]
  return <aside className="rail">
    <SiteLink className="brand" to="/" aria-label="IMDb home">IMDb</SiteLink>
    <div className="identity"><div className="avatar" aria-hidden="true">{initials}</div>
      <div><span className="identity-name">{name}</span><span className="identity-subtitle">IMDb member</span></div></div>
    <nav className="account-nav" aria-label="Account">
      {links.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || (path === '/lists' && pathname.startsWith('/list/'))
        return <SiteLink key={path} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined} to={path}>
          <Icon size={18} />{label}
        </SiteLink>
      })}
    </nav>
  </aside>
}

function GlobalSearch() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const urlQuery = pathname === '/search' ? params.get('q') || '' : ''
  const [query, setQuery] = useState(urlQuery)
  useEffect(() => setQuery(urlQuery), [pathname, urlQuery])
  function search(event) {
    event.preventDefault()
    const term = query.trim()
    navigate(withSid(term ? '/search?' + new URLSearchParams({ q: term }) : '/search'))
  }

  return <header className="topbar"><div className="topbar-inner">
    <form className="global-search" role="search" onSubmit={search}>
      <label className="input-icon"><Search size={19} aria-hidden="true" />
        <span className="sr-only">Search IMDb</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search films and TV" />
      </label>
      <button className="button primary" type="submit">Search</button>
    </form>
  </div></header>
}

function DocumentTitle({ label, children }) {
  const { titleId, listId } = useParams()
  const { titleById, lists } = useAccount()
  useEffect(() => {
    const suffix = titleId ? titleName(titleById.get(titleId))
      : listId ? lists.find((list) => list.id === listId)?.name || 'List unavailable' : label
    document.title = 'IMDb | ' + suffix
  }, [label, titleId, listId, titleById, lists])
  return children
}

function Workspace() {
  const [modal, open] = useState(null)
  const { pathname } = useLocation()
  const { lists } = useAccount()
  const navigate = useNavigate()
  const close = () => open(null)
  const toList = (id) => navigate(withSid(listPath(id)))
  const currentList = lists.find((list) => list.id === modal?.listId)
  const page = (label, element) => <DocumentTitle label={label}>{element}</DocumentTitle>

  return <>
    <Routes>
      <Route path="/" element={page('Your Activity', <ActivityPage />)} />
      <Route path="/search" element={page('Search', <SearchPage />)} />
      <Route path="/title/:titleId" element={page('Title', <TitlePage open={open} />)} />
      <Route path="/watchlist" element={page('Your Watchlist', <WatchlistPage />)} />
      <Route path="/ratings" element={page('Your Ratings', <RatingsPage open={open} />)} />
      <Route path="/lists" element={page('Your Lists', <ListsPage open={open} />)} />
      <Route path="/list/:listId" element={page('List', <ListPage key={pathname} open={open} />)} />
      <Route path="*" element={page('Page unavailable', <Missing />)} />
    </Routes>
    {modal?.kind === 'rate' && <RatingDialog titleId={modal.titleId} ratingId={modal.ratingId} close={close} />}
    {modal?.kind === 'choose-list' && <ListPicker titleId={modal.titleId} close={close}
      create={() => open({ kind: 'create-list' })} />}
    {modal?.kind === 'choose-title' && currentList && <TitlePicker list={currentList} close={close} />}
    {modal?.kind === 'create-list' && <ListForm close={close} onCreate={toList} />}
    {modal?.kind === 'edit-list' && currentList && <ListForm list={currentList} close={close} />}
    {modal?.kind === 'delete-list' && currentList && <DeleteList list={currentList} close={close}
      onDelete={() => navigate(withSid('/lists'), { replace: true })} />}
  </>
}

export function App() {
  const { pathname, search } = useLocation()
  const { notice, clearNotice } = useAccount()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname, search])
  return <div className="layout">
    <a className="skip" href="#content">Skip to content</a>
    <Rail />
    <div className="workspace">
      <GlobalSearch />
      <main id="content" className="content" tabIndex={-1}><Workspace key={pathname} /></main>
    </div>
    <div className={'toast' + (notice ? ' shown' : '')}>
      <span role="status">{notice?.text}</span>
      {notice && <button type="button" aria-label="Dismiss notification" onClick={clearNotice}><X size={17} /></button>}
    </div>
  </div>
}
