const owner = 'usr-avery'
const organization = 'ns-northstar'
const personal = 'ns-avery'
const createdAt = '2025-08-18T09:00:00.000Z'

const repositoryFixtures = [
  ['edge-router', 'Ingress routing for Northstar services.'],
  ['build-runner', 'Isolated workers for continuous integration pipelines.'],
  ['artifact-mirror', 'Regional cache for build artifacts and packages.'],
  ['policy-engine', 'Evaluates deployment policies at admission time.'],
  ['metrics-collector', 'Collects and forwards infrastructure metrics.'],
  ['event-relay', 'Routes change events between internal services.'],
  ['identity-gateway', 'Token exchange and identity verification service.'],
  ['catalog-api', 'Serves the internal service and ownership catalog.'],
  ['log-forwarder', 'Streams application logs to the observability cluster.'],
  ['postgres-tools', 'Database backup and restore utilities.'],
  ['web-runtime', 'Shared base image for server-rendered applications.'],
  ['worker-base', 'Minimal runtime for background job workers.'],
  ['release-cli', 'Command line utilities for preparing releases.'],
  ['schema-registry', 'Versioned schemas for internal event contracts.'],
  ['cache-proxy', 'Read-through cache for the regional API tier.'],
  ['trace-sampler', 'Adaptive sampling for distributed traces.'],
  ['queue-bridge', 'Connects legacy task queues to managed workers.'],
  ['data-exporter', 'Packages scheduled data exports for internal teams.'],
  ['preview-router', 'Routes temporary environments by branch name.'],
  ['container-lint', 'Checks internal image labels and package policies.'],
  ['key-rotator', 'Rotates service credentials on scheduled runs.'],
  ['backup-verifier', 'Verifies the integrity of database backups.'],
  ['traffic-replay', 'Replays synthetic requests in staging environments.'],
  ['config-renderer', 'Renders deployment configuration from templates.'],
  ['status-publisher', 'Publishes service health snapshots.'],
  ['dependency-scan', 'Inventories dependencies for security review.'],
  ['test-fixtures', 'Reusable resources for integration test environments.'],
  ['job-scheduler', 'Dispatches periodic maintenance jobs.'],
  ['migration-tools', 'Utilities for approved schema migrations.'],
  ['sandbox-runtime', 'Experimental base image for the platform team.'],
  ['build-runner', 'Personal experiments with rootless build workers.'],
  ['shell-workbench', 'Portable shell configuration and development tools.'],
  ['sample-web', 'Example application for testing image builds.'],
  ['image-inspector', 'Utilities for inspecting local image metadata.'],
  ['release-notes', 'Personal tooling for collecting changelog entries.'],
  ['network-lab', 'Local networking examples for container workshops.'],
]

const teamFixtures = [
  ['release-engineering', 'Publishes release images and maintains deployment channels.'],
  ['security-review', 'Reviews dependency scans and image access requests.'],
  ['observability', 'Owns metrics, logs, and distributed tracing.'],
  ['platform-runtime', 'Maintains the service runtime and base images.'],
  ['developer-tools', 'Builds tooling for local development and CI.'],
  ['data-platform', 'Operates data exports and event contracts.'],
  ['identity', 'Maintains service-to-service authentication.'],
  ['networking', 'Operates ingress and regional routing.'],
  ['database-operations', 'Manages database backups and migrations.'],
  ['service-catalog', 'Maintains service ownership and metadata.'],
  ['quality-engineering', 'Maintains integration test environments.'],
  ['site-reliability', 'Owns production reliability and incident tooling.'],
  ['deployment', 'Operates deploy pipelines and job scheduling.'],
  ['compliance', 'Maintains repository access review records.'],
  ['architecture', 'Reviews shared platform interfaces.'],
  ['performance', 'Profiles services and maintains replay tooling.'],
  ['api-platform', 'Supports shared API and caching services.'],
  ['event-streaming', 'Maintains event relays, queues, and consumers.'],
  ['support-tools', 'Maintains tools for internal support teams.'],
  ['research', 'Runs time-boxed infrastructure experiments.'],
  ['edge-services', 'Maintains edge workers and request routing.'],
  ['documentation', 'Maintains developer examples and tooling guides.'],
  ['partner-integrations', 'Supports incoming partner integrations.'],
  ['launch-readiness', 'Coordinates operational checks for new services.'],
]

const names = [
  'Avery Chen', 'Morgan Bell', 'Jordan Kim', 'Casey Patel', 'Riley Brooks', 'Taylor Reed',
  'Jamie Lin', 'Dakota Foster', 'Harper Diaz', 'Charlie Cole', 'Rowan Shah', 'Alex Rivera',
  'Cameron Park', 'Sage Ellis', 'Quinn Flores', 'Sydney Howard', 'Robin Zhao', 'Emerson Lane',
  'Finley Clark', 'Skyler Evans', 'Parker Singh', 'Hayden Ross', 'Reese Ford', 'Drew Martin',
  'Micah Ortiz', 'Blake Hall', 'Eden Ward', 'Jules Nguyen', 'Remy Turner', 'Ari Stewart',
  'Logan Wright', 'Marin Scott', 'Sam Brooks', 'Ellis Moore', 'Devon James', 'Max Allen',
  'Noel Baker', 'Kai Wilson', 'Lane Young', 'Shiloh Meyer',
]

