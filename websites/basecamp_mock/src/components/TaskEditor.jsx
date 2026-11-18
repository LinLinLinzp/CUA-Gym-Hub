import { useState } from 'react'
import { PeoplePicker } from './people.jsx'
import { FieldError } from './ui.jsx'
import { useProject, useStore } from '../store.jsx'
import { membersOf } from '../utils/records.js'
import { validDate } from '../utils/dates.js'

export function TaskEditor({ list, task, onClose }) {
  const project = useProject()
  const { state, add, update } = useStore()
  const people = membersOf(state, project)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [assignees, setAssignees] = useState()
  const [recipients, setRecipients] = useState()
  const [startsOn, setStartsOn] = useState(task?.startsOn ?? '')
  const [dueOn, setDueOn] = useState(task?.dueOn ?? '')
  const [range, setRange] = useState(Boolean(task?.startsOn))
  const [errors, setErrors] = useState({})

  function submit(event) {
    event.preventDefault()
    const next = {}
    if (!title.trim()) next.title = 'Enter a to-do title.'
    if (range && !validDate(startsOn)) next.start = 'Choose a start date.'
    if ((range || dueOn) && !validDate(dueOn)) next.due = 'Choose a due date.'
    else if (range && startsOn > dueOn) next.due = 'The due date must be on or after the start.'
    setErrors(next)
    if (Object.keys(next).length) return
    const fields = {
      title: title.trim(), notes: notes.trim(),
      ...(!task || assignees !== undefined ? { assigneeIds: assignees ?? [] } : {}),
      ...(!task || recipients !== undefined ? { completionNotifyIds: recipients ?? [] } : {}),
      startsOn: range ? startsOn : null, dueOn: dueOn || null,
    }
    if (task) update('todos', task.id, fields)
    else add('todos', 'todo', {
      ...fields, projectId: String(project.id), listId: String(list.id),
      completed: false, completedById: null, completedAt: null, status: 'active',
    })
    onClose()
  }

  return <form className="form inline-form task-form" noValidate onSubmit={submit}>
    <h2>{task ? 'Edit to-do' : 'Add a to-do'}</h2>
    <label><span>To-do title</span><input autoFocus value={title} required aria-invalid={Boolean(errors.title)}
      onChange={(event) => setTitle(event.target.value)} /><FieldError>{errors.title}</FieldError></label>
    <PeoplePicker label="Assigned to" people={people} selected={assignees ?? task?.assigneeIds} onChange={setAssignees} />
    <PeoplePicker label="When done, notify" people={people} selected={recipients ?? task?.completionNotifyIds} onChange={setRecipients} />
    <fieldset>
      <legend>Due on</legend>
      <label className="check-label"><input type="checkbox" checked={range} onChange={(event) => setRange(event.target.checked)} />Use a date range</label>
      <div className="field-grid">
        {range && <label><span>Start date</span><input type="date" value={startsOn} aria-invalid={Boolean(errors.start)}
          onChange={(event) => setStartsOn(event.target.value)} /><FieldError>{errors.start}</FieldError></label>}
        <label><span>{range ? 'End date' : 'Due date'}</span><input type="date" value={dueOn} aria-invalid={Boolean(errors.due)}
          onChange={(event) => setDueOn(event.target.value)} /><FieldError>{errors.due}</FieldError></label>
      </div>
    </fieldset>
    <label><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    <div className="actions">
      <button className="button primary">{task ? 'Save changes' : 'Add this to-do'}</button>
      <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
    </div>
  </form>
}
