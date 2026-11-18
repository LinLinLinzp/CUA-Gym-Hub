import { roles, zones, machines, images, locations, classes, services } from './catalog.js'

const many = (n, make) => Array.from({ length: n }, (_, i) => make(i))
const id = (prefix, i) => prefix + '-' + String(i + 1).padStart(3, '0')
const pick = (values, i) => values[i % values.length]
const createdAt = '2026-10-08T14:00:00.000Z'
const actorId = 'user-riley-morgan'
const creation = { createdAt, actorId }

const people = ['riley.morgan', 'avery.chen', 'jordan.patel', 'samira.khan', 'mateo.silva', 'hana.park', 'taylor.reed', 'mira.shah',
  'elliot.brooks', 'lena.ortiz', 'noah.kim', 'maya.foster', 'owen.price', 'zoe.carter', 'imani.james', 'kai.wilson']
const groups = ['platform-ops', 'data-platform', 'release-engineering', 'cloud-finance', 'security-review', 'site-reliability']
const agents = ['artifact-publisher', 'report-exporter', 'telemetry-ingest', 'snapshot-agent', 'batch-runner', 'asset-indexer']
const workloads = ['edge-router', 'api-gateway', 'ingest-worker', 'metrics-relay', 'search-index', 'batch-dispatch', 'build-runner', 'event-proxy', 'report-worker']
const datasets = ['telemetry-raw', 'release-artifacts', 'analytics-exports', 'network-flow', 'platform-docs', 'snapshot-staging',
  'access-logs', 'media-archive', 'deployment-state', 'security-events', 'index-backups', 'build-cache']
const budgetNames = ['Platform monthly operations', 'Compute capacity', 'Storage retention', 'Network delivery',
  'Observability services', 'Staging operations', 'Release engineering', 'Disaster recovery', 'Shared infrastructure',
  'Data processing', 'Artifact retention', 'Developer tooling', 'Production safeguards', 'Fleet maintenance',
  'Security telemetry', 'Regional workloads', 'Archive storage', 'Integration testing', 'Traffic forecasting',
  'Operational reserves', 'Build capacity', 'Platform support', 'Reporting services', 'Service growth']

