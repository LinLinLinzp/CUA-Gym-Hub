import { Outlet, Route, Routes, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { Badge, FeedbackProvider, list, projectPath, sessionKey, SiteLink } from './ui'
import { CampaignEditor, CampaignPreview } from './pages/Campaign'
import { RewardRoute, Rewards } from './pages/Rewards'
import { Surveys } from './pages/Surveys'
import { UpdateRoute, Updates } from './pages/Updates'
import { Catalog, Missing, Overview, sections } from './pages/Projects'

function Shell() {
  const { state: { account } } = useStore()
  return <>
    <header className="masthead"><div className="wrap masthead-inner">
      <div className="brand-group"><SiteLink className="brand" to="/">Kickstarter</SiteLink><span>Creator Studio</span></div>
      <div className="account"><span>{account.name}</span><span className="avatar" aria-label={account.name}>{account.initials || account.name?.slice(0, 2)}</span></div>
    </div></header>
    <main className="wrap container" id="main"><Outlet /></main>
  </>
}

function ProjectShell() {
  const { projectId } = useParams()
  const { state } = useStore()
  const location = useLocation()
  const project = list(state.projects).find(entry => entry.id === projectId)
  if (!project) return <Missing title="Project not found" />
  const base = projectPath(project.id)
  const preview = location.pathname === base + '/preview'
  return <>
    <SiteLink className="breadcrumb" to="/">← Projects</SiteLink>
    <div className="project-heading">
      <div><h1>{project.title || 'Untitled project'}</h1>
        {(project.category || project.location) && <p>{[project.category, project.location].filter(Boolean).join(' · ')}</p>}
      </div>
      <Badge status={project.status} />
    </div>
    <nav className="project-nav" aria-label="Project sections">
      {sections.map(section => <SiteLink key={section.slug} current end={!section.slug}
        className={preview && section.slug === 'campaign' ? 'preview-active' : undefined}
        aria-current={preview && section.slug === 'campaign' ? 'page' : undefined}
        to={section.slug ? base + '/' + section.slug : base}>{section.label}</SiteLink>)}
    </nav>
    <Outlet context={project} />
  </>
}

export const useProject = () => useOutletContext()

function ProjectOverview() {
  return <Overview project={useProject()} />
}

function ProjectCampaign({ preview }) {
  const project = useProject()
  const Component = preview ? CampaignPreview : CampaignEditor
  return <Component key={project.id} project={project} />
}

function ProjectRewards({ mode }) {
  const project = useProject()
  const { rewardId } = useParams()
  if (!mode) return <Rewards key={project.id} project={project} />
  return <RewardRoute project={project} rewardId={rewardId} />
}

function ProjectSurveys() {
  const project = useProject()
  const { surveyId } = useParams()
  return <Surveys key={project.id} project={project} surveyId={surveyId} />
}

function ProjectUpdates({ editing }) {
  const project = useProject()
  const { updateId } = useParams()
  if (!editing) return <Updates key={project.id} project={project} />
  return <UpdateRoute project={project} updateId={updateId} />
}

export function App() {
  useLocation()
  return <StoreProvider sid={sessionKey()}><FeedbackProvider><Routes>
    <Route element={<Shell />}>
      <Route index element={<Catalog />} />
      <Route path="projects/new" element={<CampaignEditor />} />
      <Route path="projects/:projectId" element={<ProjectShell />}>
        <Route index element={<ProjectOverview />} />
        <Route path="campaign" element={<ProjectCampaign />} />
        <Route path="preview" element={<ProjectCampaign preview />} />
        <Route path="rewards" element={<ProjectRewards />} />
        <Route path="rewards/new" element={<ProjectRewards mode="new" />} />
        <Route path="rewards/:rewardId" element={<ProjectRewards mode="detail" />} />
        <Route path="surveys" element={<ProjectSurveys />} />
        <Route path="surveys/:surveyId" element={<ProjectSurveys />} />
        <Route path="updates" element={<ProjectUpdates />} />
        <Route path="updates/new" element={<ProjectUpdates editing />} />
        <Route path="updates/:updateId" element={<ProjectUpdates editing />} />
        <Route path="*" element={<Missing title="Project section not found" />} />
      </Route>
      <Route path="*" element={<Missing title="Page not found" />} />
    </Route>
  </Routes></FeedbackProvider></StoreProvider>
}

