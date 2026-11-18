import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { person } from './model.js'
import { Empty, Icon, RouteLink, useRoute } from './ui.jsx'
import { FilesPage, TrashPage } from './folders.jsx'
import { FilePreview, TaskCenter } from './tasks.jsx'
import { Retention } from './retention.jsx'

function Shell() {
  const { state, actor } = useWorkspace()
  const { pathname, search } = useLocation()
  const route = useRoute()
  const query = new URLSearchParams(search).get('q') || ''
  const [term, setTerm] = useState(query)
  useEffect(() => { setTerm(query) }, [query, pathname])
  const account = person(state, actor)
  const initials = (account?.name || 'Account').split(/\s+/).slice(0, 2).map(word => word[0]).join('')
  const nav = pathname.startsWith('/governance') ? 'Governance' : pathname === '/tasks' ? 'Tasks' : 'Files'
  return <header className="top">
    <div className="top-content">
      <RouteLink className="wordmark" to="/">Box</RouteLink>
      <nav className="main-nav" aria-label="Workspace">
        {[['Files', '/'], ['Tasks', '/tasks'], ['Governance', '/governance/retention']].map(([text, path]) =>
          <RouteLink key={text} to={path} aria-current={nav === text ? 'page' : undefined}>{text}</RouteLink>)}
      </nav>
      <form className="global-search" role="search" onSubmit={event => { event.preventDefault(); route(`/search?q=${encodeURIComponent(term.trim())}`) }}>
        <button type="submit" aria-label="Search"><Icon name="search" /></button>
        <input type="search" aria-label="Search files and folders" placeholder="Search files and folders" value={term} onChange={event => setTerm(event.target.value)} />
      </form>
      <div className="account" title={account?.name || 'Account'} aria-label={account?.name || 'Account'}><span className="avatar">{initials}</span></div>
    </div>
  </header>
}

export function App() {
  const location = useLocation()
  return <><a className="skip" href="#main">Skip to content</a><Shell /><main id="main">
    <Routes key={location.pathname}>
      <Route path="/" element={<FilesPage />} />
      <Route path="/folders/:folderId" element={<FilesPage />} />
      <Route path="/search" element={<FilesPage search />} />
      <Route path="/trash" element={<TrashPage />} />
      <Route path="/preview/:fileId" element={<FilePreview />} />
      <Route path="/files/:fileId" element={<FilePreview />} />
      <Route path="/tasks" element={<TaskCenter />} />
      <Route path="/governance/retention" element={<Retention />} />
      <Route path="/governance/retention/:policyId" element={<Retention />} />
      <Route path="*" element={<Empty title="Page unavailable"><RouteLink to="/">Back to All files</RouteLink></Empty>} />
    </Routes>
  </main></>
}


