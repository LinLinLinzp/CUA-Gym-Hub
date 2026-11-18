import { Search } from 'lucide-react'
import { AppLink, eventPath, listPath, messagePath, projectPath, taskPath, useQuery } from '../components/navigation.jsx'
import { Empty, PageHeading } from '../components/ui.jsx'
import { useStore } from '../store.jsx'
import { active, array, boardMessages, boardOf, listsOf, matches, sameId, scheduleEntries, scheduleOf, tasksOf, textOf } from '../utils/records.js'

export function Find() {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const query = params.get('q') ?? ''
  const selected = params.get('project') ?? ''
  const projects = array(state.projects)
  const results = []
  if (query.trim()) {
    for (const project of projects) {
      if (selected && !sameId(project.id, selected)) continue
      const push = (title, details, tool, to) => {
        if (matches(query, title, details)) results.push({ project, title, details, tool, to })
      }
      push(project.name, project.description, 'Project', projectPath(project))
      for (const list of listsOf(state, project)) {
        push(list.name, list.description, 'To-do list', listPath(project, list))
        for (const task of tasksOf(state, list)) push(task.title, task.notes, 'To-do', taskPath(project, task))
      }
      for (const message of boardMessages(state, project, boardOf(state, project)).filter(active)) {
        push(message.subject, textOf(message.bodyHtml), 'Message Board', messagePath(project, message))
      }
      for (const entry of scheduleEntries(state, project, scheduleOf(state, project))) {
        push(entry.title, entry.notes, 'Schedule', eventPath(project, entry))
      }
    }
  }

  return <main className="workspace-content">
    <PageHeading title="Find" icon={Search} />
    <div className="filters">
      <label>Search your workspace<input type="search" placeholder="Find projects, to-dos, messages and events…" autoFocus
        value={query} onChange={(event) => setQuery({ q: event.target.value })} /></label>
      <label>Project<select value={selected} onChange={(event) => setQuery({ project: event.target.value })}>
        <option value="">All projects</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name || 'Untitled project'}</option>)}
      </select></label>
    </div>
    {results.length ? <ul className="card message-list reading-width">{results.map((result) => <li key={result.to}>
      <AppLink to={result.to} className="find-result">
        <strong>{result.title || 'Untitled item'}</strong>
        <span className="muted small">{result.project.name || 'Untitled project'} · {result.tool}</span>
        {result.details && <span className="message-excerpt">{result.details}</span>}
      </AppLink>
    </li>)}</ul> : <Empty>{query.trim() ? 'No matches found.' : 'Enter a word or phrase to search.'}</Empty>}
  </main>
}
