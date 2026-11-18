import { CONFIG_PATH, STARTER_CONFIG, fixtureSteps } from '../data/pipelineFixtures.js'
import { advanceBranch, created, idFor, modified, recordCommit, replace, requireRepo, requireThat } from './common.js'
import { ancestry, commitIndex, treeAt } from './git.js'
import { byId, list, numberAfter, openBranches, repoRecords } from '../utils/model.js'

const active = status => status === 'pending' || status === 'in_progress'
export const isActiveRun = run => active(run.status)
export function currentAttempt(step) {
  return list(step?.attempts).reduce((latest, attempt) => !latest || Number(attempt.number) >= Number(latest.number) ? attempt : latest, undefined)
}

export const definitionAvailable = (definition, branch) => Boolean(branch &&
  (!list(definition.branchNames).length || definition.branchNames.includes(branch.name)))

export function setupUnavailable(state, repo) {
  if (repoRecords(state.pipelineDefinitions, repo).length) return 'This repository already has a pipeline configuration.'
  const branch = byId(openBranches(state, repo), repo.defaultBranchId)
  if (!branch) return 'Choose an active default branch in Repository settings.'
  const commits = commitIndex(state, repo)
  if (branch.headCommitId && !commits.has(branch.headCommitId)) return 'The default branch points to a missing commit.'
  if ([...treeAt(commits, branch.headCommitId).keys()].some(path => path === CONFIG_PATH || path.startsWith(CONFIG_PATH + '/'))) {
    return 'The default branch already has bitbucket-pipelines.yml. Its existing configuration is preserved.'
  }
  return ''
}

export function configurePipelines(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const unavailable = setupUnavailable(state, repo)
  requireThat(!unavailable, unavailable)
  const branch = byId(openBranches(state, repo), repo.defaultBranchId)
  requireThat(branch.id === input.branchId && (branch.headCommitId ?? null) === input.expectedHead, 'The default branch changed. Review the configuration again.')
  const config = recordCommit(repo, branch, 'Configure Bitbucket Pipelines', [branch.headCommitId], [
    { path: CONFIG_PATH, operation: 'add', content: STARTER_CONFIG },
  ], stamp)
  const definition = { id: idFor('pd'), repositoryId: repo.id, name: 'Build and test', type: 'default', steps: fixtureSteps(),
    configPath: CONFIG_PATH, configCommitId: config.id, createdAt: stamp.now, createdBy: stamp.actor }
  const settings = { pipelinesEnabled: true, pipelineConfiguredAt: stamp.now, pipelineConfiguredBy: stamp.actor,
    pipelineSettingsUpdatedAt: stamp.now, pipelineSettingsUpdatedBy: stamp.actor }
  const next = advanceBranch(state, repo, branch, config, stamp, settings)
  return { state: { ...next, pipelineDefinitions: [...list(state.pipelineDefinitions), definition] }, result: definition }
}

export function setPipelinesEnabled(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  requireThat(repoRecords(state.pipelineDefinitions, repo).length, 'Set up a pipeline before changing its availability.')
  if (Boolean(repo.pipelinesEnabled) === input.enabled) return { state }
  return { state: { ...state, repositories: replace(state.repositories, repo.id, { pipelinesEnabled: input.enabled,
    pipelineSettingsUpdatedAt: stamp.now, pipelineSettingsUpdatedBy: stamp.actor, ...modified(stamp) }) } }
}

function normalizedVariables(definition, values) {
  return Object.fromEntries(list(definition.variables).filter(variable => variable.name && !variable.secret && !variable.secured).flatMap(variable => {
    const value = (values[variable.name] ?? variable.defaultValue ?? '').trim()
    requireThat(!variable.required || value, `Enter a value for ${variable.name}.`)
    requireThat(!value || !list(variable.allowedValues).length || variable.allowedValues.includes(value), `Choose an allowed value for ${variable.name}.`)
    return value ? [[variable.name, value]] : []
  }))
}

