import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { currentUser, useWorkspace } from './store'
import { withSid } from './utils/dataManager'
import { Icon, Missing, SiteLink } from './ui'
import { Zaps, ZapRoute } from './Zaps'
import { History, RunRoute } from './History'
import Connections from './Connections'

const navigation = [
  ['/zaps', 'Zaps', 'zaps'],
  ['/history', 'Zap history', 'history'],
  ['/connections', 'App connections', 'connections'],
]

export default function App() {
  const { state, notice, setNotice } = useWorkspace()
  const user = currentUser(state)
  const location = useLocation()
  const active = navigation.find(([path]) => location.pathname.startsWith(path)) || navigation[0]
  const initials = user?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'OP'
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  return <div className="workspace">
    <aside className="rail">
      <SiteLink to="/zaps" className="brand"><span aria-hidden="true" className="brand-accent" />Zapier</SiteLink>
      <nav aria-label="Workspace">
        {navigation.map(([path, name, icon]) => <SiteLink active to={path} key={path}><Icon name={icon} />{name}</SiteLink>)}
      </nav>
      <div className="rail-user"><span className="avatar" aria-hidden="true">{initials}</span><div><strong>{user?.name || 'Workspace member'}</strong>{user?.email && <small>{user.email}</small>}</div></div>
    </aside>
    <div className="main">
      <header className="context-bar"><span className="workspace-mark"><Icon name="grid" size={16} /></span><strong>{state.workspace?.name || 'Workspace'}</strong><Icon name="right" size={14} /><span>{active[1]}</span></header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to={withSid('/zaps')} replace />} />
          <Route path="/zaps" element={<Zaps />} />
          <Route path="/zaps/:zapId" element={<ZapRoute />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/runs/:runId" element={<RunRoute />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="*" element={<Missing type="Page" to="/zaps" back="Back to Zaps" />} />
        </Routes>
      </main>
    </div>
    {notice && <div className="toast" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss notification" className="icon-button" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}
  </div>
}
