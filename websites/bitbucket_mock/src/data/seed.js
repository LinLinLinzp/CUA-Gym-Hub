import { CONFIG_PATH, STARTER_CONFIG, fixtureSteps } from './pipelineFixtures.js'

const workspaces = [
  ['ws-northstar', 'northstar-engineering', 'Northstar Engineering'],
  ['ws-pinecone', 'pinecone-labs', 'Pinecone Labs'],
]
const projects = [
  ['platform', 'PLAT', 'Platform', 'Shared services and application infrastructure'],
  ['experience', 'CX', 'Customer Experience', 'Customer-facing products and support tooling'],
  ['data', 'DATA', 'Data', 'Analytics, event streams and data contracts'],
  ['developer-tools', 'DEV', 'Developer Tools', 'Build tooling and developer experience'],
  ['research', 'RES', 'Research', 'Experiments, notebooks and reproducible evaluations'],
  ['infrastructure', 'INFRA', 'Infrastructure', 'Cloud operations and service reliability'],
]
const people = [
  'Riley Chen', 'Maya Patel', 'Oliver Grant', 'Zoe Fernández', 'Noah Williams', 'Ava Brooks',
  'Sofia Rivera', 'Ethan Park', 'Amara Okafor', 'Lucas Meyer', 'Isabel Santos', 'Liam Novak',
  'Nina Kapoor', 'Hugo Martin', 'Elena Rossi', 'Kai Tanaka', 'Fatima Abdi', 'Theo Lambert',
  'Grace Liu', 'Samira Haddad', 'Owen Clarke', 'Leila Mansour', 'Mateo Díaz', 'Alex Morgan',
]
const repositoryFixtures = [
  ['atlas-api', 0, 'Public transit routing API and route planning services'],
  ['dockyard-web', 1, 'Operations dashboard for dispatch and support teams'],
  ['ledger-reconciliation', 2, 'Daily settlement and reconciliation jobs'],
  ['event-ingest', 2, 'Validation and ingestion for streaming events'],
  ['signal-notifications', 1, 'Email and in-app notification delivery'],
  ['fleet-scheduler', 0, 'Vehicle scheduling and depot allocation'],
  ['northstar-cli', 3, 'Command-line tools for internal development'],
  ['auth-gateway', 0, 'Session handling and gateway authorization'],
  ['customer-portal', 1, 'Account management and billing portal'],
  ['metrics-publisher', 2, 'Operational metrics and reporting exports'],
  ['design-tokens', 1, 'Shared colors, spacing and typography tokens'],
  ['ci-templates', 3, 'Reusable build and test workflows'],
  ['route-planner', 0, 'Real-time routing and connection planning'],
  ['station-directory', 0, 'Station details and accessibility metadata'],
  ['support-workbench', 1, 'Case triage and customer support workflows'],
  ['warehouse-models', 2, 'Transformation models for the analytics warehouse'],
  ['schema-registry', 2, 'Versioned schemas for inter-service messages'],
  ['sdk-typescript', 3, 'TypeScript client for Northstar APIs'],
  ['sdk-python', 3, 'Python client for Northstar APIs'],
  ['billing-service', 0, 'Invoice generation and account balances'],
  ['webhook-relay', 0, 'Reliable delivery of signed webhook events'],
  ['feedback-collector', 1, 'Product feedback forms and event handling'],
  ['search-indexer', 2, 'Incremental indexing for public station search'],
  ['release-notes', 3, 'Release note generation and changelog tooling'],
  ['status-dashboard', 0, 'Public service status and incident history'],
  ['partner-onboarding', 1, 'Partner account provisioning and setup'],
  ['csv-toolkit', 2, 'Helpers for reading and writing operational reports'],
  ['sandbox-repository', 3, 'An empty workspace for trying Source and Pipelines'],
  ['trajectory-models', 4, 'Forecasting experiments for mobility data'],
  ['evaluation-harness', 4, 'Repeatable benchmark runner and comparisons'],
  ['sensor-notebooks', 4, 'Exploratory notebooks for environmental sensors'],
  ['dataset-manifest', 4, 'Dataset manifests and reproducibility metadata'],
  ['cluster-operations', 5, 'Deployment manifests and cluster runbooks'],
  ['artifact-mirror', 5, 'Package and artifact mirroring service'],
  ['lab-observability', 5, 'Monitoring dashboards and alerts for the lab'],
  ['edge-provisioning', 5, 'Configuration for provisioning remote test nodes'],
]
const changes = [
  ['feature/retry-budget', 'Document retry budget defaults', 'docs/retries.md', '# Retry budget\nDefault: 3 attempts.\nBackoff starts at 150 ms.\n'],
  ['fix/csv-headers', 'Normalize CSV export headers', 'src/csv.ts', 'export const fields = ["route_id", "service_date", "station"];\n'],
  ['feature/cache-metrics', 'Record cache hit rates', 'src/cache.ts', 'export const cacheMetric = "route_cache_hit";\n'],
  ['release/2026-11', 'Prepare November release notes', 'docs/release.md', '# November release\nImproved station search and exports.\n'],
  ['develop', 'Refresh development setup', 'docs/development.md', '# Development\nRun npm ci before npm test.\n'],
  ['fix/backoff-window', 'Rebalance the backoff window', 'docs/retries.md', '# Retry budget\nDefault: 4 attempts.\nBackoff starts at 300 ms.\n'],
  ['feature/health-probes', 'Add readiness probe documentation', 'docs/health.md', '# Health checks\nReadiness verifies storage access.\n'],
]
const notes = [
  'Could we link to the retry examples from the README?', 'I verified this with the dispatch dataset.',
  'Can we cover the empty response in a unit test?', 'The new naming is consistent with the other services.',
  'Please keep the previous behavior for legacy clients.', 'This also looks good with a cold cache.',
  'The examples make the new defaults easier to follow.', 'Could we include the expected output here?',
]
const time = n => new Date(Date.UTC(2026, 9, 16, 8, 0) + n * 3_600_000).toISOString()
const stamp = (date, actor) => ({ createdAt: date, createdBy: actor, updatedAt: date, updatedBy: actor })
const userId = name => `usr-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(' ', '-')}`

