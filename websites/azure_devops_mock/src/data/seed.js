export const starterYaml = 'trigger:\n- main\n\npool:\n  vmImage: ubuntu-latest\n\nsteps:\n- script: npm ci\n  displayName: Restore packages\n- script: npm test\n  displayName: Run tests\n'

const people = [
  ['maya','Maya Chen'], ['alex','Alex Morgan'], ['priya','Priya Patel'], ['sam','Sam Rivera'],
  ['jordan','Jordan Brooks'], ['elena','Elena Morales'], ['noah','Noah Williams'], ['amina','Amina Diallo'],
  ['liam','Liam O’Connor'], ['nora','Nora Jensen'], ['omar','Omar Haddad'], ['sophie','Sophie Martin'],
  ['mateo','Mateo Silva'], ['zoe','Zoe Turner'], ['hannah','Hannah Park'], ['isaac','Isaac Reed'],
  ['ravi','Ravi Shah'], ['leila','Leila Rahman'],
]

const workspaces = [
  ['commerce','Checkout, payments and order services.', ['Checkout','Order Operations'],
    ['checkout-api','payment-gateway','order-service','storefront','cart-service','catalog-api','pricing-engine','tax-service','fulfillment','merchant-portal','returns-api','invoice-worker','commerce-sdk','receipt-renderer']],
  ['identity','Sign-in, account recovery and access management.', ['Access','Directory'],
    ['session-service','identity-web','directory-sync','account-recovery','access-audit']],
  ['platform','Shared infrastructure and developer tooling.', ['Runtime','Developer Experience'],
    ['build-tools','service-router','metrics-agent','deployment-config','runtime-sdk']],
]

const titles = [
  'Fix duplicate order confirmation', 'Make checkout retries idempotent', 'Add a payment authorization timeout',
  'Show tax breakdown before payment', 'Restore interrupted checkout sessions', 'Track processing time for refunds',
  'Validate shipping addresses at checkout', 'Keep declined payment details available', 'Add currency to receipt exports',
  'Clean up expired promotion codes', 'Expose fulfillment status on the order page', 'Audit order history cursor pagination',
  'Show a clearer invoice delivery error', 'Preserve delivery notes on cart refresh',
  'Refresh access tokens after password reset', 'Record recovery attempts in the audit log', 'Handle expired invitations',
  'Review role mapping for workspace owners', 'Add device names to active sessions',
  'Reduce build cache misses on macOS', 'Rotate gateway health-check certificates', 'Record queue latency per worker',
  'Pin package resolver across build images', 'Publish service router diagnostics',
]

const seedTime = '2026-11-10T09:00:00.000Z'
const seedUpdate = '2026-11-11T16:30:00.000Z'
const maya = 'usr-maya'
const alex = 'usr-alex'
const fields = { createdBy: maya, createdAt: seedTime, updatedBy: maya, updatedAt: seedUpdate }
const words = (slug) => slug.split('-').map((word) => word === 'api' || word === 'sdk' ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)).join(' ')
const day = (offset) => new Date(Date.UTC(2026, 10, 9 + offset)).toISOString().slice(0, 10)
const addFile = (path, after) => ({ path, kind: 'add', before: null, after })
const editFile = (path, before, after) => ({ path, kind: 'edit', before, after })

export function runStages(status, result) {
  const logLines = result === 'succeeded'
    ? ['Checked out the selected commit.', 'Restored packages.', '42 tests passed.', 'Published artifact: drop.']
    : result === 'failed' ? ['Restored packages.', 'Integration test failed: expected HTTP 200.', 'Job finished with exit code 1.'] : []
  return [{ id: 'build', name: 'Build', status, result, jobs: [{ id: 'compile', name: 'Compile and test', status, result, logLines }] }]
}

export function artifactFiles(service) {
  const content = JSON.stringify({ service, configuration: 'Release' }, null, 2)
  return [{ path: 'manifest.json', content, sizeBytes: new TextEncoder().encode(content).length }]
}

