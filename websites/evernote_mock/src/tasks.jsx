import { useLayoutEffect, useRef, useState } from 'react'
import { activeNote, activeTask, countLabel, createNotebook, dateOnly, deleted, dueLabel, idFor, list, localDay,
  noteOrder, noteRecord, noteTitle, readWorld, replaceRecord, setPreferences, taskRecord, taskTitle, text,
  updated, validateNotebookName } from './model.js'
import { noteUrl, taskUrl, useWorkspace, WorkspaceLink } from './navigation.jsx'
import { Confirm } from './notebooks.jsx'
import { Dialog, Empty, Heading, Menu, Sheet, Symbol } from './ui.jsx'

export function NewTaskButton({ noteId }) {
  const { flushEditor, setDialog } = useWorkspace()
  return <button className={noteId ? '' : 'primary'} onClick={() => {
    flushEditor()
    setDialog({ kind: 'new-task', noteId })
  }}><Symbol name="add" /> {noteId ? 'Add task' : 'New task'}</button>
}

function setTaskStatus(task, mutate) {
  mutate((state, stamp) => {
    const current = list(state.tasks).find((candidate) => candidate?.id === task.id)
    if (!activeTask(current)) return state
    const complete = current.status !== 'completed'
    return { ...state, tasks: replaceRecord(state.tasks, task.id, {
      status: complete ? 'completed' : 'open', completedAt: complete ? stamp.now : null,
      completedBy: complete ? stamp.actor : null, ...updated(stamp),
    }) }
  })
}

function toggleFlag(task, mutate) {
  mutate((state, stamp) => {
    const current = list(state.tasks).find((candidate) => candidate?.id === task.id)
    if (!activeTask(current)) return state
    return { ...state, tasks: replaceRecord(state.tasks, task.id, { flagged: !current.flagged, ...updated(stamp) }) }
  })
}

function TaskRow({ task, withinNote = false, today }) {
  const { world, route, mutate, setDialog, flushEditor } = useWorkspace()
  const note = world.noteById.get(task.noteId)
  const title = taskTitle(task)
  const target = withinNote ? noteUrl(task.noteId, route.collection, task.id) : taskUrl(task.id)
  const due = dateOnly(task.dueDate)
  const overdue = due && due < today && task.status !== 'completed'
  const status = task.status === 'completed' ? 'Reopen ' : 'Complete '
  return <div className={'task-row' + (withinNote ? ' note-task-row' : '')}>
    <input type="checkbox" aria-label={status + title} checked={task.status === 'completed'} onChange={() => setTaskStatus(task, mutate)} />
    <div>
      <WorkspaceLink className="task-title" to={target}>{title}</WorkspaceLink>
      {task.flagged && <span className="chip flagged task-flag">Flagged</span>}
    </div>
    {!withinNote && <div className="task-note meta">
      {note ? <><span>{noteTitle(note)}</span><WorkspaceLink to={noteUrl(note.id)} aria-label={'Open note for ' + title}>Open note</WorkspaceLink></> : 'No note'}
    </div>}
    {due ? <time className={overdue ? 'task-date chip overdue' : 'task-date meta'} dateTime={due}>{overdue && 'Overdue · '}{dueLabel(due)}</time> :
      <span className="task-date meta">No due date</span>}
    <Menu label={'Task actions for ' + title} iconOnly>
      <WorkspaceLink className="button" to={target}>Edit task</WorkspaceLink>
      <button onClick={() => toggleFlag(task, mutate)}>{task.flagged ? 'Remove flag' : 'Flag task'}</button>
      <button className="danger" onClick={() => {
        flushEditor()
        setDialog({ kind: 'delete-task', id: task.id })
      }}>Delete task</button>
    </Menu>
  </div>
}

export function NoteTasks({ note }) {
  const { world } = useWorkspace()
  const tasks = world.visibleTasks.filter((task) => task.noteId === note.id)
  const today = localDay()
  return <section className="note-section">
    <div className="section-line"><h2>Tasks</h2><NewTaskButton noteId={note.id} /></div>
    {tasks.length ? <div className="task-list">{tasks.map((task) => <TaskRow key={task.id} task={task} withinNote today={today} />)}</div> :
      <p className="meta">No tasks in this note.</p>}
  </section>
}

const dueGroups = ['Overdue', 'Today', 'Upcoming', 'No due date']
function taskDateGroup(task, today) {
  const due = dateOnly(task.dueDate)
  if (!due) return 'No due date'
  if (due < today) return 'Overdue'
  return due === today ? 'Today' : 'Upcoming'
}

