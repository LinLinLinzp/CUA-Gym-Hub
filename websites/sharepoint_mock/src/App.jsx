import { Building2, House, Search as SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Workspace, useWorkspace } from './workspace'
import { AppLink, Empty, useAppNavigate } from './ui'
import { initials } from './model'
import { Contents, Home, Site, Sites } from './sites'
import List from './list'
import Library from './library'
import SearchResults from './search'

function GlobalSearch({ initial }) {
  const [query, setQuery] = useState(initial)
  const navigate = useAppNavigate()
  return <form className="global-search" role="search" onSubmit={(event) => {
    event.preventDefault()
    if (query.trim()) navigate('/search?' + new URLSearchParams({ q: query.trim() }))
  }}>
    <SearchIcon size={19} aria-hidden="true" />
    <input aria-label="Search SharePoint" placeholder="Search sites, lists and documents" value={query} onChange={(event) => setQuery(event.target.value)} />
    <button type="submit">Search</button>
  </form>
}

function Shell() {
  const { actorName, data, notice } = useWorkspace()
  const location = useLocation()
  const search = location.pathname === '/search'
  const query = search ? new URLSearchParams(location.search).get('q') ?? '' : ''
  const home = location.pathname === '/'
  const sites = location.pathname.startsWith('/sites')
  return <>
    <header className="masthead">
      <AppLink className="wordmark" to="/">SharePoint</AppLink>
      <GlobalSearch key={location.pathname + query} initial={query} />
      <div className="account">
        <div className="avatar" aria-hidden="true">{initials(actorName)}</div>
        <div className="account-text"><strong>{actorName}</strong><span>{data.account.organization || 'Workspace'}</span></div>
      </div>
    </header>
    <div className="layout">
      <aside className="rail">
        <nav aria-label="Workspace navigation">
          <AppLink to="/" aria-current={home ? 'page' : undefined}><House size={18} /> Home</AppLink>
          <AppLink to="/sites" aria-current={sites ? 'page' : undefined}><Building2 size={18} /> Sites</AppLink>
        </nav>
      </aside>
      <main id="workspace"><Outlet /></main>
    </div>
    <div className="toast-region" role="status" aria-live="polite">
      {notice && <div className="toast" key={notice.id}>{notice.message}</div>}
    </div>
  </>
}

export function Missing({ title, to = '/sites', action = 'Browse sites' }) {
  return <Empty title={title}><AppLink className="button" to={to}>{action}</AppLink></Empty>
}

function SiteRoute({ component: Page }) {
  const { data } = useWorkspace()
  const { siteId } = useParams()
  const site = data.sites.find((record) => record.id === siteId)
  return site ? <Page key={siteId} site={site} /> : <Missing title="Site unavailable" />
}

export default function App() {
  return <BrowserRouter><Workspace><Routes>
    <Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="sites" element={<Sites />} />
      <Route path="sites/:siteId" element={<SiteRoute component={Site} />} />
      <Route path="sites/:siteId/contents" element={<SiteRoute component={Contents} />} />
      <Route path="sites/:siteId/lists/:listId" element={<SiteRoute component={List} />} />
      <Route path="sites/:siteId/libraries/:libraryId" element={<SiteRoute component={Library} />} />
      <Route path="sites/:siteId/libraries/:libraryId/folders/:folderId" element={<SiteRoute component={Library} />} />
      <Route path="search" element={<SearchResults />} />
      <Route path="*" element={<Missing title="Page unavailable" />} />
    </Route>
  </Routes></Workspace></BrowserRouter>
}
