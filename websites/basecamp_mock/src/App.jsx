import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Header, ProjectShell } from './components/Shell.jsx'
import { Unavailable } from './components/ui.jsx'
import { Assignments } from './pages/Assignments.jsx'
import { Find } from './pages/Find.jsx'
import { Home, ProjectOverview } from './pages/Home.jsx'
import { TodoIndex, TodoListDetail, TodoDetail } from './pages/Todos.jsx'
import { Drafts, MessageBoard, MessageDetail, MessageEditor } from './pages/Messages.jsx'
import { Schedule, ScheduleDetail, ScheduleEditor } from './pages/Schedule.jsx'
import { ProjectTrash } from './pages/Trash.jsx'
import { PendingTool } from './pages/Pending.jsx'
import { SessionStore, useProject, useStore } from './store.jsx'

function Overview() {
  const { state } = useStore()
  return <ProjectOverview state={state} project={useProject()} />
}

function WorkspaceRoutes() {
  const { state, saveFailed, retrySave } = useStore()
  return <>
    <Header state={state} />
    {saveFailed && <div className="save-error">
      <p role="alert">Basecamp couldn’t save your changes to the server.</p>
      <button type="button" className="button secondary" onClick={retrySave}>Retry save</button>
    </div>}
    <Routes>
      <Route index element={<Home state={state} />} />
      <Route path="find" element={<Find />} />
      <Route path="my-assignments" element={<Assignments />} />
      <Route path="projects/:projectId" element={<ProjectShell state={state} />}>
        <Route index element={<Overview />} />
        <Route path="todos" element={<TodoIndex />} />
        <Route path="todos/lists/:listId" element={<TodoListDetail />} />
        <Route path="todos/items/:todoId" element={<TodoDetail />} />
        <Route path="message-board" element={<MessageBoard />} />
        <Route path="message-board/new" element={<MessageEditor />} />
        <Route path="message-board/drafts" element={<Drafts />} />
        <Route path="message-board/:messageId" element={<MessageDetail />} />
        <Route path="message-board/:messageId/edit" element={<MessageEditor />} />
        <Route path="message-board/:messageId/details" element={<MessageDetail />} />
        <Route path="message-board/:messageId/details/edit" element={<MessageEditor />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="schedule/new" element={<ScheduleEditor />} />
        <Route path="schedule/:entryId" element={<ScheduleDetail />} />
        <Route path="schedule/:entryId/edit" element={<ScheduleEditor />} />
        <Route path="schedule/:entryId/details" element={<ScheduleDetail />} />
        <Route path="schedule/:entryId/details/edit" element={<ScheduleEditor />} />
        <Route path="trash" element={<ProjectTrash />} />
        <Route path="*" element={<PendingTool title="Project tool" />} />
      </Route>
      <Route path="*" element={<main className="workspace-content"><Unavailable /></main>} />
    </Routes>
  </>
}

export default function App() {
  return <BrowserRouter><SessionStore><WorkspaceRoutes /></SessionStore></BrowserRouter>
}
