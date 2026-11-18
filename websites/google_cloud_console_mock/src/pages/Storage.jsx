import React, { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Button, Confirm, Details, Dialog, Field, Filter, Heading, Missing, Pill, RowActions, Search, Select, Table } from '../components.jsx'
import { accessModes, classes, locations, locationTypes } from '../data/catalog.js'
import { active, byId, contains, dateLabel, distinct, recordPath, RouteLink, rows, uid, useGo, useWorkspace } from '../workspace.jsx'

const base = '/storage/buckets'
const locationName = value => value?.toUpperCase() || '—'
function bytes(size) {
  if (!Number.isFinite(Number(size)) || size == null) return '—'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let unit = 0
  let value = Number(size)
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++ }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value) + ' ' + units[unit]
}
const bucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/

function CreateBucket({ project, onClose }) {
  const { transact } = useWorkspace()
  const go = useGo()
  const [form, setForm] = useState({ name: '', locationType: 'region', location: 'us-central1', storageClass: 'STANDARD', accessMode: 'uniform', publicAccessPrevention: true })
  const [error, setError] = useState('')
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  function save() {
    const name = form.name.trim()
    if (!bucketNamePattern.test(name)) {
      setError('Use 3–63 lowercase letters, digits or hyphens. Start and end with a letter or digit.')
      return
    }
    const id = uid('bucket')
    const changed = transact((state, { creation, event }) => {
      const buckets = rows(state.buckets)
      if (buckets.some(r => active(r) && r.name === name)) {
        setError('That bucket name is already in use.')
        return
      }
      const record = { ...form, name, id, projectId: project.id, status: 'active', ...creation }
      event('bucket.create', id, { projectId: project.id }, { name, location: form.location, status: 'active' })
      return { ...state, buckets: [...buckets, record] }
    }, 'Bucket created.')
    if (changed) { onClose(); go(recordPath(base, { id }), { project: project.id, tab: null }) }
  }
  return <Dialog title="Create bucket" mode="panel wide" onClose={onClose} submit={save} submitLabel="Create bucket">
    <p className="muted">Project · {project.record.name || project.id}</p>
    <Field label="Bucket name" value={form.name} onChange={e => change('name', e.target.value)} error={error} />
    <div className="form-grid">
      <Field label="Location type"><Select options={locationTypes} value={form.locationType} onChange={e => {
        const locationType = e.target.value
        setForm({ ...form, locationType, location: locations[locationType][0] })
      }} /></Field>
      <Field label="Location"><Select options={locations[form.locationType].map(value => [value, locationName(value)])} value={form.location} onChange={e => change('location', e.target.value)} /></Field>
    </div>
    <Field label="Storage class"><Select options={classes} value={form.storageClass} onChange={e => change('storageClass', e.target.value)} /></Field>
    <Field label="Access control"><Select options={accessModes} value={form.accessMode} onChange={e => change('accessMode', e.target.value)} /></Field>
    <label className="check-option"><input type="checkbox" checked={form.publicAccessPrevention} onChange={e => change('publicAccessPrevention', e.target.checked)} />Enforce public access prevention</label>
  </Dialog>
}

export function Buckets({ project }) {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [storageClass, setStorageClass] = useState('')
  const [location, setLocation] = useState('')
  const [create, setCreate] = useState(false)
  const counts = new Map()
  for (const object of rows(state.storageObjects).filter(active)) counts.set(object.bucketId, (counts.get(object.bucketId) || 0) + 1)
  const scoped = rows(state.buckets).filter(r => active(r) && project.id && r.projectId === project.id)
  const data = scoped.filter(r => contains(r.name, query) && (!storageClass || r.storageClass === storageClass) && (!location || r.location === location))
  return <>
    <Heading title="Buckets" description="Manage object storage across locations and storage classes."
      action={<Button variant="primary" disabled={!project.record} onClick={() => setCreate(true)}>Create bucket</Button>} />
    <Table label="Storage buckets" data={data} filterKey={JSON.stringify([query, storageClass, location])}
      filtered={!!(query.trim() || storageClass || location) && scoped.length > 0}
      empty={project.record ? 'No buckets in this project.' : 'Select an available project to view buckets.'}
      filters={<><Search label="Search buckets" value={query} onChange={setQuery} />
        <Filter label="Storage class" options={classes} value={storageClass} onChange={setStorageClass} />
        <Filter label="Location" options={distinct(scoped.map(r => r.location)).map(value => [value, locationName(value)])} value={location} onChange={setLocation} /></>}
      columns={[
        { key: 'name', label: 'Name', sort: r => r.name, cell: r => <RouteLink to={recordPath(base, r)} scope={{ project: project.id, tab: null }}>{r.name || r.id}</RouteLink> },
        { key: 'location', label: 'Location', sort: r => r.location, cell: r => <>{locationName(r.location)}<small className="subtext">{locationTypes[r.locationType] || r.locationType}</small></> },
        { key: 'storageClass', label: 'Storage class', sort: r => classes[r.storageClass] || r.storageClass, cell: r => <Pill tone="teal">{classes[r.storageClass] || r.storageClass || '—'}</Pill> },
        { key: 'accessMode', label: 'Access control', sort: r => r.accessMode, cell: r => accessModes[r.accessMode] || r.accessMode || '—' },
        { key: 'objects', label: 'Objects', sort: r => counts.get(r.id) || 0, cell: r => counts.get(r.id) || 0, align: 'numeric' },
      ]} />
    {create && <CreateBucket project={project} onClose={() => setCreate(false)} />}
  </>
}

