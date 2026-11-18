import { useState } from 'react'
import { dateLabel, find, list, pathFor } from './model.js'
import { validateTasks, weekdays } from './jobModel.js'
import { Dialog, FormActions, SiteLink } from './ui.jsx'

const serverless = { mode: 'serverless', clusterId: null }
const blankTask = { key: '', notebookId: '', compute: serverless, parameters: {}, dependsOn: [] }

function useParameters(parameters) {
  const [entries, setEntries] = useState(() => Object.entries(parameters ?? {}))
  function toRecord() {
    const keys = entries.map(([key]) => key.trim())
    if (keys.some((key) => !key)) return { error: 'Enter a key for every parameter.' }
    if (new Set(keys).size !== keys.length) return { error: 'Parameter keys must be unique.' }
    return { parameters: Object.fromEntries(entries.map(([, value], index) => [keys[index], value])) }
  }
  return { entries, setEntries, toRecord }
}

function Parameters({ editor, heading = 'Parameters' }) {
  const { entries, setEntries } = editor
  function edit(index, field, value) {
    setEntries(entries.map((entry, i) => i === index ? entry.map((part, j) => j === field ? value : part) : entry))
  }
  return <fieldset className="check-list"><legend>{heading}</legend>
    {entries.map(([key, value], index) => <div className="parameter-row" key={index}>
      <label>Key<input aria-label={'Parameter ' + (index + 1) + ' key'} value={key} onChange={(e) => edit(index, 0, e.target.value)} /></label>
      <label>Value<input aria-label={'Parameter ' + (index + 1) + ' value'} value={value} onChange={(e) => edit(index, 1, e.target.value)} /></label>
      <button type="button" className="icon-btn" aria-label={'Remove parameter ' + (index + 1)} onClick={() => setEntries(entries.filter((_, i) => i !== index))}>×</button>
    </div>)}
    <div><button type="button" onClick={() => setEntries([...entries, ['', '']])}>+ Add parameter</button></div>
  </fieldset>
}

export function TaskForm({ state, job, initial, mode, close, save }) {
  const [name, setName] = useState(job?.name ?? '')
  const [task, setTask] = useState(initial ?? blankTask)
  const [error, setError] = useState('')
  const editor = useParameters(initial?.parameters)
  const compute = task.compute ?? serverless
  const siblingTasks = list(job?.tasks)
  const dependencyKeys = siblingTasks.filter((item) => item.key !== initial?.key).map((item) => item.key)
  const dependencyOptions = [...new Set([...dependencyKeys, ...list(initial?.dependsOn)])]
  const creating = mode === 'create'
  const missingNotebook = task.notebookId && !find(state.notebooks, task.notebookId)
  const missingCluster = compute.clusterId && !find(state.clusters, compute.clusterId)
  function update(changes) { setTask({ ...task, ...changes }) }
  function submit(event) {
    event.preventDefault()
    if (creating && !name.trim()) return setError('Enter a job name.')
    if (!/^[A-Za-z0-9_-]+$/.test((task.key ?? '').trim())) return setError('Use letters, numbers, hyphens, or underscores for the task key.')
    if (!task.notebookId || (missingNotebook && task.notebookId !== initial?.notebookId)) return setError('Select an available notebook.')
    if (compute.mode === 'cluster' && (!compute.clusterId || (missingCluster && compute.clusterId !== initial?.compute?.clusterId))) return setError('Select an available cluster.')
    const result = editor.toRecord()
    if (result.error) return setError(result.error)
    const record = { ...task, key: (task.key ?? '').trim(), compute, parameters: result.parameters, dependsOn: list(task.dependsOn) }
    const next = initial ? siblingTasks.map((item) => item.key === initial.key ? record : {
      ...item, dependsOn: list(item.dependsOn).map((key) => key === initial.key ? record.key : key),
    }) : [...siblingTasks, record]
    const invalid = validateTasks(next, state, initial ? siblingTasks.map((item) => item.key === initial.key ? { ...item, key: record.key } : item) : siblingTasks)
    if (invalid) return setError(invalid)
    save(next, name.trim())
  }
  return <Dialog title={creating ? 'Create job' : initial ? 'Edit task' : 'Add notebook task'} onClose={close} wide>
    <form onSubmit={submit}>
      {creating && <label>Job name<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></label>}
      <label>Task key<input autoFocus={!creating} required value={task.key ?? ''} onChange={(e) => update({ key: e.target.value })} /></label>
      <label>Notebook<select required value={task.notebookId ?? ''} onChange={(e) => update({ notebookId: e.target.value })}>
        <option value="">Choose a notebook</option>
        {missingNotebook && <option value={task.notebookId}>Unavailable notebook ({task.notebookId})</option>}
        {list(state.notebooks).map((nb) => <option key={nb.id} value={nb.id}>{pathFor(nb)}</option>)}
      </select></label>
      {!list(state.notebooks).length && <p className="muted">Add a notebook in <SiteLink to="/workspace">Workspace</SiteLink> to create a task.</p>}
      <label>Execution compute<select value={compute.mode === 'cluster' ? 'cluster' : 'serverless'} onChange={(e) => update({
        compute: { mode: e.target.value, clusterId: e.target.value === 'cluster' ? compute.clusterId : null },
      })}><option value="serverless">Serverless</option><option value="cluster">Named cluster</option></select></label>
      {compute.mode === 'cluster' && <label>Cluster<select required value={compute.clusterId ?? ''} onChange={(e) => update({ compute: { mode: 'cluster', clusterId: e.target.value } })}>
        <option value="">Choose a cluster</option>
        {missingCluster && <option value={compute.clusterId}>Unavailable cluster ({compute.clusterId})</option>}
        {list(state.clusters).map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.name ?? 'Unnamed cluster'} · {cluster.status ?? 'unknown'}</option>)}
      </select></label>}
      <Parameters editor={editor} />
      {dependencyOptions.length > 0 && <fieldset className="check-list"><legend>Depends on</legend>
        {dependencyOptions.map((key) => <label className="inline-label" key={key}>
          <input type="checkbox" checked={list(task.dependsOn).includes(key)} onChange={(e) => update({
            dependsOn: e.target.checked ? [...list(task.dependsOn), key] : list(task.dependsOn).filter((dependency) => dependency !== key),
          })} />{key}{!dependencyKeys.includes(key) && ' (unavailable)'}</label>)}</fieldset>}
      {error && <p className="error" role="alert">{error}</p>}
      <FormActions close={close} label={creating ? 'Create job' : 'Save task'} />
    </form>
  </Dialog>
}

