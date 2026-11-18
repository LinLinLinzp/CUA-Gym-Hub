import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { byId, companies, dateLabel, forProject, items, makeId, members, nameOf, newNumber, replaceRecord } from '../domain'
import { recordPath, RouteLink, useRouteNavigate } from '../navigation'
import { useWorkspace } from '../state'
import { Back, Button, Details, Dialog, Field, History, MissingRecord, PageHeader, RecordList, Status, useFields } from '../ui'
import { withSid } from '../utils/dataManager'

const decisions = ['Approved', 'Approved as Noted', 'Revise and Resubmit', 'Rejected']
const statuses = ['Draft', 'In Review', ...decisions]
const types = ['Product Data', 'Shop Drawing', 'Sample', 'Certificate', 'Mockup', 'Other']

export function Submittals() {
  const { id } = useParams()
  const { project, path } = useOutletContext()
  const { state } = useWorkspace()
  const base = path + '/submittals'
  const record = byId(state.submittals, id)
  if (id && record?.projectId !== project.id) return <MissingRecord to={base} tool="Submittals" />
  return record ? <SubmittalDetail key={record.id} {...{ project, base, record }} /> : <SubmittalList key={project.id} {...{ project, base }} />
}

function SubmittalList({ project, base }) {
  const { state } = useWorkspace()
  const [create, setCreate] = useState(false)
  const columns = [
    { key: 'number', label: 'Number', value: (r) => r.number, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.number || 'View submittal'}</RouteLink> },
    { key: 'title', label: 'Title', value: (r) => r.title, render: (r) => <RouteLink to={recordPath(base, r.id)}>{r.title || 'Untitled submittal'}</RouteLink> },
    { key: 'spec', label: 'Spec Section', render: (r) => r.specSection || '—' },
    { key: 'revision', label: 'Revision', render: (r) => r.revision ?? 0 },
    { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
    { key: 'court', label: 'Ball in Court', render: (r) => nameOf(state.people, r.ballInCourtId) },
    { key: 'dueDate', label: 'Due Date', value: (r) => r.dueDate, render: (r) => dateLabel(r.dueDate) },
  ]
  const filters = [
    { key: 'status', label: 'Status', options: statuses, match: (r, value) => r.status === value },
    { key: 'reviewer', label: 'Reviewer', options: members(state, project), match: (r, value) => r.reviewerId === value },
  ]
  return <>
    <RecordList title="Submittals" singular="Submittal" records={forProject(state.submittals, project.id)} columns={columns} filters={filters}
      searchLabel="Search submittals" searchText={(r) => [r.number, r.title, r.specSection].join(' ')} onCreate={() => setCreate(true)} />
    {create && <SubmittalEditor {...{ project, base }} onClose={() => setCreate(false)} />}
  </>
}

function SubmittalEditor({ project, base, record, onClose }) {
  const { state, commit } = useWorkspace()
  const navigate = useRouteNavigate()
  const { values, bind } = useFields(record || { type: 'Product Data' })
  const [file, setFile] = useState(null)
  const editing = Boolean(record)
  const typeOptions = record?.type && !types.includes(record.type) ? [...types, record.type] : types

  async function save() {
    const id = record?.id || makeId()
    let uploaded = []
    if (file) {
      const data = new FormData()
      data.append('file', file)
      try {
        const response = await fetch(withSid('/upload'), { method: 'POST', body: data })
        if (!response.ok) throw new Error('Upload failed')
        uploaded = items((await response.json()).files)
        if (!uploaded.length) throw new Error('No file returned')
      } catch {
        return 'The attachment could not be uploaded. Try saving again.'
      }
    }
    const saved = commit({ projectId: project.id, entityType: 'submittal', action: editing ? 'edit' : 'create',
      message: editing ? 'Submittal saved.' : 'Draft submittal created.' }, (previous, { created, updated }) => {
      const current = byId(previous.submittals, id)
      if (editing && !['Draft', 'Revise and Resubmit'].includes(current?.status)) return
      const fields = {
        title: values.title.trim(), type: values.type, specSection: (values.specSection || '').trim(),
        description: (values.description || '').trim(), responsibleCompanyId: values.responsibleCompanyId || null,
        reviewerId: values.reviewerId || null, dueDate: values.dueDate || null,
        attachments: [...items(current?.attachments), ...uploaded],
      }
      const next = editing ? { ...current, ...fields, ...updated } : {
        id, projectId: project.id, number: newNumber(forProject(previous.submittals, project.id), 'SUB'),
        status: 'Draft', revision: 0, ballInCourtId: null, ...fields, ...created,
      }
      const submittals = editing ? replaceRecord(previous.submittals, next) : [...items(previous.submittals), next]
      return { entityId: id, patch: { submittals } }
    })
    if (!saved) return 'This submittal is no longer editable.'
    if (!editing) navigate(recordPath(base, id))
  }

  return <Dialog title={editing ? 'Edit Submittal' : 'Create Submittal'} onClose={onClose} onSave={save} submitLabel={editing ? 'Save Changes' : 'Save Draft'}>
    <Field required label="Title" {...bind('title')} />
    <div className="field-grid">
      <Field required label="Type" options={typeOptions} {...bind('type')} />
      <Field label="Spec Section" {...bind('specSection')} />
    </div>
    <Field label="Description" area {...bind('description')} />
    <Field label="Responsible Company" options={companies(state, project)} {...bind('responsibleCompanyId')} />
    <Field label="Reviewer" options={members(state, project)} {...bind('reviewerId')} />
    <Field label="Due Date" type="date" {...bind('dueDate')} />
    <Field label="Attachment" type="file" onChange={(event) => setFile(event.target.files[0] || null)} />
  </Dialog>
}