function fromAttempts(steps) {
  const statuses = steps.map(step => currentAttempt(step)?.status)
  if (statuses.includes('failed')) return 'failed'
  if (statuses.includes('in_progress')) return 'in_progress'
  if (statuses.includes('pending') || !statuses.length) return 'pending'
  return statuses.every(status => status === 'successful' || status === 'skipped') ? 'successful' : 'pending'
}

function durationOf(steps) {
  return steps.reduce((seconds, step) => seconds + (Number(currentAttempt(step)?.durationSeconds) || 0), 0)
}

function makeAttempt(step, status, stamp, { number = 1, retryId, retry = false } = {}) {
  const done = status === 'successful' || status === 'failed'
  const hasStarted = done || status === 'in_progress'
  return {
    id: idFor('att'), number, ...(retryId ? { retryId } : {}), status, startedAt: hasStarted ? stamp.now : null,
    finishedAt: done ? stamp.now : null, durationSeconds: done ? Math.max(0, Number(step.fixtureDurationSeconds) || 0) : null,
    logSections: hasStarted ? list(retry ? step.retryFixtureLogSections ?? step.fixtureLogSections : step.fixtureLogSections) : [],
    ...created(stamp),
  }
}

function appendRun(state, repo, fields, stamp) {
  const definitions = list(fields.definitionSnapshot?.steps)
  requireThat(definitions.length, 'This pipeline definition has no runnable steps.')
  let preceding
  const steps = definitions.map(step => {
    const fixture = ['successful', 'failed', 'in_progress', 'pending'].includes(step.fixtureStatus) ? step.fixtureStatus : 'successful'
    const status = preceding === 'failed' ? 'skipped' : preceding ? 'pending' : fixture
    if (!preceding && status !== 'successful') preceding = status
    return { id: idFor('step'), definitionStepKey: step.key, name: step.name || step.key || 'Step', attempts: [makeAttempt(step, status, stamp)] }
  })
  const status = fromAttempts(steps)
  const runs = repoRecords(state.pipelineRuns, repo)
  const run = { id: idFor('run'), repositoryId: repo.id, buildNumber: numberAfter(runs, 'buildNumber'), ...fields, status,
    startedAt: stamp.now, finishedAt: active(status) ? null : stamp.now, durationSeconds: active(status) ? null : durationOf(steps),
    steps, retries: [], ...created(stamp) }
  return { state: { ...state, pipelineRuns: [...list(state.pipelineRuns), run] }, result: run }
}

export function runPipeline(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  requireThat(repo.pipelinesEnabled, 'Pipelines are disabled for this repository.')
  const branch = byId(openBranches(state, repo), input.branchId)
  const definition = byId(repoRecords(state.pipelineDefinitions, repo), input.definitionId)
  requireThat(branch, 'Choose an active branch.')
  requireThat(definition && definitionAvailable(definition, branch), 'Choose a pipeline available for this branch.')
  const commits = commitIndex(state, repo)
  const target = commits.get(input.commitId)
  requireThat(target && (input.commitTarget ? ancestry(commits, branch.headCommitId).has(target.id) : branch.headCommitId === target.id),
    'The target changed or is unavailable. Choose a valid branch commit.')
  requireThat(numberAfter(repoRecords(state.pipelineRuns, repo), 'buildNumber') === input.nextBuildNumber, 'Build history changed. Reopen the run dialog to submit again.')
  const variables = normalizedVariables(definition, input.variables || {})
  return appendRun(state, repo, { definitionId: definition.id, definitionSnapshot: { name: definition.name, type: definition.type, steps: definition.steps },
    branchId: branch.id, branchName: branch.name, commitId: target.id, commitHash: target.hash || target.id, trigger: 'manual', variables }, stamp)
}

function existingRun(state, input) {
  const repo = requireRepo(state, input.repositoryId)
  const run = byId(repoRecords(state.pipelineRuns, repo), input.runId)
  requireThat(run, 'This pipeline run is unavailable.')
  return { repo, run }
}

function elapsed(since, now) {
  const seconds = Math.floor((Date.parse(now) - Date.parse(since)) / 1000)
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0
}

