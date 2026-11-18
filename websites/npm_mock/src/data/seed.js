const account = { id: 'usr_avery', username: 'avery-chen', displayName: 'Avery Chen', plan: 'private' }
const created = { createdAt: '2025-08-12T14:00:00.000Z', createdBy: account.id }
const fixedId = (prefix, index) => prefix + '_' + String(index + 1).padStart(3, '0')

const orgNames = [
  'northstar-labs', 'papertrail-tools', 'cedar-works', 'riverbend-studio', 'uplink-systems', 'orchard-maps',
  'atlas-relay', 'fieldnotes-dev', 'inkstone-data', 'copperline', 'harbor-signal', 'juniper-builds',
  'frostline', 'woven-console', 'loam-studio', 'lantern-ops', 'spruce-stack', 'bridgewater-dev',
  'seam-collective', 'daymark-tools', 'switchyard-labs', 'redwood-pipeline', 'mosaic-runtime', 'kiln-works',
]

const projectSpecs = [
  ['trace-buffer', 'Bounded event buffers for background workers.'],
  ['config-catalog', 'Typed configuration manifests for distributed services.'],
  ['pulse-reporter', 'Structured build metrics for continuous integration.'],
  ['release-digest', 'Summaries of package changes for release reviews.'],
  ['fixture-sprout', 'Composable fixtures for integration test suites.'],
  ['log-fold', 'Groups related terminal output for easier scanning.'],
  ['stream-ledger', 'An append-only event ledger for Node streams.'],
  ['retry-window', 'Backoff policies for scheduled background jobs.'],
  ['schema-bridge', 'Translates catalog schemas into type definitions.'],
  ['shell-frames', 'Progress displays for command-line tasks.'],
  ['cache-lens', 'Cache summaries with hit-rate and age statistics.'],
  ['source-compass', 'Resolves source roots in multirepo toolchains.'],
  ['file-queues', 'Small persistent queues backed by local files.'],
  ['test-lantern', 'Collects diagnostics from isolated test workers.'],
  ['request-stamp', 'Adds consistent request metadata to service calls.'],
  ['delta-tape', 'Serializes incremental changes for durable replay.'],
  ['endpoint-map', 'Constructs routing tables from resource definitions.'],
  ['watch-batch', 'Coalesces file watcher events into batches.'],
  ['node-scout', 'Inspects runtime capabilities across Node versions.'],
  ['string-harvest', 'Extracts translatable labels from source files.'],
  ['report-stitch', 'Combines test reports from parallel build jobs.'],
  ['route-fixtures', 'Reusable fixture builders for service routing tests.'],
  ['error-canvas', 'Formats structured diagnostics with source context.'],
  ['binary-spool', 'Spools large byte streams to temporary storage.'],
  ['lint-cards', 'Collects static analysis results for code review.'],
  ['keyed-graphs', 'Builds dependency graphs with stable string IDs.'],
  ['bundle-scan', 'Audits bundle contents from local build manifests.'],
  ['queue-latch', 'Coordinates producer and consumer shutdown.'],
  ['status-wire', 'Emits status events for command-line integrations.'],
  ['type-hatch', 'Generates type definitions from fixture data.'],
  ['readable-clock', 'Formats timestamps for terminal dashboards.'],
  ['sort-hub', 'Stable sorting helpers for registry inventory.'],
  ['path-diff', 'Summarizes directory tree changes between releases.'],
  ['worker-slate', 'Tracks background worker lifecycle events.'],
  ['batch-meter', 'Reports throughput for bulk import jobs.'],
  ['manifest-keeper', 'Validates and normalizes release manifests.'],
  ['task-sieve', 'Selects jobs by labels and execution metadata.'],
  ['edge-parser', 'Parses edge routing configuration files.'],
  ['build-margin', 'Measures size budgets during local builds.'],
  ['terminal-quilt', 'Arranges terminal panels for diagnostic views.'],
]

const colleagues = [
  ['riley-patel', 'Riley Patel'], ['samira-owens', 'Samira Owens'], ['julian-park', 'Julian Park'],
  ['nora-haddad', 'Nora Haddad'], ['marcos-wells', 'Marcos Wells'], ['ina-sato', 'Ina Sato'],
]

const tokenNames = [
  'CI read cache', 'Preview deployments', 'Release publish', 'Dependency mirror', 'Northstar staging',
  'Documentation build', 'Integration runner', 'Registry telemetry', 'Sandbox installs', 'Version monitor',
  'Cedar release bot', 'Build artifacts', 'Organization inventory', 'Audit exports', 'Runtime smoke tests',
  'Catalog ingestion', 'Canary publisher', 'Workspace bootstrap', 'Package analyzer', 'Nightly validation',
  'Archive snapshot', 'Migration dry run', 'Worker pipeline', 'Operations dashboard', 'Atlas synchronization',
  'Fixture publishing', 'Review environment', 'Legacy CI bridge',
]

