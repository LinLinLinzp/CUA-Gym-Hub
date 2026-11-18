import { useState } from 'react'
import { Plus, Users } from './icons.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Dialog, Field, Fields, Heading, Missing, Panel, Pill, Related, RouteLink, Table, Toolbar, latest, options, peopleOptions, useDestination, useForm, useList } from './components.jsx'
import { actorId, byId, date, isDate, label, newId, person, rows, stamp, today } from './data/format.js'
import { useWorkspace } from './workspace.jsx'

const types = ['full_time', 'part_time', 'contractor']
const profileFields = [
  ['name', 'Full name'], ['workEmail', 'Work email'], ['jobTitle', 'Job title'],
  ['department', 'Department'], ['location', 'Location'], ['employmentType', 'Employment type'],
  ['startDate', 'Start date'], ['managerId', 'Manager'],
]
const back = ['/employees', 'Employees']

function managerAllowed(employees, managerId, employeeId) {
  if (!managerId) return true
  if (!byId(employees, managerId)) return false
  const seen = new Set([employeeId])
  let current = managerId
  while (current) {
    if (seen.has(current)) return false
    seen.add(current)
    current = byId(employees, current)?.managerId
  }
  return true
}

function employeeAction(state, values, mode, id) {
  const employees = rows(state.employees)
  const old = byId(employees, id)
  const errors = {}
  let updates
  if (id && !old) return { errors: { form: 'This employee is no longer available.' } }
  if (mode === 'end') {
    if (old.status !== 'active') return { errors: { form: 'Only active employment can be ended.' } }
    if (!isDate(values.endDate) || (isDate(old.startDate) && values.endDate < old.startDate)) {
      return { errors: { endDate: 'Enter a valid date on or after the start date.' } }
    }
    updates = { status: 'terminated', endDate: values.endDate, endReason: values.endReason.trim() || null }
  } else {
    updates = Object.fromEntries(profileFields.map(([key]) => [key, String(values[key] ?? '').trim()]))
    for (const [key, title] of profileFields.slice(0, 5)) {
      if (!updates[key]) errors[key] = `Enter a ${title.toLowerCase()}.`
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.workEmail)) errors.workEmail = 'Enter a valid work email.'
    else if (employees.some((employee) => employee.id !== id && employee.workEmail?.trim().toLowerCase() === updates.workEmail.toLowerCase())) {
      errors.workEmail = 'This work email is already in use.'
    }
    if (!types.includes(updates.employmentType)) errors.employmentType = 'Select an employment type.'
    if (!isDate(updates.startDate) || (isDate(old?.endDate) && updates.startDate > old.endDate)) {
      errors.startDate = isDate(old?.endDate) ? 'Enter a valid date on or before the end date.' : 'Enter a valid start date.'
    }
    if (!managerAllowed(employees, updates.managerId, id)) errors.managerId = 'Choose a valid manager outside this employee’s reporting chain.'
    updates.managerId ||= null
    if (!old) Object.assign(updates, { status: 'active', endDate: null, endReason: null })
  }
  if (Object.keys(errors).length) return { errors }

  const changes = Object.fromEntries(Object.entries(updates)
    .filter(([key, value]) => !old || (old[key] ?? null) !== value)
    .map(([key, value]) => [key, { previous: old?.[key] ?? null, next: value }]))
  if (!Object.keys(changes).length) return {}

  const createdAt = new Date().toISOString()
  const actor = actorId(state)
  const employeeId = id || newId('emp')
  const record = old
    ? { ...old, ...updates, updatedAt: createdAt }
    : { id: employeeId, ...updates, actorId: actor, createdAt, updatedAt: null }
  const action = mode === 'end' ? 'terminated' : old ? 'edited' : 'created'
  return {
    id: employeeId, message: { created: 'Employee added.', edited: 'Profile updated.', terminated: 'Employment ended.' }[action],
    next: {
      ...state,
      employees: old ? employees.map((employee) => employee.id === id ? record : employee) : [...employees, record],
      employeeChanges: [...rows(state.employeeChanges), { id: newId('ech'), employeeId, action, status: record.status, changes, actorId: actor, createdAt }],
    },
  }
}

function EmployeeDialog({ mode, record, onClose, afterSave }) {
  const { state, commit } = useWorkspace()
  const form = useForm(mode === 'end' ? { endDate: today(), endReason: '' } : record || { employmentType: 'full_time' }, onClose, afterSave)
  const managers = peopleOptions(rows(state.employees).filter(({ id }) => id !== record?.id))
  const [title, submitText] = { add: ['Add employee', 'Add employee'], edit: ['Edit employee', 'Save changes'], end: ['End employment', 'Confirm end employment'] }[mode]
  return <Dialog title={title} onClose={onClose} submitText={submitText} error={form.errors.form}
    description={mode === 'end' ? `Record the last day of employment for ${record.name || record.id}.` : undefined}
    onSubmit={() => form.finish(commit((current) => employeeAction(current, form.values, mode, record?.id)))}>
    <div className="form-grid">{mode === 'end' ? <>
      <Field title="End date" type="date" required {...form.field('endDate')} />
      <div className="full"><Field title="Reason (optional)" area {...form.field('endReason')} /></div>
    </> : profileFields.map(([key, fieldTitle]) => <Field key={key} title={fieldTitle} {...form.field(key)}
      required={key !== 'managerId'} type={{ workEmail: 'email', startDate: 'date' }[key]}
      choices={{ employmentType: types, managerId: managers }[key]}
      placeholder={key === 'managerId' ? 'No manager' : undefined} />)}</div>
  </Dialog>
}

