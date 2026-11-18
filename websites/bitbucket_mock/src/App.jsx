import { useState } from 'react'
import { Star } from 'lucide-react'
import { Outlet, Route, Routes, useOutletContext, useParams } from 'react-router-dom'
import { ForYou, Shell } from './components/Shell.jsx'
import { Button, Empty, ErrorText, Redirect, RouteLink, RouteNav } from './components/ui.jsx'
import { Branches, CommitDetail, CommitHistory, RepositoryDirectory, Source } from './pages/Repositories.jsx'
import { ProjectDetail, Projects } from './pages/Projects.jsx'
import { PipelineHistory, PipelineResult } from './pages/Pipelines.jsx'
import { NewPullRequest } from './pages/PullRequestForm.jsx'
import { PullRequestDetail, PullRequestList } from './pages/PullRequests.jsx'
import { CreateRepository, RepositorySettings } from './pages/RepositorySettings.jsx'
import { useStore } from './context/AppContext.jsx'
import { useToast } from './context/ToastContext.jsx'
import { setRepositoryStar } from './domain/repositories.js'
import { byId, defaultWorkspace, repoPath, starRecord, wsPath } from './utils/model.js'

const tabs = [
  ['src', 'Source'], ['commits', 'Commits'], ['branches', 'Branches'], ['pull-requests', 'Pull requests'],
  ['pipelines', 'Pipelines'], ['admin', 'Repository settings'],
]
function InheritedOutlet() {
  return <Outlet context={useOutletContext()} />
}

function StartingPage() {
  const { state } = useStore()
  const workspace = defaultWorkspace(state)
  return workspace ? <Redirect to={wsPath(workspace)} /> : <Empty title="No workspaces"><p>A workspace is needed to browse repositories, pull requests and pipelines.</p></Empty>
}
function WorkspacePage({ component: Component, ...props }) {
  const { workspace } = useOutletContext()
  return <Component workspace={workspace} {...props} />
}
function StarRepository({ repo }) {
  const { state, user, transact } = useStore()
  const toast = useToast()
  const [error, setError] = useState('')
  const star = starRecord(state, repo)
  const starred = Boolean(star && !star.removedAt)
  function toggle() {
    const result = transact(setRepositoryStar, { repositoryId: repo.id, starred: !starred })
    if (result.error) return setError(result.error)
    setError('')
    toast(starred ? 'Repository unstarred' : 'Repository starred')
  }
  return <div><Button aria-pressed={starred} disabled={!user} onClick={toggle} title={!user ? 'Sign in to star a repository.' : undefined}><Star size={16} fill={starred ? 'currentColor' : 'none'} />{starred ? 'Unstar' : 'Star'}</Button><ErrorText>{error}</ErrorText></div>
}

function RepositoryFrame() {
  const { state } = useStore()
  const { workspace, repo } = useOutletContext()
  const { repoSlug } = useParams()
  if (!repo) return <Empty title="Repository unavailable"><p>{repoSlug} could not be found in this workspace.</p><Button to={wsPath(workspace, 'repositories')}>Browse repositories</Button></Empty>
  const project = byId(state.projects, repo.projectId)
  return <div key={repo.id}>
    <div className="breadcrumb"><RouteLink to={wsPath(workspace)}>{workspace.name || workspace.slug}</RouteLink>{project && <> / {project.name || project.key}</>} / {repo.name || repo.slug}</div>
    <div className="repo-banner"><div><h1>{repo.name || repo.slug}</h1>{repo.description && <p>{repo.description}</p>}</div><StarRepository repo={repo} /></div>
    <nav className="tabs repo-tabs" aria-label="Repository">{tabs.map(([page, label]) => <RouteNav key={page} to={repoPath(workspace, repo, page)}>{label}</RouteNav>)}</nav>
    <Outlet context={{ workspace, repo }} />
  </div>
}
function RepositoryPage({ component: Component, ...props }) {
  const { workspace, repo } = useOutletContext()
  return <Component workspace={workspace} repo={repo} {...props} />
}
function RepoStart({ workspace, repo }) {
  return <Redirect to={repoPath(workspace, repo)} />
}
function Missing() {
  return <Empty title="Page unavailable"><p>Check the address or return to your workspace.</p><Button to="/">Back to workspace</Button></Empty>
}

export function App() {
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<StartingPage />} />
      <Route path=":workspaceSlug" element={<InheritedOutlet />}>
        <Route index element={<StartingPage />} />
        <Route path="workspace" element={<InheritedOutlet />}>
          <Route index element={<WorkspacePage component={({ workspace }) => <Redirect to={wsPath(workspace)} />} />} />
          <Route path="for-you" element={<WorkspacePage component={ForYou} />} />
          <Route path="repositories" element={<WorkspacePage component={RepositoryDirectory} />} />
          <Route path="projects" element={<WorkspacePage component={Projects} />} />
          <Route path="projects/:projectKey" element={<WorkspacePage component={ProjectDetail} />} />
          <Route path="starred" element={<WorkspacePage component={RepositoryDirectory} starred />} />
          <Route path="pull-requests" element={<WorkspacePage component={PullRequestList} />} />
          <Route path="pull-requests/new" element={<WorkspacePage component={NewPullRequest} />} />
          <Route path="repository/create" element={<WorkspacePage component={CreateRepository} />} />
        </Route>
        <Route path=":repoSlug" element={<RepositoryFrame />}>
          <Route index element={<RepositoryPage component={RepoStart} />} />
          <Route path="src/*" element={<RepositoryPage component={Source} />} />
          <Route path="commits" element={<RepositoryPage component={CommitHistory} />} />
          <Route path="commits/:commitId" element={<RepositoryPage component={CommitDetail} />} />
          <Route path="branches" element={<RepositoryPage component={Branches} />} />
          <Route path="pull-requests" element={<RepositoryPage component={PullRequestList} />} />
          <Route path="pull-requests/new" element={<RepositoryPage component={NewPullRequest} />} />
          <Route path="pull-requests/:prNumber" element={<RepositoryPage component={PullRequestDetail} />} />
          <Route path="pipelines" element={<RepositoryPage component={PipelineHistory} />} />
          <Route path="pipelines/results/:buildNumber" element={<RepositoryPage component={PipelineResult} />} />
          <Route path="admin" element={<RepositoryPage component={RepositorySettings} />} />
          <Route path="*" element={<Missing />} />
        </Route>
        <Route path="*" element={<Missing />} />
      </Route>
      <Route path="*" element={<Missing />} />
    </Route>
  </Routes>
}