export function stopPipeline(state, input, stamp) {
  const { run } = existingRun(state, input)
  requireThat(isActiveRun(run), 'Only pending or in-progress pipelines can be stopped.')
  const stopped = { status: 'stopped', stoppedAt: stamp.now, stoppedBy: stamp.actor, finishedAt: stamp.now, ...modified(stamp) }
  const steps = list(run.steps).map(step => {
    const current = currentAttempt(step)
    if (!current || !active(current.status)) return step
    return { ...step, attempts: replace(step.attempts, current.id, { ...stopped, durationSeconds: elapsed(current.startedAt, stamp.now) }) }
  })
  return { state: { ...state, pipelineRuns: replace(state.pipelineRuns, run.id, { ...stopped, steps, durationSeconds: elapsed(run.startedAt, stamp.now) }) } }
}

export function retryUnavailable(repo, run) {
  if (!repo.pipelinesEnabled) return 'Enable Pipelines in Repository settings to rerun this build.'
  if (run.status !== 'failed') return 'Only failed pipeline runs can be retried.'
  const failed = list(run.steps).filter(step => currentAttempt(step)?.status === 'failed')
  if (!failed.length || failed.some(step => !list(run.definitionSnapshot?.steps).some(definition => definition.key === step.definitionStepKey))) {
    return 'The failed steps or their saved definitions are unavailable.'
  }
  return ''
}

export function rerunUnavailable(repo, run) {
  if (!repo.pipelinesEnabled) return 'Enable Pipelines in Repository settings to rerun this build.'
  if (run.status !== 'failed') return 'Only failed pipeline runs can be rerun here.'
  if (!run.commitId || !run.branchId || !run.definitionId || !list(run.definitionSnapshot?.steps).length) return 'The original target or saved definition is unavailable.'
  return ''
}

export function retryPipelineSteps(state, input, stamp) {
  const { repo, run } = existingRun(state, input)
  const reason = retryUnavailable(repo, run)
  requireThat(!reason, reason)
  requireThat(numberAfter(run.retries, 'number') === input.retryNumber, 'This run changed. Review the latest attempts before retrying.')
  const retryId = idFor('retry')
  const stepIds = []
  let retryDuration = 0
  let failed = false
  const steps = list(run.steps).map(step => {
    const original = currentAttempt(step)
    if (original?.status !== 'failed') return step
    const definition = run.definitionSnapshot.steps.find(item => item.key === step.definitionStepKey)
    const status = definition.retryFixtureStatus === 'successful' ? 'successful' : 'failed'
    const attempt = makeAttempt(definition, status, stamp, { number: numberAfter(step.attempts, 'number'), retryId, retry: true })
    stepIds.push(step.id)
    retryDuration += attempt.durationSeconds
    failed ||= status === 'failed'
    return { ...step, attempts: [...step.attempts, attempt] }
  })
  const retry = { id: retryId, number: input.retryNumber, stepIds, status: failed ? 'failed' : 'successful', finishedAt: stamp.now,
    durationSeconds: retryDuration, createdAt: stamp.now, createdBy: stamp.actor }
  const status = fromAttempts(steps)
  const patch = { steps, retries: [...list(run.retries), retry], status, finishedAt: active(status) ? null : stamp.now,
    durationSeconds: active(status) ? null : durationOf(steps), ...modified(stamp) }
  return { state: { ...state, pipelineRuns: replace(state.pipelineRuns, run.id, patch) }, result: { ...run, ...patch } }
}

export function rerunPipeline(state, input, stamp) {
  const { repo, run } = existingRun(state, input)
  const reason = rerunUnavailable(repo, run)
  requireThat(!reason, reason)
  const latestRuns = repoRecords(state.pipelineRuns, repo)
  requireThat(!latestRuns.some(item => item.rerunOfRunId === run.id && item.buildNumber >= input.nextBuildNumber), 'This pipeline was already rerun from this confirmation.')
  const { definitionId, definitionSnapshot, branchId, branchName, commitId, commitHash, variables } = run
  return appendRun(state, repo, { definitionId, definitionSnapshot, branchId, branchName: branchName || 'Unknown branch',
    commitId, commitHash: commitHash || commitId, variables: variables || {}, trigger: 'rerun', rerunOfRunId: run.id }, stamp)
}
