export const languages = { python: 'Python', sql: 'SQL', scala: 'Scala', r: 'R' }
export const runtimes = ['15.4 LTS', '16.4 LTS', '17.3 LTS']
export const nodeTypes = ['m5d.xlarge', 'm5d.2xlarge', 'i3.xlarge', 'r5d.xlarge']

const teams = ['Retail', 'Finance', 'Data Platform', 'Customer Insights', 'Logistics', 'Growth']
const datasets = ['Orders', 'Ledger', 'Events', 'Customer profiles', 'Shipments', 'Campaigns']
const notebookKinds = ['quality checks', 'daily extract', 'volume trends', 'schema review', 'reconciliation', 'weekly summary']
const jobKinds = ['Daily refresh', 'Reconcile source', 'Publish aggregates', 'Validate arrivals', 'Weekly report']
const computeKinds = ['analytics shared', 'batch workers', 'development', 'validation']
const userNames = ['Maya Chen', 'Javier Ortiz', 'Priya Raman', 'Samira Bennett', 'Noah Park', 'Alma Reed']
const id = (prefix, index) => prefix + '-' + String(index + 1).padStart(3, '0')
const date = (offset) => new Date(Date.UTC(2026, 9, 2, 14, offset)).toISOString()

export function fixtureOutput(language, source = '') {
  if (/^\s*select\s+42\s+as\s+order_count\s*;?\s*$/i.test(source)) {
    return { kind: 'table', columns: ['order_count'], rows: [[42]] }
  }
  if (language === 'sql') {
    return { kind: 'table', columns: ['region', 'records'], rows: [['East', 14], ['West', 10]] }
  }
  return { kind: 'text', text: 'Processed 24 synthetic records.' }
}

