import { advanceBranch, created, idFor, modified, recordCommit, replace, requireProject, requireRepo, requireThat } from './common.js'
import { commitIndex, filePath, treeAt } from './git.js'
import { CONFIG_PATH } from '../data/pipelineFixtures.js'
import { activeRepos, byId, list, openBranches, slugify, starRecord } from '../utils/model.js'

function repositoryFields(input) {
  const name = input.name.trim()
  requireThat(name.length > 0 && name.length <= 62, 'Enter a repository name from 1 to 62 characters.')
  requireThat(['private', 'public'].includes(input.visibility), 'Choose a valid visibility.')
  return { name, projectId: input.projectId, description: input.description.trim(), visibility: input.visibility }
}

export function createRepository(state, input, stamp) {
  const workspace = byId(state.workspaces, input.workspaceId)
  requireThat(workspace, 'Choose an available workspace.')
  const fields = repositoryFields(input)
  requireProject(state, workspace.id, fields.projectId)
  const slug = slugify(fields.name)
  requireThat(slug && slug !== 'workspace', 'Use a name that produces an available URL slug.')
  requireThat(!activeRepos(state, workspace).some(repo => repo.slug === slug), 'A repository already uses this URL slug.')
  const repo = { ...fields, id: idFor('repo'), workspaceId: workspace.id, slug, defaultBranchId: idFor('br'), pipelinesEnabled: false,
    deletedAt: null, mergeChecks: { requiredApprovals: 0, requireResolvedTasks: false }, ...created(stamp) }
  const branch = { id: repo.defaultBranchId, repositoryId: repo.id, name: 'main', sourceBranchId: null, headCommitId: null, closedAt: null, ...created(stamp) }
  const commits = list(state.commits)
  const commit = input.includeReadme ? recordCommit(repo, branch, 'Initialize repository with README', [],
    [{ path: 'README.md', operation: 'add', content: `# ${fields.name}\n${fields.description ? `\n${fields.description}\n` : ''}` }], stamp) : null
  if (commit) branch.headCommitId = commit.id
  return { state: { ...state, repositories: [...list(state.repositories), repo],
    branches: [...list(state.branches), branch], commits: commit ? [...commits, commit] : commits }, result: repo }
}

export function editRepository(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const fields = repositoryFields(input)
  requireProject(state, repo.workspaceId, fields.projectId)
  requireThat(byId(openBranches(state, repo), input.defaultBranchId), 'Choose an active default branch.')
  const patch = { ...fields, defaultBranchId: input.defaultBranchId }
  if (Object.entries(patch).every(([key, value]) => repo[key] === value)) return { state }
  return { state: { ...state, repositories: replace(state.repositories, repo.id, { ...patch, ...modified(stamp) }) } }
}

export function setRepositoryStar(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const existing = starRecord(state, repo)
  if (Boolean(existing && !existing.removedAt) === input.starred) return { state }
  const patch = { ...modified(stamp), ...(input.starred ? { starredAt: stamp.now, removedAt: null } : { removedAt: stamp.now }) }
  const repositoryStars = existing ? replace(state.repositoryStars, existing.id, patch) :
    [...list(state.repositoryStars), { id: idFor('star'), repositoryId: repo.id, userId: stamp.actor, ...created(stamp), ...patch }]
  return { state: { ...state, repositoryStars } }
}

export function deleteRepository(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  return { state: { ...state, repositories: replace(state.repositories, repo.id, { deletedAt: stamp.now, deletedBy: stamp.actor, ...modified(stamp) }) } }
}

function validBranch(name) {
  return name && name !== '@' && !name.startsWith('-') && !name.endsWith('.') && !name.includes('..') &&
    !name.includes('@{') && !/[\s~^:?*\[\\\x00-\x1f\x7f]/.test(name) &&
    name.split('/').every(part => part && !part.startsWith('.') && !part.endsWith('.lock'))
}

export function createBranch(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const branches = openBranches(state, repo)
  const source = byId(branches, input.sourceBranchId)
  requireThat(source, 'Choose an active source branch.')
  requireThat(!source.headCommitId || commitIndex(state, repo).has(source.headCommitId), 'The source branch points to a missing commit.')
  requireThat((source.headCommitId ?? null) === (input.expectedHead ?? null), 'The source branch changed. Reopen the form and try again.')
  const name = input.name.trim()
  requireThat(validBranch(name), 'Enter a valid branch name, such as feature/update-readme.')
  requireThat(!branches.some(branch => branch.name === name || branch.name?.startsWith(name + '/') || name.startsWith(branch.name + '/')),
    'An active branch already uses this name or path.')
  const branch = { id: idFor('br'), repositoryId: repo.id, name, sourceBranchId: source.id, headCommitId: source.headCommitId ?? null,
    closedAt: null, ...created(stamp) }
  return { state: { ...state, branches: [...list(state.branches), branch],
    repositories: replace(state.repositories, repo.id, modified(stamp)) }, result: branch }
}

export function commitFile(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const branch = byId(openBranches(state, repo), input.branchId)
  requireThat(branch, 'This branch is unavailable.')
  const head = branch.headCommitId ?? null
  requireThat(head === (input.expectedHead ?? null), 'The branch changed. Reopen the editor to work from the latest commit.')
  const commits = commitIndex(state, repo)
  requireThat(!head || commits.has(head), 'The branch points to a missing commit.')
  const path = filePath(input.path)
  requireThat(path, 'Enter a repository-relative file path.')
  requireThat(path !== CONFIG_PATH, 'Manage bitbucket-pipelines.yml from Pipelines.')
  const message = input.message.trim()
  requireThat(message, 'Enter a commit message.')
  const current = treeAt(commits, head)
  const operation = input.operation
  requireThat(operation === 'add' || operation === 'modify', 'Choose a supported file action.')
  if (operation === 'add') {
    requireThat(![...current.keys()].some(file => file === path || file.startsWith(path + '/') || path.startsWith(file + '/')),
      'A file or directory already exists at this path.')
  } else {
    requireThat(current.has(path), 'This file is no longer available.')
    requireThat(current.get(path) !== input.content, 'Change the file before committing.')
  }
  const commit = recordCommit(repo, branch, message, [head], [{ path, operation, content: input.content }], stamp)
  return { state: advanceBranch(state, repo, branch, commit, stamp), result: commit }
}
