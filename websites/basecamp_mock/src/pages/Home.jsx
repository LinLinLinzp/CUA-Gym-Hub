import { useState } from 'react'
import { ArrowUpRight, CalendarDays, ClipboardList, Search } from 'lucide-react'
import { AppLink, eventPath, messagePath, projectPath, taskPath } from '../components/navigation.jsx'
import { Avatars } from '../components/people.jsx'
import { Empty, PageHeading } from '../components/ui.jsx'
import { array, boardOf, membersOf, matches, orderedMessages, projectTasks, scheduleOf } from '../utils/records.js'
import { agendaSources } from '../utils/agenda.js'
import { dateInZone, formatDay, validZone } from '../utils/dates.js'

export function Home({ state }) {
  const [query, setQuery] = useState('')
  const projects = array(state.projects).filter((project) => matches(query, project.name))

  return <main className="workspace-content">
    <PageHeading title={state.workspace?.name || 'Home'} />
    <div className="section-heading">
      <h2>Projects</h2>
      <label className="search-field"><Search size={17} aria-hidden="true" />
        <input type="search" aria-label="Filter projects by name" placeholder="Filter projects…" value={query}
          onChange={(event) => setQuery(event.target.value)} />
      </label>
    </div>
    {projects.length ? <div className="project-grid">
      {projects.map((project) => <AppLink key={project.id} className="card project-card" to={projectPath(project)}
        style={{ '--project-color': project.color || 'var(--active)' }}>
        <span className="project-monogram" aria-hidden="true">{project.name?.trim()[0] || 'P'}</span>
        <h3>{project.name || 'Untitled project'}</h3>
        {project.description && <p>{project.description}</p>}
        <Avatars people={membersOf(state, project)} />
      </AppLink>)}
    </div> : <Empty>{query ? 'No projects match your search.' : 'There are no projects yet.'}</Empty>}
  </main>
}

export function ProjectOverview({ state, project }) {
  const base = projectPath(project)
  const tasks = projectTasks(state, project)
  const completed = tasks.filter((todo) => todo.completed).length
  const board = boardOf(state, project)
  const messages = board ? orderedMessages(state, project, board) : []
  const zone = validZone(state.workspace?.timeZone)
  const today = dateInZone(new Date(), zone)
  const schedule = scheduleOf(state, project)
  const upcoming = new Map()
  const sources = schedule ? agendaSources(state, project, schedule, zone, { around: today }) : []
  for (const { record: entry, start, end, kind } of sources) {
    if (end < today) continue
    const date = start > today ? start : today
    const to = kind === 'todo' ? taskPath(project, entry) : eventPath(project, entry)
    const prior = upcoming.get(to)
    if (!prior || date < prior.date) upcoming.set(to, { entry, date, to })
  }
  const previews = [...upcoming.values()].sort((a, b) => a.date.localeCompare(b.date) || a.to.localeCompare(b.to)).slice(0, 4)

  return <>
    <section className="project-heading">
      <PageHeading title={project.name || 'Untitled project'} />
      {project.description && <p>{project.description}</p>}
      <Avatars people={membersOf(state, project)} limit={12} size={32} />
    </section>
    <div className="tool-grid">
      <section className="card tool-card">
        <h2><AppLink to={`${base}/todos`}>To-dos <ArrowUpRight size={16} /></AppLink></h2>
        <p className="muted">{completed} of {tasks.length} completed</p>
        {tasks.length > 0 && <progress aria-label="To-do progress" value={completed} max={tasks.length} />}
        <ul className="preview-list">{tasks.filter((todo) => !todo.completed).slice(0, 3).map((todo) =>
          <li key={todo.id}><ClipboardList size={16} /><AppLink to={taskPath(project, todo)}>{todo.title || 'Untitled to-do'}</AppLink></li>
        )}</ul>
      </section>
      <section className="card tool-card">
        <h2><AppLink to={`${base}/message-board`}>Message Board <ArrowUpRight size={16} /></AppLink></h2>
        {messages.length ? <ul className="preview-list">{messages.slice(0, 4).map((message) =>
          <li key={message.id}><AppLink to={messagePath(project, message)}>{message.subject || 'Untitled message'}</AppLink></li>
        )}</ul> : <p className="muted">No published messages.</p>}
      </section>
      <section className="card tool-card schedule-preview">
        <h2><AppLink to={`${base}/schedule`}>Schedule <ArrowUpRight size={16} /></AppLink></h2>
        {previews.length ? <ul className="preview-list">{previews.map(({ entry, date, to }) =>
          <li key={to}><CalendarDays size={16} /><span className="muted">{formatDay(date, { month: 'short', day: 'numeric' })}</span>
            <AppLink to={to}>{entry.title || 'Untitled item'}</AppLink></li>
        )}</ul> : <p className="muted">Nothing upcoming.</p>}
      </section>
    </div>
  </>
}
