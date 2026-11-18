import { byId, list, scoped } from '../utils/model.js'

export function requireThat(condition, message) {
  if (!condition) throw new Error(message)
}

export const idFor = prefix => `${prefix}-${globalThis.crypto.randomUUID()}`
export const modified = ({ actor, now }) => ({ updatedAt: now, updatedBy: actor })
export const created = stamp => ({ createdAt: stamp.now, createdBy: stamp.actor, ...modified(stamp) })
export const replace = (records, id, patch) => list(records).map(record => record.id === id ? { ...record, ...patch } : record)

export function requireRepo(state, id) {
  const repo = byId(state.repositories, id)
  requireThat(repo && !repo.deletedAt && byId(state.workspaces, repo.workspaceId), 'This repository is unavailable.')
  return repo
}

export function requireProject(state, workspaceId, projectId) {
  requireThat(byId(scoped(state.projects, 'workspaceId', workspaceId), projectId), 'Choose a project in this workspace.')
}

export function recordCommit(repo, branch, message, parentIds, changes, { actor, now }) {
  const id = idFor('cmt')
  const hash = (id.slice(4).replaceAll('-', '') + id.slice(4, 12)).slice(0, 40)
  return { id, repositoryId: repo.id, branchId: branch.id, hash, message, parentIds: parentIds.filter(Boolean), changes, createdAt: now, createdBy: actor }
}

export function advanceBranch(state, repo, branch, commit, stamp, repoPatch = {}) {
  return {
    ...state,
    commits: [...list(state.commits), commit],
    branches: replace(state.branches, branch.id, { headCommitId: commit.id, ...modified(stamp) }),
    repositories: replace(state.repositories, repo.id, { ...repoPatch, ...modified(stamp) }),
  }
}