export function Employees() {
  const { state } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const destination = useDestination()
  const employees = rows(state.employees)
  const list = useList('name')
  const records = list.apply(employees, (record) => [record.name, record.workEmail, record.jobTitle, record.id])
  const columns = [
    ['name', 'Name', (record) => <RouteLink className="person-cell" to={`/employees/${record.id}`}>
      <Avatar name={record.name} /><span><strong>{record.name || record.id}</strong>{record.workEmail && <small>{record.workEmail}</small>}</span></RouteLink>, true],
    ['jobTitle', 'Job title'], ['department', 'Department'], ['location', 'Location'],
    ['employmentType', 'Employment type', (record) => label(record.employmentType)],
    ['startDate', 'Start date', (record) => date(record.startDate), true],
    ['status', 'Status', (record) => <Pill value={record.status} />],
  ]
  const add = () => setAdding(true)
  return <>
    <Heading title="Employees" description="Manage employee profiles and reporting relationships." icon={Users}
      actions={<button className="button primary" onClick={add}><Plus size={17} />Add employee</button>} />
    <Toolbar list={list} placeholder="Search employees" filters={[
      ['department', 'Departments', options(employees, 'department')],
      ['status', 'Statuses', options(employees, 'status')],
      ['employmentType', 'Employment types', options(employees, 'employmentType')],
    ]} />
    <Table columns={columns} records={records} list={list} noun="employees"
      emptyAction={<button className="button" onClick={add}>Add employee</button>} />
    {adding && <EmployeeDialog mode="add" onClose={() => setAdding(false)} afterSave={(id) => navigate(destination(`/employees/${id}`))} />}
  </>
}

export function EmployeeDetail() {
  const { state } = useWorkspace()
  const { employeeId } = useParams()
  const [mode, setMode] = useState(null)
  const employee = byId(state.employees, employeeId)
  if (!employee) return <Missing back={back} entity="Employee" />
  const devices = rows(state.devices).filter(({ assignedEmployeeId }) => assignedEmployeeId === employeeId)
  const requests = latest(state.ptoRequests).filter((record) => record.employeeId === employeeId)
  const history = latest(state.employeeChanges).filter((record) => record.employeeId === employeeId)
  const manager = byId(state.employees, employee.managerId)
  return <>
    <Heading title={employee.name || employeeId} description={employee.jobTitle} icon={Users} back={back} status={employee.status}
      actions={<>
        {employee.status === 'active' && <button className="button danger" onClick={() => setMode('end')}>End employment</button>}
        <button className="button primary" onClick={() => setMode('edit')}>Edit profile</button>
      </>} />
    <div className="detail-grid"><div className="stack">
      <Panel title="Employee profile"><Fields values={[
        ['Work email', employee.workEmail], ['Job title', employee.jobTitle], ['Department', employee.department],
        ['Location', employee.location], ['Employment type', label(employee.employmentType)], ['Start date', date(employee.startDate)],
        ['Manager', manager ? <RouteLink to={`/employees/${manager.id}`}>{manager.name || manager.id}</RouteLink> : person(state, employee.managerId)],
        ['Employee ID', employee.id], ...(employee.endDate ? [['End date', date(employee.endDate)], ['End reason', employee.endReason]] : []),
      ]} /></Panel>
      <Panel title="Profile history" count={history.length}>
        {history.length ? <ul className="history">{history.map((entry) => <li key={entry.id}>
          <span><strong>{label(entry.action)}</strong><small>{Object.keys(entry.changes || {}).map((key) => profileFields.find(([field]) => field === key)?.[1] || key.replace(/[A-Z]/g, (letter) => ' ' + letter.toLowerCase())).join(', ')}</small></span>
          <time>{stamp(entry.createdAt)}</time>
        </li>)}</ul> : <p className="subtle">No profile history yet.</p>}
      </Panel>
    </div><div className="stack">
      <Panel title="Assigned devices" count={devices.length}><Related empty="No devices assigned." items={devices.map((device) => ({
        id: device.id, to: `/devices/${device.id}`, title: device.model, sub: device.assetTag, status: device.status,
      }))} /></Panel>
      <Panel title="Time-off requests" count={requests.length}><Related empty="No time-off requests." items={requests.map((request) => ({
        id: request.id, to: `/time-off/${request.id}`, title: label(request.type), sub: date(request.startDate), status: request.status,
      }))} /></Panel>
    </div></div>
    {mode && <EmployeeDialog mode={mode} record={employee} onClose={() => setMode(null)} />}
  </>
}
