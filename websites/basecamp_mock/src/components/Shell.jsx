import { CalendarDays, CheckSquare, ClipboardCheck, House, MessageSquare, Mountain, Search, Trash2 } from 'lucide-react'
import { Outlet, useParams } from 'react-router-dom'
import { Shortcuts } from './Shortcuts.jsx'
import { AppLink, projectPath } from './navigation.jsx'
import { Avatar } from './people.jsx'
import { Unavailable } from './ui.jsx'
import { ProjectProvider } from '../store.jsx'
import { byId } from '../utils/records.js'

export function Header({ state }) {
  const actor = byId(state.people, state.workspace?.currentUserId)
  return <header className="site-header">
    <AppLink to="/" className="wordmark"><Mountain size={25} aria-hidden="true" />Basecamp</AppLink>
    <nav aria-label="Workspace"><AppLink nav end to="/"><House size={16} aria-hidden="true" />Home</AppLink>
      <AppLink nav to="/find"><Search size={16} aria-hidden="true" />Find</AppLink>
      <AppLink nav to="/my-assignments" className="assignments-link" aria-label="My Assignments">
        <ClipboardCheck size={16} aria-hidden="true" /><span>My Assignments</span>
      </AppLink>
    </nav>
    <div className="header-right">
      <Shortcuts state={state} />
      <span className="header-person"><Avatar person={actor} size={32} /><span>{actor?.name || 'Workspace member'}</span></span>
    </div>
  </header>
}

const tools = [
  ['', 'Overview', House],
  ['/todos', 'To-dos', CheckSquare],
  ['/message-board', 'Message Board', MessageSquare],
  ['/schedule', 'Schedule', CalendarDays],
  ['/trash', 'Trash', Trash2],
]

export function ProjectShell({ state }) {
  const { projectId } = useParams()
  const project = byId(state.projects, projectId)
  if (!project) return <main className="workspace-content"><Unavailable title="Project unavailable" /></main>
  const base = projectPath(project)

  return <div className="project-shell">
    <aside className="project-rail">
      <AppLink to={base} className="rail-project">{project.name || 'Untitled project'}</AppLink>
      <nav aria-label="Project tools">{tools.map(([suffix, label, Icon]) =>
        <AppLink key={suffix} nav end={!suffix} to={base + suffix}><Icon size={17} aria-hidden="true" />{label}</AppLink>
      )}</nav>
    </aside>
    <main className="project-content" key={project.id}><ProjectProvider value={project}><Outlet /></ProjectProvider></main>
  </div>
}
