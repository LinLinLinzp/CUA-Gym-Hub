import { appendCommit, compareBranches, hasHead, repoBranches } from './git.js'
import { created, find, list, nextId, nextNumber, requireThat, scoped, stamp, update } from './model.js'
import { closeLinkedWork } from './workItems.js'

export const votes = ['none','approved','approvedWithSuggestions','waitingForAuthor','rejected']
const approving = (row) => ['approved','approvedWithSuggestions'].includes(row.vote)

function lookup(data, projectId, repoId, id) {
  const repo = find(scoped(data.repositories, projectId), repoId)
  const request = list(data.pullRequests).find((row) => row.repoId === repoId && row.id === id)
  requireThat(repo && request, 'This pull request is unavailable.')
  return [repo,request]
}

export function createPullRequest(data, projectId, repoId, draft, actor, now) {
  const repo = find(scoped(data.repositories, projectId), repoId)
  const branches = repoBranches(data, repoId)
  const source = find(branches,draft.sourceBranchId)
  const target = find(branches,draft.targetBranchId)
  requireThat(repo && hasHead(data,repoId,source) && hasHead(data,repoId,target) && source.id !== target.id, 'Choose distinct source and target branches with commits.')
  requireThat(draft.title.trim(), 'Enter a pull request title.')
  const reviewerIds = [...new Set(draft.reviewerIds)]
  const workItemIds = [...new Set(draft.workItemIds)]
  const project = find(data.projects,projectId)
  requireThat(reviewerIds.every((id) => list(project.memberIds).includes(id) && find(data.users,id)), 'Select project members as reviewers.')
  requireThat(workItemIds.every((id) => find(scoped(data.workItems,projectId),id)), 'Link work items from this project.')
  const rows = list(data.pullRequests)
  const item = { id: nextNumber(rows), repoId, sourceBranchId: source.id, targetBranchId: target.id, sourceCommitId: source.headCommitId,
    targetCommitId: target.headCommitId, title: draft.title.trim(), description: draft.description.trim(), status: 'active', isDraft: draft.isDraft,
    reviewers: reviewerIds.map((userId) => ({ userId, required: false, vote: 'none', votedAt: null })),
    workItemIds, tags: draft.tags, mergeCommitId: null, closedBy: null, closedAt: null, ...created(actor, now), ...stamp(actor, now) }
  return [{ ...data, pullRequests: [...rows,item] }, item]
}

export function pullHeads(data, repoId, request) {
  const branches = repoBranches(data, repoId)
  const source = find(branches, request.sourceBranchId)
  const target = find(branches, request.targetBranchId)
  const active = request.status === 'active'
  return { source, target,
    sourceHead: (active && hasHead(data,repoId,source) ? source.headCommitId : request.sourceCommitId),
    targetHead: (active && hasHead(data,repoId,target) ? target.headCommitId : request.targetCommitId),
  }
}

export function reviewChecks(data, repo, request, source, target, comparison) {
  const reviewers = list(request.reviewers)
  const required = request.targetBranchId === repo.defaultBranchId ? Number(repo.requiredApprovals) || 0 : 0
  const count = new Set(reviewers.filter(approving).map((row) => row.userId)).size
  const approvals = count >= required && reviewers.every((row) => !row.required || approving(row))
  const heads = hasHead(data, repo.id, source) && hasHead(data, repo.id, target) && source.id !== target.id
  const reason = request.status !== 'active' ? 'This pull request is closed.'
    : request.isDraft ? 'Publish this draft before completing it.'
    : !heads ? 'Both branches need available head commits.'
    : !approvals ? 'Required reviewer approvals are missing.'
    : !comparison.baseId ? 'The branches have no common commit.'
    : comparison.conflicts.length ? 'Resolve conflicting changes before completing.' : ''
  return { required, count, approvals, reason }
}

export function updatePullRequest(data, projectId, repoId, id, action, value, actor, now) {
  const [repo, request] = lookup(data, projectId, repoId, id)
  requireThat(request.status === 'active', 'This pull request is closed.')
  let next = data
  let patch
  if (action === 'publish') {
    if (!request.isDraft) return [data]
    patch = { isDraft: false }
  } else if (action === 'vote') {
    requireThat(votes.includes(value), 'Select a valid vote.')
    const rows = list(request.reviewers)
    const index = rows.findIndex((row) => row.userId === actor)
    if (rows[index]?.vote === value) return [data]
    const reviewer = { ...rows[index], userId: actor, required: rows[index]?.required ?? false, vote: value, votedAt: now }
    patch = { reviewers: index < 0 ? [...rows,reviewer] : rows.map((row,i) => i === index ? reviewer : row) }
  } else if (action === 'abandon') {
    patch = { status: 'abandoned', closedBy: actor, closedAt: now }
  } else {
    requireThat(action === 'complete', 'Unknown pull request action.')
    const { source, target, sourceHead, targetHead } = pullHeads(data, repoId, request)
    const comparison = compareBranches(data, repo.id, sourceHead,targetHead)
    const { reason } = reviewChecks(data,repo,request,source,target,comparison)
    requireThat(!reason, reason)
    const [merged, commit] = appendCommit(data, target, [targetHead,sourceHead], 'Merge pull request #' + id + ': ' + request.title, comparison.changes, actor, now)
    patch = { status: 'completed', mergeCommitId: commit.id, sourceCommitId: sourceHead, targetCommitId: targetHead, closedBy: actor, closedAt: now }
    next = value ? closeLinkedWork(merged,projectId,list(request.workItemIds),actor,now) : merged
  }
  return [{ ...next, pullRequests: update(list(next.pullRequests), { ...request, ...patch, ...stamp(actor, now) }) }]
}

export function addPullComment(data, projectId, repoId, id, input, actor, now) {
  lookup(data, projectId, repoId, id)
  const rows = list(data.pullRequestComments)
  const body = input.body.trim()
  const parent = find(rows,input.parentId)
  requireThat(body, 'Enter a comment.')
  requireThat(!input.parentId || parent?.pullRequestId === id && !parent.parentId, 'The comment thread is unavailable.')
  const path = parent ? parent.path ?? null : input.path ?? null
  const line = parent ? parent.line ?? null : input.line ?? null
  requireThat(path === null || Number.isSafeInteger(line) && line > 0, 'Select a valid line.')
  const comment = { id: nextId(rows,'prc-' + id + '-'), pullRequestId: id, parentId: parent?.id ?? null, path, line, body,
    status: 'active', ...created(actor,now), ...stamp(actor,now) }
  return [{ ...data, pullRequestComments: [...rows,comment] }]
}

export function threadStatus(data, projectId, repoId, id, rootId, status, actor, now) {
  lookup(data, projectId, repoId, id)
  const rows = list(data.pullRequestComments)
  const root = find(rows,rootId)
  requireThat(root?.pullRequestId === id && !root.parentId && ['active','resolved'].includes(status), 'The comment thread is unavailable.')
  if (root.status === status) return [data]
  return [{ ...data, pullRequestComments: update(rows, { ...root,status,...stamp(actor,now) }) }]
}
