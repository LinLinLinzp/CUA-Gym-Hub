import { useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { byId, forProject, items, tools } from './domain'
import { projectPath, recordPath, RouteLink, useRouteLink, useRouteNavigate } from './navigation'
import { useWorkspace } from './state'
import { Activity, Empty, Icon, PageHeader } from './ui'
import { Rfis } from './pages/Rfis'
import { Submittals } from './pages/Submittals'
import { DailyLog } from './pages/DailyLog'
import { ChangeOrders } from './pages/ChangeOrders'

function Workspace() {
  const { projectId } = useParams()
  const { state } = useWorkspace()
  const project = byId(state.projects, projectId)
  const projects = items(state.projects)
  const path = project ? projectPath(project.id) : '/'
  const route = useRouteLink()
  const navigate = useRouteNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const user = byId(state.people, state.account?.currentUserId)
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || '•'

  return <div className="workspace">
    <aside id="workspace-navigation" className={'rail' + (showMenu ? ' menu-open' : '')}>
      <RouteLink to={path} className="wordmark" onClick={() => setShowMenu(false)}>Procore</RouteLink>
      <nav aria-label="Project navigation">
        {project && <>
          <div className="rail-label">Workspace</div>
          <NavLink to={route(path)} end onClick={() => setShowMenu(false)}><Icon name="overview" />Project Overview</NavLink>
          <div className="rail-label tools-label">Project tools</div>
          {tools.map((tool) => <NavLink key={tool.slug} to={route(path + '/' + tool.slug)} onClick={() => setShowMenu(false)}>
            <Icon name={tool.icon} />{tool.label}
          </NavLink>)}
        </>}
      </nav>
    </aside>
    <div className="workspace-body">
      <header className="topbar">
        <button className="menu-button button" type="button" aria-expanded={showMenu} aria-controls="workspace-navigation" onClick={() => setShowMenu(!showMenu)}>Menu</button>
        {!!projects.length && <div className="project-picker">
          <Icon name="project" />
          <label className="sr-only" htmlFor="active-project">Project</label>
          <select id="active-project" value={project?.id || ''} onChange={(event) => {
            const selected = event.target.value
            if (selected) navigate(projectPath(selected))
            setShowMenu(false)
          }}>
            {!project && <option value="">Select a project</option>}
            {projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || entry.number || entry.id}</option>)}
          </select>
        </div>}
        <div className="identity">
          <div><strong>{user?.name || 'Workspace user'}</strong><small>{state.account?.companyName || 'Project account'}</small></div>
          <span className="avatar" aria-hidden="true">{initials}</span>
        </div>
      </header>
      <main className="content">
        {project ? <Outlet context={{ project, path }} /> : <Empty title={projects.length ? 'Project unavailable' : 'No projects available'}>
          {projects.length ? <RouteLink to="/">Back to project workspace</RouteLink> : 'Projects will appear here when they are added to this account.'}
        </Empty>}
      </main>
    </div>
  </div>
}

function Home() {
  const { state } = useWorkspace()
  const route = useRouteLink()
  const project = byId(state.projects, state.account?.defaultProjectId) || items(state.projects)[0]
  return project ? <Navigate to={route(projectPath(project.id))} replace /> : <Workspace />
}

function Overview() {
  const { projectId } = useParams()
  const { state } = useWorkspace()
  const project = byId(state.projects, projectId)
  const base = projectPath(projectId)
  const activities = forProject(state.activity, projectId)
  function activityTarget(activity) {
    const tool = tools.find(({ entity }) => entity === activity.entityType)
    if (!tool) return null
    const record = byId(state[tool.key], activity.entityId)
    if (record?.projectId !== projectId) return null
    return recordPath(base + '/' + tool.slug, tool.entity === 'dailyLog' ? record.date : record.id)
  }

  return <>
    <div className="overview-hero">
      <div>
        <PageHeader title={project.name || 'Project Overview'} kicker="Project overview" />
        <p className="project-meta">{[project.number, project.city].filter(Boolean).join(' · ') || 'Project workspace'}</p>
      </div>
      <div className="plan-art" aria-hidden="true"><span /><i /><b /></div>
    </div>
    <h2 className="overview-heading">Project tools</h2>
    <div className="metrics">
      {tools.map((tool) => {
        const count = forProject(state[tool.key], projectId).filter((item) => item.status === tool.status).length
        const metric = tool.entity === 'dailyLog' ? 'Completed days' : tool.status === 'Open' ? 'Open RFIs' : tool.status
        return <RouteLink key={tool.slug} to={base + '/' + tool.slug} className="metric">
          <div className="metric-top"><span className="tool-icon"><Icon name={tool.icon} /></span><span className="card-arrow" aria-hidden="true">↗</span></div>
          <strong>{tool.label}</strong>
          <span className="metric-number">{count}</span>
          <span className="muted">{metric}</span>
        </RouteLink>
      })}
    </div>
    <section className="panel overview-activity">
      <h2>Recent activity</h2>
      <Activity events={activities} limit={6} target={activityTarget} />
    </section>
  </>
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/projects/:projectId" element={<Workspace />}>
      <Route index element={<Overview />} />
      <Route path="rfis/:id?" element={<Rfis />} />
      <Route path="submittals/:id?" element={<Submittals />} />
      <Route path="daily-log/:date?" element={<DailyLog />} />
      <Route path="change-orders/:id?" element={<ChangeOrders />} />
      <Route path="*" element={<Empty title="Page unavailable"><RouteLink to="..">Project Overview</RouteLink></Empty>} />
    </Route>
    <Route path="*" element={<Home />} />
  </Routes>
}
