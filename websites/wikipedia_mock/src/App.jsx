import { useState } from 'react'
import { Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { WorkspaceProvider, useWorkspace } from './workspace.js'
import { ButtonLink, SiteLink, useSiteNavigate } from './navigation.jsx'
import { articlePath, changeArticleWatch, contributorName, isWatched } from './data/records.js'
import { Catalog, Home } from './pages/Catalog.jsx'
import { Article } from './pages/Article.jsx'
import { Editor } from './pages/Editor.jsx'
import { History } from './pages/History.jsx'
import { Talk, Thread } from './pages/Talk.jsx'
import { Activity, WatchedPages } from './pages/Watchlist.jsx'

function SearchForm({ initialQuery }) {
  const navigate = useSiteNavigate()
  const [query, setQuery] = useState(initialQuery)
  return <form className="mast-search" role="search" onSubmit={event => {
    event.preventDefault()
    navigate(query.trim() ? '/articles?q=' + encodeURIComponent(query.trim()) : '/articles')
  }}>
    <span className="search-icon" aria-hidden="true" />
    <input aria-label="Search articles" placeholder="Search articles" type="search" value={query}
      onChange={event => setQuery(event.target.value)} />
    <button type="submit">Search</button>
  </form>
}

function Shell() {
  const { state } = useWorkspace()
  const { pathname, search } = useLocation()
  const name = contributorName(state, state.account?.id, 'Signed-in contributor')
  const initials = (name.match(/[A-Z]/g)?.slice(0, 2).join('') || name.slice(0, 2)).toUpperCase()
  const active = pathname === '/' ? '/' : pathname.startsWith('/watchlist') ? '/watchlist' : '/articles'
  const query = pathname.startsWith('/articles') ? new URLSearchParams(search).get('q') ?? '' : ''
  return <div className="layout">
    <a href="#main-content" className="skip">Skip to content</a>
    <aside className="rail">
      <SiteLink className="brand" to="/">Wikipedia</SiteLink>
      <nav aria-label="Account navigation">
        {[['/', 'Workspace', 'workspace'], ['/articles', 'Articles', 'articles'], ['/watchlist', 'Watchlist', 'watchlist']].map(([path, label, icon]) =>
          <SiteLink key={path} to={path} className="rail-link" aria-current={active === path ? 'page' : undefined}>
            <span className={'nav-icon ' + icon} aria-hidden="true" />{label}
          </SiteLink>
        )}
      </nav>
    </aside>
    <header className="masthead">
      <SearchForm key={query} initialQuery={query} />
      <div className="account"><span className="initials" aria-hidden="true">{initials}</span>{name}</div>
    </header>
    <main id="main-content" tabIndex={-1} className="content"><Outlet /></main>
  </div>
}

function ArticleLayout() {
  const { slug } = useParams()
  const { state, commit, notice, setNotice } = useWorkspace()
  const { pathname } = useLocation()
  const article = state.articles.find(item => item.slug === slug)
  if (!article) return <Unavailable title="Article unavailable" to="/articles" label="Browse articles" />
  const base = articlePath(article)
  const watching = isWatched(state, article.id)
  const suffix = pathname.split('/')[3] || ''
  return <>
    <div className="page-heading">
      <div className="metadata"><SiteLink to="/articles">Articles</SiteLink>{article.category && <span> / {article.category}</span>}</div>
      <h1>{article.title}</h1>
    </div>
    <div className="article-nav">
      <nav className="tabs" aria-label="Article navigation">
        {[['', 'Article'], ['talk', 'Talk'], ['edit', 'Edit'], ['history', 'History']].map(([path, label]) =>
          <SiteLink to={path ? base + '/' + path : base} key={label} aria-current={suffix === path ? 'page' : undefined}>{label}</SiteLink>
        )}
      </nav>
      {(!suffix || suffix === 'talk') && <button type="button" aria-pressed={watching} disabled={!state.account?.id}
        onClick={() => {
          if (commit(current => changeArticleWatch(current, article.id, !watching))) {
            setNotice({ articleId: article.id, text: watching ? 'Page removed from your watchlist.' : 'Article and talk page added to your watchlist.' })
          }
        }}>{watching ? 'Unwatch' : 'Watch'}</button>}
    </div>
    {notice?.articleId === article.id && <p className="feedback success" role="status">{notice.text}</p>}
    <Outlet context={article} />
  </>
}

function WatchlistLayout() {
  const { pathname } = useLocation()
  return <>
    <div className="page-heading"><h1>Watchlist</h1></div>
    <nav className="tabs watch-tabs" aria-label="Watchlist navigation">
      <SiteLink to="/watchlist" aria-current={pathname.startsWith('/watchlist/pages') ? undefined : 'page'}>Activity</SiteLink>
      <SiteLink to="/watchlist/pages" aria-current={pathname.startsWith('/watchlist/pages') ? 'page' : undefined}>Watched pages</SiteLink>
    </nav>
    <Outlet />
  </>
}

function Unavailable({ title, to, label }) {
  return <section className="paper"><h2>{title}</h2><ButtonLink to={to}>{label}</ButtonLink></section>
}

export default function App({ initialState }) {
  return <WorkspaceProvider initialState={initialState}>
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="articles" element={<Catalog />} />
        <Route path="wiki/:slug" element={<ArticleLayout />}>
          <Route index element={<Article />} />
          <Route path="edit" element={<Editor />} />
          <Route path="history" element={<History />} />
          <Route path="talk" element={<Talk />} />
          <Route path="talk/:topicId" element={<Thread />} />
        </Route>
        <Route path="watchlist" element={<WatchlistLayout />}>
          <Route index element={<Activity />} />
          <Route path="pages" element={<WatchedPages />} />
        </Route>
        <Route path="*" element={<Unavailable title="Page unavailable" to="/" label="Return to workspace" />} />
      </Route>
    </Routes>
  </WorkspaceProvider>
}
