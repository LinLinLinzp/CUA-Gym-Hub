import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { nodeTypes, runtimes } from './data/seed.js'
import { actionLabel, created, dateLabel, find, list, matches, newest, pathFor, person, replace, routeId, stamp, uid } from './model.js'
import { Confirm, Dialog, FormActions, Header, Missing, SiteLink, Status, Table, sections, useSiteNavigate } from './ui.jsx'
import { useWorkspace } from './store.jsx'

const section = sections.compute
const clusterUrl = (id) => section.to + '/' + routeId(id)
const clusterName = (cluster) => cluster.name ?? 'Untitled cluster'
const modeNames = { single: 'Single node', fixed: 'Fixed size', autoscale: 'Autoscaling' }
const sizingLabel = (scaling) => {
  if (scaling?.mode === 'single') return 'Single node'
  if (scaling?.mode === 'fixed') return (scaling.workers ?? '—') + ' workers'
  if (scaling?.mode === 'autoscale') return (scaling.minWorkers ?? '—') + '–' + (scaling.maxWorkers ?? '—') + ' workers'
  return '—'
}
const idleLabel = (minutes) => minutes === 0 ? 'Off' : minutes == null ? '—' : minutes + ' min'
const clusterEvent = (state, context, cluster, action, previousStatus, status, changes = {}) => [
  ...list(state.clusterEvents), { ...context, id: uid('cle'), clusterId: cluster.id, clusterName: clusterName(cluster),
    action, previousStatus, status, changes },
]

function ConfigOptions({ values, current }) {
  const options = current && !values.includes(current) ? [...values, current] : values
  return options.map((value) => <option key={value}>{value}</option>)
}