export function SettingsForm({ job, close, save }) {
  const [name, setName] = useState(job.name ?? '')
  const [description, setDescription] = useState(job.description ?? '')
  const [error, setError] = useState('')
  return <Dialog title="Edit job settings" onClose={close}><form onSubmit={(e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a job name.')
    save({ name: name.trim(), description: description.trim() })
  }}>
    <label>Job name<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label>Description<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <FormActions close={close} />
  </form></Dialog>
}

export function ScheduleForm({ schedule, close, save }) {
  const [draft, setDraft] = useState({ frequency: 'daily', time: '08:30', timezone: 'UTC', weekday: 1, paused: false, ...schedule })
  const [error, setError] = useState('')
  function edit(field, value) { setDraft({ ...draft, [field]: value }) }
  return <Dialog title="Configure schedule" onClose={close}><form onSubmit={(e) => {
    e.preventDefault()
    const timezone = (draft.timezone ?? '').trim()
    const timezoneError = 'Enter a valid timezone, such as UTC or America/New_York.'
    if (!timezone || /^[+-]/.test(timezone)) return setError(timezoneError)
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }) } catch { return setError(timezoneError) }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return setError('Choose a time of day.')
    save({ frequency: draft.frequency, time: draft.time, timezone,
      weekday: draft.frequency === 'weekly' ? Number(draft.weekday ?? 1) : null, paused: Boolean(draft.paused) })
  }}>
    <label>Frequency<select autoFocus value={draft.frequency} onChange={(e) => edit('frequency', e.target.value)}>
      <option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
    {draft.frequency === 'weekly' && <label>Weekday<select value={draft.weekday ?? 1} onChange={(e) => edit('weekday', e.target.value)}>
      {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>}
    <div className="form-grid">
      <label>Time<input required type="time" value={draft.time ?? ''} onChange={(e) => edit('time', e.target.value)} /></label>
      <label>Timezone<input required value={draft.timezone ?? ''} onChange={(e) => edit('timezone', e.target.value)} placeholder="America/New_York" /></label>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <FormActions close={close} label="Save schedule" />
  </form></Dialog>
}

export function RunForm({ job, close, run }) {
  const editor = useParameters()
  const [error, setError] = useState('')
  const count = list(job.tasks).length
  return <Dialog title="Run job now" onClose={close}><form onSubmit={(e) => {
    e.preventDefault()
    const result = editor.toRecord()
    if (result.error) return setError(result.error)
    run(result.parameters)
  }}>
    <p>{count} saved {count === 1 ? 'task' : 'tasks'} will run in dependency order.</p>
    <p className="muted">Overrides apply to matching task parameter keys for this run only.</p>
    <Parameters editor={editor} heading="Parameter overrides" />
    {error && <p className="error" role="alert">{error}</p>}
    <FormActions close={close} label="Run now" />
  </form></Dialog>
}