function Upload({ bucket, onClose }) {
  const { transact } = useWorkspace()
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  function upload() {
    if (!files.length) { setError('Choose one or more files.'); return }
    const changed = transact((state, { creation, event }) => {
      const objects = rows(state.storageObjects)
      const names = new Set(objects.filter(r => r.bucketId === bucket.id && active(r)).map(r => r.name))
      const additions = []
      for (const file of files) {
        const name = file.webkitRelativePath || file.name
        if (names.has(name)) { setError('An object with this path already exists: ' + name); return }
        names.add(name)
        additions.push({ id: uid('object'), bucketId: bucket.id, name, sizeBytes: file.size,
          contentType: file.type || 'application/octet-stream', status: 'active', ...creation })
      }
      for (const { id, name, sizeBytes, status } of additions) {
        event('object.upload', id, { projectId: bucket.projectId }, { bucketId: bucket.id, name, sizeBytes, status })
      }
      return { ...state, storageObjects: [...objects, ...additions] }
    }, files.length === 1 ? 'Object uploaded.' : files.length + ' objects uploaded.')
    if (changed) onClose()
  }
  return <Dialog title="Upload files" onClose={onClose} submit={upload} submitLabel="Upload">
    <p>Upload to <strong>{bucket.name || bucket.id}</strong>.</p>
    <Field label="Choose files" type="file" multiple error={error} onChange={e => { setFiles([...e.target.files]); setError('') }} />
    {files.length > 0 && <ul className="file-list">{files.map((file, i) => <li key={i}>{file.name} <span className="muted">({bytes(file.size)})</span></li>)}</ul>}
  </Dialog>
}

function EditClass({ bucket, onClose }) {
  const { transact } = useWorkspace()
  const [storageClass, setStorageClass] = useState(classes[bucket.storageClass] ? bucket.storageClass : 'STANDARD')
  function save() {
    if (storageClass !== bucket.storageClass) transact((state, { update, event }) => {
      event('bucket.update', bucket.id, { projectId: bucket.projectId }, { name: bucket.name, storageClass })
      return { ...state, buckets: rows(state.buckets).map(r => r.id === bucket.id ? { ...r, storageClass, ...update } : r) }
    }, 'Storage class updated.')
    onClose()
  }
  return <Dialog title="Edit storage class" onClose={onClose} submit={save} submitLabel="Save changes">
    <p className="muted">{bucket.name || bucket.id}</p>
    <Field label="Storage class"><Select options={classes} value={storageClass} onChange={e => setStorageClass(e.target.value)} /></Field>
  </Dialog>
}

function DeleteBucket({ bucket, onClose }) {
  const { transact } = useWorkspace()
  const go = useGo()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const expected = bucket.name || bucket.id
  function remove() {
    if (name !== expected) { setError('Enter the bucket name exactly as shown.'); return }
    const changed = transact((state, { update, event }) => {
      if (rows(state.storageObjects).some(r => r.bucketId === bucket.id && active(r))) {
        setError('Delete all objects in the bucket first.')
        return
      }
      event('bucket.delete', bucket.id, { projectId: bucket.projectId }, { name: expected, status: 'deleted' })
      return { ...state, buckets: rows(state.buckets).map(r => r.id === bucket.id ? { ...r, status: 'deleted', ...update } : r) }
    }, 'Bucket deleted.')
    if (changed) { onClose(); go(base, { project: bucket.projectId, tab: null }) }
  }
  return <Confirm title="Delete bucket" onClose={onClose} submit={remove} submitLabel="Delete bucket" danger>
    <p>Delete <strong>{expected}</strong>? Type its name to confirm.</p>
    <Field label="Confirm bucket name" value={name} onChange={e => setName(e.target.value)} error={error} />
  </Confirm>
}

