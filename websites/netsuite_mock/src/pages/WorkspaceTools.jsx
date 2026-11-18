import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink, useAppNavigate } from '../components/Navigation.jsx'
import { choices, DataTable, PageHeader, Section } from '../components/Controls.jsx'
import { DraftField, DraftPicker, useDraft, useRecordAction } from '../components/RecordUI.jsx'
import { codeOf, documentNo, find, formatDate, label, nameOf, records, rows, today } from '../utils/model.js'
import { homePath, recordPath } from '../utils/routes.js'
import { removeShortcut, saveNote, savePreferences, saveShortcut, saveTask } from '../utils/workspaceActions.js'

const options = { go: null }

function WorkspaceHeader({ title, children }) {
  return <PageHeader title={title} before={<AppLink to={homePath}>Home</AppLink>}>{children}</PageHeader>
}

function Preferences({ title }) {
  const { state } = useWorkspace()
  const [draft, change] = useDraft({ ...state.preferences })
  const action = useRecordAction()
  const main = { draft, change }
  return <>
    <WorkspaceHeader title={title}><button type="button" className="primary" onClick={() => action.run((latest) => savePreferences(latest, draft), { ...options, message: 'Preferences saved.' })}>Save</button>
      <AppLink className="button" to={homePath}>Cancel</AppLink></WorkspaceHeader>
    <Section title="General"><div className="fields">
      <DraftField {...main} title="Default Location" name="defaultLocationId" options="locations" />
      <DraftField {...main} title="Sales Order Default Status" name="salesOrderDefaultStatus" options={choices('Pending Approval', 'Pending Fulfillment')} />
      <DraftField {...main} title="Credit Limit Handling" name="creditLimitHandling" options={choices('Warn', 'Ignore')} />
      <DraftField {...main} title="List Rows per Page" name="listRowsPerPage" type="number" min="1" step="1" />
      <DraftField {...main} title="Purchase Order Supervisor Approval Default" name="purchaseOrderSupervisorApprovalDefault" type="checkbox" />
      <DraftField {...main} title="Allow Negative Inventory" name="allowNegativeInventory" type="checkbox" />
      <DraftField {...main} title="Show Confirmation Banners" name="showConfirmationBanners" type="checkbox" />
    </div></Section>
    {action.modal}
  </>
}

function Shortcuts({ title }) {
  const { state } = useWorkspace()
  const [draft, change, reset] = useDraft({})
  const action = useRecordAction()
  const main = { draft, change }
  function add() {
    action.run((latest) => {
      const result = saveShortcut(latest, draft)
      reset({})
      return result
    }, { ...options, message: 'Shortcut saved.' })
  }
  return <>
    <WorkspaceHeader title={title} />
    <Section title="New Shortcut"><div className="fields">
      <DraftField {...main} title="Label" name="label" required />
      <DraftField {...main} title="Record URL" name="path" placeholder="/app/…" required />
    </div><div className="panel-body"><button type="button" className="primary" onClick={add}>Add Shortcut</button></div></Section>
    <section className="panel"><DataTable records={rows(state, 'shortcuts')} columns={[
      { key: 'label', title: 'Label', render: (row) => typeof row.path === 'string' && /^\/(?![\/\\])/.test(row.path) ? <AppLink to={row.path}>{row.label}</AppLink> : row.label },
      { key: 'path', title: 'Path' },
      { key: 'remove', title: 'Action', render: (row) => <button type="button" onClick={() => action.confirm({ title: 'Remove Shortcut', message: `Remove “${row.label}”?`,
        onConfirm: () => action.run((latest) => removeShortcut(latest, row.id), { ...options, message: 'Shortcut removed.' }) })}>Remove</button> },
    ]} /></section>
    {action.modal}
  </>
}

