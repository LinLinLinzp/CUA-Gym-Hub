import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { directory, eligibleUsers, FieldError, humanDate, label, nameOf, personName, replace, stampRemoval } from './model.js'
import { Breadcrumbs, Chip, Dialog, Empty, Field, Form, Heading, Icon, RouteLink } from './ui.jsx'

const fileUrl = id => `/preview/${encodeURIComponent(id)}`
const decisions = ['completed', 'approved', 'rejected']
const assignmentsFor = (state, taskId) => state.taskAssignments.filter(entry => entry.taskId === taskId && entry.status !== 'removed')
const canEdit = (task, entries, actor) => Boolean(actor && task.createdById === actor && task.status === 'open' &&
  !entries.some(entry => entry.decidedAt || decisions.includes(entry.status)))

function aggregate(task, entries) {
  const any = task.completionRule === 'any'
  const count = status => entries.filter(entry => entry.status === status).length
  const satisfied = status => any ? count(status) > 0 : count(status) === entries.length
  if (task.type === 'general') return satisfied('completed') ? 'completed' : 'open'
  if (satisfied('approved')) return 'approved'
  if (any ? count('rejected') === entries.length : count('rejected') > 0) return 'rejected'
  return 'open'
}

function overdue(task) {
  const today = new Date()
  const localDate = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(part => String(part).padStart(2, '0')).join('-')
  return task.status === 'open' && task.dueDate && task.dueDate < localDate
}

function taskTitle(type, editing) {
  if (editing) return 'Edit task'
  return type === 'approval' ? 'Add approval task' : 'Add general task'
}

function TaskEditor({ file, task, type, onClose }) {
  const { state, commit } = useWorkspace()
  const eligible = eligibleUsers(state, file)
  const entries = task ? assignmentsFor(state, task.id) : []
  const selected = new Set(entries.map(item => item.assigneeId))
  function save(data) {
    commit((current, meta) => {
      const target = current.files.find(record => record.id === file.id)
      if (!target || !directory(current).visible(target.folderId)) throw new Error('This file is no longer available.')
      const values = {
        fileId: target.id, type, completionRule: data.get('rule'),
        message: String(data.get('message')).trim(), dueDate: data.get('dueDate') || null,
      }
      if (!values.message) throw new FieldError('message', 'Enter a task message.')
      if (!['general', 'approval'].includes(type) || !['all', 'any'].includes(values.completionRule)) throw new Error('Select a valid task type and completion rule.')
      const ids = new Set(data.getAll('assignee'))
      const allowed = new Set(eligibleUsers(current, target).map(user => user.id))
      if (!ids.size || [...ids].some(id => !allowed.has(id))) throw new Error('Select at least one person with active access.')
      const newAssignment = (taskId, assigneeId) => ({
        ...meta.record('task-assignment'), taskId, assigneeId, status: 'pending',
        decidedAt: null, decidedById: null, removedAt: null, removedById: null,
      })
      if (!task) {
        const record = {
          ...meta.record('task'), ...values, status: 'open', resolvedAt: null, resolvedById: null, deletedAt: null, deletedById: null,
        }
        return { ...current, tasks: [...current.tasks, record], taskAssignments: [...current.taskAssignments, ...[...ids].map(id => newAssignment(record.id, id))] }
      }
      const previous = current.tasks.find(record => record.id === task.id)
      const active = assignmentsFor(current, task.id)
      if (!previous || !canEdit(previous, active, meta.actor)) throw new Error('This task can no longer be edited.')
      const priorIds = new Set(active.map(entry => entry.assigneeId))
      const assignments = current.taskAssignments.map(entry => entry.taskId === task.id && entry.status === 'pending' && !ids.has(entry.assigneeId)
        ? { ...entry, ...stampRemoval(meta) } : entry)
      return {
        ...current, tasks: replace(current.tasks, task.id, { ...values, ...meta.update }),
        taskAssignments: [...assignments, ...[...ids].filter(id => !priorIds.has(id)).map(id => newAssignment(task.id, id))],
      }
    }, task ? 'Task updated.' : 'Task created.')
    onClose()
  }

  return <Dialog title={taskTitle(type, task)} wide onClose={onClose}>
    <Form action={task ? 'Save task' : 'Create task'} onClose={onClose} onSave={save}>
      <Field title="Message"><textarea name="message" rows="3" required autoFocus defaultValue={task?.message} /></Field>
      <fieldset><legend>Assignees</legend>
        <div className="picker">{eligible.length ? eligible.map(user => <label key={user.id}>
          <input type="checkbox" name="assignee" value={user.id} defaultChecked={selected.has(user.id)} />{nameOf(user)}
        </label>) : <p className="panel-pad muted">No people with active access were found.</p>}</div>
      </fieldset>
      <Field title="Due date (optional)"><input type="date" name="dueDate" defaultValue={task?.dueDate || ''} /></Field>
      <Field title="Completion rule"><select name="rule" defaultValue={task?.completionRule || 'all'}><option value="all">All assignees</option><option value="any">Any assignee</option></select></Field>
    </Form>
  </Dialog>
}

