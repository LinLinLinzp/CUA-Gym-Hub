import { useEffect, useRef, useState } from 'react'
import { Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Icon, Modal, WorkspaceLink, useWorkspaceNavigate, Badge } from './components/ui.jsx'
import { activeApps, useStore } from './data/store.jsx'
import { appPath, appSections, regions } from './data/catalog.js'
import { Applications, matchingApps } from './pages/Applications.jsx'
import { Overview, Settings } from './pages/AppDetails.jsx'
import { Resources } from './pages/Resources.jsx'
import { Releases } from './pages/Releases.jsx'

function Shell() {
  const { state, notice, dismiss } = useStore()
  const { pathname } = useLocation()
  const [jump, setJump] = useState(false)
  const activeApp = activeApps(state).find((app) => appPath(app.id) === pathname || pathname.startsWith(appPath(app.id) + '/'))
  const section = activeApp && appSections.find(([, suffix]) => suffix && pathname === appPath(activeApp.id, suffix))?.[0]
  const account = state.account
  const initials = account.name?.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('') || 'H'

  useEffect(() => {
    function shortcut(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey ||
        event.target?.closest?.('input, select, textarea, [contenteditable], dialog') ||
        document.querySelector('dialog[open]')) return
      event.preventDefault()
      setJump(true)
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  return <div className="workspace">
    <aside className="rail">
      <WorkspaceLink className="wordmark" to="/apps">Heroku</WorkspaceLink>
      <nav aria-label="Workspace">
        <WorkspaceLink className="rail-link" to="/apps" aria-current={pathname === '/' || pathname === '/apps' ? 'page' : undefined}>
          <Icon name="grid" />Applications
        </WorkspaceLink>
        <button className="rail-link jump-trigger" aria-keyshortcuts="/" onClick={() => setJump(true)}>
          <Icon name="search" /><span>Quick Jump</span><kbd aria-hidden="true">/</kbd>
        </button>
      </nav>
      <div className="account">
        <span className="avatar" aria-hidden="true">{initials}</span>
        <div><strong>{account.name || 'Heroku account'}</strong><small>{account.workspaceName || 'Workspace'}</small></div>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="topbar">
        <nav aria-label="Breadcrumb">
          <span className="workspace-label">{account.workspaceName || 'Workspace'}</span>
          <Icon name="chevron" size={13} />
          <WorkspaceLink to="/apps">Applications</WorkspaceLink>
          {activeApp && <>
            <Icon name="chevron" size={13} />
            <WorkspaceLink to={appPath(activeApp.id)}>{activeApp.name ?? activeApp.id}</WorkspaceLink>
          </>}
          {section && <><Icon name="chevron" size={13} /><span aria-current="page">{section}</span></>}
        </nav>
      </header>
      <main className="content" id="main-content">
        <div className="notice-area" role="status">
          {notice && <div className="notice">
            <Icon name="check" /><span>{notice.message}</span>
            <button className="button icon-button" aria-label="Dismiss notification" onClick={dismiss}><Icon name="close" size={16} /></button>
          </div>}
        </div>
        <Outlet />
      </main>
    </div>
    {jump && <QuickJump onClose={() => setJump(false)} />}
  </div>
}

function QuickJump({ onClose }) {
  const { state } = useStore()
  const navigate = useWorkspaceNavigate()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef(null)
  const results = matchingApps(activeApps(state), query).sort((first, second) => (first.name ?? first.id).localeCompare(second.name ?? second.id))
  function open(app) {
    onClose()
    navigate(appPath(app.id))
  }
  function handleKey(event) {
    if (!results.length) return
    if (event.key === 'Enter') {
      event.preventDefault()
      open(results[index])
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = (index + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length
      setIndex(next)
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    }
  }
  return <Modal title="Quick Jump" description="Find and open an application in this workspace." onClose={onClose}>
    <label className="field">Search apps
      <input type="search" autoFocus value={query} role="combobox" aria-autocomplete="list"
        aria-expanded={results.length > 0} aria-controls="jump-results"
        aria-activedescendant={results.length ? 'jump-option-' + index : undefined}
        onKeyDown={handleKey} onChange={(event) => { setQuery(event.target.value); setIndex(0) }} />
    </label>
    <div id="jump-results" className="jump-results" role="listbox" aria-label="Matching apps" ref={listRef}>
      {results.map((app, position) => <button key={app.id} type="button" role="option" tabIndex={-1}
        id={'jump-option-' + position} aria-selected={index === position}
        onClick={() => open(app)}><span>{app.name ?? app.id}</span><small>{regions[app.region] ?? '—'}</small></button>)}
    </div>
    {!results.length && <p className="muted">No matching applications.</p>}
  </Modal>
}

function AppLayout() {
  const { appId } = useParams()
  const { state } = useStore()
  const app = activeApps(state).find((row) => row.id === appId)
  if (!app) return <Unavailable />
  return <>
    <div className="app-heading">
      <div className="app-mark"><Icon name="layers" size={24} /></div>
      <div>
        <div className="app-title"><h1>{app.name ?? app.id}</h1><Badge status={app.status} /></div>
        <p className="app-meta">{[regions[app.region], app.stack].filter(Boolean).join(' · ') || 'Application'}</p>
      </div>
    </div>
    <nav className="tabs" aria-label="Application">
      {appSections.map(([label, suffix]) => <WorkspaceLink key={label} tab end to={appPath(appId, suffix)}>{label}</WorkspaceLink>)}
    </nav>
    <Outlet key={appId} context={app} />
  </>
}

function Unavailable() {
  return <section className="panel unavailable">
    <div className="empty-icon"><Icon name="box" size={24} /></div>
    <h1>Application unavailable</h1>
    <p>This application could not be found in your workspace.</p>
    <WorkspaceLink className="button primary" to="/apps">Back to Applications</WorkspaceLink>
  </section>
}

export function App() {
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<Applications />} />
      <Route path="apps" element={<Applications />} />
      <Route path="apps/:appId" element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="resources" element={<Resources />} />
        <Route path="releases" element={<Releases />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Unavailable />} />
      </Route>
      <Route path="*" element={<Unavailable />} />
    </Route>
  </Routes>
}
