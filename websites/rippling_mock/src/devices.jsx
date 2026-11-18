import { useState } from 'react'
import { Laptop, Plus } from './icons.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import { Dialog, Field, Fields, Heading, Missing, Panel, Pill, RouteLink, Table, Toolbar, latest, options, peopleOptions, useDestination, useForm, useList } from './components.jsx'
import { activePeople, actorId, byId, label, newId, person, rows, stamp } from './data/format.js'
import { useWorkspace } from './workspace.jsx'

const back = ['/devices', 'Devices']
const categories = ['laptop', 'desktop', 'tablet']
const conditions = ['new', 'good', 'fair']
const deviceFields = [
  ['assetTag', 'Asset tag'], ['serial', 'Serial number'], ['model', 'Model'],
  ['category', 'Category', categories], ['condition', 'Condition', conditions], ['location', 'Location'],
]

function addDevice(state, values) {
  const devices = rows(state.devices)
  const clean = Object.fromEntries(deviceFields.map(([key]) => [key, String(values[key] ?? '').trim()]))
  const errors = {}
  for (const [key, title, allowed] of deviceFields) {
    if (!clean[key] || (allowed && !allowed.includes(clean[key]))) errors[key] = `${allowed ? 'Select' : 'Enter'} a ${title.toLowerCase()}.`
  }
  for (const [key, title] of deviceFields.slice(0, 2)) {
    if (!errors[key] && devices.some((record) => record[key]?.trim().toLowerCase() === clean[key].toLowerCase())) errors[key] = `This ${title.toLowerCase()} is already in use.`
  }
  if (Object.keys(errors).length) return { errors }
  const id = newId('dev')
  const record = {
    id, ...clean, status: 'available', assignedEmployeeId: null, actorId: actorId(state), createdAt: new Date().toISOString(), updatedAt: null,
  }
  return { id, message: 'Device added.', next: { ...state, devices: [...devices, record] } }
}

function moveDevice(state, id, nextEmployeeId, expectedHolder) {
  const device = byId(state.devices, id)
  if (!device || !['available', 'assigned'].includes(device.status)) return { errors: { form: 'This device is unavailable for assignment changes.' } }
  const previousEmployeeId = device.assignedEmployeeId || null
  if (previousEmployeeId !== expectedHolder) return { errors: { form: 'The assigned employee has changed. Reopen this action.' } }
  if (previousEmployeeId === nextEmployeeId) return {}
  if (nextEmployeeId && !byId(activePeople(state), nextEmployeeId)) return { errors: { employeeId: 'Select an active employee.' } }
  const action = nextEmployeeId ? previousEmployeeId ? 'reassigned' : 'assigned' : 'unassigned'
  const status = nextEmployeeId ? 'assigned' : 'available'
  const createdAt = new Date().toISOString()
  const event = { id: newId('das'), deviceId: id, previousEmployeeId, nextEmployeeId, action, status, actorId: actorId(state), createdAt }
  return {
    message: `Device ${action}.`,
    next: {
      ...state,
      devices: rows(state.devices).map((record) => record.id === id ? { ...record, assignedEmployeeId: nextEmployeeId, status, updatedAt: createdAt } : record),
      deviceAssignments: [...rows(state.deviceAssignments), event],
    },
  }
}

function AddDevice({ onClose, afterSave }) {
  const { commit } = useWorkspace()
  const form = useForm({}, onClose, afterSave)
  return <Dialog title="Add device" onClose={onClose} submitText="Add device" error={form.errors.form}
    onSubmit={() => form.finish(commit((state) => addDevice(state, form.values)))}>
    <div className="form-grid">{deviceFields.map(([key, title, choices]) => <Field key={key} title={title} choices={choices} required {...form.field(key)} />)}</div>
  </Dialog>
}

function DeviceMove({ device, mode, onClose }) {
  const { state, commit } = useWorkspace()
  const form = useForm({ employeeId: device.assignedEmployeeId || '' }, onClose)
  const [confirm, setConfirm] = useState(mode === 'unassign')
  const [validation, setValidation] = useState('')
  const current = device.assignedEmployeeId || null
  const chosen = mode === 'unassign' ? null : form.values.employeeId
  const active = activePeople(state)
  const title = mode === 'unassign' ? 'Unassign device' : current ? 'Reassign device' : 'Assign device'
  function submit() {
    if (mode !== 'unassign' && !chosen) { setValidation('Select an active employee.'); return }
    if (chosen === current) { onClose(); return }
    if (current && chosen && !confirm) { setConfirm(true); return }
    form.finish(commit((snapshot) => moveDevice(snapshot, device.id, chosen, current)))
  }
  return <Dialog title={title} onClose={onClose} error={form.errors.form || (confirm ? form.errors.employeeId : undefined)}
    submitText={confirm ? mode === 'unassign' ? 'Confirm unassignment' : 'Confirm reassignment' : current ? 'Continue' : 'Assign device'} onSubmit={submit}>
    {confirm ? <p>{chosen
      ? `Transfer ${device.assetTag || device.id} from ${person(state, current)} to ${person(state, chosen)}?`
      : `Return ${device.assetTag || device.id} from ${person(state, current)} to available inventory?`}</p>
      : <Field title="Employee" {...form.field('employeeId')} choices={peopleOptions(active)}
        error={validation || form.errors.employeeId} required
        change={(key, value) => { setValidation(''); form.change(key, value) }} />}
  </Dialog>
}