function Notes({ title, query }) {
  const { state } = useWorkspace()
  const [draft, change, reset] = useDraft({ noteType: 'Note', direction: 'Incoming', recordCode: query.get('code') || 'custjob', recordId: query.get('record') || '' })
  const action = useRecordAction()
  const main = { draft, change }
  const recordEntries = rows(state, records[draft.recordCode]?.key).map((row) => ({ id: row.id, text: [...new Set([documentNo(row), label(row)])].join(' · ') }))
  const submit = () => action.run((latest) => {
    const result = saveNote(latest, draft)
    reset({ ...draft, title: '', memo: '' })
    return result
  }, { ...options, message: 'Note saved.' })
  return <>
    <WorkspaceHeader title={title} />
    <Section title="New Note"><div className="fields">
      <DraftField {...main} title="Record Type" name="recordCode" options={Object.entries(records).map(([id, entry]) => ({ id, text: entry.title }))}
        reflect={(code) => reset({ ...draft, recordCode: code, recordId: '' })} />
      <DraftPicker {...main} title="Record" name="recordId" entries={recordEntries} required />
      <DraftField {...main} title="Title" name="title" required />
      <DraftField {...main} title="Type" name="noteType" options={choices('Note', 'Phone Call', 'E-mail')} />
      <DraftField {...main} title="Direction" name="direction" options={choices('Incoming', 'Outgoing')} />
      <DraftField {...main} title="Memo" name="memo" type="textarea" required />
    </div><div className="panel-body"><button type="button" className="primary" onClick={submit}>Add Note</button></div></Section>
    <section className="panel"><DataTable records={[...rows(state, 'userNotes')].reverse()} columns={[
      { key: 'title', title: 'Title' },
      { key: 'record', title: 'Record', render: (row) => {
        const code = codeOf(row.recordType)
        const record = find(state, records[code]?.key, row.recordId)
        return record ? <AppLink to={recordPath(code, record)}>{documentNo(record)}</AppLink> : '—'
      } },
      { key: 'noteType', title: 'Type' }, { key: 'memo', title: 'Memo' },
      { key: 'author', title: 'Author', render: (row) => nameOf(state, 'employees', row.authorId) },
      { key: 'date', title: 'Date', render: (row) => formatDate(row.createdAt) },
    ]} /></section>
    {action.modal}
  </>
}

function Tasks({ title, query }) {
  const { state } = useWorkspace()
  const navigate = useAppNavigate()
  const record = find(state, 'tasks', query.get('id'))
  const defaults = { assignedToId: state.currentUser?.employeeId, priority: 'Medium', status: 'Not Started', startDate: today() }
  const [draft, change, reset] = useDraft(record ? { ...record } : defaults)
  const action = useRecordAction()
  const main = { draft, change }
  const submit = () => action.run((latest) => {
    const result = saveTask(latest, draft)
    reset(defaults)
    if (record) navigate('/app/workspace/tasks')
    return result
  }, { ...options, message: 'Task saved.' })
  return <>
    <WorkspaceHeader title={title} />
    <Section title={record ? 'Edit Task' : 'New Task'}><div className="fields">
      <DraftField {...main} title="Title" name="title" required />
      <DraftField {...main} title="Assigned To" name="assignedToId" options="employees" required />
      <DraftField {...main} title="Priority" name="priority" options={choices('High', 'Medium', 'Low')} />
      <DraftField {...main} title="Status" name="status" options={choices('Not Started', 'In Progress', 'Completed')} />
      <DraftField {...main} title="Start Date" name="startDate" type="date" />
      <DraftField {...main} title="Due Date" name="dueDate" type="date" />
      <DraftPicker {...main} title="Company" name="companyId" entries="customers" />
      <DraftPicker {...main} title="Transaction" name="transactionId" entries={Object.values(records).filter((entry) => !entry.directory)
        .flatMap((entry) => rows(state, entry.key).map((row) => ({ id: row.id, text: documentNo(row) })))} />
      <DraftField {...main} title="Message" name="message" type="textarea" />
    </div><div className="toolbar panel-body"><button type="button" className="primary" onClick={submit}>Save Task</button>
      {record && <AppLink className="button" to="/app/workspace/tasks">Cancel</AppLink>}</div></Section>
    <section className="panel"><DataTable records={rows(state, 'tasks')} columns={[
      { key: 'title', title: 'Title', render: (row) => <AppLink to={`/app/workspace/tasks?id=${encodeURIComponent(row.id)}`}>{row.title}</AppLink> },
      { key: 'assigned', title: 'Assigned To', render: (row) => nameOf(state, 'employees', row.assignedToId) },
      { key: 'priority', title: 'Priority' }, { key: 'status', title: 'Status' },
      { key: 'due', title: 'Due Date', render: (row) => formatDate(row.dueDate) },
    ]} /></section>
    {action.modal}
  </>
}

const sections = { preferences: Preferences, shortcuts: Shortcuts, notes: Notes, tasks: Tasks }

export default function WorkspaceTools(props) {
  const Page = sections[props.section]
  return Page ? <Page {...props} /> : null
}
