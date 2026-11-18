import { catalog } from './catalog.js'

const names = [
  'northline-billing-prod', 'harbor-reporting-staging', 'cedar-events-dev', 'northline-console-prod',
  'atlas-search-prod', 'atlas-search-staging', 'cedar-events-prod', 'harbor-reporting-prod',
  'lumen-notify-prod', 'lumen-notify-staging', 'northline-ledger-prod', 'northline-ledger-dev',
  'juniper-catalog-prod', 'juniper-catalog-staging', 'meridian-sync-prod', 'meridian-sync-dev',
  'orchard-web-prod', 'orchard-web-preview', 'summit-analytics-prod', 'summit-analytics-dev',
  'willow-dispatch-prod', 'willow-dispatch-staging', 'forge-integrations-prod', 'forge-sandbox',
  'maple-accounts-prod', 'maple-accounts-staging', 'ridge-ingest-prod', 'ridge-ingest-dev',
  'northline-status-prod', 'northline-docs-preview', 'harbor-archive-prod', 'cedar-lab-dev',
]
const pad = (number) => String(number).padStart(3, '0')
const date = (offset) => new Date(Date.UTC(2026, 9, 12, 14, 30) + offset * 3600000).toISOString()
const releaseId = (appId, version) => ['release', appId, pad(version)].join('-')

export function createInitialData() {
  const account = {
    id: 'usr-avery-morgan', name: 'Avery Morgan',
    email: 'avery.morgan@northline.example', workspaceName: 'Northline Engineering',
  }
  const state = {
    account, apps: [], formations: [], addOns: [], releases: [],
    appEvents: [], dynoEvents: [], addOnEvents: [],
  }
  names.forEach((name, index) => {
    const id = 'app-' + pad(index + 1)
    const actorId = account.id
    const createdAt = date(index * 12)
    const releaseCount = index < 16 ? 4 : 3
    const latestSucceeded = index % 8 === 5 ? releaseCount - 1 : releaseCount
    state.apps.push({
      id, name, actorId, region: index % 3 === 1 ? 'eu' : 'us',
      stack: index % 7 === 3 ? 'heroku-22' : 'heroku-24',
      status: index % 9 === 6 ? 'maintenance' : 'active',
      activeReleaseId: releaseId(id, latestSucceeded),
      createdAt, updatedAt: date(index * 12 + latestSucceeded * 32),
    })
    for (let version = 1; version <= releaseCount; version += 1) {
      let status = 'succeeded'
      if (version > latestSucceeded) status = index % 16 === 5 ? 'failed' : 'pending'
      if (version === 2 && index % 6 === 0) status = 'expired'
      const revision = ((index + 1) * 771911 + version * 213109).toString(16).padStart(7, '0')
      state.releases.push({
        id: releaseId(id, version), appId: id, version, actorId, status,
        type: version === 1 ? 'initial' : 'deploy',
        description: version === 1 ? 'Initial app release' : 'Deploy ' + revision,
        ...(version > 1 && { revision }), createdAt: date(index * 12 + version * 32),
      })
    }
    const processes = index === 31 ? [] : index < 3 ? ['web', 'worker', 'scheduler'] : ['web', 'worker']
    processes.forEach((processType) => {
      const quantity = processType === 'web' ? (index % 3) + 1 : Number(index % 4 !== 2)
      state.formations.push({
        id: ['formation', id, processType].join('-'), appId: id, processType, actorId,
        ...(processType === 'web' && { command: 'npm start' }),
        ...(processType === 'worker' && index % 3 !== 2 && { command: 'node jobs/worker.js' }),
        size: processType === 'web' ? (index % 5 === 4 ? 'standard-2x' : 'standard-1x') : index % 5 === 3 ? 'eco' : 'basic',
        quantity,
        status: quantity ? 'running' : 'stopped', createdAt, updatedAt: date(index * 12 + 40),
      })
    })
    const serviceCount = index < 17 ? 2 : Number(index !== 31)
    for (let slot = 0; slot < serviceCount; slot += 1) {
      const service = catalog[(index + slot) % catalog.length]
      const plan = service.plans[(index + slot) % 2]
      const prefix = ['postgresql', 'redis', 'papertrail'][(index + slot) % catalog.length]
      state.addOns.push({
        id: 'addon-' + id + '-0' + (slot + 1), appId: id, actorId,
        serviceKey: service.key, serviceName: service.name,
        name: prefix + '-' + ['maple', 'clear', 'woven', 'rapid'][index % 4] + '-' + (41826 + index * 27 + slot),
        planKey: plan.key, monthlyPrice: plan.monthlyPrice, status: 'provisioned',
        createdAt, updatedAt: date(index * 12 + 48),
      })
    }
  })
  return state
}