export function createInitialData() {
  const users = people.map(([key, displayName], index) => ({
    id: 'usr-' + key, displayName, email: key + '@example.test',
    initials: displayName.split(' ').map((part) => part[0]).join(''),
    avatarColor: ['#37648E','#6553A8','#21766A','#A04755','#855B2D','#36597C'][index % 6],
  }))
  const projects = [], teams = [], sprints = [], workItems = [], workItemRevisions = [], workItemComments = [], queries = []
  const repositories = [], branches = [], commits = [], pullRequests = [], pullRequestComments = []
  const pipelines = [], pipelineRuns = [], pipelineArtifacts = [], releaseDefinitions = [], releases = [], deployments = [], releaseApprovals = []

  for (const [key, description, teamNames, repos] of workspaces) {
    const name = 'Harbor ' + words(key)
    const projectId = 'proj-' + key
    const memberIds = users.filter((_, i) => i < 4 || i % 3 === workspaces.findIndex(([id]) => id === key)).map((user) => user.id)
    const projectTeams = teamNames.map((label, index) => {
      const teamKey = label.toLowerCase().replaceAll(' ', '-')
      const id = 'team-' + teamKey
      const sprintPrefix = 'spr-' + (index === 0 ? key : teamKey)
      for (let n = 20; n <= 23; n++) {
        sprints.push({ id: sprintPrefix + '-' + n, projectId, teamId: id, name: 'Sprint ' + n,
          path: name + '/Sprint ' + n, startDate: day((n - 22) * 14), endDate: day((n - 22) * 14 + 13) })
      }
      return { id, projectId, name: label + ' Team', memberIds, areaPath: name + '/' + label, defaultSprintId: sprintPrefix + '-22', wipLimits: { Active: 6, Resolved: 4 } }
    })
    teams.push(...projectTeams)
    projects.push({ id: projectId, organizationId: 'org-harbor', slug: name.replace(' ', '-'), name, description, process: 'Agile',
      visibility: 'private', defaultTeamId: projectTeams[0].id, memberIds, createdAt: '2026-05-18T09:00:00.000Z' })

    const projectItems = []
    for (let i = 0; i < (key === 'commerce' ? 42 : 15); i++) {
      const id = key === 'commerce' ? String(i === 0 ? 1042 : 1033 + (i >= 9 ? i + 1 : i)) : String((key === 'identity' ? 1200 : 1300) + i)
      const team = projectTeams[i % 5 === 4 ? 1 : 0]
      const type = i === 1 ? 'Feature' : ['Bug','User Story','Task','User Story'][i % 4]
      const repoName = repos[Math.floor(i / 3) % repos.length]
      const titleIndex = key === 'commerce' ? i % 14 : (key === 'identity' ? 14 : 19) + i % 5
      const title = i >= (key === 'commerce' ? 14 : 5) ? titles[titleIndex] + ' in ' + words(repoName) : titles[titleIndex]
      const state = i === 0 ? 'Active' : ['New','Active','Resolved','Closed','New'][i % 5]
      const item = { id, projectId, teamId: team.id, type, title,
        description: i === 0 && key === 'commerce' ? 'Retrying card authorization creates two order emails.' : 'Verify the change in ' + words(repoName) + ' and update the regression coverage.',
        acceptanceCriteria: i === 0 && key === 'commerce' ? 'One confirmation per order ID.' : 'The regression check passes in the selected sprint.',
        state, assignedToId: i === 0 ? alex : i % 7 === 0 ? null : memberIds[(i - 1) % memberIds.length],
        priority: 1 + (i + 1) % 4, storyPoints: i % 4 === 2 ? null : [3,5,2,8][i % 4], areaPath: team.areaPath,
        sprintId: i % 8 === 7 ? null : team.defaultSprintId.replace(/22$/, String(i % 6 === 5 ? 21 : 22)),
        tags: i === 0 && key === 'commerce' ? ['payments','regression'] : [[key,'regression'],['frontend'],['service'],['observability']][i % 4],
        parentId: type === 'Feature' ? null : i === 0 && key === 'commerce' ? '1034' : projectItems[1]?.id ?? null,
        boardOrder: (i + 2) * 100, createdBy: maya, createdAt: seedTime, changedBy: maya, changedAt: seedUpdate }
      projectItems.push(item)
      workItemRevisions.push({ id: 'rev-' + id + '-1', workItemId: id, action: 'create',
        changes: { title: { from: null, to: title }, state: { from: null, to: i === 0 ? 'New' : state } }, createdBy: maya, createdAt: seedTime })
      if (i === 0 || i % 8 === 3) {
        workItemComments.push({ id: 'wic-' + id + '-1', workItemId: id,
          body: i === 0 && key === 'commerce' ? 'Reproduced with a delayed authorization response.' : 'The regression case is ready for the next review.', createdBy: alex, createdAt: seedUpdate })
      }
      if (i === 0) workItemRevisions.push({ id: 'rev-' + id + '-2', workItemId: id, action: 'move',
        changes: { state: { from: 'New', to: 'Active' }, boardOrder: { from: 100, to: 200 } }, createdBy: maya, createdAt: seedUpdate })
    }
    workItems.push(...projectItems)

    const querySpecs = [
      ['Bugs in progress','shared','type','Bug','Active'], ['My active work','my','assignedToId',maya,'Active'],
      ['Resolved stories','shared','type','User Story','Resolved'], ['New features','shared','type','Feature','New'],
      ['Closed work','my','state','Closed'], ['Current sprint','shared','sprintId',projectTeams[0].defaultSprintId],
      ['Unassigned work','my','assignedToId',null], ['Regression follow-up','my','title',key === 'commerce' ? 'checkout' : repos[0].split('-')[0]],
    ]
    for (const [index, [label, scope, field, value, status]] of querySpecs.entries()) {
      queries.push({ id: key === 'commerce' && index === 0 ? 'query-checkout-bugs' : 'query-' + key + '-' + index,
        projectId, name: index === 0 && key === 'commerce' ? 'Checkout bugs in progress' : label, scope,
        clauses: [{ field, operator: field === 'title' ? 'contains' : 'equals', value }, ...(status ? [{ field: 'state', operator: 'equals', value: status }] : [])], ...fields })
    }

    for (const [index, slug] of repos.entries()) {
      const checkout = slug === 'checkout-api'
      const conflict = key === 'commerce' && index === 1
      const suffix = checkout ? 'checkout' : slug
      const repoId = 'repo-' + suffix
      const main = 'br-' + suffix + '-main'
      const feature = checkout ? 'br-checkout-retry' : 'br-' + suffix + '-feature'
      const baseCommit = 'c-' + suffix + '-01'
      const head = checkout ? 'c-main-09' : 'c-' + suffix + '-02'
      const completed = index % 4 === 0
      const historicalCommit = 'c-' + suffix + '-merged'
      const mainHead = completed ? historicalCommit : head
      const featureFirst = 'c-' + suffix + '-feature-01'
      const featureHead = checkout ? 'c-retry-02' : 'c-' + suffix + '-feature-02'
      const sourcePath = checkout ? 'src/orders/confirm.ts' : 'src/handler.ts'
      const original = checkout ? 'export function confirm(order) {\n  return notify(order)\n}\n' : 'export const retries = 2\n'
      const modified = checkout ? original.replace('notify(order)', 'notifyOnce(order)') : 'export const retries = 4\n'
      const linked = [projectItems[index * 2 % projectItems.length].id]
      const title = checkout ? 'Guard duplicate order confirmation' : 'Improve retry handling in ' + words(slug)
      const defaultBranchId = main
      repositories.push({ id: repoId, projectId, slug, name: slug, defaultBranchId, requiredApprovals: index % 4 === 1 ? 1 : 0, createdBy: maya, createdAt: seedTime })
      branches.push({ id: main, repoId, name: 'main', baseBranchId: null, headCommitId: mainHead, workItemIds: [], ...fields },
        { id: feature, repoId, name: checkout ? 'feature/retry-guard' : 'feature/retry-handling', baseBranchId: main, headCommitId: featureHead, workItemIds: linked, ...fields })
      commits.push({ id: baseCommit, repoId, branchId: main, parentCommitIds: [], message: 'Initialize ' + slug,
        changes: [addFile('README.md', '# ' + words(slug) + '\n\n' + description + '\n\nRun the unit tests before opening a pull request.\n'),
          addFile('azure-pipelines.yml', starterYaml), addFile(sourcePath, original)], createdBy: maya, createdAt: seedTime },
        { id: head, repoId, branchId: main, parentCommitIds: [baseCommit], message: 'Document local service configuration',
          changes: [addFile('docs/configuration.md', '# Local configuration\n\nUse the development profile for integration checks.\n'),
            ...(conflict ? [editFile(sourcePath, original, 'export const retries = 3\n')] : [])], createdBy: maya, createdAt: seedTime },
        { id: featureFirst, repoId, branchId: feature, parentCommitIds: [conflict ? baseCommit : head], message: 'Add retry regression coverage',
          changes: [addFile('tests/retry.test.ts', 'test("handles a retry", () => expect(true).toBe(true))\n')], createdBy: alex, createdAt: seedTime },
        { id: featureHead, repoId, branchId: feature, parentCommitIds: [featureFirst], message: title,
          changes: [editFile(sourcePath, original, modified)], createdBy: maya, createdAt: seedUpdate })
      const prId = checkout ? '321' : String(321 + pullRequests.length)
      const defaultPr = { repoId, sourceBranchId: feature, targetBranchId: main, sourceCommitId: featureHead, targetCommitId: mainHead,
        description: 'Improves retry handling and adds a regression check.', isDraft: index % 5 === 2,
        reviewers: [{ userId: alex, required: false, vote: checkout ? 'approved' : 'none', votedAt: checkout ? seedUpdate : null }],
        workItemIds: linked, tags: [key,'regression'], mergeCommitId: null, closedBy: null, closedAt: null, ...fields }
      pullRequests.push({ ...defaultPr, id: prId, title, status: 'active' })
      if (checkout || index % 2 === 0) {
        const historicalSource = 'c-' + suffix + '-docs'
        const closedItem = projectItems.find((item) => item.state === 'Closed')
        if (completed) {
          const changes = [addFile('docs/overview.md', '# Service overview\n')]
          commits.push(
            { id: historicalSource, repoId, branchId: feature, parentCommitIds: [head], message: 'Document the service overview', changes, createdBy: alex, createdAt: seedTime },
            { id: historicalCommit, repoId, branchId: main, parentCommitIds: [head,historicalSource], message: 'Merge documentation review', changes, createdBy: maya, createdAt: seedTime },
          )
        }
        pullRequests.push({ ...defaultPr, id: String(321 + pullRequests.length), title: 'Review ' + words(slug) + ' documentation',
          status: completed ? 'completed' : 'abandoned', isDraft: false, workItemIds: closedItem ? [closedItem.id] : [],
          targetCommitId: head, sourceCommitId: completed ? historicalSource : featureHead,
          mergeCommitId: completed ? historicalCommit : null, closedBy: maya, closedAt: seedUpdate })
      }
      if (checkout || index % 4 === 0) {
        pullRequestComments.push({ id: 'prc-' + prId + '-1', pullRequestId: prId, parentId: null, path: sourcePath, line: 2,
          body: 'Can we add a retry case to the integration test?', status: 'active', ...fields, createdBy: alex })
      }

      const pipelineId = checkout ? 'pipe-checkout-ci' : 'pipe-' + slug + '-ci'
      const pipelineName = words(slug) + ' CI'
      pipelines.push({ id: pipelineId, projectId, name: pipelineName, repoId, defaultBranchId, yamlPath: 'azure-pipelines.yml', ...fields })
      const definitionId = checkout ? 'rd-checkout' : 'rd-' + slug
      const definitionStages = [{ id: 'qa', name: 'QA', dependsOnStageId: null, approverIds: [] },
        { id: 'prod', name: 'Production', dependsOnStageId: 'qa', approverIds: [maya] }]
      releaseDefinitions.push({ id: definitionId, projectId, name: words(slug) + ' Release', artifactPipelineId: pipelineId, stages: definitionStages, ...fields })

      const artifacts = []
      for (let n = 0; n < 3; n++) {
        const status = n === 2 ? (index % 3 === 0 ? 'inProgress' : index % 3 === 1 ? 'queued' : 'completed') : 'completed'
        const result = status !== 'completed' ? null : n === 2 || (n === 1 && index % 2 === 0 && index !== 2) ? 'failed' : 'succeeded'
        const runId = checkout && n === 0 ? '5202' : String(5203 + pipelineRuns.length)
        const number = '20261111.' + (checkout && n === 0 ? 2 : 3 + pipelineRuns.length)
        pipelineRuns.push({ id: runId, projectId, pipelineId, repoId, branchId: main, commitId: head, number,
          reason: n === 0 ? 'manual' : 'individualCI', status, result, variables: { configuration: 'Release' },
          stages: runStages(status,result), requestedBy: maya, createdAt: seedUpdate, startedAt: status === 'queued' ? null : seedUpdate,
          finishedAt: status === 'completed' ? seedUpdate : null, rerunOfRunId: null, canceledBy: null })
        if (result === 'succeeded') {
          const artifact = { id: 'artifact-' + runId + '-drop', projectId, pipelineId, runId, name: 'drop', version: number,
            files: artifactFiles(slug), createdBy: maya, createdAt: seedUpdate }
          artifacts.push(artifact)
          pipelineArtifacts.push(artifact)
        }
      }

      for (let n = 0; n < 2; n++) {
        const id = checkout && n === 0 ? '8102' : String(8103 + releases.length)
        const artifact = artifacts[n % artifacts.length]
        const outcome = n === 0 ? 'pendingApproval' : index % 3 === 0 ? 'rejected' : 'succeeded'
        const stages = definitionStages.map((stage) => ({
          ...stage, status: stage.id === 'qa' ? 'succeeded' : outcome, latestDeploymentId: 'dep-' + id + '-' + stage.id + '-1',
        }))
        releases.push({ id, projectId, definitionId, name: 'Release-' + id, artifactId: artifact.id, runId: artifact.runId, artifactVersion: artifact.version,
          status: n === 0 ? 'active' : outcome === 'rejected' ? 'failed' : 'succeeded',
          description: 'Promote the latest verified ' + words(slug) + ' build.', stages, ...fields, createdBy: alex })
        for (const stage of stages) {
          const pending = stage.status === 'pendingApproval'
          deployments.push({ id: stage.latestDeploymentId, projectId, releaseId: id, stageId: stage.id, artifactId: artifact.id, attempt: 1, status: stage.status,
            requestedBy: alex, createdAt: seedTime, startedAt: stage.status === 'succeeded' ? seedUpdate : null,
            finishedAt: pending ? null : seedUpdate, finishedBy: pending ? null : maya,
            logs: pending ? [{ step: 'Pre-deployment checks', status: 'pendingApproval', lines: ['Waiting for an approval decision.'] }] :
              [{ step: 'Download artifact', status: 'succeeded', lines: ['Resolved drop ' + artifact.version + '.'] },
                { step: 'Deploy to ' + stage.name, status: stage.status, lines: [stage.status === 'succeeded' ? 'Deployment completed.' : 'The approver rejected the deployment.'] }] })
          if (stage.id === 'prod') releaseApprovals.push({ id: 'approval-' + id + '-prod-1-maya', releaseId: id, stageId: stage.id,
            deploymentId: stage.latestDeploymentId, approverId: maya, status: pending ? 'pending' : outcome === 'rejected' ? 'rejected' : 'approved',
            comment: pending ? '' : outcome === 'rejected' ? 'Hold until the regression check is complete.' : 'Verified in QA.',
            createdBy: alex, createdAt: seedTime, decidedBy: pending ? null : maya, decidedAt: pending ? null : seedUpdate })
        }
        if (n === 1 && index % 3 === 0) {
          const old = deployments.find((row) => row.id === stages[0].latestDeploymentId)
          const retry = { ...old, id: 'dep-' + id + '-qa-2', attempt: 2, createdAt: seedUpdate }
          deployments.push(retry)
          stages[0].latestDeploymentId = retry.id
        }
      }
    }
  }

  return {
    organization: { id: 'org-harbor', slug: 'harbor-labs', name: 'Harbor Labs', defaultProjectId: 'proj-commerce' },
    preferences: { currentUserId: maya, theme: 'light' },
    projects, teams, users, sprints, workItems, workItemRevisions, workItemComments, queries, repositories, branches, commits,
    pullRequests, pullRequestComments, pipelines, pipelineRuns, pipelineArtifacts, releaseDefinitions, releases, deployments, releaseApprovals,
  }
}