function SubmittalDetail({ project, base, record }) {
  const { state, commit } = useWorkspace()
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const { id, status } = record
  const editingAllowed = ['Draft', 'Revise and Resubmit'].includes(status)
  const reviews = items(state.submittalReviews).filter((review) => review.submittalId === id)
    .sort((a, b) => (a.revision ?? 0) - (b.revision ?? 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  const attachments = items(record.attachments)
  const resubmit = modal === 'resubmit'
  const submitLabel = resubmit ? 'Resubmit for Review' : 'Submit for Review'

  function transition(action, newStatus, message, changes) {
    const saved = commit({ projectId: project.id, entityType: 'submittal', action, message }, (previous, audit) => {
      const current = byId(previous.submittals, id)
      if (!current || current.status !== status) return
      const { fields, patch, ...links } = changes(current, previous, audit)
      const next = { ...current, ...fields, status: newStatus, ...audit.updated }
      return {
        ...links, entityId: id, previousStatus: status, newStatus,
        patch: { ...patch, submittals: replaceRecord(previous.submittals, next) },
      }
    })
    return saved ? undefined : 'This submittal changed. Open the action again.'
  }

  function submit() {
    if (!record.dueDate || !byId(members(state, project), record.reviewerId)) return 'Edit the submittal to add a project reviewer and due date.'
    return transition(modal, 'In Review', resubmit ? 'Submittal resubmitted.' : 'Submittal sent for review.', (current) => ({
      fields: {
        ballInCourtId: current.reviewerId,
        ...(resubmit ? { revision: Number(current.revision ?? 0) + 1 } : {}),
      },
    }))
  }

  function review({ decision, comments }) {
    const reviewId = makeId()
    return transition('review', decision, 'Review recorded.', (current, previous, { created }) => ({
      fields: { ballInCourtId: null },
      relatedId: reviewId,
      patch: { submittalReviews: [...items(previous.submittalReviews), {
        id: reviewId, submittalId: id, revision: current.revision ?? 0, decision, comments: comments.trim(), ...created,
      }] },
    }))
  }

  return <>
    <Back to={base}>Submittals</Back>
    <PageHeader title={record.title || 'Untitled submittal'} kicker={record.number || 'Submittal'} status={status || 'Unspecified'} actions={<>
      {editingAllowed && <Button onClick={() => setModal('edit')}>Edit</Button>}
      {status === 'Draft' && <Button primary onClick={() => setModal('submit')}>Submit for Review</Button>}
      {status === 'Revise and Resubmit' && <Button primary onClick={() => setModal('resubmit')}>Resubmit for Review</Button>}
      {status === 'In Review' && <Button primary onClick={() => setModal('review')}>Record Review</Button>}
    </>} />
    <div className="detail-grid">
      <div className="stack">
        <section className="panel detail-panel"><h2>Description</h2><p className="prose">{record.description || 'No description provided.'}</p></section>
        <section className="panel detail-panel"><h2>Attachments</h2>
          {attachments.length ? <ul className="record-items">{attachments.map((file, index) => <li key={file.stored_name || index}>
            {typeof file.url === 'string' && file.url.startsWith('/files/') && !file.url.includes('\\')
              ? <a href={withSid(file.url)} download>{file.original_name || file.stored_name || 'Download attachment'}</a>
              : <span>{file.original_name || 'Attachment unavailable'}</span>}
          </li>)}</ul> : <p className="quiet">No attachments.</p>}
        </section>
        <section className="panel detail-panel"><h2>Review history</h2>
          {reviews.length ? <ul className="record-items">{reviews.map((review) => <li key={review.id}>
            <div className="item-header"><strong>Revision {review.revision ?? 0}</strong><Status value={review.decision} /></div>
            <p className="muted">{nameOf(state.people, review.createdById, 'Workspace user')} · {dateLabel(review.createdAt)}</p>
            {review.comments && <p className="prose">{review.comments}</p>}
          </li>)}</ul> : <p className="quiet">No review decisions recorded.</p>}
        </section>
        <History type="submittal" record={record} />
      </div>
      <Details rows={[
        ['Number', record.number], ['Type', record.type], ['Spec Section', record.specSection || '—'], ['Revision', record.revision ?? 0],
        ['Responsible Company', nameOf(state.companies, record.responsibleCompanyId)], ['Reviewer', nameOf(state.people, record.reviewerId)],
        ['Ball in Court', nameOf(state.people, record.ballInCourtId)], ['Due Date', dateLabel(record.dueDate)],
      ]} />
    </div>
    {modal === 'edit' && <SubmittalEditor {...{ project, base, record }} onClose={close} />}
    {['submit', 'resubmit'].includes(modal) && <Dialog confirm title={submitLabel} onClose={close} onSave={submit} submitLabel={submitLabel}>
      <p>Send {resubmit ? 'revision ' + (Number(record.revision ?? 0) + 1) : 'this submittal'} to {nameOf(state.people, record.reviewerId, 'the reviewer')}.</p>
    </Dialog>}
    {modal === 'review' && <ReviewEditor onClose={close} onSave={review} />}
  </>
}

function ReviewEditor({ onClose, onSave }) {
  const { values, bind } = useFields({ decision: '', comments: '' })
  return <Dialog title="Record Review" onClose={onClose} onSave={() => onSave(values)} submitLabel="Save Review">
    <Field required label="Decision" options={decisions} {...bind('decision')} />
    <Field label="Comments" area required={Boolean(values.decision && values.decision !== 'Approved')} {...bind('comments')} />
  </Dialog>
}
