import { Film, Layers3 } from 'lucide-react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Library } from './pages/Library.jsx'
import { VideoDetails, VideoReview } from './pages/Video.jsx'
import { ShowcaseList, ShowcaseEditor } from './pages/Showcases.jsx'
import { useWorkspace } from './store.jsx'

import { Recovery, WorkspaceLink, useRoutePath } from './navigation.jsx'

export default function App() {
  const { state, notice, setNotice, loadError, saving, saveError } = useWorkspace()
  const path = useRoutePath()
  const { pathname } = useLocation()
  if (!state) return <main className="startup">
    {loadError ? <><p>Could not load the workspace.</p><button onClick={() => window.location.reload()}>Try again</button></> : <p role="status">Loading workspace…</p>}
  </main>
  const actor = state.people.find((person) => person.id === state.account.currentUserId)

  return <>
    <header className="masthead">
      <div className="masthead-inner">
        <WorkspaceLink className="wordmark" to="/videos">Vimeo</WorkspaceLink>
        <nav aria-label="Workspace">
          <NavLink to={path('/videos')} className={pathname === '/' ? 'active' : undefined}><Film size={16} /> Library</NavLink>
          <NavLink to={path('/showcases')}><Layers3 size={16} /> Showcases</NavLink>
        </nav>
        <div className="account"><span className="account-name">{state.account.name}</span><span className="avatar" title={actor?.name ?? 'Account member'}>{actor?.initials || 'NS'}</span></div>
      </div>
    </header>
    <main className="workspace">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/videos" element={<Library />} />
        <Route path="/videos/:videoId" element={<VideoDetails />} />
        <Route path="/videos/:videoId/review" element={<VideoReview />} />
        <Route path="/showcases" element={<ShowcaseList />} />
        <Route path="/showcases/:showcaseId" element={<ShowcaseEditor />} />
        <Route path="*" element={<Recovery />} />
      </Routes>
    </main>
    <div aria-live="polite" className="feedback">
      {saving && <div role="status" className="toast">Saving changes…</div>}
      {saveError && <div role="alert" className="toast">{saveError}</div>}
      {notice && <div className="toast">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
    </div>
  </>
}