function commitRecord(repo, branch, suffix, n, title, parent, delta, actor) {
  return {
    id: `cmt-${repo.slug}-${suffix}`, repositoryId: repo.id, branchId: branch.id,
    hash: (0x10000000 + n * 71119).toString(16).padStart(8, '0') + 'b8f36c02f1e4a51a09f0414731d109aa',
    message: title, parentIds: parent ? [parent] : [], changes: delta,
    createdAt: time(n), createdBy: actor,
  }
}

export function createInitialData() {
  const state = {
    currentUserId: 'usr-riley-chen',
    workspaces: workspaces.map(([id, slug, name]) => ({ id, slug, name })),
    projects: projects.map(([id, key, name, description], index) => ({
      id: `prj-${id}`, key, name, description, workspaceId: workspaces[index < 4 ? 0 : 1][0],
    })),
    users: people.map((name, index) => ({
      id: userId(name), name, username: userId(name).slice(4).replace('-', ''), workspaceIds: index < 8 ? workspaces.map(([id]) => id) : [workspaces[index < 19 ? 0 : 1][0]],
      avatarColor: ['#245a81', '#684b9c', '#267463', '#a14460', '#875122', '#42598d'][index % 6],
    })),
    repositories: [], repositoryStars: [], branches: [], commits: [],
    pullRequests: [], pullRequestComments: [], pullRequestTasks: [], pullRequestReviews: [], pullRequestActivity: [],
    pipelineDefinitions: [], pipelineRuns: [],
  }
  const riley = state.currentUserId
  for (const [index, [slug, projectIndex, description]] of repositoryFixtures.entries()) {
    const project = state.projects[projectIndex]
    const owner = state.users[index % 8].id
    const empty = slug === 'sandbox-repository'
    const configured = !empty && ![33, 34].includes(index)
    const branchCount = index === 0 ? 8 : index <= 12 || index === 28 ? 3 : empty ? 1 : 2
    const commitCount = index === 0 ? 20 : empty ? 0 : index <= 20 ? 5 : index === 28 ? 8 : 4
    const baseCount = commitCount ? commitCount - branchCount + 1 : 0
    const date = time(430 - index * 6)
    const main = { id: `br-${slug}-main`, repositoryId: `repo-${slug}`, name: 'main', headCommitId: null, sourceBranchId: null, closedAt: null, ...stamp(date, owner) }
    const repo = {
      id: main.repositoryId, workspaceId: project.workspaceId, projectId: project.id, name: slug, slug, description,
      visibility: index % 7 === 4 || slug === 'atlas-api' ? 'public' : 'private', defaultBranchId: main.id,
      pipelinesEnabled: configured && index !== 5, deletedAt: null,
      mergeChecks: { requiredApprovals: index === 0 || index === 5 ? 1 : 0, requireResolvedTasks: index === 0 },
      ...stamp(date, owner),
    }
    state.repositories.push(repo)
    state.branches.push(main)
    let configCommitId
    const baseCommits = []
    for (let offset = 0; offset < baseCount; offset++) {
      let title
      let delta
      if (offset === 0) {
        title = 'Initialize repository'
        delta = [{ path: 'README.md', operation: 'add', content: `# ${slug}\n\n${description}.\n\n## Getting started\nInstall dependencies with npm ci, then run npm test.\n` }]
      } else if (offset === 1 && configured) {
        title = 'Configure Bitbucket Pipelines'
        delta = [{ path: CONFIG_PATH, operation: 'add', content: STARTER_CONFIG }]
      } else if (offset === 2) {
        title = 'Add service entry point'
        delta = [{ path: 'src/index.ts', operation: 'add', content: `export const service = "${slug}";\n` }]
      } else if (index === 0 && offset >= 3 && offset <= 7) {
        const paths = ['src/routes.ts', 'src/stations.ts', 'docs/api.md', 'tests/routes.test.ts', 'docs/deployment.md']
        title = ['Expose supported routes', 'Register station metadata', 'Describe the filtering API', 'Cover route planning', 'Document deployment steps'][offset - 3]
        delta = [{ path: paths[offset - 3], operation: 'add', content: ['export const routes = ["express", "local"];\n', 'export const stations = ["Central", "North Park"];\n', '# API\nFilter routes by service day.\n', '// Route planning cases\nexport const expectedRoutes = 2;\n', '# Deployment\nPromote staging after the build passes.\n'][offset - 3] }]
      } else if (index === 0 && offset >= 10) {
        title = ['Start the retry budget guide', 'Publish route health metrics', 'Document the production retry window'][offset - 10]
        delta = [offset === 11
          ? { path: 'src/metrics.ts', operation: 'add', content: 'export const metric = "route_health";\n' }
          : { path: 'docs/retries.md', operation: offset === 10 ? 'add' : 'modify', content: offset === 10 ? '# Retry budget\nDefault: 2 attempts.\n' : '# Retry budget\nDefault: 3 attempts.\nBackoff starts at 150 ms.\n' }]
      } else {
        title = offset === 1 ? 'Document local setup' : 'Update contribution notes'
        delta = [{ path: 'CONTRIBUTING.md', operation: offset === 1 || configured && offset === 3 || index === 0 && offset === 8 ? 'add' : 'modify', content: '# Contributing\n\nRun checks before opening a pull request.\n' + (offset % 2 ? '\nExplain how you verified the change.\n' : '') }]
      }
      const n = index === 0 ? 50 + offset : 70 + index * 8 + offset
      const commit = commitRecord(repo, main, offset === 12 && index === 0 ? 'base' : `main-${offset + 1}`, n, title, main.headCommitId, delta, owner)
      if (offset === 1 && configured) configCommitId = commit.id
      main.headCommitId = commit.id
      baseCommits.push(commit)
      state.commits.push(commit)
    }
    main.updatedAt = baseCommits.at(-1)?.createdAt || date

    const features = []
    for (let offset = 0; offset < branchCount - 1; offset++) {
      const [name, title, path, content] = changes[(index === 0 ? offset : index + offset) % changes.length]
      const actor = state.users[(index + offset + 1) % 8].id
      const branchName = index > 0 && name === 'develop' ? 'develop' : name
      const branch = { id: `br-${slug}-${index === 0 && offset === 0 ? 'retry' : 'work-' + (offset + 1)}`, repositoryId: repo.id, name: branchName,
        sourceBranchId: main.id, headCommitId: null, closedAt: null, ...stamp(time(310 + index * 3 + offset), actor) }
      const parent = index === 0 && offset === 5 ? baseCommits[10] : baseCommits.at(-1)
      const previous = index === 0 && [0, 5].includes(offset)
      const text = index === 0 && offset === 0 ? content + 'Use exponential backoff for transient errors.\n' : content
      const commit = commitRecord(repo, branch, index === 0 && offset === 0 ? 'retry' : `work-${offset + 1}`, 310 + index * 3 + offset,
        title, parent?.id, [{ path, operation: previous ? 'modify' : 'add', content: text }], actor)
      branch.headCommitId = commit.id
      state.branches.push(branch)
      state.commits.push(commit)
      features.push(branch)
    }

    if (configured) {
      repo.pipelineConfiguredAt = time(123 + index * 3)
      repo.pipelineConfiguredBy = owner
      repo.pipelineSettingsUpdatedAt = date
      repo.pipelineSettingsUpdatedBy = owner
      const definitions = [['build', 'Build and test', 'default', 'successful']]
      if (index < 2) definitions.push(['release', 'Release check', 'custom', 'in_progress'])
      if (index === 0) definitions.push(['branch', 'Feature validation', 'branch', 'successful'])
      const added = definitions.map(([suffix, name, type, outcome]) => ({
        id: `pd-${slug}-${suffix}`, repositoryId: repo.id, name, type,
        ...(type === 'custom' ? { variables: [{ name: 'REGION', required: true, defaultValue: 'eu-west', allowedValues: ['eu-west', 'us-east'] }] } : {}),
        ...(type === 'branch' ? { branchNames: [features[0]?.name, 'develop'].filter(Boolean) } : {}),
        steps: fixtureSteps(outcome), configPath: CONFIG_PATH, configCommitId,
        createdAt: repo.pipelineConfiguredAt, createdBy: owner,
      }))
      state.pipelineDefinitions.push(...added)
      const runCount = index === 0 ? 24 : index <= 8 ? 3 : 2
      for (let offset = 0; offset < runCount; offset++) {
        const buildNumber = (index === 0 ? 279 : 0) + offset + 1
        const outcome = index === 0 && offset === 23 ? 'in_progress' : offset % 4 === 1 || index === 0 && offset === 22 ? 'failed' : 'successful'
        const branch = offset % 3 === 1 && features[0] ? features[0] : main
        const commit = state.commits.find(item => item.id === branch.headCommitId)
        const definition = outcome === 'in_progress' && added[1] ? added[1] : added[0]
        const id = `run-${slug}-${buildNumber}`
        const startedAt = time(index === 0 ? 360 + offset * 3 : 361 + (index + offset) * 2)
        const actor = state.users[(offset + index) % 8].id
        const steps = fixtureSteps(outcome).map((step, stepIndex) => {
          const status = stepIndex === 2 && outcome !== 'successful' ? outcome === 'failed' ? 'skipped' : 'pending' : step.fixtureStatus
          const done = status === 'failed' || status === 'successful'
          return { id: `step-${slug}-${buildNumber}-${step.key}`, name: step.name, definitionStepKey: step.key, attempts: [{
            id: `att-${slug}-${buildNumber}-${step.key}-1`, number: 1, status,
            startedAt: done || status === 'in_progress' ? startedAt : null,
            finishedAt: done ? startedAt : null, durationSeconds: done ? step.fixtureDurationSeconds : null,
            logSections: done || status === 'in_progress' ? step.fixtureLogSections : [], ...stamp(startedAt, actor),
          }] }
        })
        state.pipelineRuns.push({ id, repositoryId: repo.id, buildNumber, definitionId: definition.id,
          definitionSnapshot: { name: definition.name, type: definition.type, steps: definition.steps },
          branchId: branch.id, branchName: branch.name, commitId: commit.id, commitHash: commit.hash, status: outcome,
          trigger: offset % 4 === 0 || outcome === 'in_progress' ? 'manual' : offset % 4 === 2 ? 'pull_request' : 'push',
          variables: definition.type === 'custom' ? { REGION: 'eu-west' } : {}, startedAt,
          finishedAt: outcome === 'in_progress' ? null : startedAt, durationSeconds: outcome === 'in_progress' ? null : outcome === 'failed' ? 21 : 25,
          steps, retries: [], ...stamp(startedAt, actor),
        })
      }
    }

    if (index < 24) state.repositoryStars.push({ id: index === 0 ? 'star-riley-atlas' : `star-${slug}`, repositoryId: repo.id,
      userId: index < 7 ? riley : owner, starredAt: date, removedAt: index % 7 === 6 ? date : null, ...stamp(date, index < 7 ? riley : owner) })

    const requestCount = index === 0 ? 16 : empty ? 0 : index <= 10 ? 2 : 1
    for (let offset = 0; offset < requestCount; offset++) {
      const number = index === 0 ? 32 + offset : offset + 1
      const branch = index === 0 && number === 47 ? features[0] : index === 0 && number === 46 ? features[5] :
        index === 0 && number === 45 ? features[1] : features[offset % features.length]
      const destination = index === 0 && number >= 38 && number < 45 ? features[4] : main
      const safeSource = branch?.id === destination.id ? features[6] : branch
      const authorId = index === 0 && number === 47 ? state.users[1].id : index === 0 && number === 45 ? riley : state.users[(index + offset + 1) % 8].id
      const createdAt = time(index === 0 ? 407 + offset * 2 : 397 - index * 2 + offset)
      const status = index === 0 ? number >= 40 ? 'open' : number % 3 ? 'merged' : 'declined' : offset === 0 || index % 2 === 0 ? 'open' : 'merged'
      const id = `pr-${index === 0 ? 'atlas' : slug}-${number}`
      const commit = state.commits.find(item => item.id === safeSource?.headCommitId)
      const title = number === 47 && index === 0 ? 'Document the retry budget' :
        number === 46 && index === 0 ? 'Rebalance retry backoff' : commit?.message || 'Update the service configuration'
      const reviewers = [riley, state.users[1 + (index + offset) % 7].id].filter(user => user !== authorId)
      state.pullRequests.push({ id, repositoryId: repo.id, number, sourceBranchId: safeSource?.id || main.id, destinationBranchId: destination.id,
        sourceCommitId: safeSource?.headCommitId || main.headCommitId, destinationCommitId: destination.headCommitId,
        title, description: index === 0 && number === 47 ? 'Clarify defaults for transient failures and document how the retry window is applied.' : `Updates ${slug} and adds a reproducible example for reviewers.`,
        authorId, reviewerIds: reviewers, closeSourceOnMerge: false, status, ...stamp(createdAt, authorId),
        ...(status === 'merged' ? { mergedAt: createdAt, mergedBy: authorId, mergeCommitId: destination.headCommitId, mergeStrategy: 'merge_commit', sourceBranchClosed: false } : {}),
        ...(status === 'declined' ? { declinedAt: createdAt, declinedBy: authorId, declineReason: 'Superseded by a consolidated change.' } : {}),
      })
    }
  }

  for (const [index, pr] of state.pullRequests.entries()) {
    const created = { id: `pra-${pr.id}-created`, pullRequestId: pr.id, type: 'created', targetId: pr.id, changes: { title: pr.title, status: 'open' }, createdAt: pr.createdAt, createdBy: pr.authorId }
    state.pullRequestActivity.push(created)
    const actor = pr.reviewerIds[0] || pr.authorId
    const comment = { id: `prc-${pr.id}-1`, pullRequestId: pr.id, parentCommentId: null, body: notes[index % notes.length],
      anchor: null, status: 'open', resolvedAt: null, resolvedBy: null, ...stamp(pr.updatedAt, actor) }
    if (pr.id === 'pr-atlas-47') {
      comment.anchor = { path: 'docs/retries.md', side: 'source', line: 2, commitId: pr.sourceCommitId }
      comment.status = 'resolved'
      comment.resolvedAt = pr.updatedAt
      comment.resolvedBy = pr.authorId
    }
    state.pullRequestComments.push(comment)
    if (index < 20) state.pullRequestComments.push({ id: `prc-${pr.id}-2`, pullRequestId: pr.id, parentCommentId: comment.id,
      body: index % 2 ? 'I’ll include that in this change.' : 'Done. I added an example with the expected result.', anchor: null, ...stamp(pr.updatedAt, pr.authorId) })
    if (index < 36) {
      const completed = index % 3 !== 2 || pr.id === 'pr-atlas-47'
      state.pullRequestTasks.push({ id: `prt-${pr.id}-1`, pullRequestId: pr.id, commentId: comment.id, assigneeId: pr.authorId,
        body: pr.id === 'pr-atlas-47' ? 'Add a README cross-reference' : 'Verify the updated behavior in a unit test',
        status: completed ? 'completed' : 'open', completedAt: completed ? pr.updatedAt : null, completedBy: completed ? pr.authorId : null, ...stamp(pr.updatedAt, actor) })
    }
    if (index < 50) {
      const reviewerId = pr.id === 'pr-atlas-47' ? state.users[2].id : actor
      if (pr.id === 'pr-atlas-47' && !pr.reviewerIds.includes(reviewerId)) pr.reviewerIds.push(reviewerId)
      state.pullRequestReviews.push({ id: `rev-${pr.id}-1`, pullRequestId: pr.id, reviewerId, status: pr.id === 'pr-atlas-47' || index % 3 === 0 ? 'approved' : index % 3 === 1 ? 'changes_requested' : 'unreviewed',
        sourceCommitId: pr.sourceCommitId, ...stamp(pr.updatedAt, reviewerId) })
    }
    const transition = pr.status === 'merged' ? { type: 'merged', targetId: pr.mergeCommitId, changes: { status: 'merged', mergeCommitId: pr.mergeCommitId } } :
      pr.status === 'declined' ? { type: 'declined', targetId: pr.id, changes: { status: 'declined', declineReason: pr.declineReason } } :
      { type: 'comment_added', targetId: comment.id, changes: { body: comment.body, anchor: comment.anchor } }
    state.pullRequestActivity.push({ id: `pra-${pr.id}-latest`, pullRequestId: pr.id, ...transition, createdAt: pr.updatedAt, createdBy: pr.status === 'open' ? actor : pr.authorId })
  }
  return state
}