export function Tasks() {
  const { world, setDialog } = useWorkspace()
  const [filter, setFilter] = useState('Open')
  const [group, setGroup] = useState('due')
  const today = localDay()
  const visible = world.visibleTasks.filter((task) => {
    if (filter === 'Open') return task.status !== 'completed'
    if (filter === 'Completed') return task.status === 'completed'
    return filter !== 'Flagged' || Boolean(task.flagged)
  }).sort((a, b) => (dateOnly(a.dueDate) || '9999').localeCompare(dateOnly(b.dueDate) || '9999') ||
    taskTitle(a).localeCompare(taskTitle(b)) || String(a.id).localeCompare(String(b.id)))
  const groups = new Map()
  for (const task of visible) {
    const key = group === 'due' ? taskDateGroup(task, today) : world.noteById.get(task.noteId)?.id || null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(task)
  }
  const groupName = (id) => group === 'due' ? id : id ? noteTitle(world.noteById.get(id)) : 'No note'
  const keys = group === 'due' ? dueGroups.filter((name) => groups.has(name)) :
    [...groups.keys()].sort((a, b) => groupName(a).localeCompare(groupName(b)))
  return <>
    <Heading title="Tasks" count={countLabel(visible.length, 'task')}>
      <select aria-label="Filter tasks" value={filter} onChange={(event) => setFilter(event.target.value)}>
        {['Open', 'Completed', 'All', 'Flagged'].map((option) => <option key={option}>{option}</option>)}
      </select>
      <select aria-label="Group tasks" value={group} onChange={(event) => setGroup(event.target.value)}>
        <option value="due">Group by due date</option><option value="note">Group by note</option>
      </select>
      <button onClick={() => setDialog({ kind: 'default-task-note' })}>Set default task note</button>
    </Heading>
    {keys.length ? keys.map((key) => <section className="task-group" key={key ?? 'orphan'}>
      <h2>{groupName(key)}</h2>
      <div className="task-list">{groups.get(key).map((task) => <TaskRow key={task.id} task={task} today={today} />)}</div>
    </section>) : <Empty title={filter === 'All' ? 'No tasks yet' : 'No ' + filter.toLowerCase() + ' tasks'} symbol="tasks">
      <div className="controls">{filter !== 'All' && <button onClick={() => setFilter('All')}>Show all tasks</button>}<NewTaskButton /></div>
    </Empty>}
  </>
}

function TaskForm({ task, noteId, onSubmit, onCancel, extra }) {
  const { world } = useWorkspace()
  const bookNeeded = !world.defaultBook
  const [draft, setDraft] = useState(() => ({
    title: text(task?.title), description: text(task?.description), dueDate: dateOnly(task?.dueDate),
    flagged: Boolean(task?.flagged), noteId: task ? (world.noteById.has(task.noteId) ? task.noteId : '') :
      (noteId || world.taskNote?.id || ''), notebookName: '',
  }))
  const [error, setError] = useState('')
  const change = (key, value) => { setDraft({ ...draft, [key]: value }); setError('') }
  const needsDestination = !task && !draft.noteId
  const choices = [...world.liveNotes].sort(noteOrder)
  return <form onSubmit={(event) => {
    event.preventDefault()
    if (!draft.title.trim()) { setError('Enter a task title.'); return }
    if (needsDestination && bookNeeded) {
      const error = validateNotebookName(draft.notebookName, world.books)
      if (error) { setError(error); return }
    }
    onSubmit({ ...draft, title: draft.title.trim(), dueDate: draft.dueDate || null, notebookName: draft.notebookName.trim() })
  }}>
    <label className="editor-field"><span>Title</span><input data-initial-focus value={draft.title} onChange={(event) => change('title', event.target.value)} /></label>
    <label className="editor-field"><span>Note</span><select aria-label="Note" value={draft.noteId} onChange={(event) => change('noteId', event.target.value)}>
      {!draft.noteId && task && <option value="">No note</option>}
      {!task && <option value="">{world.fallbackTaskNote ? 'Use Things to do' : 'Create Things to do'}</option>}
      {choices.map((note) => <option value={note.id} key={note.id}>{noteTitle(note)}</option>)}
    </select></label>
    {needsDestination && bookNeeded && <label className="editor-field"><span>New notebook name</span><input value={draft.notebookName}
      onChange={(event) => change('notebookName', event.target.value)} /></label>}
    <label className="editor-field"><span>Description</span><textarea aria-label="Description" rows="3" value={draft.description} onChange={(event) => change('description', event.target.value)} /></label>
    <label className="editor-field"><span>Due date</span><input type="date" value={draft.dueDate} onChange={(event) => change('dueDate', event.target.value)} /></label>
    <label className="checkbox-field"><input type="checkbox" checked={draft.flagged} onChange={(event) => change('flagged', event.target.checked)} /> Flagged</label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions">
      {extra}
      <button type="button" onClick={onCancel}>Cancel</button>
      <button className="primary">{task ? 'Save task' : 'Create task'}</button>
    </div>
  </form>
}

