import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { loadWorkspace, useWorkspaceStore } from './store.js'
import { getSessionId } from './utils/dataManager.js'
import { Missing, Overview, ProjectLink, Shell, WorkspaceContext, rows } from './workspace.jsx'
import { Clusters, ClusterDetail } from './clusters.jsx'
import { DatabaseUsers } from './database-users.jsx'
import { ProjectUsers } from './project-users.jsx'
import { NetworkAccess } from './network-access.jsx'
import { Activity, RecentActivity } from './activity.jsx'
import './styles.css'

const APP = 'mongodb-atlas'
function Workspace() {
  const [query] = useSearchParams()
  const { pathname } = useLocation()
  const sid = getSessionId()
  const { state, accept, mutate } = useWorkspaceStore()
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    loadWorkspace().then(data => {
      if (active) accept(data)
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [])
  if (error) return <main className="loading" role="alert">Unable to load this workspace. Reload the page to try again.</main>
  if (!state) return <main className="loading" role="status">Loading workspace…</main>

  const projects = rows(state.projects).filter(project => project?.id)
  const explicitProject = query.get('project')
  const clusterId = pathname.startsWith('/clusters/') ? pathname.split('/')[2] : ''
  const detailProject = clusterId && rows(state.clusters).find(cluster => encodeURIComponent(cluster?.id) === clusterId)?.projectId
  const viewKey = `${APP}:project:${sid || '_default'}`
  const preferredId = detailProject || sessionStorage.getItem(viewKey) || state.account?.defaultProjectId
  const project = explicitProject
    ? projects.find(item => item.id === explicitProject)
    : projects.find(item => item.id === preferredId) || projects[0]
  if (project) sessionStorage.setItem(viewKey, project.id)

  return <WorkspaceContext.Provider value={{ state, project, projects, mutate }}>
    <Shell>
      {project ? <Routes>
        <Route path="/" element={<><Overview /><RecentActivity /></>} />
        <Route path="/clusters" element={<Clusters key={project.id} />} />
        <Route path="/database-access" element={<DatabaseUsers key={project.id} />} />
        <Route path="/project-access" element={<ProjectUsers key={project.id} />} />
        <Route path="/network-access" element={<NetworkAccess key={project.id} />} />
        <Route path="/activity" element={<Activity key={project.id} />} />
        <Route path="/clusters/:clusterId" element={<ClusterDetail key={project.id + pathname} />} />
        <Route path="*" element={<Missing title="Page unavailable"><ProjectLink to="/">Back to overview</ProjectLink></Missing>} />
      </Routes> : <Missing title="Project unavailable"><p>{projects.length ? 'Choose an available project from the project switcher.' : 'There are no projects in this workspace.'}</p></Missing>}
    </Shell>
  </WorkspaceContext.Provider>
}

function App() {
  const [query] = useSearchParams()
  return <Workspace key={query.get('sid') || getSessionId() || '_default'} />
}

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)