function ClusterForm({ initial, close, save }) {
  const [draft, setDraft] = useState({
    name: initial?.name ?? '', runtime: initial?.runtime ?? runtimes[1], nodeType: initial?.nodeType ?? nodeTypes[0],
    mode: initial?.scaling?.mode ?? 'single', workers: initial?.scaling?.workers ?? 2,
    minWorkers: initial?.scaling?.minWorkers ?? 1, maxWorkers: initial?.scaling?.maxWorkers ?? 4,
    autoTerminationMinutes: initial?.autoTerminationMinutes ?? 30,
  })
  const [error, setError] = useState('')
  function edit(field, value) { setDraft({ ...draft, [field]: value }) }
  function numberField(label, field, min) {
    return <label>{label}<input required type="number" min={min} step="1" value={draft[field]} onChange={(e) => edit(field, e.target.value)} /></label>
  }
  function submit(e) {
    e.preventDefault()
    if (!draft.name.trim()) return setError('Enter a cluster name.')
    const validNumber = (value, min) => String(value).trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= min
    const { mode, workers, minWorkers, maxWorkers } = draft
    const scaling = { mode }
    if (mode === 'fixed') {
      if (!validNumber(workers, 1)) return setError('Enter a positive whole number of workers.')
      scaling.workers = Number(workers)
    }
    if (mode === 'autoscale') {
      if (!validNumber(minWorkers, 1) || !validNumber(maxWorkers, 1)) return setError('Enter positive whole-number worker limits.')
      if (Number(minWorkers) > Number(maxWorkers)) return setError('Minimum workers must be less than or equal to maximum workers.')
      scaling.minWorkers = Number(minWorkers)
      scaling.maxWorkers = Number(maxWorkers)
    }
    if (!validNumber(draft.autoTerminationMinutes, 0)) return setError('Enter a whole number of minutes, or 0 to turn auto-termination off.')
    save({ name: draft.name.trim(), runtime: draft.runtime, nodeType: draft.nodeType, scaling,
      autoTerminationMinutes: Number(draft.autoTerminationMinutes) })
  }
  return <Dialog title={initial ? 'Edit configuration' : 'Create compute'} onClose={close} wide>
    <form onSubmit={submit}>
      <label>Cluster name<input autoFocus required value={draft.name} onChange={(e) => edit('name', e.target.value)} /></label>
      <div className="form-grid">
        <label>Runtime<select value={draft.runtime} onChange={(e) => edit('runtime', e.target.value)}><ConfigOptions values={runtimes} current={draft.runtime} /></select></label>
        <label>Node type<select value={draft.nodeType} onChange={(e) => edit('nodeType', e.target.value)}><ConfigOptions values={nodeTypes} current={draft.nodeType} /></select></label>
      </div>
      <label>Sizing mode<select value={draft.mode} onChange={(e) => edit('mode', e.target.value)}>
        {Object.entries(modeNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      {draft.mode === 'fixed' && numberField('Workers', 'workers', 1)}
      {draft.mode === 'autoscale' && <div className="form-grid">
        {numberField('Minimum workers', 'minWorkers', 1)}{numberField('Maximum workers', 'maxWorkers', 1)}
      </div>}
      {numberField('Auto-termination minutes', 'autoTerminationMinutes', 0)}
      <small>Set to 0 to turn off auto-termination.</small>
      {error && <p className="error" role="alert">{error}</p>}
      <FormActions close={close} label={initial ? 'Save configuration' : 'Create compute'} />
    </form>
  </Dialog>
}

export function ClusterList() {
  const { state, apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(params.get('new') === 'cluster')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const rows = list(state.clusters).filter((cluster) => matches(clusterName(cluster), query) && (!status || cluster.status === status))
  function close() {
    setCreating(false)
    if (params.has('new')) {
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }
  function create(config) {
    const id = uid('cl')
    apply((world, context) => {
      const cluster = { id, ...config, ...created(context), status: 'running',
        lastStartedAt: context.createdAt, lastRestartedAt: null, lastTerminatedAt: null }
      return { ...world, clusters: [...list(world.clusters), cluster],
        clusterEvents: clusterEvent(world, context, cluster, 'created', null, 'running') }
    })
    navigate(clusterUrl(id))
  }
  return <>
    <Header title="Compute" description="Configure clusters and review their lifecycle history.">
      <button className="primary" onClick={() => setCreating(true)}>+ Create compute</button>
    </Header>
    <div className="filters">
      <label>Search<input type="search" placeholder="Search clusters by name" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option><option value="running">Running</option><option value="terminated">Terminated</option>
      </select></label>
    </div>
    <Table label="Clusters" headers={['Cluster', 'State', 'Owner', 'Runtime', 'Sizing', 'Auto-termination']} empty="No clusters match your view."
      rows={rows.map((cluster) => <tr key={cluster.id}>
        <td><SiteLink to={clusterUrl(cluster.id)}>{clusterName(cluster)}</SiteLink></td><td><Status value={cluster.status} /></td>
        <td>{person(state, cluster.ownerId)}</td><td>{cluster.runtime ?? '—'}</td><td>{sizingLabel(cluster.scaling)}</td>
        <td>{idleLabel(cluster.autoTerminationMinutes)}</td>
      </tr>)} />
    {creating && <ClusterForm close={close} save={create} />}
  </>
}

export function ClusterDetails() {
  const { clusterId } = useParams()
  const { state } = useWorkspace()
  const cluster = find(state.clusters, clusterId)
  return cluster ? <Cluster cluster={cluster} /> : <Missing resource="Cluster" section={section} />
}

const lifecycle = {
  Start: { action: 'started', before: 'terminated', status: 'running' },
  Restart: { action: 'restarted', before: 'running', status: 'running' },
  Terminate: { action: 'terminated', before: 'running', status: 'terminated' },
}

function Cluster({ cluster }) {
  const { state, apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [modal, setModal] = useState('')
  const close = () => setModal('')
  const name = clusterName(cluster)
  const notebooks = list(state.notebooks).filter((notebook) => notebook.clusterId === cluster.id)
  const jobs = list(state.jobs).filter((job) => list(job.tasks).some((task) => task.compute?.mode === 'cluster' && task.compute.clusterId === cluster.id))
  const events = newest(state.clusterEvents).filter((event) => event.clusterId === cluster.id)
  const blocked = notebooks.length + jobs.length > 0
  function update(config) {
    const changes = Object.fromEntries(Object.entries(config).filter(([key, value]) => {
      if (key !== 'scaling') return cluster[key] !== value
      return Object.keys(cluster.scaling ?? {}).length !== Object.keys(value).length ||
        Object.entries(value).some(([field, setting]) => cluster.scaling?.[field] !== setting)
    }))
    apply((world, context) => ({ ...world, clusters: replace(world.clusters, { ...cluster, ...config, ...stamp(context) }),
      clusterEvents: clusterEvent(world, context, { ...cluster, ...config }, 'updated', cluster.status ?? null, cluster.status ?? null, changes) }))
    close()
  }
  function transition(verb) {
    const { action, before, status } = lifecycle[verb]
    if (cluster.status !== before) return
    apply((world, context) => {
      const timestamps = verb === 'Terminate' ? { lastTerminatedAt: context.createdAt } : { lastStartedAt: context.createdAt }
      if (verb === 'Restart') timestamps.lastRestartedAt = context.createdAt
      return { ...world, clusters: replace(world.clusters, { ...cluster, status, ...timestamps, ...stamp(context) }),
        clusterEvents: clusterEvent(world, context, cluster, action, before, status) }
    })
    close()
  }
  function remove() {
    if (cluster.status !== 'terminated' || blocked) return
    apply((world, context) => ({ ...world,
      clusters: list(world.clusters).filter((item) => item.id !== cluster.id),
      clusterEvents: clusterEvent(world, context, cluster, 'deleted', cluster.status, null) }))
    navigate(section.to)
  }
  return <>
    <Header title={name} section={section} description={cluster.runtime}>
      <Status value={cluster.status} />
      {cluster.status === 'terminated' && <>
        <button onClick={() => setModal('Delete')}>Delete cluster</button><button className="primary" onClick={() => transition('Start')}>Start</button>
      </>}
      {cluster.status === 'running' && <><button onClick={() => setModal('Restart')}>Restart</button><button onClick={() => setModal('Terminate')}>Terminate</button></>}
    </Header>
    <div className="details-grid filters">
      <section className="panel pad stack">
        <div className="toolbar"><h2>Configuration</h2><button onClick={() => setModal('edit')}>Edit configuration</button></div>
        <dl className="summary-grid">
          <div><dt>Runtime</dt><dd>{cluster.runtime ?? '—'}</dd></div><div><dt>Node type</dt><dd>{cluster.nodeType ?? '—'}</dd></div>
          <div><dt>Sizing mode</dt><dd>{modeNames[cluster.scaling?.mode] ?? '—'}</dd></div>
          <div><dt>Workers</dt><dd>{sizingLabel(cluster.scaling)}</dd></div><div><dt>Auto-termination</dt><dd>{idleLabel(cluster.autoTerminationMinutes)}</dd></div>
          <div><dt>Owner</dt><dd>{person(state, cluster.ownerId)}</dd></div>
        </dl>
      </section>
      <section className="panel pad stack"><h2>Usage</h2>
        <dl className="summary-grid"><div><dt>Attached notebooks</dt><dd>{notebooks.length}</dd></div><div><dt>Jobs using compute</dt><dd>{jobs.length}</dd></div>
          <div><dt>Last started</dt><dd>{dateLabel(cluster.lastStartedAt)}</dd></div><div><dt>Last terminated</dt><dd>{dateLabel(cluster.lastTerminatedAt)}</dd></div>
        </dl>
        {blocked && <ReferenceLinks notebooks={notebooks} jobs={jobs} />}
      </section>
    </div>
    <section className="stack"><h2>Event history</h2>
      <Table label="Cluster event history" headers={['Event', 'Previous state', 'Resulting state', 'Actor', 'Time']} empty="No cluster events yet."
        rows={events.map((event) => <tr key={event.id}><td>{actionLabel('compute', event.action)}</td>
          <td>{event.previousStatus ? <Status value={event.previousStatus} /> : '—'}</td>
          <td>{event.status ? <Status value={event.status} /> : '—'}</td><td>{person(state, event.actorId)}</td><td>{dateLabel(event.createdAt)}</td>
        </tr>)} />
    </section>
    {modal === 'edit' && <ClusterForm initial={cluster} close={close} save={update} />}
    {(modal === 'Restart' || modal === 'Terminate') && <Confirm verb={modal} name={name} close={close} requireName={false} submit={() => transition(modal)}>
      <p>{modal === 'Restart' ? 'The cluster will restart in place.' : 'The cluster will stop.'} Notebook and job attachments will be kept.</p>
      {blocked && <p>{notebooks.length} attached notebooks and {jobs.length} jobs use this cluster.</p>}
    </Confirm>}
    {modal === 'Delete' && <Confirm verb="Delete" name={name} close={close} submit={remove} blocked={blocked}>
      {blocked ? <div><p>Detach notebooks and change the compute on linked job tasks before deleting this cluster.</p>
        <ReferenceLinks notebooks={notebooks} jobs={jobs} /></div> : <p>Cluster events will remain in history.</p>}
    </Confirm>}
  </>
}

function ReferenceLinks({ notebooks, jobs }) {
  return <ul className="reference-links">
    {notebooks.map((nb) => <li key={nb.id}><SiteLink to={'/workspace/notebooks/' + routeId(nb.id)}>{pathFor(nb)}</SiteLink></li>)}
    {jobs.map((job) => <li key={job.id}><SiteLink to={'/jobs/' + routeId(job.id)}>{job.name ?? 'Unnamed job'}</SiteLink></li>)}
  </ul>
}