export function TaskSheet({ task }) {
  const { route, go, mutate, setDialog, notice } = useWorkspace()
  const sheet = useRef(null)
  const withinNote = Boolean(route.note)
  const close = () => go(withinNote ? noteUrl(route.note.id, route.collection) : '/tasks', { replace: true })
  useLayoutEffect(() => {
    const previous = document.activeElement
    sheet.current?.querySelector('[data-initial-focus]')?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return <Sheet label="Task details" className="sheet-task" sheetRef={sheet} onClose={close}>
    <header className="sheet-header">
      <div className="controls">
        <button className="icon-button" aria-label="Close task" onClick={close}><Symbol name="close" /></button>
        <strong>Task details</strong>
      </div>
      <button onClick={() => setTaskStatus(task, mutate)}>{task.status === 'completed' ? 'Reopen task' : 'Complete task'}</button>
    </header>
    <div className="sheet-body">
      <TaskForm task={task} onCancel={close} extra={<button type="button" className="danger" onClick={() =>
        setDialog({ kind: 'delete-task', id: task.id })}>Delete task</button>} onSubmit={(draft) => {
        const changed = mutate((state, stamp) => {
          const current = list(state.tasks).find((candidate) => candidate?.id === task.id)
          if (!activeTask(current)) return state
          const fields = { title: draft.title, description: draft.description, dueDate: draft.dueDate,
            flagged: draft.flagged, noteId: draft.noteId || current.noteId }
          const existing = { title: text(current.title), description: text(current.description), dueDate: dateOnly(current.dueDate) || null,
            flagged: Boolean(current.flagged), noteId: current.noteId }
          const changes = Object.fromEntries(Object.entries(fields).filter(([key, value]) => existing[key] !== value))
          return Object.keys(changes).length ? { ...state, tasks: replaceRecord(state.tasks, task.id, { ...changes, ...updated(stamp) }) } : state
        })
        close()
        if (changed) notice('Task saved')
      }} />
    </div>
  </Sheet>
}

export function TaskDialog({ kind, id, noteId }) {
  const { world, route, setDialog, mutate, notice, go } = useWorkspace()
  const close = () => setDialog(null)
  if (kind === 'new-task') {
    return <Dialog title="New task" onClose={close}>
      <TaskForm noteId={noteId} onCancel={close} onSubmit={(draft) => {
        const changed = mutate((state, stamp) => {
          const current = readWorld(state)
          let next = state
          let destination = draft.noteId
          if (destination && !activeNote(current.noteById.get(destination))) return state
          if (!destination) {
            let bookId = current.defaultBook?.id
            if (!bookId) {
              bookId = idFor('nb')
              next = createNotebook(next, bookId, draft.notebookName, stamp, current)
            }
            destination = current.fallbackTaskNote?.id
            if (!destination) {
              destination = idFor('note')
              next = { ...next, notes: [...list(next.notes), noteRecord(destination, bookId, 'Things to do', stamp)] }
            }
            next = { ...next, preferences: setPreferences(next, { defaultTaskNoteId: destination }, stamp) }
          }
          return { ...next, tasks: [...list(next.tasks), taskRecord(idFor('task'), destination, draft, stamp)] }
        })
        close()
        if (changed) notice('Task created')
      }} />
    </Dialog>
  }
  if (kind === 'default-task-note') {
    const choices = [...world.liveNotes].sort(noteOrder)
    return <Dialog title="Set default task note" onClose={close}>
      {choices.length ? <form onSubmit={(event) => {
        event.preventDefault()
        const noteId = new FormData(event.currentTarget).get('note')
        const changed = mutate((state, stamp) => {
          if (!activeNote(readWorld(state).noteById.get(noteId)) || state.preferences?.defaultTaskNoteId === noteId) return state
          return { ...state, preferences: setPreferences(state, { defaultTaskNoteId: noteId }, stamp) }
        })
        close()
        if (changed) notice('Default task note updated')
      }}>
        <label className="editor-field"><span>Note</span><select name="note" aria-label="Note" defaultValue={world.taskNote?.id || choices[0].id} data-initial-focus>
          {choices.map((note) => <option key={note.id} value={note.id}>{noteTitle(note)}</option>)}
        </select></label>
        <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Set default</button></div>
      </form> : <><p>Create a note to select a default task destination.</p>
        <div className="dialog-actions"><button data-initial-focus onClick={close}>Close</button></div></>}
    </Dialog>
  }
  const task = world.visibleTasks.find((task) => task.id === id)
  if (!task) return null
  return <Confirm title="Delete task?" label="Delete task" onConfirm={() => {
    const changed = mutate((state, stamp) => {
      if (!activeTask(list(state.tasks).find((candidate) => candidate?.id === id))) return state
      return { ...state, tasks: replaceRecord(state.tasks, id, deleted(stamp)) }
    })
    close()
    if (changed) {
      if (route.task?.id === id) go(route.note ? noteUrl(route.note.id, route.collection) : '/tasks', { replace: true })
      notice('Task deleted')
    }
  }}><p><strong>{taskTitle(task)}</strong> will be removed from its note and Tasks.</p></Confirm>
}
