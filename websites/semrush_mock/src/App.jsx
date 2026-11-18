import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { AppLink, Empty, Layout } from './ui.jsx'
import { useWorkspace } from './store.jsx'
import { list } from './model.js'
import { Projects, ProjectOverview } from './Projects.jsx'
import { Tracking } from './Tracking.jsx'
import { Audit } from './Audit.jsx'

function ProjectRoute({ View }) {
  const { projectId } = useParams()
  const { state } = useWorkspace()
  const project = list(state.projects).find(row => row.id === projectId)
  return project ? <View key={project.id} project={project} /> : <Recovery title="Project not found" />
}

function Recovery({ title = 'Page not found' }) {
  return <section className="card"><Empty title={title}
    action={<AppLink className="button primary" to="/projects">Go to Projects</AppLink>}>
    Open your project directory to find the site you want to work on.
  </Empty></section>
}

export default function App() {
  return <BrowserRouter><Layout><Routes>
    <Route path="/" element={<Projects />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/projects/:projectId" element={<ProjectRoute View={ProjectOverview} />} />
    <Route path="/position-tracking" element={<Projects tool="position-tracking" />} />
    <Route path="/projects/:projectId/position-tracking" element={<ProjectRoute View={Tracking} />} />
    <Route path="/site-audit" element={<Projects tool="site-audit" />} />
    <Route path="/projects/:projectId/site-audit" element={<ProjectRoute View={Audit} />} />
    <Route path="/projects/:projectId/site-audit/issues/:issueId" element={<ProjectRoute View={Audit} />} />
    <Route path="*" element={<Recovery />} />
  </Routes></Layout></BrowserRouter>
}

