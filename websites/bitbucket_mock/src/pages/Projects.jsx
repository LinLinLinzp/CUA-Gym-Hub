import { FolderKanban } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useStore } from '../context/AppContext.jsx'
import { activeRepos, query, scoped, wsPath } from '../utils/model.js'
import { Button, Empty, PageHeading, RouteLink, Table, usePage } from '../components/ui.jsx'

export function Projects({ workspace }) {
  const { state } = useStore()
  const projects = scoped(state.projects, 'workspaceId', workspace.id).sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key))
  const count = new Map()
  for (const repo of activeRepos(state, workspace)) count.set(repo.projectId, (count.get(repo.projectId) || 0) + 1)
  const page = usePage(projects, workspace.id)
  return <>
    <div className="breadcrumb">{workspace.name || workspace.slug}</div><PageHeading title="Projects" />
    {page.rows.length ? <Table label="Projects" columns={['Project', 'Key', 'Repositories']}>{page.rows.map(project => <tr key={project.id}>
      <td><RouteLink className="row-title" to={wsPath(workspace, `projects/${encodeURIComponent(project.key)}`)}><FolderKanban size={16} className="row-icon" />{project.name || project.key}</RouteLink>
        {project.description && <small className="row-meta">{project.description}</small>}</td>
      <td><code>{project.key}</code></td><td>{count.get(project.id) || 0}</td>
    </tr>)}</Table> : <Empty title="No projects" icon={FolderKanban} />}
    {page.controls}
  </>
}

export function ProjectDetail({ workspace }) {
  const { state } = useStore()
  const { projectKey } = useParams()
  const project = scoped(state.projects, 'workspaceId', workspace.id).find(item => item.key === projectKey)
  if (!project) return <Empty title="Project unavailable" icon={FolderKanban}><Button to={wsPath(workspace, 'projects')}>Back to projects</Button></Empty>
  const count = activeRepos(state, workspace).filter(repo => repo.projectId === project.id).length
  return <>
    <div className="breadcrumb"><RouteLink to={wsPath(workspace, 'projects')}>Projects</RouteLink> / {project.key}</div>
    <PageHeading title={project.name || project.key} meta={project.description} />
    <section className="panel panel-pad stack small-gap"><h2>Repositories</h2><p>{count} {count === 1 ? 'repository' : 'repositories'} in this project.</p>
      <div><Button to={query(wsPath(workspace, 'repositories'), { project: project.id })}>Browse project repositories</Button></div>
    </section>
  </>
}