function TaskAction({ kind, task, onClose }) {
  const { commit } = useWorkspace()
  const titles = { delete: 'Delete task', completed: 'Mark complete', approved: 'Approve', rejected: 'Reject' }
  const feedback = { delete: 'Task deleted.', completed: 'Completion recorded.', approved: 'Approval recorded.', rejected: 'Rejection recorded.' }
  function save() {
    commit((current, meta) => {
      const previous = current.tasks.find(record => record.id === task.id)
      const entries = assignmentsFor(current, task.id)
      if (!previous || previous.status !== 'open') throw new Error('This task is already closed.')
      const file = current.files.find(record => record.id === previous.fileId)
      if (!file || !directory(current).visible(file.folderId)) throw new Error('This file is no longer available.')
      if (kind === 'delete') {
        if (!canEdit(previous, entries, meta.actor)) throw new Error('This task can no longer be deleted.')
        return {
          ...current, tasks: replace(current.tasks, previous.id, { ...meta.update, status: 'deleted', deletedAt: meta.now, deletedById: meta.actor }),
          taskAssignments: current.taskAssignments.map(entry => entry.taskId === task.id && entry.status === 'pending' ? { ...entry, ...stampRemoval(meta) } : entry),
        }
      }
      const assignment = entries.find(entry => entry.assigneeId === meta.actor && entry.status === 'pending')
      if (!assignment || (previous.type === 'general' ? kind !== 'completed' : previous.type !== 'approval' || !['approved', 'rejected'].includes(kind))) {
        throw new Error('You do not have an open assignment for this decision.')
      }
      const decision = { ...meta.update, status: kind, decidedAt: meta.now, decidedById: meta.actor }
      const status = aggregate(previous, replace(entries, assignment.id, decision))
      const resolution = status === 'open' ? {} : { resolvedAt: meta.now, resolvedById: meta.actor }
      return {
        ...current, taskAssignments: replace(current.taskAssignments, assignment.id, decision),
        tasks: replace(current.tasks, previous.id, { ...meta.update, status, ...resolution }),
      }
    }, feedback[kind])
    onClose()
  }
  return <Dialog title={titles[kind]} onClose={onClose}>
    <Form action={titles[kind]} onClose={onClose} onSave={save} danger={kind === 'delete' || kind === 'rejected'}>
      <p>{kind === 'delete' ? 'Delete this task and remove its pending assignments?' : 'Record this decision for your assignment?'}</p>
      <p><strong>{task.message || 'Untitled task'}</strong></p>
    </Form>
  </Dialog>
}

function TaskCard({ task, preview = false }) {
  const { state, actor } = useWorkspace()
  const [action, setAction] = useState(null)
  const close = () => setAction(null)
  const entries = assignmentsFor(state, task.id)
  const file = state.files.find(item => item.id === task.fileId)
  const fileAvailable = file && directory(state).visible(file.folderId)
  const editable = fileAvailable && canEdit(task, entries, actor)
  const actionable = fileAvailable && task.status === 'open' && entries.some(entry => entry.assigneeId === actor && entry.status === 'pending')
  return <article className="task-card">
    <div className="record-head"><small>{label(task.type)} task</small><div className="inline-actions"><Chip status={task.status} />{overdue(task) && <Chip status="overdue" />}</div></div>
    <h3>{task.message || 'Untitled task'}</h3>
    {!preview && (fileAvailable ? <RouteLink to={fileUrl(file.id)}>{nameOf(file)}</RouteLink> : <small>File unavailable</small>)}
    <p className="muted">{task.dueDate ? `Due ${humanDate(task.dueDate)}` : 'No due date'} · {task.completionRule === 'any' ? 'Any assignee' : 'All assignees'}</p>
    {entries.length > 0 && <ul className="clean-list task-assignees">{entries.map(entry => <li key={entry.id}>
      {personName(state, entry.assigneeId)} <Chip status={entry.status} />
    </li>)}</ul>}
    {(editable || actionable) && <div className="inline-actions">
      {actionable && (task.type === 'general'
        ? <button className="primary" onClick={() => setAction('completed')}>Mark complete</button>
        : task.type === 'approval' && <><button className="primary" onClick={() => setAction('approved')}>Approve</button><button onClick={() => setAction('rejected')}>Reject</button></>)}
      {editable && <><button onClick={() => setAction('edit')}>Edit task</button><button onClick={() => setAction('delete')}>Delete task</button></>}
    </div>}
    {action === 'edit' ? <TaskEditor file={file} task={task} type={task.type} onClose={close} /> : action && <TaskAction task={task} kind={action} onClose={close} />}
  </article>
}

