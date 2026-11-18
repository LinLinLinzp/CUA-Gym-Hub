import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { byId } from './model.js'
import { useStore } from './store.jsx'
import { Empty, Icon, LocalLink, Page } from './ui.jsx'
import { RepositoryCreate, RepositoryIndex, RepositoryRoute } from './repositories.jsx'
import { TeamCreate, TeamDetail, TeamIndex } from './teams.jsx'

export default function App() {
  const { pathname } = useLocation()
  const { state, notice, dismiss } = useStore()
  const user = byId(state, 'users', state.account?.userId)
  const name = user?.displayName || user?.username || 'Signed-in account'
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const inTeams = pathname.startsWith('/teams')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <div className="shell">
    <a className="skip" href="#main">Skip to content</a>
    <aside className="rail">
      <LocalLink className="brand" to="/">Docker Hub</LocalLink>
      <nav aria-label="Account navigation">
        <LocalLink to="/repositories" className={inTeams ? '' : 'selected'} aria-current={inTeams ? undefined : 'true'}>
          <Icon name="repository" />Repositories
        </LocalLink>
        <LocalLink to="/teams" className={inTeams ? 'selected' : ''} aria-current={inTeams ? 'true' : undefined}>
          <Icon name="team" />Teams
        </LocalLink>
      </nav>
      <div className="identity">
        <span className="avatar" aria-hidden="true">{initials}</span>
        <span><strong>{name}</strong>{user?.username && <small>@{user.username}</small>}</span>
      </div>
    </aside>
    <main id="main">
      <Routes>
        <Route path="/" element={<RepositoryIndex />} />
        <Route path="/repositories" element={<RepositoryIndex />} />
        <Route path="/repositories/new" element={<RepositoryCreate />} />
        <Route path="/repositories/:namespace/:name" element={<RepositoryRoute />} />
        <Route path="/repositories/:namespace/:name/:tab" element={<RepositoryRoute />} />
        <Route path="/repositories/:namespace/:name/tags/:tagName" element={<RepositoryRoute />} />
        <Route path="/teams" element={<TeamIndex />} />
        <Route path="/teams/new" element={<TeamCreate />} />
        <Route path="/teams/:teamId" element={<TeamDetail />} />
        <Route path="*" element={<Page section="Repositories" title="Page unavailable">
          <Empty title="Page unavailable"><LocalLink to="/repositories">Browse repositories</LocalLink></Empty>
        </Page>} />
      </Routes>
      <div className="feedback" role="status" aria-live="polite">
        {notice && <div className="toast" key={notice.sequence}>
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={dismiss}><Icon name="close" size={16} /></button>
        </div>}
      </div>
    </main>
  </div>
}

