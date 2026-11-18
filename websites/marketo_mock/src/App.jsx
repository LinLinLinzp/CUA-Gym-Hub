import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { usePaths } from './navigation.jsx'
import { Button, Icon } from './ui.jsx'
import { Inventory } from './pages/Inventory.jsx'
import { ProgramPage } from './pages/Programs.jsx'
import { ListPage } from './pages/Lists.jsx'
import { CampaignPage } from './pages/Campaigns.jsx'

const navigation = [['programs', 'Programs'], ['lists', 'Lists'], ['campaigns', 'Smart Campaigns']]

export function App() {
  const { state, notice, dismiss } = useWorkspace()
  const { path } = usePaths()
  const { pathname } = useLocation()
  const user = state.currentUser?.name || 'Maya Chen'
  const initials = user.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')

  return <>
    <header className="masthead"><div className="masthead-inner">
      <div className="brand-group"><Link className="brand" to={path('/')}>Marketo</Link><span className="workspace-name">Demand Operations</span></div>
      <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span>{user}</span></div>
    </div></header>
    <div className="nav-strip"><nav className="main-nav" aria-label="Workspace">
      {navigation.map(([key, label]) => <NavLink key={key} to={path('/' + key)}
        className={({ isActive }) => isActive || (key === 'programs' && pathname === '/') ? 'selected' : ''}>
        <Icon name={key} />{label}
      </NavLink>)}
    </nav></div>
    <main className="main">
      <Routes>
        <Route path="/" element={<Inventory key="programs" section="programs" />} />
        <Route path="/programs" element={<Inventory key="programs" section="programs" />} />
        <Route path="/lists" element={<Inventory key="lists" section="lists" />} />
        <Route path="/campaigns" element={<Inventory key="campaigns" section="campaigns" />} />
        <Route path="/programs/:id" element={<ProgramPage />} />
        <Route path="/lists/:id" element={<ListPage />} />
        <Route path="/campaigns/:id" element={<CampaignPage />} />
        <Route path="*" element={<Missing section="programs" title="Page" />} />
      </Routes>
    </main>
    {notice && <div className="toast" role="status"><Icon name="check" />{notice.message}
      <Button icon="close" className="icon-button" aria-label="Dismiss notification" onClick={dismiss} />
    </div>}
  </>
}

export function Missing({ section, title }) {
  const { path } = usePaths()
  return <section className="card content-card"><h1>{title} unavailable</h1>
    <p>This record could not be found in the workspace.</p>
    <Link to={path('/' + section)}>Back to {navigation.find(([key]) => key === section)?.[1]}</Link>
  </section>
}

