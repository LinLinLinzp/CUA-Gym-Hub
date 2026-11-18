import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckSquare, Plus } from 'lucide-react'
import { AppLink, listPath, projectPath, taskPath, useAppNavigate, useQuery } from '../components/navigation.jsx'
import { ActionMenu, Breadcrumbs, Dialog, Empty, FieldError, PageHeading, TrashDialog, Unavailable } from '../components/ui.jsx'
import { Comments } from '../components/Comments.jsx'
import { TaskEditor } from '../components/TaskEditor.jsx'
import { resolvePeople } from '../components/people.jsx'
import { dateInZone, formatDay, validDate, validZone } from '../utils/dates.js'
import { useProject, useStore } from '../store.jsx'
import { array, byId, hasId, inProject, listsOf, matches, membersOf, sameId, tasksOf } from '../utils/records.js'

const todosPath = (project) => `${projectPath(project)}/todos`
const listTitle = (list) => list.name || 'Untitled list'

function TodoBreadcrumbs({ list, tail }) {
  const project = useProject()
  const items = [{ label: project.name || 'Project', to: projectPath(project) },
    { label: 'To-dos', to: list || tail ? todosPath(project) : null }]
  if (list) items.push({ label: listTitle(list), to: tail ? listPath(project, list) : null })
  if (tail) items.push({ label: tail })
  return <Breadcrumbs items={items} />
}

function ListEditor({ list, onClose }) {
  const project = useProject()
  const { add, update } = useStore()
  const navigate = useAppNavigate()
  const [name, setName] = useState(list?.name ?? '')
  const [description, setDescription] = useState(list?.description ?? '')
  const [error, setError] = useState('')
  return <form className="form inline-form" noValidate onSubmit={(event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a list name.')
      return
    }
    const fields = { name: name.trim(), description: description.trim() }
    if (list) {
      update('todoLists', list.id, fields)
      onClose()
      return
    }
    const id = add('todoLists', 'list', {
      ...fields, projectId: String(project.id), status: 'active',
    })
    if (id) navigate(listPath(project, { id }))
  }}>
    <h2>{list ? 'Edit list' : 'New list'}</h2>
    <label><span>List name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)}
      aria-invalid={Boolean(error)} required /><FieldError>{error}</FieldError></label>
    <label><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="actions">
      <button className="button primary">{list ? 'Save changes' : 'Add this list'}</button>
      <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
    </div>
  </form>
}

function ListSection({ list, detail, tasks, visible = tasks, action }) {
  const project = useProject()
  const completed = tasks.filter((task) => task.completed).length
  return <section className="card list-card">
    <div className="section-heading list-heading">
      <div>
        {!detail && <h2><AppLink to={listPath(project, list)}>{listTitle(list)}</AppLink></h2>}
        {list.description && <p>{list.description}</p>}
      </div>
      <span className="muted small" aria-label={`${completed} of ${tasks.length} completed`}>{completed}/{tasks.length} completed</span>
    </div>
    {tasks.length > 0 && <progress aria-label="List progress" value={completed} max={tasks.length} />}
    <TaskRows list={list} tasks={visible.filter((task) => !task.completed)} />
    {action}
    <TaskRows list={list} tasks={visible.filter((task) => task.completed)} completed />
  </section>
}

