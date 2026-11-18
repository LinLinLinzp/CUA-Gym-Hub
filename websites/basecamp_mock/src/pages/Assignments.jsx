import { ClipboardCheck } from 'lucide-react'
import { AppLink, projectPath, taskPath, useQuery } from '../components/navigation.jsx'
import { Empty, PageHeading } from '../components/ui.jsx'
import { useStore } from '../store.jsx'
import { dateInZone, formatDay, validDate, validZone } from '../utils/dates.js'
import { array, hasId, projectTasks } from '../utils/records.js'

export function Assignments() {
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const filter = params.get('show') ?? ''
  const actor = state.workspace?.currentUserId
  const today = dateInZone(new Date(), validZone(state.workspace?.timeZone))
  const groups = array(state.projects).map((project) => {
    const tasks = projectTasks(state, project).filter((task) => {
      if (!hasId(task.assigneeIds, actor)) return false
      if (filter === 'completed') return Boolean(task.completed)
      if (filter === 'overdue') return !task.completed && validDate(task.dueOn) && task.dueOn < today
      if (filter === 'due') return !task.completed && validDate(task.dueOn)
      return !task.completed
    })
    return { project, tasks }
  }).filter(({ tasks }) => tasks.length)

  return <main className="workspace-content">
    <PageHeading title="My Assignments" icon={ClipboardCheck} />
    <div className="filters"><label>Show<select value={filter} onChange={(event) => setQuery({ show: event.target.value })}>
      <option value="">Open assignments</option><option value="due">With a due date</option>
      <option value="overdue">Overdue</option><option value="completed">Completed</option>
    </select></label></div>
    <div className="reading-width stack">
      {groups.map(({ project, tasks }) => <section className="card" key={project.id}>
        <h2><AppLink to={projectPath(project)}>{project.name || 'Untitled project'}</AppLink></h2>
        <ul className="task-rows">{tasks.map((task) => <li key={task.id} className={`task-row${task.completed ? ' completed' : ''}`}>
          <div><AppLink className="task-title" to={taskPath(project, task)}>{task.title || 'Untitled to-do'}</AppLink>
            {validDate(task.dueOn) && <span className="task-meta small muted">
              {!task.completed && task.dueOn < today ? 'Overdue · ' : 'Due '}{formatDay(task.dueOn)}
            </span>}</div>
        </li>)}</ul>
      </section>)}
      {!groups.length && <Empty>No assignments match this view.</Empty>}
    </div>
  </main>
}