export function createInitialData() {
  const workspace = { id: 'ws-acme', name: 'Acme Analytics' }
  const users = userNames.map((name) => ({
    id: 'usr-' + name.split(' ')[0].toLowerCase(), name,
    email: name.toLowerCase().replace(' ', '.') + '@acme.example',
  }))
  const person = (index) => users[index % users.length]
  const clusters = Array.from({ length: 24 }, (_, i) => {
    const ownerId = person(i).id
    const status = i % 4 === 3 ? 'terminated' : 'running'
    return {
      id: id('cl', i), name: teams[i % 6] + ' ' + computeKinds[Math.floor(i / 6)], ownerId,
      runtime: runtimes[(i + 1) % 3], nodeType: nodeTypes[i % 4],
      scaling: [{ mode: 'autoscale', minWorkers: 2, maxWorkers: 6 }, { mode: 'single' }, { mode: 'fixed', workers: 4 }][i % 3],
      autoTerminationMinutes: [45, 20, 60, 0][i % 4], status, createdBy: ownerId, updatedBy: ownerId,
      createdAt: date(i), updatedAt: date(250 + i), lastStartedAt: date(i),
      lastRestartedAt: status === 'running' ? date(250 + i) : null,
      lastTerminatedAt: status === 'terminated' ? date(250 + i) : null,
    }
  })
  const notebooks = Array.from({ length: 36 }, (_, i) => {
    const owner = person(i)
    const language = ['sql', 'python', 'scala', 'r'][i % 4]
    const dataset = datasets[i % 6]
    const folder = ['/Shared/Retail', '/Shared/Finance', '/Teams/Data Platform', '/Users/' + owner.email][i % 4]
    return {
      id: id('nb', i), name: dataset + ' ' + notebookKinds[Math.floor(i / 6)], folder, language,
      ownerId: owner.id, createdBy: owner.id, updatedBy: owner.id, createdAt: date(30 + i), updatedAt: date(400 + i),
      clusterId: i % 5 ? clusters[i % 18].id : i === 0 ? clusters[0].id : null,
      cells: [
        { id: id('cell', i * 2), kind: 'code', language, source: {
          sql: 'SELECT 42 AS order_count', python: 'print("Review synthetic extract")',
          scala: 'println("Review synthetic extract")', r: 'print("Review synthetic extract")',
        }[language] },
        { id: id('cell', i * 2 + 1), kind: 'markdown', language: null, source: '# ' + dataset + '\nReview the latest synthetic extract before publication.' },
      ],
    }
  })
  const notebookRuns = notebooks.map((nb, i) => {
    const cell = nb.cells[0]
    const status = i % 9 === 8 ? 'failed' : 'succeeded'
    return {
      id: id('nbr', i), notebookId: nb.id, notebookName: nb.name, clusterId: nb.clusterId || clusters[0].id,
      actorId: nb.ownerId, status, scope: 'cell', createdAt: date(700 + i), endedAt: date(701 + i), cellIds: [cell.id],
      results: [{ cellId: cell.id, language: cell.language, source: cell.source, status,
        output: status === 'failed' ? { kind: 'error', text: 'The sample extract was unavailable.' } : fixtureOutput(cell.language, cell.source) }],
    }
  })
  const jobs = Array.from({ length: 30 }, (_, i) => {
    const ownerId = person(i).id
    const first = {
      key: 'validate-extract', notebookId: notebooks[i].id,
      compute: i % 4 === 1 ? { mode: 'cluster', clusterId: clusters[i % 16].id } : { mode: 'serverless', clusterId: null },
      parameters: { region: i % 2 ? 'east' : 'west' }, dependsOn: [],
    }
    return {
      id: id('job', i), name: jobKinds[Math.floor(i / 6)] + ' · ' + teams[i % 6],
      description: 'Review the ' + datasets[i % 6].toLowerCase() + ' extract and publish validation results.',
      ownerId, createdBy: ownerId, updatedBy: ownerId, createdAt: date(70 + i), updatedAt: date(500 + i),
      tasks: i % 3 ? [first] : [first, {
        key: 'summarize-results', notebookId: notebooks[i + 6].id, compute: { mode: 'serverless', clusterId: null },
        parameters: {}, dependsOn: [first.key],
      }],
      schedule: i % 3 === 0 ? null : {
        frequency: i % 3 === 1 ? 'daily' : 'weekly', time: '08:30', timezone: i % 2 ? 'America/New_York' : 'UTC',
        weekday: i % 3 === 1 ? null : 1, paused: i % 7 === 0,
      },
    }
  })
  const jobRuns = Array.from({ length: 60 }, (_, i) => {
    const job = jobs[i % 30]
    const status = i === 31 ? 'running' : i === 34 ? 'queued' : i % 13 === 12 ? 'canceled' : i % 7 === 6 ? 'failed' : 'succeeded'
    const createdAt = date(1100 + i * 2)
    const startedAt = status === 'queued' ? null : createdAt
    const endedAt = ['running', 'queued'].includes(status) ? null : date(1101 + i * 2)
    return {
      id: id('run', i), jobId: job.id, jobName: job.name, actorId: job.ownerId,
      trigger: job.schedule && i % 2 ? 'scheduled' : 'manual', status, createdAt, startedAt, endedAt,
      canceledAt: status === 'canceled' ? endedAt : null, canceledBy: status === 'canceled' ? job.ownerId : null,
      parameterOverrides: {}, tasks: job.tasks.map((task, index) => {
        const nb = notebooks.find((item) => item.id === task.notebookId)
        const taskStatus = status === 'failed' && index > 0 ? 'skipped' : status === 'running' && index > 0 ? 'queued' : status
        return { ...task, notebookName: nb.name, status: taskStatus,
          startedAt: ['queued', 'skipped'].includes(taskStatus) ? null : startedAt, endedAt,
          output: taskStatus === 'succeeded' ? fixtureOutput(nb.language, nb.cells[0].source)
            : taskStatus === 'failed' ? { kind: 'error', text: 'The sample extract was unavailable.' } : null,
        }
      }),
    }
  })
  const clusterEvents = clusters.flatMap((cluster, i) => [
    { id: id('cle', i * 2), clusterId: cluster.id, clusterName: cluster.name, actorId: cluster.ownerId,
      action: 'created', previousStatus: null, status: 'running', createdAt: cluster.createdAt, changes: {} },
    { id: id('cle', i * 2 + 1), clusterId: cluster.id, clusterName: cluster.name, actorId: cluster.ownerId,
      action: cluster.status === 'running' ? 'restarted' : 'terminated', previousStatus: 'running',
      status: cluster.status, createdAt: cluster.updatedAt, changes: {} },
  ])
  const activity = jobRuns.slice(-12).map((run, i) => ({
    id: id('act', i), entityType: 'job', entityId: run.jobId, entityName: run.jobName, action: 'run_started',
    actorId: run.actorId, createdAt: run.createdAt, relatedId: run.id, changes: { status: run.status },
  }))
  return { workspace, currentUser: users[0], users, notebooks, notebookRuns, jobs, jobRuns, clusters, clusterEvents, activity }
}
