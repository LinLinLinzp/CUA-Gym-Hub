import { useMemo, useRef, useState } from 'react'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { Shell } from './shell.jsx'
import { Workspace, WorkspaceLink } from './navigation.jsx'
import { Empty, Heading } from './ui.jsx'
import { NewNoteButton, Notes, NoteSheet } from './notes.jsx'
import { NoteDialog } from './note-dialogs.jsx'
import { NewNotebookButton, NotebookActions, NotebookDialog, Notebooks } from './notebooks.jsx'
import { NewTaskButton, NoteTasks, TaskDialog, Tasks, TaskSheet } from './tasks.jsx'
import { readWorld } from './model.js'
import { resolveRoute } from './route.js'
import { useStore } from './store.js'
import { getSessionId } from './utils/dataManager.js'

const headings = { notes: 'Notes', notebooks: 'Notebooks', tasks: 'Tasks', trash: 'Trash', search: 'Search' }

function WorkspaceRoutes({ state, mutate }) {
  const location = useLocation()
  const navigate = useNavigate()
  const world = useMemo(() => readWorld(state), [state])
  const route = resolveRoute(location, world)
  const editor = useRef(null)
  const [dialog, setDialog] = useState(null)
  const [feedback, setFeedback] = useState('')
  const feedbackTimer = useRef(null)
  const linkTo = (path) => {
    const url = new URL(path, window.location.origin)
    const sid = new URLSearchParams(location.search).get('sid') || getSessionId()
    if (sid) url.searchParams.set('sid', sid)
    return url.pathname + url.search + url.hash
  }
  const flushEditor = () => editor.current?.()
  const go = (path, options) => {
    flushEditor()
    navigate(linkTo(path), options)
  }
  const notice = (message) => {
    clearTimeout(feedbackTimer.current)
    setFeedback(message)
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2800)
  }
  const value = { linkTo, go, flushEditor, editor, world, route, mutate, setDialog, notice }
  return <Workspace.Provider value={value}>
    <Shell section={route.section === 'search' ? 'notes' : route.section} user={world.user} feedback={feedback} actions={<>
      {route.section === 'notebooks' && <NewNotebookButton />}
      {route.section === 'tasks' && <NewTaskButton />}
      <NewNoteButton />
    </>}>
      {route.missing ? <>
        <Heading title={headings[route.section]} />
        <Empty title={route.missing} symbol={route.section}>
          <WorkspaceLink className="button" to={route.recovery || route.collection}>{route.recoveryLabel || 'Back to ' + headings[route.section]}</WorkspaceLink>
        </Empty>
      </> : route.section === 'notebooks' && !route.notebook ? <Notebooks /> :
        route.section === 'tasks' ? <Tasks /> :
        <Notes key={route.section} notebookActions={route.notebook && <NotebookActions book={route.notebook} />} />}
      {route.note && <NoteSheet key={route.note.id} note={route.note} focusTitle={location.state?.focusTitle === route.note.id}
        renderTasks={(note) => <NoteTasks note={note} />} />}
      {route.task && <TaskSheet key={route.task.id} task={route.task} />}
      {dialog && (['new-notebook', 'rename-notebook', 'protect-notebook', 'delete-notebook'].includes(dialog.kind)
        ? <NotebookDialog key={dialog.kind} {...dialog} />
        : ['new-task', 'default-task-note', 'delete-task'].includes(dialog.kind)
          ? <TaskDialog key={dialog.kind} {...dialog} />
          : <NoteDialog key={dialog.kind} {...dialog} />)}
    </Shell>
  </Workspace.Provider>
}

export function App() {
  const { state, mutate } = useStore()
  if (!state) return <main className="workspace" role="status">Loading workspace…</main>
  return <BrowserRouter><WorkspaceRoutes state={state} mutate={mutate} /></BrowserRouter>
}