export function BucketDetail({ project }) {
  const { state, transact } = useWorkspace()
  const { bucketId } = useParams()
  const { search } = useLocation()
  const tab = new URLSearchParams(search).get('tab') === 'configuration' ? 'configuration' : 'objects'
  const bucket = byId(state.buckets, bucketId)
  const objects = rows(state.storageObjects).filter(r => r.bucketId === bucketId && active(r))
  const [prefix, setPrefix] = useState('')
  const [dialog, setDialog] = useState(null)
  const back = <RouteLink className="back" to={base} scope={{ project: project.id, tab: null }}>‹ Buckets</RouteLink>
  if (!bucket || bucket.projectId !== project.id) return <Missing message="Bucket unavailable">{back}</Missing>
  const path = recordPath(base, bucket)
  const changeable = project.record && active(bucket)
  const close = () => setDialog(null)
  function removeObject(object) {
    transact((current, { update, event }) => {
      const stored = rows(current.storageObjects)
      if (!stored.some(r => r.id === object.id && r.bucketId === bucket.id && active(r))) return
      event('object.delete', object.id, { projectId: bucket.projectId }, { bucketId: bucket.id, name: object.name, status: 'deleted' })
      return { ...current, storageObjects: stored.map(r => r.id === object.id ? { ...r, status: 'deleted', ...update } : r) }
    }, 'Object deleted.')
    close()
  }
  return <>
    <Heading title={bucket.name || bucket.id} description={active(bucket) ? 'Cloud Storage bucket' : 'Deleted bucket'}
      action={changeable && <Button variant="danger-text" disabled={objects.length > 0} aria-describedby={objects.length ? 'delete-bucket-hint' : undefined} onClick={() => setDialog({ type: 'delete' })}>Delete bucket</Button>}>{back}</Heading>
    {changeable && objects.length > 0 && <p className="muted" id="delete-bucket-hint">Remove all objects before deleting this bucket.</p>}
    <nav className="tabs" aria-label="Bucket sections">
      {[['objects', 'Objects'], ['configuration', 'Configuration']].map(([value, label]) =>
        <RouteLink key={value} to={path} scope={{ project: project.id, tab: value === 'objects' ? null : value }} aria-current={tab === value ? 'page' : undefined}>{label}</RouteLink>)}
    </nav>
    {tab === 'objects' ? <Table label="Bucket objects" data={objects.filter(r => String(r.name ?? '').startsWith(prefix.trim()))} filtered={!!prefix.trim() && objects.length > 0}
      filterKey={prefix} empty="This bucket has no objects." noResults="No object names start with that prefix."
      filters={<><Search label="Filter by prefix" value={prefix} onChange={setPrefix} />
        {changeable && <Button variant="primary" className="push" onClick={() => setDialog({ type: 'upload' })}>Upload files</Button>}</>}
      columns={[
        { key: 'name', label: 'Object name', sort: r => r.name },
        { key: 'sizeBytes', label: 'Size', align: 'numeric', sort: r => Number(r.sizeBytes) || 0, cell: r => bytes(r.sizeBytes) },
        { key: 'contentType', label: 'Content type', sort: r => r.contentType },
        { key: 'createdAt', label: 'Created', sort: r => r.createdAt, cell: r => dateLabel(r.createdAt) },
        { key: 'actions', label: 'Actions', align: 'actions-cell', cell: r => changeable && <RowActions label={'Actions for ' + (r.name || r.id)} actions={[
          ['Delete object', () => setDialog({ type: 'object', object: r }), true],
        ]} /> },
      ]} /> : <section className="card detail-card"><div className="split"><h2>Bucket configuration</h2>
        {changeable && <Button onClick={() => setDialog({ type: 'class' })}>Edit storage class</Button>}</div>
        <Details items={[
          ['Bucket ID', <code>{bucket.id}</code>], ['Project', project.record?.name || bucket.projectId],
          ['Location type', locationTypes[bucket.locationType] || bucket.locationType], ['Location', locationName(bucket.location)],
          ['Storage class', classes[bucket.storageClass] || bucket.storageClass], ['Access control', accessModes[bucket.accessMode] || bucket.accessMode],
          ['Public access prevention', bucket.publicAccessPrevention == null ? null : bucket.publicAccessPrevention ? 'Enforced' : 'Not enforced'],
          ['Created', dateLabel(bucket.createdAt, true)], ['Status', <Pill tone={active(bucket) ? 'success' : 'danger-pill'}>{active(bucket) ? 'Active' : 'Deleted'}</Pill>],
        ]} /></section>}
    {dialog?.type === 'upload' && <Upload bucket={bucket} onClose={close} />}
    {dialog?.type === 'class' && <EditClass bucket={bucket} onClose={close} />}
    {dialog?.type === 'delete' && <DeleteBucket bucket={bucket} onClose={close} />}
    {dialog?.type === 'object' && <Confirm title="Delete object" onClose={close} submit={() => removeObject(dialog.object)} submitLabel="Delete object" danger>
      <p>Remove <strong>{dialog.object.name || dialog.object.id}</strong> from {bucket.name || bucket.id}?</p>
    </Confirm>}
  </>
}