export function Devices() {
  const { state } = useWorkspace()
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const destination = useDestination()
  const devices = rows(state.devices)
  const list = useList('assetTag')
  const records = list.apply(devices, (record) => [record.assetTag, record.serial, record.model, person(state, record.assignedEmployeeId), record.assignedEmployeeId])
  const columns = [
    ['assetTag', 'Asset tag', (record) => <RouteLink className="person-cell" to={`/devices/${record.id}`}>
      <span className="item-icon"><Laptop size={17} /></span><span><strong>{record.assetTag || record.id}</strong>{record.serial && <small>{record.serial}</small>}</span>
    </RouteLink>, true],
    ['model', 'Model'], ['category', 'Category', (record) => label(record.category)],
    ['location', 'Location'], ['assignedEmployeeId', 'Assigned to', (record) => person(state, record.assignedEmployeeId)],
    ['status', 'Status', (record) => <Pill value={record.status} />],
  ]
  const add = () => setAdding(true)
  return <>
    <Heading title="Devices" description="Track inventory, device locations, and employee assignments." icon={Laptop}
      actions={<button className="button primary" onClick={add}><Plus size={17} />Add device</button>} />
    <Toolbar list={list} placeholder="Search devices" filters={[
      ['category', 'Categories', options(devices, 'category')], ['status', 'Statuses', options(devices, 'status')],
      ['location', 'Locations', options(devices, 'location')],
    ]} />
    <Table columns={columns} records={records} list={list} noun="devices" emptyAction={<button className="button" onClick={add}>Add device</button>} />
    {adding && <AddDevice onClose={() => setAdding(false)} afterSave={(id) => navigate(destination(`/devices/${id}`))} />}
  </>
}

export function DeviceDetail() {
  const { state } = useWorkspace()
  const { deviceId } = useParams()
  const [mode, setMode] = useState(null)
  const device = byId(state.devices, deviceId)
  if (!device) return <Missing back={back} entity="Device" />
  const holder = device.assignedEmployeeId
  const employee = byId(state.employees, holder)
  const history = latest(state.deviceAssignments).filter((record) => record.deviceId === deviceId)
  const canMove = ['available', 'assigned'].includes(device.status)
  const canAssign = activePeople(state).length > 0 && canMove
  const reason = !canMove ? device.status === 'retired' ? 'Retired devices cannot be assigned.' : 'An available or assigned device is required.' : !canAssign ? 'Add an active employee to assign this device.' : ''
  return <>
    <Heading title={device.assetTag || deviceId} description={device.model} icon={Laptop} back={back} status={device.status}
      actions={<>
        {holder && canMove && <button className="button" onClick={() => setMode('unassign')}>Unassign</button>}
        <button className="button primary" disabled={!canAssign} aria-describedby={reason ? 'device-reason' : undefined} onClick={() => setMode('assign')}>{holder ? 'Reassign device' : 'Assign device'}</button>
      </>} />
    {reason && <p className="inline-note" id="device-reason">{reason}</p>}
    <div className="detail-grid">
      <Panel title="Device information"><Fields values={[
        ['Asset tag', device.assetTag], ['Serial number', device.serial], ['Model', device.model],
        ['Category', label(device.category)], ['Condition', label(device.condition)], ['Location', device.location],
        ['Current holder', employee ? <RouteLink to={`/employees/${holder}`}>{employee.name || holder}</RouteLink> : holder || 'Unassigned'],
        ['Last updated', stamp(device.updatedAt)],
      ]} /></Panel>
      <Panel title="Assignment history" count={history.length}>
        {history.length ? <ul className="history">{history.map((event) => <li key={event.id}>
          <span><strong>{label(event.action)}</strong><small>{event.previousEmployeeId && `${person(state, event.previousEmployeeId)} → `}{event.nextEmployeeId ? person(state, event.nextEmployeeId) : 'Available inventory'}</small></span>
          <time>{stamp(event.createdAt)}</time>
        </li>)}</ul> : <p className="subtle">No assignment changes yet.</p>}
      </Panel>
    </div>
    {mode && <DeviceMove device={device} mode={mode} onClose={() => setMode(null)} />}
  </>
}