export function FilePreview() {
  const { state } = useWorkspace()
  const { fileId } = useParams()
  const [adding, setAdding] = useState(null)
  const file = state.files.find(item => item.id === fileId)
  const tree = directory(state)
  if (!file || !tree.visible(file.folderId)) return <Empty title="File unavailable"><RouteLink to="/">Back to All files</RouteLink> · <RouteLink to="/trash">View Trash</RouteLink></Empty>
  const trail = tree.chain(file.folderId)
  const tasks = state.tasks.filter(task => task.fileId === fileId && task.status !== 'deleted')
  return <>
    <Breadcrumbs folders={trail} tail={nameOf(file)} />
    <Heading title={nameOf(file)} description={`Owned by ${personName(state, file.ownerId)} · Updated ${humanDate(file.updatedAt)}`} />
    <div className="split preview-split">
      <section className="matte" aria-label="Document preview">
        <div className="document">
          <small>{state.account?.workspaceName || 'Box'} / {file.mimeType?.includes('pdf') ? 'PDF' : 'Document'}</small>
          <h2>{nameOf(file).replace(/\.[^.]+$/, '')}</h2>
          <p>{file.previewText || 'A text preview is unavailable for this document.'}</p>
          {Array.isArray(file.previewRows) && file.previewRows.length > 0 && <table>
            <thead><tr><th scope="col">Item</th><th scope="col">Review notes</th></tr></thead>
            <tbody>{file.previewRows.map((row, i) => <tr key={i}><td>{row?.[0]}</td><td>{row?.[1]}</td></tr>)}</tbody>
          </table>}
          <footer>{nameOf(file)} · Page 1</footer>
        </div>
      </section>
      <section className="panel panel-pad">
        <div className="section-head"><h2>Activity</h2><button onClick={() => setAdding('choose')}><Icon name="plus" />Add task</button></div>
        <div className="task-stack">{tasks.length ? [...tasks].reverse().map(task => <TaskCard key={task.id} task={task} preview />) : <Empty title="No tasks on this file" />}</div>
      </section>
    </div>
    {adding === 'choose' ? <Dialog title="Add task" onClose={() => setAdding(null)}>
      <div className="dialog-content"><button onClick={() => setAdding('general')}>General</button><button onClick={() => setAdding('approval')}>Approval</button></div>
    </Dialog> : adding && <TaskEditor file={file} type={adding} onClose={() => setAdding(null)} />}
  </>
}

export function TaskCenter() {
  const { state, actor } = useWorkspace()
  const [tab, setTab] = useState('Assigned to me')
  const [filter, setFilter] = useState('all')
  const assigned = new Set(state.taskAssignments.filter(entry => entry.assigneeId === actor && entry.status !== 'removed').map(entry => entry.taskId))
  const tasks = state.tasks.filter(task => task.status !== 'deleted' && (tab === 'Assigned to me' ? assigned.has(task.id) : task.createdById === actor) &&
    (filter === 'all' || filter === task.status || (filter === 'overdue' && overdue(task))))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return <>
    <Heading title="Task Center" description="Review assignments and follow the tasks you’ve created." />
    <section className="panel">
      <div className="toolbar">
        <div className="tabs" aria-label="Task views">{['Assigned to me', 'Created by me'].map(text => <button key={text} aria-pressed={tab === text} onClick={() => setTab(text)}>{text}</button>)}</div>
        <Field title="Status"><select value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All statuses</option>{['open', 'overdue', 'completed', 'approved', 'rejected'].map(status => <option key={status} value={status}>{label(status)}</option>)}
        </select></Field>
      </div>
      {tasks.length ? <div className="task-grid">{tasks.map(task => <TaskCard key={task.id} task={task} />)}</div> : <Empty title="No tasks match this view" />}
    </section>
  </>
}


