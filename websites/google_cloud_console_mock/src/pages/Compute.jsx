import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Confirm, Details, Dialog, Field, Filter, Heading, Missing, Pill, RowActions, Search, Select, Table } from '../components.jsx'
import { images, machines, vmStatuses, zones } from '../data/catalog.js'
import { active, byId, contains, dateLabel, distinct, recordPath, RouteLink, rows, uid, useGo, useWorkspace } from '../workspace.jsx'

const base = '/compute/instances'
const namePattern = /^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const statusLabel = status => vmStatuses[status] || status || 'Unknown'
const vmActions = {
  start: { label: 'Start', done: 'started', status: 'RUNNING' },
  stop: { label: 'Stop', done: 'stopped', status: 'TERMINATED', effect: 'The instance will stop running. Its boot disk will be retained.' },
  reset: { label: 'Reset', done: 'reset', status: 'RUNNING', effect: 'The instance will restart immediately. Unsaved work may be lost.' },
  delete: { label: 'Delete', done: 'deleted', status: 'DELETED', effect: 'The instance will be removed from the active fleet.' },
}
const permitted = record => record.status === 'RUNNING' ? ['stop', 'reset', 'delete']
  : record.status === 'TERMINATED' ? ['start', 'delete'] : []

function VmStatus({ status }) {
  return <Pill tone={status === 'RUNNING' ? 'success' : status === 'DELETED' ? 'danger-pill' : ''}><span className="dot" />{statusLabel(status)}</Pill>
}

function availableAddress(instances, field, prefixes) {
  const used = new Set(instances.map(r => r[field]))
  for (const prefix of prefixes) {
    for (let suffix = 1; suffix < 255; suffix++) {
      const ip = prefix + '.' + suffix
      if (!used.has(ip)) return ip
    }
  }
  return null
}
const internalRanges = Array.from({ length: 256 }, (_, i) => '10.24.' + i)
const externalRanges = ['192.0.2', '198.51.100', '203.0.113']

function CreateInstance({ project, onClose }) {
  const { transact } = useWorkspace()
  const go = useGo()
  const [form, setForm] = useState({ name: '', region: 'us-central1', zone: 'us-central1-a', machineType: 'e2-standard-2', bootImage: 'debian-12', bootDiskGb: '30', external: true })
  const [errors, setErrors] = useState({})
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  function save() {
    const name = form.name.trim()
    const bootDiskGb = Number(form.bootDiskGb)
    const errors = {}
    if (!namePattern.test(name)) errors.name = 'Use 1–63 lowercase letters, digits or hyphens. Start with a letter and end with a letter or digit.'
    if (!Number.isSafeInteger(bootDiskGb) || bootDiskGb <= 0) errors.disk = 'Enter a positive whole number in GB.'
    setErrors(errors)
    if (Object.keys(errors).length) return
    const id = uid('vm')
    const changed = transact((state, { creation, event }) => {
      const records = rows(state.vmInstances)
      const instances = records.filter(active)
      if (instances.some(r => r.name === name && r.projectId === project.id && r.zone === form.zone)) {
        setErrors({ name: 'That name is already in use in this zone.' })
        return
      }
      const internalIp = availableAddress(instances, 'internalIp', internalRanges)
      const externalIp = form.external ? availableAddress(instances, 'externalIp', externalRanges) : null
      if (!internalIp || (form.external && !externalIp)) {
        setErrors({ address: 'No addresses are available for the requested configuration.' })
        return
      }
      const record = { id, projectId: project.id, name, region: form.region, zone: form.zone,
        machineType: form.machineType, bootImage: form.bootImage, bootDiskGb, internalIp, externalIp, status: 'RUNNING', ...creation }
      event('vm.create', id, { projectId: project.id }, { name, zone: record.zone, status: record.status })
      return { ...state, vmInstances: [...records, record] }
    }, 'Instance created.')
    if (changed) { onClose(); go(recordPath(base, { id }), { project: project.id }) }
  }
  return <Dialog title="Create instance" mode="panel wide" onClose={onClose} submit={save} submitLabel="Create instance">
    <p className="muted">Project · {project.record.name || project.id}</p>
    <Field label="Instance name" value={form.name} onChange={e => change('name', e.target.value)} error={errors.name} />
    <div className="form-grid">
      <Field label="Region"><Select options={Object.keys(zones)} value={form.region} onChange={e => {
        const region = e.target.value
        setForm({ ...form, region, zone: zones[region][0] })
      }} /></Field>
      <Field label="Zone"><Select options={zones[form.region]} value={form.zone} onChange={e => change('zone', e.target.value)} /></Field>
    </div>
    <Field label="Machine type"><Select options={machines} value={form.machineType} onChange={e => change('machineType', e.target.value)} /></Field>
    <Field label="Boot image"><Select options={images} value={form.bootImage} onChange={e => change('bootImage', e.target.value)} /></Field>
    <Field label="Boot disk size (GB)" type="number" min="1" step="1" value={form.bootDiskGb} error={errors.disk} onChange={e => change('bootDiskGb', e.target.value)} />
    <label className="check-option"><input type="checkbox" checked={form.external} onChange={e => change('external', e.target.checked)} />Assign an external IP address</label>
    {errors.address && <p role="alert" className="error">{errors.address}</p>}
  </Dialog>
}