export function createInitialData() {
  const organizations = orgNames.map((name, i) => ({
    id: fixedId('org', i), name, scope: '@' + name, plan: i % 3 === 1 ? 'public' : 'private', ...created,
  }))
  const packages = projectSpecs.map(([project, description], i) => {
    const orgIndex = i < 3 ? 0 : (i >= 19 ? (i === 19 ? 1 : 2 + (i - 20) % 15) : null)
    const org = organizations[orgIndex]
    const scope = org?.scope ?? ((i % 3 === 1 && i !== 4) || i === 3 ? '@' + account.username : null)
    const lastPublishedAt = new Date(Date.UTC(2026, 10, 16 - i * 2, 14)).toISOString()
    const version = i === 0 ? '2.4.1' : `${1 + i % 6}.${i % 10}.${1 + i % 5}`
    const deprecated = [8, 15, 27, 36].includes(i)
    return {
      id: fixedId('pkg', i), name: scope ? scope + '/' + project : project,
      description, scope, organizationId: org?.id ?? null, ownerUserId: org ? null : account.id,
      version, versions: [
        { version, tag: 'latest', publishedAt: lastPublishedAt },
        { version: version.slice(0, -1) + '0', tag: 'previous', publishedAt: '2026-07-18T14:00:00.000Z' },
      ],
      weeklyDownloads: i === 0 ? 21400 : 420 + (i * 7821) % 52900, lastPublishedAt,
      visibility: scope && org?.plan !== 'public' && (i === 1 || i % 3 === 1) ? 'private' : 'public',
      status: deprecated ? 'deprecated' : 'active',
      deprecationMessage: deprecated ? 'This package is archived and no longer receives updates.' : null,
      deprecatedAt: deprecated ? '2026-11-02T14:00:00.000Z' : null, deprecatedBy: deprecated ? account.id : null,
      ...created, updatedAt: null, updatedBy: null,
    }
  })
  const organizationMembers = organizations.flatMap((org, i) => {
    const role = i === 1 ? 'member' : ['owner', 'owner', 'admin', 'member'][i % 4]
    const members = [{ ...account, role }, ...colleagues.slice(0, i === 0 ? 5 : 1).map(([username, displayName], j) => ({
      id: 'usr_' + username, username, displayName, role: role !== 'owner' && j === 0 ? 'owner' : j === 1 ? 'admin' : 'member',
    }))]
    return members.map((member, j) => ({
      id: j === 0 ? fixedId('mem', i) : `mem_${i + 1}_${j + 1}`, organizationId: org.id, userId: member.id,
      username: member.username, displayName: member.displayName, role: member.role, status: 'active', ...created,
      updatedAt: null, updatedBy: null, removedAt: null, removedBy: null,
    }))
  })
  const makeTeam = (id, organizationId, name, description, isDefault = false) => ({
    id, organizationId, name, description, isDefault, status: 'active', ...created, removedAt: null, removedBy: null,
  })
  const teams = [
    ...organizations.map((org, i) => makeTeam(fixedId('team', i), org.id, 'developers', 'Default package maintainers.', true)),
    makeTeam('team_platform', 'org_001', 'platform', 'Runtime tooling and release infrastructure.'),
    makeTeam('team_docs', 'org_001', 'documentation', 'Package guides and examples.'),
    makeTeam('team_qa', 'org_002', 'quality', 'Verification and release checks.'),
  ]
  const teamMembers = teams.slice(0, 24).map((team, i) => ({
    id: fixedId('tm', i), teamId: team.id,
    organizationMemberId: organizationMembers.find(member => member.organizationId === team.organizationId && member.role === 'owner').id,
    status: 'active', ...created, removedAt: null, removedBy: null,
  }))
  teamMembers.push({ id: 'tm_platform', teamId: 'team_platform', organizationMemberId: 'mem_1_2',
    status: 'active', ...created, removedAt: null, removedBy: null })
  const teamPackageGrants = [
    ['team_001', 'pkg_001', 'read-write'], ['team_platform', 'pkg_001', 'read-only'], ['team_002', 'pkg_020', 'read-write'],
  ].map(([teamId, packageId, permission], i) => ({
    id: fixedId('grant', i), teamId, packageId, permission, status: 'active', ...created,
    updatedAt: null, updatedBy: null, removedAt: null, removedBy: null,
  }))
  const organizationInvitations = [
    ['morgan-wu', 'team_platform', 'pending'], ['jules@example.test', null, 'pending'], ['robin-vale', null, 'revoked'],
  ].map(([invitee, teamId, status], i) => ({
    id: fixedId('inv', i), organizationId: 'org_001', invitee, teamId, status, ...created,
    revokedAt: status === 'revoked' ? '2026-11-02T14:00:00.000Z' : null, revokedBy: status === 'revoked' ? account.id : null,
  }))
  const tokens = tokenNames.map((name, i) => {
    const revoked = i % 7 === 6
    const organizationOnly = i % 4 === 0 && i > 0
    const permission = ['read-only', 'read-only', 'read-write', 'stage-only'][i % 4]
    const selected = i % 3 !== 1 && !organizationOnly
    return {
      id: fixedId('tok', i), name, description: `Granular access for ${name.toLowerCase()}.`,
      maskedValue: 'sim_' + (47344 + i * 107).toString(16) + '••••' + (31777 + i * 122).toString(16),
      status: revoked ? 'revoked' : 'active',
      allowedCidrs: i % 3 === 0 ? ['192.0.2.0/24'] : i % 5 === 0 ? ['2001:db8::/32'] : [],
      bypass2fa: permission === 'read-write' && i % 3 === 0,
      packages: { permission: organizationOnly ? 'none' : permission,
        selection: organizationOnly ? 'none' : selected ? 'selected' : 'all',
        packageIds: selected && i % 2 === 0 ? [packages[i].id] : [],
        scopes: selected && i % 2 === 1 ? [organizations[i % 24].scope] : [] },
      organizations: { permission: organizationOnly ? 'read-only' : 'none', organizationIds: organizationOnly ? [organizations[i % 24].id] : [] },
      expiresAt: i % 5 === 3 ? '2026-07-20T19:00:00.000Z' : '2029-06-18T19:00:00.000Z',
      lastUsedAt: i % 3 === 0 ? '2026-11-12T12:20:00.000Z' : null,
      revokedAt: revoked ? '2026-11-02T14:00:00.000Z' : null, revokedBy: revoked ? account.id : null,
      ...created,
    }
  })
  return { account: { ...account }, packages, tokens, organizations, organizationMembers, organizationInvitations, teams, teamMembers, teamPackageGrants }
}
