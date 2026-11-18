import { useState } from 'react'
import { Archive, CalendarDays, ChevronDown, ClipboardList, FolderOpen, LayoutGrid, Menu, Package, Users, X } from 'lucide-react'
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useAccount } from './state.jsx'
import { items } from './model.js'
import { AppLink, BackHome, Empty, workspacePath } from './ui.jsx'
import Workspace from './pages/Workspace.jsx'
import Build from './pages/Build.jsx'
import Logic from './pages/Logic.jsx'
import Responses from './pages/Responses.jsx'
import { Preview, PublishedForm } from './pages/Respondent.jsx'

const workspaceIcons = { ws_research: ClipboardList, ws_people: Users, ws_product: Package, ws_marketing: LayoutGrid, ws_events: CalendarDays, ws_archive: Archive }

function Shell() {
  const { state } = useAccount()
  const { pathname } = useLocation()
  const [railLocation, setRailLocation] = useState(null)
  const railOpen = railLocation === pathname
  const params = pathname.split('/')
  const isForm = params[1] === 'forms'
  const formWorkspace = isForm ? items(state.forms).find((form) => encodeURIComponent(form.id) === params[2])?.workspaceId : null
  const name = state.account?.name || 'Morgan Ellis'
  const organization = state.account?.organization || 'Rowan Studio'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <button className="rail-toggle icon-button" aria-label={railOpen ? 'Hide workspaces' : 'Show workspaces'} aria-expanded={railOpen}
          onClick={() => setRailLocation(railOpen ? null : pathname)}>{railOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <AppLink to="/">Typeform</AppLink>
      </div>
      <div className="topbar-content">
        <span className="organization">{organization}</span>
        <div className="account"><span className="avatar">{initials}</span><span>{name}</span></div>
      </div>
    </header>
    <aside className={'rail' + (railOpen ? ' rail-open' : '')}>
      <nav aria-label="Workspaces">
        <div className="rail-label"><ChevronDown size={14} /> Workspaces</div>
        {items(state.workspaces).map((workspace) => {
          const Icon = workspaceIcons[workspace.id] || FolderOpen
          const selected = formWorkspace === workspace.id
          return <AppLink key={workspace.id} nav className={selected ? 'selected' : undefined} to={workspacePath(workspace.id)}
            aria-current={selected ? 'location' : undefined} onClick={() => setRailLocation(null)}><Icon size={17} />{workspace.name || 'Untitled workspace'}</AppLink>
        })}
      </nav>
      <div className="rail-footer"><span className="rail-dot" />{organization}</div>
    </aside>
    <main id="main" className="main"><div className="content"><Outlet /></div></main>
  </div>
}

function Home() {
  const { state } = useAccount()
  const { search } = useLocation()
  const first = items(state.workspaces)[0]
  return first ? <Navigate replace to={workspacePath(first.id) + search} /> : <Empty title="No workspaces">Workspaces in this account will appear here.</Empty>
}

export function FormView({ page: Page }) {
  const { state } = useAccount()
  const { formId } = useParams()
  const form = items(state.forms).find((entry) => entry.id === formId)
  const workspace = items(state.workspaces).find((entry) => entry.id === form?.workspaceId)
  return form ? <Page key={formId} form={form} workspace={workspace} /> :
    <Empty title="Form not found" action={<BackHome />}>This form may have been deleted or moved to another account.</Empty>
}

export default function App() {
  return <Routes>
    <Route path="to/:formId" element={<PublishedForm />} />
    <Route path="forms/:formId/preview" element={<FormView page={Preview} />} />
    <Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="workspaces/:workspaceId" element={<Workspace />} />
      <Route path="forms/:formId/build" element={<FormView page={Build} />} />
      <Route path="forms/:formId/logic" element={<FormView page={Logic} />} />
      <Route path="forms/:formId/responses" element={<FormView page={Responses} />} />
      <Route path="*" element={<Empty title="Page not found" action={<BackHome />} />} />
    </Route>
  </Routes>
}
