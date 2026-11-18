const organizationId = 'org_signal'
const actorId = 'acct_avery'
const createdAt = '2026-06-08T15:30:00.000Z'
const future = '2027-01-09T18:00:00.000Z'
const expired = '2026-06-18T18:00:00.000Z'

const projectConfigs = [
  { suffix: 'commerce', name: 'Commerce Platform', clusters: 24, databaseUsers: 30, projectUsers: 26, ipEntries: 30 },
  { suffix: 'lab', name: 'Data Lab', clusters: 4, databaseUsers: 6, projectUsers: 5, ipEntries: 5 },
  { suffix: 'reliability', name: 'Reliability Sandbox', clusters: 3, databaseUsers: 5, projectUsers: 4, ipEntries: 4 },
]
const services = ['catalog', 'checkout', 'orders', 'payments', 'identity', 'inventory', 'pricing', 'search', 'fulfillment', 'analytics']
const stages = ['east', 'west', 'staging']
const locations = [
  ['AWS', 'US_EAST_1'], ['GCP', 'CENTRAL_US'], ['AZURE', 'US_EAST_2'],
  ['AWS', 'US_WEST_2'], ['GCP', 'WESTERN_EUROPE'], ['AZURE', 'EUROPE_WEST'],
]
const tiers = ['M20', 'M10', 'M30', 'FLEX', 'M0', 'M10']
const names = [
  'Avery Chen', 'Morgan Reed', 'Riley Brooks', 'Jordan Patel', 'Sasha Ortiz', 'Casey Nguyen',
  'Devin Park', 'Rowan Blake', 'Cameron Ross', 'Jamie Wells', 'Alex Young', 'Reese Alvarez',
  'Parker Kim', 'Sage Donovan', 'Drew Singh', 'Jules Martin', 'Robin Bell', 'Ellis Brooks',
  'Quinn Flores', 'Marin Zhao', 'Arden James', 'Skyler Ruiz', 'Nico Lawson', 'Samira Hart',
  'Noah Foster', 'Lee Jordan', 'Taylor Quinn',
]
const projectRoles = ['GROUP_READ_ONLY', 'GROUP_CLUSTER_MANAGER', 'GROUP_DATA_ACCESS_READ_ONLY', 'GROUP_OWNER']
const networkComments = [
  'Warehouse CI runner', 'Office VPN', 'Inventory integration', 'Checkout monitoring',
  'Data pipeline gateway', 'Incident response VPN', 'Release validation', 'Support operations',
  'Reporting collector', 'Build worker',
]

const emailFor = name => {
  if (name === 'Avery Chen') return 'avery@signalharbor.example'
  if (name === 'Taylor Quinn') return 'taylor@signalharbor.example'
  return name.toLowerCase().replace(' ', '.') + '@signalharbor.example'
}
const numbered = (prefix, suffix, index) => prefix + '_' + suffix + '_' + String(index + 1).padStart(2, '0')
const generate = (length, create) => Array.from({ length }, (_, index) => create(index))

export function createInitialData() {
  const projects = projectConfigs.map(({ suffix, name }) => ({ id: 'proj_' + suffix, organizationId, name }))
  const organizationMembers = names.map(name => ({ id: 'orgmem_' + name.split(' ')[0].toLowerCase(), organizationId, name, email: emailFor(name) }))
  const clusters = []
  const databaseUsers = []
  const projectUsers = []
  const ipAccessList = []
  const activityLog = []

  projectConfigs.forEach((config, projectIndex) => {
    const { suffix } = config
    const projectId = projects[projectIndex].id
    const base = index => {
      const time = index % 3 === 0 ? createdAt : '2026-06-12T13:00:00.000Z'
      return { projectId, createdAt: time, createdBy: actorId, updatedAt: time, updatedBy: actorId }
    }
    const projectClusters = generate(config.clusters, index => {
      const [provider, region] = locations[index % locations.length]
      const tier = tiers[index % tiers.length]
      const dedicated = tier.startsWith('M') && tier !== 'M0'
      const service = services[index % services.length]
      const stage = stages[Math.floor(index / services.length)]
      const name = projectIndex ? suffix + '-' + service : ['commerce-east', 'checkout-primary'][index] || service + '-' + stage
      return {
        id: numbered('cl', suffix, index), ...base(index), name, provider, region, tier,
        mongoVersion: dedicated && index % 3 === 1 ? '7.0' : '8.0',
        diskSizeGB: dedicated ? 20 + (index % 4) * 10 : null,
        backupEnabled: dedicated && index % 3 !== 1,
        terminationProtection: index % 7 === 0,
        status: dedicated && index % 4 === 2 ? 'paused' : 'active',
      }
    })
    clusters.push(...projectClusters)
    databaseUsers.push(...generate(config.databaseUsers, index => {
      const service = services[index % services.length]
      const duty = ['reader', 'writer', 'service'][Math.floor(index / services.length)]
      return {
        id: numbered('dbu', suffix, index), ...base(index), username: service + '_' + duty,
        authMethod: 'SCRAM', authDatabase: 'admin',
        roles: index % 7 === 6 ? [{ roleName: 'readAnyDatabase', databaseName: 'admin' }] :
          [{ roleName: index % 3 ? 'readWrite' : 'read', databaseName: service }],
        clusterIds: index % 3 === 1 ? [projectClusters[index % projectClusters.length].id] : null,
        expiresAt: index % 9 === 3 ? expired : index % 9 === 6 ? future : null,
        status: 'active',
      }
    }))
    projectUsers.push(...generate(config.projectUsers, index => {
      const member = organizationMembers[index]
      const pending = index % 6 === 5
      return {
        id: numbered('pu', suffix, index), ...base(index),
        email: pending ? member.name.toLowerCase().replace(' ', '.') + '@ridgepartners.example' : member.email,
        ...(pending ? { invitedAt: '2026-11-14T16:15:00.000Z', expiresAt: '2026-12-14T16:15:00.000Z' } : { name: member.name }),
        roles: index === 0 ? ['GROUP_OWNER'] : index % 5 === 0 ? projectRoles.slice(0, 2) : [projectRoles[index % 3]],
        status: pending ? 'pending' : 'active',
      }
    }))
    ipAccessList.push(...generate(config.ipEntries, index => ({
      id: numbered('ip', suffix, index), ...base(index),
      address: index % 5 === 4 ? '203.0.113.' + Math.floor(index / 5) * 32 + '/27' :
        (index % 2 ? '192.0.2.' : '198.51.100.') + (index + 24),
      comment: networkComments[index % networkComments.length] + (index >= 10 ? ' · ' + ['East', 'West'][Math.floor(index / 10) - 1] : ''),
      expiresAt: index % 5 === 1 ? expired : index % 5 === 3 ? future : null, status: 'active',
    })))
    const firstCluster = projectClusters[0]
    activityLog.push({
      id: numbered('evt', suffix, 0), projectId, actorId, entityType: 'cluster', entityId: firstCluster.id,
      action: 'cluster.created', status: 'completed', createdAt: firstCluster.createdAt,
      changes: Object.fromEntries(Object.entries(firstCluster).map(([field, value]) => [field, { before: null, after: value }])),
    })
  })

  return {
    organization: { id: organizationId, name: 'Signal Harbor' },
    account: { id: actorId, name: 'Avery Chen', email: 'avery@signalharbor.example', organizationId, defaultProjectId: projects[0].id },
    organizationMembers, projects, clusters, databaseUsers, projectUsers, ipAccessList, activityLog,
  }
}