const releaseTags = ['latest', 'stable', '2.8.0', '2.8', '2.8.0-rc.2', '2.8.0-rc.1', '2.7.4',
  '2.7.3', '2.7.2', '2.7.1', '2.7.0', '2.7', '2.6.5', '2.6.4', '2.6.3', '2.6.2',
  '2.6.1', '2.6.0', '2.6', 'nightly', 'canary', 'dev', 'alpine', 'fips']
const levels = ['read_only', 'read_write', 'admin']

function metadata(updatedAt = createdAt, creation = createdAt) {
  return { status: 'active', createdAt: creation, createdBy: owner, updatedAt, updatedBy: owner }
}

function repositoryDate(index) {
  return new Date(Date.UTC(2025, 10, 18 - index, 14)).toISOString()
}

function seedTag(repository, repositoryIndex, name, index) {
  const imageIndex = repositoryIndex === 0 && index < 3 ? 2 : index
  const value = (repositoryIndex * 91 + imageIndex * 13 + 4751443).toString(16).padStart(8, '0')
  const digest = 'sha256:' + value.repeat(8)
  const size = 26378240 + repositoryIndex * 528384 + imageIndex * 117760
  const platforms = [{ os: 'linux', architecture: 'amd64', sizeBytes: size }]
  if ((repositoryIndex + imageIndex) % 3 !== 0) {
    platforms.push({ os: 'linux', architecture: 'arm64', sizeBytes: size - 182784 })
  }
  const pushedAt = new Date(Date.parse(repository.updatedAt) - index * 86400000).toISOString()
  return {
    id: repositoryIndex === 0 ? `tag-edge-${name}` : `tag-${repository.id.slice(5)}-${name}`,
    repositoryId: repository.id, name, digest, platforms,
    sizeBytes: platforms.reduce((total, platform) => total + platform.sizeBytes, 0),
    pushedAt, immutable: repositoryIndex === 0 && name === '2.8.0',
    ...metadata(pushedAt, pushedAt),
  }
}

export function createInitialData() {
  const users = names.map(displayName => {
    const [first, last] = displayName.toLowerCase().split(' ')
    return {
      id: `usr-${first}`, username: first + last, displayName,
      email: `${first}@northstar.example`,
    }
  })
  const repositories = repositoryFixtures.map(([name, description], index) => ({
    id: index < 30 ? `repo-${name}` : `repo-personal-${name}`,
    namespaceId: index < 30 ? organization : personal,
    name, description, overview: index % 3 === 2 ? '' :
      index === 0 ? 'Gateway image for staging and production ingress. Use the stable tag for regular deployments.' : `${description} Versioned release images are listed in Tags.`,
    visibility: index % 4 === 1 || index % 4 === 3 ? 'public' : 'private',
    pullCount: index === 0 ? 12540 : (index * 1479 + 113) % 34860,
    ...metadata(repositoryDate(index)),
  }))
  const tags = repositories.flatMap((repository, index) => {
    if (index >= 26 && ![30, 31].includes(index)) return []
    const channels = ['latest', '1.4.0', index % 2 ? 'nightly' : 'stable', index % 3 ? '1.3.0' : 'alpine']
    return (index === 0 ? releaseTags : channels).map((name, tagIndex) => seedTag(repository, index, name, tagIndex))
  })
  const teams = teamFixtures.map(([name, description]) => ({
    id: `team-${name}`, namespaceId: organization, name, description, ...metadata(),
  }))
  const teamMemberships = teams.slice(0, -1).flatMap((team, index) =>
    [0, 1, 2].map(offset => {
      const user = users[(index * 4 + offset * 7) % 32]
      return {
        id: index === 0 && offset === 0 ? 'tm-release-avery' : `tm-${team.name}-${user.id.slice(4)}`,
        teamId: team.id, userId: user.id, ...metadata(),
      }
    }),
  )
  const repositoryPermissions = repositories.slice(0, 20).flatMap((repository, index) =>
    [0, 1].map(offset => {
      const team = teams[(index * 3 + offset * 2) % 23]
      return {
        id: index === 0 && offset === 0 ? 'rp-edge-release' : `rp-${repository.name}-${team.name}`,
        repositoryId: repository.id, teamId: team.id,
        permission: levels[(index + offset + 1) % levels.length], ...metadata(),
      }
    }),
  )
  return {
    account: { userId: owner, defaultNamespaceId: organization },
    namespaces: [
      { id: organization, slug: 'northstar-platform', name: 'Northstar Platform', type: 'organization' },
      { id: personal, slug: 'averychen', name: 'Avery Chen', type: 'personal' },
    ],
    users,
    organizationMembers: users.slice(0, 36).map((user, index) => ({
      id: `om-northstar-${user.id.slice(4)}`, namespaceId: organization, userId: user.id,
      role: index === 0 ? 'owner' : index % 6 === 0 ? 'editor' : 'member',
    })),
    repositories, tags, teams, teamMemberships, repositoryPermissions, activity: [],
  }
}
