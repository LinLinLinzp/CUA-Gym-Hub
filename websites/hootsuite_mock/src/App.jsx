import React, { useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Composer } from './components/Composer.jsx'
import { Icon } from './components/ui.jsx'
import { useWorkspace, WorkspaceProvider } from './context/Workspace.jsx'
import { Approvals } from './pages/Approvals.jsx'
import { Streams } from './pages/Streams.jsx'
import { Planner } from './pages/Planner.jsx'
import { initials, text } from './utils/records.js'
import { withSid } from './utils/dataManager.js'

const destinations = [
  ['Planner', '/planner', 'calendar'],
  ['Approvals', '/approvals', 'review'],
  ['Streams', '/streams', 'streams'],
]

export function App() {
  return <WorkspaceProvider><WorkspaceShell /></WorkspaceProvider>
}

function WorkspaceShell() {
  const { state, actor } = useWorkspace()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [composer, setComposer] = useState(null)
  const linked = (path) => new URLSearchParams(search).has('sid') ? path + search : withSid(path + search)

  function openComposer(options = {}) {
    setComposer({ returnFocus: document.activeElement, ...options })
  }

  function finishComposer(result) {
    setComposer(null)
    if (result.requestId) {
      navigate(linked('/approvals'), { state: { approval: { id: result.requestId, message: result.message } } })
    } else {
      navigate(linked('/planner'), { state: { planner: result } })
    }
  }

  return <>
    <header className="shell">
      <div className="brand"><span className="wordmark">Hootsuite</span><span className="workspace-name">{text(state.workspace?.name) || 'Workspace'}</span></div>
      <nav aria-label="Workspace">
        {destinations.map(([name, path, icon]) => <NavLink key={path} to={linked(path === '/planner' && pathname === '/' ? '/' : path)}
          className={({ isActive }) => isActive || (path === '/planner' && pathname === '/') ? 'active' : undefined}
          aria-current={path === '/planner' && pathname === '/' ? 'page' : undefined}><Icon name={icon} />{name}</NavLink>)}
      </nav>
      <div className="account">
        <button className="primary" disabled={!actor} onClick={() => openComposer()}><Icon name="plus" />New post</button>
        <span className="avatar" title={text(actor?.name) || 'No signed-in team member'} aria-label={text(actor?.name) || 'No signed-in team member'}>
          {text(actor?.initials) || initials(actor?.name)}
        </span>
      </div>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<Planner openComposer={openComposer} />} />
        <Route path="/planner" element={<Planner openComposer={openComposer} />} />
        <Route path="/approvals" element={<Approvals openComposer={openComposer} />} />
        <Route path="/streams" element={<Streams />} />
        <Route path="*" element={<Navigate to={linked('/planner')} replace />} />
      </Routes>
    </main>
    {composer && <Composer options={composer} onClose={() => setComposer(null)} onSaved={finishComposer} />}
  </>
}
