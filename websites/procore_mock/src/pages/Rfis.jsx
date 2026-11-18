import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { byId, dateLabel, forProject, items, makeId, members, nameOf, newNumber, replaceRecord } from '../domain'
import { recordPath, RouteLink, useRouteNavigate } from '../navigation'
import { useWorkspace } from '../state'
import { Back, Button, Details, Dialog, Field, History, MissingRecord, PageHeader, RecordList, Status, useFields } from '../ui'

const statuses = ['Draft', 'Open', 'Closed']

function assigneeNames(state, record) {
  return items(record.assigneeIds).map((id) => nameOf(state.people, id)).join(', ') || 'Unassigned'
}

export function Rfis() {
  const { id } = useParams()
  const { project, path } = useOutletContext()
  const { state } = useWorkspace()
  const base = path + '/rfis'
  const record = byId(state.rfis, id)
  if (id && record?.projectId !== project.id) return <MissingRecord to={base} tool="RFIs" />
  return record ? <RfiDetail key={record.id} {...{ project, base, record }} /> : <RfiList key={project.id} {...{ project, base }} />
}

function RfiList({ project, base }) {
  const { state } = useWorkspace()
  const [create, setCreate] = useState(false)
  const columns = [
    { key: 'number', label: 'Number', value: (r) => r.number, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.number || 'View RFI'}</RouteLink> },
    { key: 'subject', label: 'Subject', value: (r) => r.subject, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.subject || 'Untitled RFI'}</RouteLink> },
    { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
    { key: 'assignees', label: 'Assignees', render: (r) => assigneeNames(state, r) },
    { key: 'dueDate', label: 'Due Date', value: (r) => r.dueDate, render: (r) => dateLabel(r.dueDate) },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
  ]
  const filters = [
    { key: 'status', label: 'Status', options: statuses, match: (r, value) => r.status === value },
    { key: 'assignee', label: 'Assignee', options: members(state, project), match: (r, value) => items(r.assigneeIds).includes(value) },
  ]

  return <>
    <RecordList title="RFIs" singular="RFI" records={forProject(state.rfis, project.id)} columns={columns} filters={filters}
      searchLabel="Search RFIs" searchText={(r) => [r.number, r.subject, r.question].join(' ')} onCreate={() => setCreate(true)} />
    {create && <RfiEditor project={project} base={base} onClose={() => setCreate(false)} />}
  </>
}

function RfiEditor({ project, base, record, onClose }) {
  const { state, commit } = useWorkspace()
  const navigate = useRouteNavigate()
  const { values, bind } = useFields(record || {})
  const people = members(state, project)
  const [assigneeIds, setAssignees] = useState(items(record?.assigneeIds))
  const editing = Boolean(record)
  const assigned = people.some((person) => assigneeIds.includes(person.id))

  function save() {
    if (record?.status === 'Open' && !assigned) return 'Select at least one project assignee.'
    const id = record?.id || makeId()
    const saved = commit({ projectId: project.id, entityType: 'rfi', action: editing ? 'edit' : 'create', message: editing ? 'RFI saved.' : 'Draft RFI created.' },
      (previous, { created, updated }) => {
        const current = byId(previous.rfis, id)
        if (editing && !['Draft', 'Open'].includes(current?.status)) return
        const data = {
          subject: values.subject.trim(), question: values.question.trim(), location: (values.location || '').trim(),
          assigneeIds, dueDate: values.dueDate || null,
        }
        const next = editing ? { ...current, ...data, ...updated } : {
          id, projectId: project.id, number: newNumber(forProject(previous.rfis, project.id), 'RFI'), status: 'Draft',
          officialResponseId: null, ...data, ...created,
        }
        const rfis = editing ? replaceRecord(previous.rfis, next) : [...items(previous.rfis), next]
        return { entityId: id, patch: { rfis } }
      })
    if (!saved) return 'This RFI is no longer editable.'
    if (!editing) navigate(recordPath(base, id))
  }

  return <Dialog title={editing ? 'Edit RFI' : 'Create RFI'} onClose={onClose} onSave={save} submitLabel={editing ? 'Save Changes' : 'Save Draft'}>
    <Field label="Subject" required {...bind('subject')} />
    <Field label="Question" required area {...bind('question')} />
    <Field label="Location" {...bind('location')} />
    <fieldset className="checkbox-group"><legend>Assignees</legend>
      {people.length ? people.map((person, index) => <label key={person.id}>
        <input type="checkbox" checked={assigneeIds.includes(person.id)} ref={index === 0 ? (control) =>
          control?.setCustomValidity(record?.status === 'Open' && !assigned ? 'Select at least one project assignee.' : '') : undefined} onChange={(event) => {
          const checked = event.target.checked
          setAssignees((selected) => checked ? [...selected, person.id] : selected.filter((value) => value !== person.id))
        }} />{person.name || person.id}
      </label>) : <p className="muted">No project members available.</p>}
    </fieldset>
    <Field label="Due Date" type="date" required={record?.status === 'Open'} {...bind('dueDate')} />
    {record?.status === 'Open' && !assigned && <p className="muted">An open RFI requires a project assignee.</p>}
  </Dialog>
}