export function createInitialData() {
  const currentUser = { id: actorId, displayName: 'Riley Morgan', email: 'riley.morgan@example.test' }
  const billingAccounts = [
    { id: 'billing-northstar', name: 'Northstar Operating Account', currency: 'USD', status: 'active' },
    { id: 'billing-research', name: 'Research and Innovation', currency: 'USD', status: 'active' },
  ]
  const projects = [
    ['northstar-platform', 'Northstar Platform', '794120603815', billingAccounts[0].id],
    ['ridge-staging', 'Ridge Staging', '794120603827', billingAccounts[0].id],
    ['studio-research', 'Studio Research', '794120603839', billingAccounts[1].id],
    ['greenfield-sandbox', 'Greenfield Sandbox', '794120603851', null],
  ].map(([id, name, number, billingAccountId]) => ({ id, name, number, billingAccountId, ...creation }))
  const projectFor = (i, cutoff = 24) => projects[i < cutoff ? 0 : 1 + ((i - cutoff) % 3)]
  const principals = [
    ...people.map(name => ['user', name + '@example.test']),
    ...groups.map(name => ['group', name + '@example.test']),
    ...agents.map(name => ['serviceAccount', name + '@northstar.iam.example.test']),
  ]
  const iamBindings = many(36, i => {
    const [principalType, principal] = principals[i < 28 ? i : i - 13]
    return { id: id('iam', i), projectId: projectFor(i, 32).id, principalType, principal,
      roleId: pick(Object.keys(roles), i), source: i % 7 ? 'direct' : 'inherited',
      ...(i % 7 === 0 ? { sourceName: 'Northstar Organization' } : {}), status: 'active', ...creation }
  })
  const vmInstances = many(36, i => {
    const region = pick(Object.keys(zones), i)
    return { id: id('vm', i), projectId: projectFor(i).id,
      name: pick(workloads, i) + '-' + String(Math.floor(i / workloads.length) + 1).padStart(2, '0'),
      region, zone: pick(zones[region], Math.floor(i / 3)), machineType: pick(machines, i + 3),
      bootImage: pick(Object.keys(images), i), bootDiskGb: 30 + (i % 4) * 20,
      internalIp: '10.24.0.' + (i + 11), externalIp: i % 3 === 0 ? '192.0.2.' + (i + 11) : null,
      status: i % 4 === 1 ? 'TERMINATED' : 'RUNNING', ...creation }
  })
  const buckets = many(36, i => {
    const project = projectFor(i)
    const locationType = pick(Object.keys(locations), i)
    return { id: id('bucket', i), projectId: project.id,
      name: project.id.split('-')[0] + '-' + pick(datasets, i) + (i < 12 ? '' : '-' + (Math.floor(i / 12) + 1)),
      locationType, location: pick(locations[locationType], Math.floor(i / 3)),
      storageClass: pick(Object.keys(classes), i), accessMode: i % 9 ? 'uniform' : 'fine-grained',
      publicAccessPrevention: i % 7 !== 0, status: 'active', ...creation }
  })
  const filenames = [['access-log.ndjson', 'application/x-ndjson'], ['export.csv', 'text/csv'],
    ['manifest.json', 'application/json'], ['snapshot.tar.gz', 'application/gzip']]
  const storageObjects = many(72, i => {
    const [filename, contentType] = pick(filenames, i)
    return { id: id('object', i), bucketId: buckets[Math.floor(i / 4)].id,
      name: '2026/10/' + filename, sizeBytes: 20480 + i * 4096, contentType, status: 'active', ...creation }
  })
  const billingCosts = many(96, i => {
    const month = i < 48 ? '10' : '11'
    const project = projects[i % 6 === 0 ? 2 : i % 4 === 0 ? 1 : 0]
    return { id: id('cost', i), billingAccountId: project.billingAccountId, projectId: project.id,
      date: '2026-' + month + '-' + String(1 + Math.floor((i % 48) / 3)).padStart(2, '0'),
      service: pick(services, Math.floor(i / 3) + i), amount: (235 + (i * 791) % 7900) / 100, currency: 'USD' }
  })
  const budgets = budgetNames.map((name, i) => ({
    id: id('budget', i), billingAccountId: billingAccounts[0].id, name,
    projectIds: i % 4 === 1 ? [projects[0].id] : i % 4 === 2 ? [projects[1].id] : [],
    period: 'monthly', amount: i === 0 ? 1200 : 175 + 75 * i, currency: 'USD',
    thresholds: [{ percent: 50, basis: 'actual' }, { percent: 90, basis: 'forecast' }, { percent: 100, basis: 'actual' }],
    status: 'active', ...creation,
  }))
  const activity = many(16, i => {
    const index = Math.floor(i / 3)
    const [kind, record, changes] = [
      ['vm.create', vmInstances[index * 4], { name: vmInstances[index * 4].name, zone: vmInstances[index * 4].zone, status: 'RUNNING' }],
      ['bucket.create', buckets[index], { name: buckets[index].name, location: buckets[index].location, status: 'active' }],
      ['iam.grant', iamBindings[index], { principal: iamBindings[index].principal, roleId: iamBindings[index].roleId, status: 'active' }],
    ][i % 3]
    return { id: id('activity', i), kind, entityId: record.id, projectId: record.projectId, changes, actorId,
      createdAt: '2026-11-' + String(i + 1).padStart(2, '0') + 'T14:00:00.000Z' }
  })
  return { currentUser, projects, iamBindings, vmInstances, buckets, storageObjects, billingAccounts, billingCosts, budgets, activity }
}
