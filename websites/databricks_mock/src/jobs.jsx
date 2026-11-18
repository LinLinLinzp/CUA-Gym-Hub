import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { active, activity, changeRecord, created, dateLabel, find, list, matches, newest, pathFor, person, replace, routeId, uid } from './model.js'
import { executeJob, jobName, scheduleLabel, weekdays } from './jobModel.js'
import { RunForm, ScheduleForm, SettingsForm, TaskForm } from './jobForms.jsx'
import { Confirm, Header, Missing, Output, SiteLink, Status, Table, sections, useSiteNavigate } from './ui.jsx'

const section = sections.jobs
const jobUrl = (id) => section.to + '/' + routeId(id)
const runUrl = (run) => jobUrl(run.jobId) + '/runs/' + routeId(run.id)
const statuses = ['succeeded', 'failed', 'running', 'queued', 'canceled']

export function JobList() {
  const { state, apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(params.get('new') === 'job')
  const [query, setQuery] = useState('')
  const [trigger, setTrigger] = useState('')
  const [status, setStatus] = useState('')
  const latest = new Map()
  for (const run of newest(state.jobRuns)) if (!latest.has(run.jobId)) latest.set(run.jobId, run)
  const rows = list(state.jobs).filter((job) => matches(jobName(job), query) &&
    (!status || (latest.get(job.id)?.status ?? 'none') === status) &&
    (!trigger || trigger === scheduleLabel(job.schedule)))
  function close() {
    setCreating(false)
    if (params.has('new')) {
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }
  function create(tasks, name) {
    const id = uid('job')
    apply((world, context) => {
      const job = { id, name, description: '', tasks, schedule: null, ...created(context) }
      return { ...world, jobs: [...list(world.jobs), job], activity: activity(world, context, 'job', job, 'created') }
    })
    navigate(jobUrl(id))
  }
  return <>
    <Header title="Jobs" description="Build notebook workflows, manage schedules, and inspect runs.">
      <button className="primary" onClick={() => setCreating(true)}>+ Create job</button>
    </Header>
    <div className="filters">
      <label>Search<input type="search" placeholder="Search jobs by name" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Trigger<select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
        <option value="">All triggers</option>{['Manual', 'Daily', 'Weekly', 'Paused'].map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Last run status<select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option><option value="none">No runs</option>
        {statuses.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
      </select></label>
    </div>
    <Table label="Jobs" headers={['Job', 'Owner', 'Trigger', 'Tasks', 'Last run status']} empty="No jobs match your view." rows={rows.map((job) => {
      const last = latest.get(job.id)
      return <tr key={job.id}><td><SiteLink to={jobUrl(job.id)}>{jobName(job)}</SiteLink></td><td>{person(state, job.ownerId)}</td>
        <td>{scheduleLabel(job.schedule)}</td><td>{list(job.tasks).length}</td>
        <td>{last ? <SiteLink to={runUrl(last)}><Status value={last.status} /></SiteLink> : <span className="muted">No runs</span>}</td></tr>
    })} />
    {creating && <TaskForm mode="create" state={state} close={close} save={create} />}
  </>
}

function ComputeLink({ state, compute }) {
  if (compute?.mode !== 'cluster') return 'Serverless'
  const cluster = find(state.clusters, compute.clusterId)
  return cluster ? <SiteLink to={'/compute/' + routeId(cluster.id)}>{cluster.name ?? 'Unnamed cluster'}</SiteLink> : 'Unavailable cluster'
}

function RunsTable({ runs }) {
  return <Table label="Job runs" headers={['Run', 'Status', 'Trigger', 'Created', 'Finished']} empty="No runs yet." rows={runs.map((run) => (
    <tr key={run.id}><td><SiteLink className="code" to={runUrl(run)}>{run.id}</SiteLink></td><td><Status value={run.status} /></td>
      <td>{run.trigger ?? '—'}</td><td>{dateLabel(run.createdAt)}</td><td>{dateLabel(run.endedAt)}</td></tr>
  ))} />
}

function SchedulePanel({ schedule, open, change }) {
  return <section className="panel pad stack">
    <h2>Schedule</h2>
    <div><Status value={schedule?.paused ? 'paused' : 'manual'} label={scheduleLabel(schedule)} /></div>
    {schedule && <dl className="summary-grid">
      <div><dt>Frequency</dt><dd>{schedule.frequency === 'weekly' ? weekdays[schedule.weekday] ?? 'Weekly' : 'Daily'}</dd></div>
      <div><dt>Time</dt><dd>{schedule.time ?? '—'} {schedule.timezone ?? ''}</dd></div>
    </dl>}
    <div className="actions">
      <button onClick={open}>{schedule ? 'Edit schedule' : 'Configure schedule'}</button>
      {schedule && <>
        <button onClick={() => change({ ...schedule, paused: !schedule.paused }, schedule.paused ? 'schedule_resumed' : 'schedule_paused')}>
          {schedule.paused ? 'Resume schedule' : 'Pause schedule'}
        </button>
        <button onClick={() => change(null, 'schedule_removed')}>Remove schedule</button>
      </>}
    </div>
  </section>
}

export function JobDetails() {
  const { jobId } = useParams()
  const { state } = useWorkspace()
  const job = find(state.jobs, jobId)
  return job ? <Job job={job} /> : <Missing resource="Job" section={section} />
}

function Job({ job }) {
  const { state, apply } = useWorkspace()
  const navigate = useSiteNavigate()
  const [tab, setTab] = useState('Tasks')
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const runs = newest(state.jobRuns).filter((run) => run.jobId === job.id)
  const activeRuns = runs.filter((run) => active(run.status))
  const tasks = list(job.tasks)
  function update(changes, action) {
    apply((world, context) => changeRecord(world, 'jobs', job, changes, context, 'job', action))
    close()
  }
  function run(parameters) {
    let record
    apply((world, context) => {
      record = executeJob(world, job, parameters, context)
      return { ...world, jobRuns: [...list(world.jobRuns), record],
        activity: activity(world, context, 'job', job, 'run_started', { status: record.status }, record.id) }
    })
    navigate(runUrl(record))
  }
  function remove() {
    apply((world, context) => ({ ...world, jobs: list(world.jobs).filter((item) => item.id !== job.id),
      activity: activity(world, context, 'job', job, 'deleted') }))
    navigate(section.to)
  }
  return <>
    <Header title={jobName(job)} section={section} description={job.description}>
      <button onClick={() => setModal({ type: 'settings' })}>Edit settings</button>
      <button onClick={() => setModal({ type: 'delete' })}>Delete job</button>
      <button className="primary" onClick={() => setModal({ type: 'run' })} disabled={!tasks.length}>Run now</button>
    </Header>
    <div className="details-grid">
      <div>
        <div className="tabs" aria-label="Job views">{['Tasks', 'Runs'].map((value) => (
          <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>
        ))}</div>
        {tab === 'Runs' ? <RunsTable runs={runs} /> : <section className="panel stack pad">
          <div className="toolbar"><h2>Notebook tasks</h2><button onClick={() => setModal({ type: 'task' })}>+ Add task</button></div>
          {!tasks.length && <p className="muted">Add a notebook task to run this job.</p>}
          {tasks.map((task) => {
            const notebook = find(state.notebooks, task.notebookId)
            return <article className="task-card" key={task.key}>
              <div className="toolbar"><h3>{task.key}</h3><div className="actions">
                <button aria-label={'Edit task ' + task.key} onClick={() => setModal({ type: 'task', task })}>Edit</button>
                <button aria-label={'Remove task ' + task.key} disabled={tasks.length < 2} onClick={() => setModal({ type: 'remove', task })}>Remove</button>
              </div></div>
              <dl className="summary-grid">
                <div><dt>Notebook</dt><dd>{notebook ? <SiteLink to={'/workspace/notebooks/' + routeId(notebook.id)}>{pathFor(notebook)}</SiteLink> : 'Unavailable notebook'}</dd></div>
                <div><dt>Compute</dt><dd><ComputeLink state={state} compute={task.compute} /></dd></div>
                <div><dt>Depends on</dt><dd>{list(task.dependsOn).join(', ') || 'None'}</dd></div>
              </dl>
              <ParameterValues value={task.parameters} />
            </article>
          })}
        </section>}
      </div>
      <div className="stack">
        <SchedulePanel schedule={job.schedule} open={() => setModal({ type: 'schedule' })}
          change={(schedule, action) => update({ schedule }, action)} />
        <section className="panel pad stack"><h2>Job details</h2><dl className="summary-grid">
          <div><dt>Owner</dt><dd>{person(state, job.ownerId)}</dd></div>
          <div><dt>Modified</dt><dd>{dateLabel(job.updatedAt)}</dd></div>
          <div><dt>Last run</dt><dd>{runs.length ? <SiteLink to={runUrl(runs[0])}><Status value={runs[0].status} /></SiteLink> : 'No runs'}</dd></div>
        </dl></section>
      </div>
    </div>
    {modal?.type === 'settings' && <SettingsForm job={job} close={close} save={(changes) => update(changes, 'settings_updated')} />}
    {modal?.type === 'task' && <TaskForm state={state} job={job} initial={modal.task} close={close} save={(next) => update({ tasks: next }, 'tasks_updated')} />}
    {modal?.type === 'remove' && <Confirm verb="Remove" name={modal.task.key} close={close} requireName={false} submit={() => {
      const key = modal.task.key
      update({ tasks: tasks.filter((item) => item.key !== key).map((item) => list(item.dependsOn).includes(key)
        ? { ...item, dependsOn: list(item.dependsOn).filter((dependency) => dependency !== key) } : item) }, 'tasks_updated')
    }}><p>The task and its references in other tasks’ dependency lists will be removed.</p></Confirm>}
    {modal?.type === 'schedule' && <ScheduleForm schedule={job.schedule} close={close} save={(schedule) => update({ schedule }, 'schedule_saved')} />}
    {modal?.type === 'run' && <RunForm job={job} close={close} run={run} />}
    {modal?.type === 'delete' && <Confirm verb="Delete" name={jobName(job)} close={close} blocked={activeRuns.length > 0} submit={remove}>
      {activeRuns.length ? <div><p>Cancel active or queued runs before deleting this job.</p><ul>{activeRuns.map((item) => (
        <li key={item.id}><SiteLink to={runUrl(item)}>{item.id}</SiteLink> · {item.status}</li>
      ))}</ul></div> : <p>Existing runs and their task snapshots will remain readable.</p>}
    </Confirm>}
  </>
}

function ParameterValues({ value, heading = 'Parameters' }) {
  const entries = Object.entries(value ?? {})
  if (!entries.length) return null
  return <div className="compact"><strong>{heading}</strong><dl className="summary-grid code">{entries.map(([key, item]) => (
    <div key={key}><dt>{key}</dt><dd>{String(item)}</dd></div>
  ))}</dl></div>
}

export function RunDetails() {
  const { jobId, runId } = useParams()
  const { state, apply } = useWorkspace()
  const [confirm, setConfirm] = useState(false)
  const run = find(state.jobRuns, runId)
  const job = find(state.jobs, jobId)
  if (!run || run.jobId !== jobId) return <Missing resource="Run" section={section} />
  const name = run.jobName ?? (job ? jobName(job) : 'Archived job')
  function cancel() {
    apply((world, context) => {
      const next = { ...run, status: 'canceled', endedAt: context.createdAt, canceledAt: context.createdAt,
        canceledBy: context.actorId, tasks: list(run.tasks).map((task) => active(task.status)
          ? { ...task, status: 'canceled', endedAt: context.createdAt } : task) }
      return { ...world, jobRuns: replace(world.jobRuns, next),
        activity: activity(world, context, 'job', { id: jobId, name }, 'run_canceled', { status: 'canceled' }, runId) }
    })
    setConfirm(false)
  }
  return <>
    <Header title="Run details" section={section} parent={job ? { to: jobUrl(jobId), label: jobName(job) } : null} description={name + ' · ' + run.id}>
      <Status value={run.status} />
      {active(run.status) && <button onClick={() => setConfirm(true)}>Cancel run</button>}
    </Header>
    <div className="details-grid">
      <section className="panel pad stack"><h2>Task results</h2>
        {!list(run.tasks).length && <p className="muted">This run has no task snapshots.</p>}
        {list(run.tasks).map((task) => <article className="task-card" key={task.key}>
          <div className="toolbar"><h3>{task.key ?? 'Notebook task'}</h3><Status value={task.status} /></div>
          <dl className="summary-grid">
            <div><dt>Notebook</dt><dd>{task.notebookName ?? 'Unavailable notebook'}</dd></div>
            <div><dt>Execution compute</dt><dd><ComputeLink state={state} compute={task.compute} /></dd></div>
            <div><dt>Depends on</dt><dd>{list(task.dependsOn).join(', ') || 'None'}</dd></div>
            <div><dt>Started</dt><dd>{dateLabel(task.startedAt)}</dd></div>
            <div><dt>Finished</dt><dd>{dateLabel(task.endedAt)}</dd></div>
          </dl>
          <ParameterValues value={task.parameters} />
          <Output output={task.output} />
        </article>)}
      </section>
      <section className="panel pad stack"><h2>Run information</h2><dl className="summary-grid">
        <div><dt>Trigger</dt><dd>{run.trigger ?? '—'}</dd></div>
        <div><dt>Actor</dt><dd>{person(state, run.actorId)}</dd></div>
        <div><dt>Created</dt><dd>{dateLabel(run.createdAt)}</dd></div>
        <div><dt>Finished</dt><dd>{dateLabel(run.endedAt)}</dd></div>
      </dl><ParameterValues value={run.parameterOverrides} heading="Parameter overrides" /></section>
    </div>
    {confirm && <Confirm verb="Cancel run" name={run.id} requireName={false} close={() => setConfirm(false)} submit={cancel}>
      <p>Unfinished tasks will be canceled. Finished task results will remain available.</p>
    </Confirm>}
  </>
}