function RfiDetail({ project, base, record }) {
  const { state, commit } = useWorkspace()
  const [modal, setModal] = useState(null)
  const [text, setText] = useState('')
  const replies = items(state.rfiResponses).filter((reply) => reply.rfiId === record.id)
  const official = byId(replies, record.officialResponseId)
  const close = () => setModal(null)
  const { id, status } = record
  const allowed = members(state, project)
  const canOpen = Boolean(record.dueDate && allowed.some((person) => items(record.assigneeIds).includes(person.id)))

  function update(action, message, transform) {
    return commit({ projectId: project.id, entityType: 'rfi', action, message }, (previous, audit) => {
      const current = byId(previous.rfis, id)
      if (!current || current.status !== status) return
      const { fields, patch, ...links } = transform(current, previous, audit)
      const next = { ...current, ...fields, ...audit.updated }
      return { ...links, entityId: id, patch: { ...patch, rfis: replaceRecord(previous.rfis, next) } }
    })
  }

  const transitions = {
    open: ['Open', 'Open RFI', 'The RFI will be available for replies.'],
    close: ['Closed', 'Close RFI', 'Replies and the official response will stay visible.'],
    reopen: ['Open', 'Reopen RFI', 'The RFI will accept replies again.'],
  }
  const transition = transitions[modal]

  return <>
    <Back to={base}>RFIs</Back>
    <PageHeader title={record.subject || 'Untitled RFI'} kicker={record.number || 'RFI'} status={status || 'Unspecified'} actions={<>
      {['Draft', 'Open'].includes(status) && <Button onClick={() => setModal('edit')}>Edit</Button>}
      {status === 'Draft' && <Button primary onClick={() => setModal('open')}>Open RFI</Button>}
      {status === 'Open' && <><Button onClick={() => setModal('close')}>Close RFI</Button><Button primary onClick={() => { setText(''); setModal('reply') }}>Add Reply</Button></>}
      {status === 'Closed' && <Button primary onClick={() => setModal('reopen')}>Reopen RFI</Button>}
    </>} />
    <div className="detail-grid">
      <div className="stack">
        <section className="panel detail-panel"><h2>Question</h2><p className="prose">{record.question || 'No question provided.'}</p></section>
        {official && <section className="panel detail-panel"><h2>Official response</h2><p className="prose">{official.text}</p><p className="muted">{nameOf(state.people, official.createdById)} · {dateLabel(official.createdAt)}</p></section>}
        <section className="panel detail-panel"><h2>Replies ({replies.length})</h2>
          {replies.length ? <ul className="record-items">{replies.map((reply) => <li key={reply.id}>
            <div className="item-header"><strong>{nameOf(state.people, reply.createdById, 'Workspace user')}</strong>
              <span className="muted">{dateLabel(reply.createdAt)}</span>
            </div>
            <p className="prose">{reply.text || '—'}</p>
            <div className="reply-action">{reply.id === official?.id ? <Status value="Official response" />
              : status === 'Open' && <Button onClick={() => update('set_official_response', 'Official response updated.', () =>
                ({ fields: { officialResponseId: reply.id }, relatedId: reply.id }))}>Set as Official Response</Button>}</div>
          </li>)}</ul> : <p className="quiet">No replies yet.</p>}
        </section>
        <History type="rfi" record={record} />
      </div>
      <Details rows={[
        ['Number', record.number], ['Assignees', assigneeNames(state, record)], ['Due Date', dateLabel(record.dueDate)],
        ['Location', record.location || '—'], ['Created by', nameOf(state.people, record.createdById)],
      ]} />
    </div>
    {modal === 'edit' && <RfiEditor {...{ project, base, record }} onClose={close} />}
    {modal === 'reply' && <Dialog title="Add Reply" onClose={close} submitLabel="Post Reply" onSave={() => {
      const replyId = makeId()
      return update('reply', 'Reply posted.', (current, previous, { created }) => ({
        relatedId: replyId, patch: { rfiResponses: [...items(previous.rfiResponses), { id: replyId, rfiId: id, text: text.trim(), ...created }] },
      })) ? undefined : 'This RFI changed. Open the action again.'
    }}><Field label="Reply" required area value={text} onChange={(event) => setText(event.target.value)} /></Dialog>}
    {transition && <Dialog title={transition[1]} confirm onClose={close} submitLabel={transition[1]} onSave={() => {
      if (transition[0] === 'Open' && !canOpen) {
        return modal === 'open' ? 'Edit the RFI to add a project assignee and due date before opening it.'
          : 'Reopening requires a project assignee and due date.'
      }
      return update(modal, transition[1] + ' saved.', () => ({
        fields: { status: transition[0] }, previousStatus: status, newStatus: transition[0],
      })) ? undefined : 'This RFI changed. Open the action again.'
    }}><p>{transition[2]}</p></Dialog>}
  </>
}