function useLifecycle() {
  const { transact } = useWorkspace()
  const [pending, setPending] = useState(null)
  const close = () => setPending(null)
  function apply(record, action) {
    const { status, done } = vmActions[action]
    transact((state, { update, event }) => {
      const instances = rows(state.vmInstances)
      const current = instances.find(r => r.id === record.id)
      if (!current || !permitted(current).includes(action)) return
      const reset = action === 'reset' ? { lastResetAt: update.updatedAt } : {}
      event('vm.' + action, current.id, { projectId: current.projectId }, { name: current.name, status, ...reset })
      return { ...state, vmInstances: instances.map(r => r.id === current.id ? { ...r, status, ...update, ...reset } : r) }
    }, 'Instance ' + done + '.')
    close()
  }
  return {
    request: (record, action) => action === 'start' ? apply(record, action) : setPending({ record, action }),
    confirmation: pending && <Confirm title={vmActions[pending.action].label + ' instance'} onClose={close} submitLabel={vmActions[pending.action].label + ' instance'}
      submit={() => apply(pending.record, pending.action)} danger={pending.action === 'delete'}>
      <p><strong>{pending.record.name || pending.record.id}</strong></p><p>{vmActions[pending.action].effect}</p>
    </Confirm>,
  }
}

export function Instances({ project }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [zone, setZone] = useState('')
  const [create, setCreate] = useState(false)
  const life = useLifecycle()
  const scoped = rows(state.vmInstances).filter(r => active(r) && project.id && r.projectId === project.id)
  const data = scoped.filter(r => contains(r.name, query) && (!status || r.status === status) && (!zone || r.zone === zone))
  return <>
    <Heading title="VM instances" description="Provision and manage virtual machines in your project."
      action={<Button variant="primary" disabled={!project.record} onClick={() => setCreate(true)}>Create instance</Button>} />
    <Table label="Virtual machine instances" data={data} filterKey={JSON.stringify([query, status, zone])}
      filtered={!!(query.trim() || status || zone) && scoped.length > 0}
      empty={project.record ? 'No VM instances in this project.' : 'Select an available project to view instances.'}
      filters={<><Search label="Search instances" value={query} onChange={setQuery} />
        <Filter label="Status" options={{ RUNNING: 'Running', TERMINATED: 'Stopped' }} value={status} onChange={setStatus} />
        <Filter label="Zone" options={distinct(scoped.map(r => r.zone))} value={zone} onChange={setZone} /></>}
      columns={[
        { key: 'name', label: 'Name', sort: r => r.name, cell: r => <RouteLink to={recordPath(base, r)} scope={{ project: project.id }}>{r.name || r.id}</RouteLink> },
        { key: 'status', label: 'Status', sort: r => statusLabel(r.status), cell: r => <VmStatus status={r.status} /> },
        { key: 'zone', label: 'Zone', sort: r => r.zone },
        { key: 'machineType', label: 'Machine type', sort: r => r.machineType },
        { key: 'internalIp', label: 'Internal IP', sort: r => r.internalIp },
        { key: 'externalIp', label: 'External IP', sort: r => r.externalIp },
        { key: 'actions', label: 'Actions', align: 'actions-cell', cell: r => project.record && permitted(r).length > 0 &&
          <RowActions label={'Actions for ' + (r.name || r.id)} actions={permitted(r).map(action => [vmActions[action].label, () => life.request(r, action), action === 'delete'])} /> },
      ]} />
    {create && <CreateInstance project={project} onClose={() => setCreate(false)} />}
    {life.confirmation}
  </>
}

export function InstanceDetail({ project }) {
  const { state } = useWorkspace()
  const { vmId } = useParams()
  const record = byId(state.vmInstances, vmId)
  const life = useLifecycle()
  const back = <RouteLink className="back" to={base} scope={{ project: project.id }}>‹ VM instances</RouteLink>
  if (!record || record.projectId !== project.id) return <Missing message="Instance unavailable">{back}</Missing>
  return <>
    <Heading title={record.name || record.id} description="Compute Engine instance" action={project.record && <div className="button-group">
      {permitted(record).map(action => <Button key={action} variant={action === 'delete' ? 'danger-text' : ''} onClick={() => life.request(record, action)}>{vmActions[action].label}</Button>)}</div>}>{back}</Heading>
    <section className="card detail-card"><h2>Instance configuration</h2><Details items={[
      ['Status', <VmStatus status={record.status} />], ['Instance ID', <code>{record.id}</code>], ['Project', project.record?.name || record.projectId],
      ['Region', record.region], ['Zone', record.zone], ['Machine type', record.machineType],
      ['Boot image', images[record.bootImage] || record.bootImage], ['Boot disk', record.bootDiskGb != null ? record.bootDiskGb + ' GB' : null],
      ['Internal IP', record.internalIp ? <code>{record.internalIp}</code> : null], ['External IP', record.externalIp ? <code>{record.externalIp}</code> : null],
      ['Created', dateLabel(record.createdAt, true)], ['Last reset', dateLabel(record.lastResetAt, true)],
    ]} /></section>
    {life.confirmation}
  </>
}
