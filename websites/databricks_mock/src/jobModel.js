import { fixtureOutput } from './data/seed.js'
import { find, list, uid } from './model.js'

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const jobName = (job) => job.name ?? 'Untitled job'
export const scheduleLabel = (schedule) => !schedule ? 'Manual' : schedule.paused ? 'Paused' : schedule.frequency === 'weekly' ? 'Weekly' : 'Daily'

function orderTasks(tasks) {
  const pending = [...tasks]
  const done = new Set()
  const ordered = []
  while (pending.length) {
    const index = pending.findIndex((task) => list(task.dependsOn).every((key) => done.has(key)))
    if (index === -1) break
    const [task] = pending.splice(index, 1)
    ordered.push(task)
    done.add(task.key)
  }
  return { ordered, pending }
}

export function validateTasks(tasks, state, previous = []) {
  const keys = new Set(tasks.map((task) => task.key))
  if (keys.size !== tasks.length) return 'Task keys must be unique.'
  for (const task of tasks) {
    const oldTask = previous.find((item) => item.key === task.key)
    if (!find(state.notebooks, task.notebookId) && oldTask?.notebookId !== task.notebookId) return 'Select an available notebook.'
    if (task.compute?.mode === 'cluster' && !find(state.clusters, task.compute.clusterId) &&
      oldTask?.compute?.clusterId !== task.compute.clusterId) return 'Select an available cluster.'
    if (list(task.dependsOn).some((key) => !keys.has(key))) return 'Every dependency must reference a saved task.'
  }
  if (orderTasks(tasks).pending.length) return 'Task dependencies cannot contain a cycle.'
  return ''
}

export function executeJob(state, job, parameterOverrides, context) {
  const { ordered, pending } = orderTasks(list(job.tasks))
  const completed = new Map()
  function execute(task, unresolved = false) {
    const notebook = find(state.notebooks, task.notebookId)
    const compute = task.compute ?? { mode: 'serverless', clusterId: null }
    const cluster = find(state.clusters, compute.clusterId)
    const parameters = Object.fromEntries(Object.entries(task.parameters ?? {}).map(([key, value]) => [
      key, Object.hasOwn(parameterOverrides, key) ? parameterOverrides[key] : value,
    ]))
    const skipped = !unresolved && list(task.dependsOn).some((key) => completed.get(key) !== 'succeeded')
    let error = ''
    if (unresolved) error = 'The task has an unresolved or cyclic dependency.'
    else if (skipped) error = 'A prerequisite task did not succeed.'
    else if (!notebook) error = 'The selected notebook is unavailable.'
    else if (compute.mode === 'cluster' && cluster?.status !== 'running') error = 'The selected compute is unavailable.'
    const status = skipped ? 'skipped' : error ? 'failed' : 'succeeded'
    completed.set(task.key, status)
    const cell = list(notebook?.cells).find((item) => item.kind !== 'markdown' && (item.source ?? '').trim())
    return { ...task, compute, parameters, dependsOn: list(task.dependsOn), notebookName: notebook?.name ?? null, status,
      startedAt: skipped ? null : context.createdAt, endedAt: context.createdAt,
      output: error ? { kind: 'error', text: error } : fixtureOutput(cell?.language ?? notebook?.language, cell?.source) }
  }
  const tasks = [...ordered.map((task) => execute(task)), ...pending.map((task) => execute(task, true))]
  return { id: uid('run'), jobId: job.id, jobName: jobName(job), ...context,
    trigger: 'manual', status: tasks.length && tasks.every((task) => task.status === 'succeeded') ? 'succeeded' : 'failed',
    startedAt: context.createdAt, endedAt: context.createdAt, canceledAt: null, canceledBy: null, parameterOverrides, tasks }
}