function useTaskFilters() {
  const project = useProject()
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const q = params.get('q') ?? ''
  const assignee = params.get('assignee') ?? ''
  const due = params.get('due') ?? ''
  const completion = params.get('completion') ?? ''
  const today = dateInZone(new Date(), validZone(state.workspace?.timeZone))

  function keep(task, list) {
    const dated = validDate(task.dueOn)
    if (!matches(q, list.name, list.description, task.title, task.notes)) return false
    if (assignee === 'unassigned' && array(task.assigneeIds).length) return false
    if (assignee && assignee !== 'unassigned' && !hasId(task.assigneeIds, assignee)) return false
    if (completion === 'open' && task.completed || completion === 'completed' && !task.completed) return false
    if (due === 'overdue') return dated && task.dueOn < today && !task.completed
    if (due === 'upcoming') return dated && task.dueOn >= today && !task.completed
    if (due === 'none') return !dated
    return true
  }

  const filters = <div className="filters">
    <label>Search to-dos<input type="search" placeholder="Lists or to-dos…" value={q}
      onChange={(event) => setQuery({ q: event.target.value })} /></label>
    <label>Assignee<select value={assignee} onChange={(event) => setQuery({ assignee: event.target.value })}>
      <option value="">Anyone</option><option value="unassigned">Unassigned</option>
      {membersOf(state, project).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select></label>
    <label>Due<select value={due} onChange={(event) => setQuery({ due: event.target.value })}>
      <option value="">Any date</option><option value="overdue">Overdue</option>
      <option value="upcoming">Upcoming</option><option value="none">No due date</option>
    </select></label>
    <label>Status<select value={completion} onChange={(event) => setQuery({ completion: event.target.value })}>
      <option value="">All to-dos</option><option value="open">Open</option><option value="completed">Completed</option>
    </select></label>
  </div>
  return { q, keep, filters, taskFiltersActive: Boolean(assignee || due || completion) }
}

export function TodoIndex() {
  const project = useProject()
  const { state } = useStore()
  const [params, setQuery] = useQuery()
  const creating = params.get('newList') === '1'
  const { q, keep, filters, taskFiltersActive } = useTaskFilters()
  const lists = listsOf(state, project).flatMap((list) => {
    const tasks = tasksOf(state, list)
    const visible = tasks.filter((task) => keep(task, list))
    return visible.length || (!taskFiltersActive && matches(q, list.name, list.description)) ? [{ list, tasks, visible }] : []
  })
  return <>
    <TodoBreadcrumbs />
    <PageHeading title="To-dos" icon={CheckSquare}
      action={<button type="button" className="button primary" onClick={() => setQuery({ newList: '1' })}><Plus size={16} />New list</button>} />
    {filters}
    <div className="stack">
      {creating && <ListEditor onClose={() => setQuery({ newList: null })} />}
      {lists.map(({ list, tasks, visible }) => <ListSection key={list.id} list={list} tasks={tasks} visible={visible}
        action={<AppLink className="button secondary" to={listPath(project, list) + '?add=1'}><Plus size={16} />Add a to-do</AppLink>} />)}
      {!lists.length && <Empty>{q || taskFiltersActive ? 'No lists or to-dos match these filters.' : 'There are no to-do lists yet.'}</Empty>}
    </div>
  </>
}

export function TodoListDetail() {
  const { listId } = useParams()
  const project = useProject()
  const { state } = useStore()
  const list = byId(listsOf(state, project), listId)
  if (!list) return <Unavailable title="To-do list unavailable" to={todosPath(project)} label="Back to To-dos" />
  return <ListDetail key={list.id} list={list} />
}

function ListDetail({ list }) {
  const project = useProject()
  const { state, update } = useStore()
  const [editing, setEditing] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const [query, setQuery] = useQuery()
  const adding = query.get('add') === '1'
  const { keep, filters } = useTaskFilters()
  const tasks = tasksOf(state, list)
  const visible = tasks.filter((task) => keep(task, list))
  const navigate = useAppNavigate()
  return <>
    <TodoBreadcrumbs list={list} />
    <PageHeading title={listTitle(list)} action={<ActionMenu label="List options">
      <button type="button" onClick={() => setEditing(true)}>Edit</button>
      <button type="button" className="destructive" onClick={() => setTrashing(true)}>Put in the trash</button>
    </ActionMenu>} />
    {!editing && filters}
    {editing ? <ListEditor list={list} onClose={() => setEditing(false)} /> :
      <ListSection list={list} detail tasks={tasks} visible={visible} action={adding
        ? <TaskEditor list={list} onClose={() => setQuery({ add: null })} />
        : <button type="button" className="button secondary" onClick={() => setQuery({ add: '1' })}><Plus size={16} />Add a to-do</button>} />}
    {!editing && !visible.length && tasks.length > 0 && <Empty>No to-dos match these filters.</Empty>}
    {trashing && <TrashDialog title={listTitle(list)} onClose={() => setTrashing(false)} onConfirm={() => {
      update('todoLists', list.id, { status: 'trashed' })
      navigate(todosPath(project))
    }} />}
  </>
}

const taskTitle = (task) => task.title || 'Untitled to-do'

function taskDates(task) {
  const start = formatDay(task.startsOn)
  const due = formatDay(task.dueOn)
  return start && due && start !== due ? start + ' – ' + due : due || start
}

function TaskMeta({ task }) {
  const { state } = useStore()
  const assignees = resolvePeople(state.people, task.assigneeIds)
  const dates = taskDates(task)
  if (!assignees.length && !dates) return null
  const overdue = !task.completed && validDate(task.dueOn) && task.dueOn < dateInZone(new Date(), validZone(state.workspace?.timeZone))
  return <span className="task-meta small muted">
    {assignees.length > 0 && <span>{assignees.map((person) => person.name).join(', ')}</span>}
    {dates && <span>{dates}</span>}
    {overdue && <span className="badge overdue">Overdue</span>}
  </span>
}

function TaskRows({ list, tasks, completed }) {
  if (!tasks.length) return null
  return <>
    {completed && <h3 className="completed-heading">Completed</h3>}
    <ul className="task-rows">{tasks.map((task) => <TaskRow key={task.id} task={task} list={list} />)}</ul>
  </>
}

function TaskCheckbox({ task, showLabel }) {
  const { update } = useStore()
  const label = task.completed ? 'Reopen' : 'Complete'
  return <label className="task-check">
    <input type="checkbox" checked={Boolean(task.completed)} aria-label={label + ' ' + taskTitle(task)}
      onChange={(event) => {
        const completed = event.target.checked
        update('todos', task.id, (stamp) => ({
          completed, completedById: completed ? stamp.updatedById : null, completedAt: completed ? stamp.updatedAt : null,
        }))
      }} />
    {showLabel && <span>{task.completed ? 'Completed' : 'Mark complete'}</span>}
  </label>
}

function TaskOptions({ task, list, onTrash }) {
  const project = useProject()
  const { state, positionTodo, update } = useStore()
  const [moving, setMoving] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const [destination, setDestination] = useState('')
  const destinations = listsOf(state, project).filter((other) => !sameId(other.id, list.id))
  const open = tasksOf(state, list).filter((item) => !item.completed)
  const index = open.findIndex((item) => sameId(item.id, task.id))

  function reorder(direction) {
    const neighbor = open[index + direction]
    if (neighbor) positionTodo({ id: task.id, projectId: project.id, listId: list.id, neighborId: neighbor.id, direction })
  }

  function move(event) {
    event.preventDefault()
    if (!destination) return
    positionTodo({ id: task.id, projectId: project.id, listId: list.id, destinationId: destination })
    setMoving(false)
  }

  return <>
    <ActionMenu label={taskTitle(task) + ' options'}>
      {destinations.length > 0 && <button type="button" onClick={() => { setDestination(''); setMoving(true) }}>Move</button>}
      {index > 0 && <button type="button" onClick={() => reorder(-1)}>Move up</button>}
      {index >= 0 && index < open.length - 1 && <button type="button" onClick={() => reorder(1)}>Move down</button>}
      <button type="button" className="destructive" onClick={() => setTrashing(true)}>Put in the trash</button>
    </ActionMenu>
    {moving && <Dialog title={`Move “${taskTitle(task)}”`} onClose={() => setMoving(false)}>
      <form className="form" onSubmit={move}>
        <label><span>Destination list</span><select required value={destination} onChange={(event) => setDestination(event.target.value)}>
          <option value="">Choose a list…</option>
          {destinations.map((other) => <option key={other.id} value={other.id}>{listTitle(other)}</option>)}
        </select></label>
        <div className="actions">
          <button className="button primary" disabled={!destination}>Move to list</button>
          <button type="button" className="button secondary" onClick={() => setMoving(false)}>Cancel</button>
        </div>
      </form>
    </Dialog>}
    {trashing && <TrashDialog title={taskTitle(task)} onClose={() => setTrashing(false)} onConfirm={() => {
      update('todos', task.id, { status: 'trashed' })
      onTrash?.()
    }} />}
  </>
}

function TaskRow({ task, list }) {
  const project = useProject()
  return <li className={`task-row${task.completed ? ' completed' : ''}`}>
    <TaskCheckbox task={task} />
    <div>
      <AppLink className="task-title" to={taskPath(project, task)}>{taskTitle(task)}</AppLink>
      <TaskMeta task={task} />
    </div>
    <TaskOptions task={task} list={list} />
  </li>
}

export function TodoDetail() {
  const { todoId } = useParams()
  const project = useProject()
  const { state } = useStore()
  const task = byId(inProject(state.todos, project), todoId)
  const list = task && byId(listsOf(state, project), task.listId)
  if (!list || (task.status ?? 'active') !== 'active') {
    return <Unavailable title="To-do unavailable" to={todosPath(project)} label="Back to To-dos" />
  }
  return <TaskDetail key={task.id} task={task} list={list} />
}

function TaskDetail({ task, list }) {
  const project = useProject()
  const navigate = useAppNavigate()
  const { state } = useStore()
  const [editing, setEditing] = useState(false)
  const notify = resolvePeople(state.people, task.completionNotifyIds)
  return <div className="reading-width">
    <TodoBreadcrumbs list={list} tail={taskTitle(task)} />
    <PageHeading title={taskTitle(task)}
      action={<>
        <button type="button" className="button secondary" onClick={() => setEditing(true)}>Edit</button>
        <TaskOptions task={task} list={list} onTrash={() => navigate(listPath(project, list))} />
      </>} />
    {editing ? <TaskEditor task={task} list={list} onClose={() => setEditing(false)} /> :
      <section className="card stack">
        <TaskCheckbox task={task} showLabel />
        <TaskMeta task={task} />
        {notify.length > 0 && <p><strong>When done, notify</strong> {notify.map((person) => person.name).join(', ')}</p>}
        {task.notes && <p className="preserve-lines">{task.notes}</p>}
      </section>}
    {!editing && <Comments parent={task} type="todo" />}
  </div>
}
