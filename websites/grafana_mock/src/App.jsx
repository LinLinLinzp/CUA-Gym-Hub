import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace, SiteLink } from './workspace.jsx'
import { withSid } from './utils/dataManager.js'
import { DashboardLibrary, DashboardDetail, DashboardEditor } from './pages/Dashboards.jsx'
import { AlertList, AlertDetail, AlertEditor } from './pages/Alerts.jsx'
import { ContactPoints } from './pages/ContactPoints.jsx'
import { Empty } from './ui.jsx'

function Header() {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const identity = state.currentUser?.name || 'Maya Chen'
  const activeSection = (pathname.startsWith('/d/') || pathname.startsWith('/dashboards/')) ? '/dashboards' : pathname.startsWith('/alerting/rules/') || pathname === '/alerting/new' ? '/alerting/list' : pathname
  const sections = [['/dashboards', 'Dashboards'], ['/alerting/list', 'Alert rules'], ['/alerting/notifications', 'Contact points']]
  return <header className="workspace-header"><div className="header-inner">
    <div className="brand-lockup">
      <SiteLink to="/dashboards" className="brand">Grafana</SiteLink>
      <span className="workspace-name">{state.workspace?.name || 'Acme Operations'}</span>
    </div>
    <nav aria-label="Workspace">
      {sections.map(([path, label]) => <SiteLink key={path} to={path}
        className={activeSection === path ? 'current' : undefined}
        aria-current={activeSection === path ? 'page' : undefined}
      >{label}</SiteLink>)}
    </nav>
    <div className="identity"><span className="avatar" aria-hidden="true">{identity.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span><span>{identity}</span></div>
  </div></header>
}

export default function App() {
  const { notice, notify } = useWorkspace()
  return <>
    <a href="#content" className="skip">Skip to content</a>
    <Header />
    <main id="content" className="page" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Navigate replace to={withSid('/dashboards')} />} />
        <Route path="/dashboards" element={<DashboardLibrary />} />
        <Route path="/dashboards/f/:id" element={<DashboardLibrary />} />
        <Route path="/dashboards/new" element={<DashboardEditor key="new" />} />
        <Route path="/d/:id/edit" element={<DashboardEditor key="edit" edit />} />
        <Route path="/d/:id/duplicate" element={<DashboardEditor key="duplicate" duplicate />} />
        <Route path="/d/:id/:slug?" element={<DashboardDetail />} />
        <Route path="/alerting/list" element={<AlertList />} />
        <Route path="/alerting/new" element={<AlertEditor key="new" />} />
        <Route path="/alerting/rules/:id/edit" element={<AlertEditor key="edit" edit />} />
        <Route path="/alerting/rules/:id" element={<AlertDetail />} />
        <Route path="/alerting/notifications" element={<ContactPoints />} />
        <Route path="*" element={<Empty title="Page unavailable" action={<SiteLink to="/dashboards">Back to dashboards</SiteLink>} />} />
      </Routes>
    </main>
    {notice && <div className={'notice' + (notice.error ? ' notice-error' : '')} role={notice.error ? 'alert' : 'status'}>
      <span>{notice.message}</span><button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => notify(null)}>×</button>
    </div>}
  </>
}
