import { created, find, list, nextId, requireThat, scoped, stamp, update } from './model.js'

export function commitChain(data, repoId, head) {
  const index = new Map(list(data.commits).filter((commit) => commit.repoId === repoId).map((commit) => [commit.id, commit]))
  const seen = new Set()
  const chain = []
  for (let id = head; id && !seen.has(id) && index.has(id);) {
    seen.add(id)
    const commit = index.get(id)
    chain.push(commit)
    id = list(commit.parentCommitIds)[0]
  }
  return chain
}

export function snapshot(data, repoId, head) {
  const files = new Map()
  for (const commit of commitChain(data, repoId, head).reverse()) {
    for (const change of list(commit.changes)) {
      if (change.kind === 'delete' || change.after == null) files.delete(change.path)
      else if (change.path) files.set(change.path, change.after)
    }
  }
  return files
}

export const repoBranches = (data, repoId) => list(data.branches).filter((row) => row.repoId === repoId)
export const resolveBranch = (data, repo, version) => {
  const branches = repoBranches(data, repo.id)
  if (version) return branches.find((row) => row.id === version || row.name === version.replace(/^refs\/heads\//, ''))
  return find(branches, repo.defaultBranchId) ?? branches[0]
}
export const hasHead = (data, repoId, branch) => Boolean(branch?.headCommitId && list(data.commits).some((row) => row.id === branch.headCommitId && row.repoId === repoId))
const validRepoName = (name) => /^[a-z\d][a-z\d._-]{0,63}$/i.test(name) && !name.endsWith('.')
const branchNamePattern = /^[^\s\x00-\x20\x7f~^:?*\[\\]+$/
export const validBranchName = (name) => branchNamePattern.test(name) && name !== '@' && !name.startsWith('-') && !name.includes('..') &&
  !name.includes('@{') && name.split('/').every((part) => part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock'))
export function validPath(path) {
  return typeof path === 'string' && path.length <= 255 && !/[\\\x00-\x1f]/.test(path) &&
    path.split('/').every((piece) => piece && piece !== '.' && piece !== '..' && piece.toLowerCase() !== '.git')
}
export const fileChange = (path, before, after) => ({
  path, kind: before == null ? 'add' : after == null ? 'delete' : 'edit', before: before ?? null, after: after ?? null,
})

export function newRepo(data, projectId, rawName, readme, actor, now) {
  const name = rawName.trim()
  requireThat(validRepoName(name), 'Enter a repository name with letters, numbers, periods, underscores or hyphens.')
  const rows = list(data.repositories)
  const slug = name.toLowerCase()
  requireThat(!scoped(rows, projectId).some((row) => [row.slug, row.name].some((value) => value?.toLowerCase() === slug)), 'A repository with this name already exists.')
  const repo = { id: nextId(rows, 'repo-'), projectId, slug, name, defaultBranchId: null, requiredApprovals: 0, ...created(actor, now) }
  let next = { ...data, repositories: [...rows,repo] }
  if (readme) [next] = initializeRepo(next, projectId, repo.id, actor, now)
  return [next, repo]
}

export function initializeRepo(data, projectId, repoId, actor, now) {
  const repo = find(scoped(data.repositories, projectId), repoId)
  requireThat(repo && !repoBranches(data, repo.id).length, 'This repository is already initialized or unavailable.')
  const branches = list(data.branches)
  const id = nextId(branches, 'br-')
  const branch = { id, repoId, name: 'main', baseBranchId: null, headCommitId: null, workItemIds: [], ...created(actor, now), ...stamp(actor, now) }
  const next = { ...data, repositories: update(list(data.repositories), { ...repo, defaultBranchId: id }), branches: [...branches, branch] }
  return appendCommit(next, branch, [], 'Initialize repository', [fileChange('README.md', null, '# ' + repo.name + '\n')], actor, now)
}

export function createBranch(data, projectId, repoId, rawName, baseId, workItemIds, actor, now) {
  const repo = find(scoped(data.repositories, projectId), repoId)
  const branches = repoBranches(data, repoId)
  const base = find(branches, baseId)
  const name = rawName.trim()
  requireThat(repo && hasHead(data, repoId, base), 'Select a base branch with an available commit.')
  requireThat(validBranchName(name), 'Enter a valid Git branch name.')
  requireThat(!branches.some((branch) => branch.name === name || branch.name?.startsWith(name + '/') || name.startsWith(branch.name + '/')), 'This branch name conflicts with an existing branch.')
  const linked = [...new Set(workItemIds)]
  requireThat(linked.every((id) => find(scoped(data.workItems, projectId), id)), 'Link work items from this project.')
  const all = list(data.branches)
  const branch = { id: nextId(all,'br-'), repoId, name, baseBranchId: base.id, headCommitId: base.headCommitId, workItemIds: linked, ...created(actor, now), ...stamp(actor, now) }
  return [{ ...data, branches: [...all, branch] }, branch]
}

export function appendCommit(data, branch, parentCommitIds, message, changes, actor, now) {
  const commits = list(data.commits)
  const commit = { id: nextId(commits,'c-'), repoId: branch.repoId, branchId: branch.id, parentCommitIds, message, changes, ...created(actor, now) }
  return [{ ...data, commits: [...commits,commit], branches: update(list(data.branches), { ...branch, headCommitId: commit.id, ...stamp(actor, now) }) }, commit]
}

export function commitFile(data, projectId, repoId, branchId, path, value, message, actor, now, { mode, original } = {}) {
  const repo = find(scoped(data.repositories, projectId), repoId)
  const branch = find(repoBranches(data, repoId), branchId)
  requireThat(repo && hasHead(data, repoId, branch), 'Select a branch with an available commit.')
  requireThat(validPath(path), 'Enter a relative file path, such as src/new-file.js.')
  requireThat(message.trim(), 'Enter a commit message.')
  const files = snapshot(data, repoId, branch.headCommitId)
  const previous = files.get(path)
  if (mode === 'create') requireThat(!files.has(path), 'A file already exists at this path on the selected branch.')
  if (mode === 'edit') {
    requireThat(previous === original || previous === value,
      'This file changed on the selected branch while you were editing. Keep a copy of your draft and reopen the file to review the latest version.')
    requireThat(files.has(path), 'The file is unavailable on the selected branch.')
  }
  requireThat(![...files.keys()].some((existing) => existing.startsWith(path + '/') || path.startsWith(existing + '/')), 'A file or folder already uses this path.')
  if (previous === value) return [data, null]
  return appendCommit(data, branch, [branch.headCommitId], message.trim(), [fileChange(path, previous, value)], actor, now)
}

function ancestorDistances(commits, head) {
  const distances = new Map()
  const queue = [[head,0]]
  for (let i = 0; i < queue.length; i++) {
    const [id, distance] = queue[i]
    if (!commits.has(id) || distances.has(id)) continue
    distances.set(id, distance)
    for (const parent of list(commits.get(id).parentCommitIds)) queue.push([parent, distance + 1])
  }
  return distances
}

export function changesBetween(data, repoId, earlier, later) {
  const from = snapshot(data, repoId, earlier)
  const to = snapshot(data, repoId, later)
  return [...new Set([...from.keys(), ...to.keys()])].sort().filter((path) => from.get(path) !== to.get(path))
    .map((path) => fileChange(path, from.get(path), to.get(path)))
}

export function compareBranches(data, repoId, sourceHead, targetHead) {
  const commits = new Map(list(data.commits).filter((row) => row.repoId === repoId).map((row) => [row.id,row]))
  const source = ancestorDistances(commits, sourceHead)
  const target = ancestorDistances(commits, targetHead)
  const sourceOnly = [...source.keys()].filter((id) => !target.has(id)).map((id) => commits.get(id))
  const baseId = [...source.keys()].filter((id) => target.has(id)).sort((a,b) => source.get(a) + target.get(a) - source.get(b) - target.get(b))[0]
  const preview = changesBetween(data, repoId, baseId ?? targetHead, sourceHead)
  const changes = [], conflicts = []
  const targetFiles = snapshot(data, repoId, targetHead)
  if (baseId) {
    for (const change of preview) {
      const targetContent = targetFiles.get(change.path) ?? null
      if (targetContent !== change.before && targetContent !== change.after) conflicts.push(change.path)
      else if (targetContent !== change.after) changes.push(fileChange(change.path, targetContent, change.after))
    }
    const merged = new Set(targetFiles.keys())
    for (const change of changes) {
      if (change.after === null) merged.delete(change.path)
      else merged.add(change.path)
    }
    for (const path of merged) {
      const segments = path.split('/')
      if (segments.some((_, index) => index > 0 && merged.has(segments.slice(0,index).join('/')))) conflicts.push(path)
    }
  }
  return { baseId, sourceOnly, preview, changes, conflicts: [...new Set(conflicts)] }
}
