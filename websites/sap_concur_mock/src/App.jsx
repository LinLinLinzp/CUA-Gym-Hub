import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useWorkspace } from './workspace.jsx'
import { activeUser } from './model.js'
import { Icon, PageLink, SidNav, Missing } from './ui.jsx'
import { Home, Library, ApprovalLibrary } from './pages/Libraries.jsx'
import { DocumentDetail, ApprovalDetail, CreateDocument } from './pages/Documents.jsx'

const destinations = [
  ['/', 'Workspace', 'home'], ['/expense', 'Expense', 'expense'],
  ['/requests', 'Requests', 'travel'], ['/approvals', 'Approvals', 'approval'],
]

export default function App() {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const user = activeUser(state)
  const name = user?.name || state.account?.activeUserId || 'Account'
  const section = destinations.find(([path]) => path !== '/' && pathname.startsWith(path))?.[1] || 'Workspace'
  return <div className="shell">
    <a className="skip" href="#main">Skip to content</a>
    <aside className="rail">
      <PageLink to="/" className="wordmark">SAP Concur</PageLink>
      <nav aria-label="Main navigation">
        {destinations.map(([to, label, icon]) => <SidNav key={to} to={to} end={to === '/'}>
          <Icon name={icon} />{label}
        </SidNav>)}
      </nav>
      <div className="rail-org">{state.account?.organizationName}</div>
    </aside>
    <div className="work-area">
      <header className="topbar">
        <span className="section-label">{section}</span>
        <div className="identity">
          <span className="avatar" aria-hidden="true">{name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>
          <span><strong>{name}</strong>{user?.roleTitle && <small>{user.roleTitle}</small>}</span>
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/expense" element={<Library type="expense_report" />} />
          <Route path="/requests" element={<Library type="travel_request" />} />
          <Route path="/expense/new" element={<CreateDocument type="expense_report" />} />
          <Route path="/requests/new" element={<CreateDocument type="travel_request" />} />
          <Route path="/expense/:id" element={<DocumentDetail type="expense_report" />} />
          <Route path="/requests/:id" element={<DocumentDetail type="travel_request" />} />
          <Route path="/approvals" element={<ApprovalLibrary />} />
          <Route path="/approvals/:type/:id" element={<ApprovalDetail />} />
          <Route path="*" element={<Missing title="Page unavailable" to="/" label="Workspace" />} />
        </Routes>
      </main>
    </div>
  </div>
}
