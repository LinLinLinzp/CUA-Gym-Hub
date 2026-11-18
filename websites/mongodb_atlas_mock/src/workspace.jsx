import { createContext, useContext } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export const WorkspaceContext = createContext(null)
export const useWorkspace = () => useContext(WorkspaceContext)
export const rows = value => Array.isArray(value) ? value : []
export const scoped = (state, key, projectId) => rows(state[key]).filter(row => row?.projectId === projectId)
export const liveClusters = (state, projectId) => scoped(state, 'clusters', projectId).filter(row => row.status !== 'terminated')

export function useProjectLink() {
  const [query] = useSearchParams()
  const { project } = useWorkspace()
  return (path, projectId = project?.id) => {
    const target = new URLSearchParams()
    const sid = query.get('sid') || sessionStorage.getItem('mock_sid')
    if (sid) target.set('sid', sid)
    if (projectId) target.set('project', projectId)
    return target.size ? `${path}?${target}` : path
  }
}

export function ProjectLink({ to, ...props }) {
  const link = useProjectLink()
  return <Link to={link(to)} {...props} />
}

const navItems = [
  ['/', 'Overview', 'overview'], ['/clusters', 'Clusters', 'clusters'],
  ['/database-access', 'Database Access', 'database'], ['/network-access', 'Network Access', 'network'],
  ['/project-access', 'Project Access', 'users'], ['/activity', 'Activity', 'activity'],
]

const iconPaths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  clusters: 'M3 4h18v6H3z M3 14h18v6H3z M6 7h1 M6 17h1',
  database: 'M4 6c0 2 4 3 8 3s8-1 8-3-4-3-8-3-8 1-8 3v12c0 2 4 3 8 3s8-1 8-3V6 M4 12c0 2 4 3 8 3s8-1 8-3',
  network: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
  users: 'M15 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M17 14a4 4 0 0 1 4 4v2 M16 4a3 3 0 0 1 0 6',
  search: 'M21 21l-5-5 M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
}
export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]} /></svg>
}

export function Shell({ children }) {
  const { state, project, projects } = useWorkspace()
  const to = useProjectLink()
  const [query, setQuery] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const name = state.account?.name || state.account?.email || 'Project account'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')
  function switchProject(event) {
    const id = event.target.value
    if (pathname.startsWith('/clusters/')) {
      return navigate(to('/clusters', id))
    }
    const next = new URLSearchParams(query)
    if (!next.has('sid') && sessionStorage.getItem('mock_sid')) next.set('sid', sessionStorage.getItem('mock_sid'))
    next.set('project', id)
    setQuery(next)
  }
  return <>
    <a className="skip" href="#content">Skip to content</a>
    <header className="masthead">
      <div className="frame masthead-inner">
        <ProjectLink to="/" className="brand">MongoDB Atlas</ProjectLink>
        <label className="project-switch">
          <span>{state.organization?.name || 'Project'} workspace</span>
          <select aria-label="Project" value={project?.id ?? ''} onChange={switchProject} disabled={!projects.length}>
            {!project && <option value="">Select a project</option>}
            {projects.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
          </select>
        </label>
        <div className="identity" title={state.account?.email}><span className="avatar">{initials}</span><span>{name}</span></div>
      </div>
    </header>
    <nav className="project-nav" aria-label="Project navigation">
      <div className="frame nav-inner">
        {navItems.map(([path, label, icon]) => <NavLink key={path} end={path === '/'} to={to(path)}><Icon name={icon} />{label}</NavLink>)}
      </div>
    </nav>
    <main className="frame content" id="content" tabIndex={-1}>{children}</main>
  </>
}

export function PageHeading({ title, description, children }) {
  return <header className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</header>
}

export function Overview() {
  const { project, state } = useWorkspace()
  const cards = [
    ['Clusters', '/clusters', 'clusters', liveClusters(state, project.id).length, 'Deployments in this project'],
    ['Database Users', '/database-access', 'database', scoped(state, 'databaseUsers', project.id).filter(row => row.status !== 'deleted').length, 'Database credentials'],
    ['IP Access List', '/network-access', 'network', scoped(state, 'ipAccessList', project.id).filter(row => row.status !== 'deleted').length, 'Network access rules'],
    ['Project Access', '/project-access', 'users', scoped(state, 'projectUsers', project.id).filter(row => row.status !== 'removed').length, 'Members and invitations'],
  ]
  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Project overview</p>
        <h1>{project.name || project.id}</h1>
        <p>Manage your deployments, database credentials and access from one project.</p>
        <ProjectLink className="button primary" to="/clusters" state={{ create: true }}>Create cluster <Icon name="arrow" size={16} /></ProjectLink>
      </div>
      <div className="node-art" aria-hidden="true"><i /><i /><i /><b /><b /></div>
    </section>
    <section className="overview" aria-labelledby="resources-title">
      <h2 id="resources-title">Project resources</h2>
      <div className="cards">
        {cards.map(([label, path, icon, count, description]) => <ProjectLink className="metric-card" to={path} key={path}>
          <span className="card-icon"><Icon name={icon} size={20} /></span><span className="card-arrow"><Icon name="arrow" /></span>
          <strong>{count}</strong><span className="card-title">{label}</span><span className="muted">{description}</span>
        </ProjectLink>)}
      </div>
    </section>
  </>
}

export function Missing({ title, children }) {
  return <div className="missing"><h1>{title}</h1>{children}</div>
}
