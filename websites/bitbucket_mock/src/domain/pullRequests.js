import { advanceBranch, created, idFor, modified, recordCommit, replace, requireRepo, requireThat } from './common.js'
import { commitIndex, compareHeads, treeAt } from './git.js'
import { byId, list, numberAfter, openBranches, repoRecords, scoped } from '../utils/model.js'

export function requestDetail(state, repo, pr) {
  const branches = repoRecords(state.branches, repo)
  const source = byId(branches, pr.sourceBranchId)
  const destination = byId(branches, pr.destinationBranchId)
  const live = pr.status === 'open'
  const sourceId = live && source ? source.headCommitId ?? null : pr.sourceCommitId ?? null
  const destinationId = live && destination ? destination.headCommitId ?? null : pr.destinationCommitId ?? null
  const commits = commitIndex(state, repo)
  return { source, destination, sourceId, destinationId, commitIndex: commits, ...compareHeads(commits, sourceId, destinationId) }
}

export function requestRecords(state, pr) {
  return {
    comments: scoped(state.pullRequestComments, 'pullRequestId', pr.id),
    tasks: scoped(state.pullRequestTasks, 'pullRequestId', pr.id),
    reviews: scoped(state.pullRequestReviews, 'pullRequestId', pr.id),
    activity: scoped(state.pullRequestActivity, 'pullRequestId', pr.id),
  }
}

export function reviewChecks(repo, pr, detail, tasks, reviews) {
  const required = Number(repo.mergeChecks?.requiredApprovals) || 0
  const reviewers = new Set(reviews.filter(review => review.reviewerId !== pr.authorId && review.status === 'approved' &&
    review.sourceCommitId === detail.sourceId).map(review => review.reviewerId))
  const remaining = tasks.filter(task => task.status !== 'completed').length
  const blocked = reviewers.size < required || Boolean(repo.mergeChecks?.requireResolvedTasks && remaining)
  return { required, approved: reviewers.size, remaining, requireResolved: Boolean(repo.mergeChecks?.requireResolvedTasks), blocked }
}

export function mergeAvailability(repo, detail, checks) {
  if (!detail.source || detail.source.closedAt || !detail.destination || detail.destination.closedAt) return 'Both branches must be active.'
  if (!detail.commitIndex.has(detail.sourceId) || detail.destinationId && !detail.commitIndex.has(detail.destinationId)) return 'The source or destination commit is missing.'
  if (!detail.changes.length || !detail.commits.length) return 'The source branch has no changes to merge.'
  if (detail.conflicts.length) return 'Resolve the conflicting files before merging.'
  if (checks.blocked) return 'Complete the required merge checks first.'
  return ''
}

export function closeBranchReason(state, repo, pr, source) {
  if (!source || source.closedAt) return 'The source branch is unavailable.'
  if (source.id === repo.defaultBranchId) return 'The default branch must stay open.'
  if (repoRecords(state.pullRequests, repo).some(other => other.id !== pr.id && other.status === 'open' &&
    (other.sourceBranchId === source.id || other.destinationBranchId === source.id))) return 'Another open pull request uses this branch.'
  return ''
}

export const workspaceUsers = (state, repo) => list(state.users).filter(user =>
  !Array.isArray(user.workspaceIds) || user.workspaceIds.includes(repo.workspaceId))

function openRequest(state, input) {
  const repo = requireRepo(state, input.repositoryId)
  const pr = byId(repoRecords(state.pullRequests, repo), input.pullRequestId)
  requireThat(pr?.status === 'open', 'This pull request is no longer open.')
  return { repo, pr }
}

function activity(state, pr, type, targetId, changes, stamp) {
  return [...list(state.pullRequestActivity), { id: idFor('pra'), pullRequestId: pr.id, type, targetId, changes, createdAt: stamp.now, createdBy: stamp.actor }]
}

function updateRequest(state, pr, patch, type, targetId, changes, stamp) {
  return { ...state, pullRequests: replace(state.pullRequests, pr.id, { ...patch, ...modified(stamp) }),
    pullRequestActivity: activity(state, pr, type, targetId, changes, stamp) }
}

function editableFields(state, repo, input, authorId) {
  const title = input.title.trim()
  requireThat(title, 'Enter a title for this pull request.')
  const reviewerIds = [...new Set(list(input.reviewerIds))]
  const available = workspaceUsers(state, repo)
  requireThat(reviewerIds.every(id => id !== authorId && byId(available, id)), 'Choose reviewers from this workspace.')
  return { title, description: input.description.trim(), reviewerIds, closeSourceOnMerge: Boolean(input.closeSourceOnMerge) }
}

export function createPullRequest(state, input, stamp) {
  const repo = requireRepo(state, input.repositoryId)
  const branches = openBranches(state, repo)
  const source = byId(branches, input.sourceBranchId)
  const destination = byId(branches, input.destinationBranchId)
  requireThat(source && destination && source.id !== destination.id, 'Choose two different active branches in this repository.')
  const sourceId = source.headCommitId ?? null
  const destinationId = destination.headCommitId ?? null
  requireThat(sourceId === input.sourceCommitId && destinationId === input.destinationCommitId, 'A branch changed. Review the updated comparison before submitting.')
  const commits = commitIndex(state, repo)
  requireThat(commits.has(sourceId) && (!destinationId || commits.has(destinationId)), 'A selected branch points to a missing commit.')
  const comparison = compareHeads(commits, sourceId, destinationId)
  requireThat(comparison.changes.length && comparison.commits.length, 'The source branch has no changes to include.')
  const requests = repoRecords(state.pullRequests, repo)
  requireThat(!requests.some(pr => pr.status === 'open' && pr.sourceBranchId === source.id && pr.destinationBranchId === destination.id),
    'An open pull request already exists for these branches.')
  const fields = editableFields(state, repo, input, stamp.actor)
  const pr = { id: idFor('pr'), number: numberAfter(requests, 'number'), repositoryId: repo.id, sourceBranchId: source.id, destinationBranchId: destination.id,
    sourceCommitId: sourceId, destinationCommitId: destinationId, authorId: stamp.actor, status: 'open', ...fields, ...created(stamp) }
  return { state: { ...state, pullRequests: [...list(state.pullRequests), pr], pullRequestActivity: activity(state, pr, 'created', pr.id,
    { ...fields, sourceBranchId: source.id, destinationBranchId: destination.id, sourceCommitId: sourceId, destinationCommitId: destinationId, status: 'open' }, stamp) }, result: pr }
}

export function editPullRequest(state, input, stamp) {
  const { repo, pr } = openRequest(state, input)
  requireThat(pr.authorId === stamp.actor, 'Only the author can edit this pull request.')
  const fields = editableFields(state, repo, input, pr.authorId)
  const changes = Object.fromEntries(Object.entries(fields).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(pr[key])))
  if (!Object.keys(changes).length) return { state, result: pr }
  return { state: updateRequest(state, pr, changes, 'edited', pr.id, changes, stamp), result: { ...pr, ...changes } }
}

export function linesOf(text) {
  return text == null || text === '' ? [] : String(text).replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
}

export function addComment(state, input, stamp) {
  const { repo, pr } = openRequest(state, input)
  const body = input.body.trim()
  requireThat(body, 'Enter a comment.')
  const { comments } = requestRecords(state, pr)
  const parent = input.parentCommentId ? byId(comments, input.parentCommentId) : null
  requireThat(!input.parentCommentId || parent && !parent.parentCommentId, 'This thread is unavailable.')
  const anchor = parent ? null : input.anchor ?? null
  if (anchor) {
    const detail = requestDetail(state, repo, pr)
    requireThat(anchor.side === 'source' || anchor.side === 'destination', 'Choose a valid diff line.')
    const expected = anchor.side === 'source' ? detail.sourceId : detail.destinationId
    const files = treeAt(detail.commitIndex, expected)
    requireThat(expected && expected === anchor.commitId && detail.changes.some(change => change.path === anchor.path) &&
      Number.isInteger(anchor.line) && anchor.line > 0 && anchor.line <= linesOf(files.get(anchor.path)).length,
    'This diff line has changed. Select a line from the latest comparison.')
  }
  const fields = { body, parentCommentId: parent?.id || null, anchor, ...(!parent ? { status: 'open', resolvedAt: null, resolvedBy: null } : {}) }
  const comment = { id: idFor('prc'), pullRequestId: pr.id, ...fields, ...created(stamp) }
  return { state: updateRequest({ ...state, pullRequestComments: [...list(state.pullRequestComments), comment] }, pr, {},
    parent ? 'comment_replied' : 'comment_added', comment.id, fields, stamp), result: comment }
}

export function setThreadResolution(state, input, stamp) {
  const { pr } = openRequest(state, input)
  const comment = byId(requestRecords(state, pr).comments, input.commentId)
  requireThat(comment && !comment.parentCommentId, 'This comment thread is unavailable.')
  const patch = { status: input.resolved ? 'resolved' : 'open', resolvedAt: input.resolved ? stamp.now : null, resolvedBy: input.resolved ? stamp.actor : null }
  if (Boolean(comment.status === 'resolved') === input.resolved) return { state }
  return { state: updateRequest({ ...state, pullRequestComments: replace(state.pullRequestComments, comment.id, { ...patch, ...modified(stamp) }) },
    pr, {}, input.resolved ? 'thread_resolved' : 'thread_reopened', comment.id, patch, stamp) }
}

export function addTask(state, input, stamp) {
  const { pr } = openRequest(state, input)
  const body = input.body.trim()
  requireThat(body, 'Enter a task.')
  const assigneeId = input.assigneeId || null
  requireThat(!assigneeId || [pr.authorId, ...list(pr.reviewerIds)].includes(assigneeId) && byId(state.users, assigneeId), 'Assign the task to an available author or reviewer.')
  const commentId = input.commentId || null
  requireThat(!commentId || byId(requestRecords(state, pr).comments, commentId), 'This comment is unavailable.')
  const fields = { commentId, assigneeId, body, status: 'open', completedAt: null, completedBy: null }
  const task = { id: idFor('prt'), pullRequestId: pr.id, ...fields, ...created(stamp) }
  return { state: updateRequest({ ...state, pullRequestTasks: [...list(state.pullRequestTasks), task] }, pr, {}, 'task_created', task.id, fields, stamp), result: task }
}

export function setTaskStatus(state, input, stamp) {
  const { pr } = openRequest(state, input)
  const task = byId(requestRecords(state, pr).tasks, input.taskId)
  requireThat(task, 'This task is unavailable.')
  const patch = { status: input.completed ? 'completed' : 'open', completedAt: input.completed ? stamp.now : null, completedBy: input.completed ? stamp.actor : null }
  if (Boolean(task.status === 'completed') === input.completed) return { state }
  return { state: updateRequest({ ...state, pullRequestTasks: replace(state.pullRequestTasks, task.id, { ...patch, ...modified(stamp) }) },
    pr, {}, input.completed ? 'task_completed' : 'task_reopened', task.id, patch, stamp) }
}

export function setReview(state, input, stamp) {
  const { repo, pr } = openRequest(state, input)
  requireThat(pr.authorId !== stamp.actor && list(pr.reviewerIds).includes(stamp.actor), 'Only an assigned reviewer can review this pull request.')
  requireThat(['approved', 'changes_requested', 'unreviewed'].includes(input.status), 'Choose a valid review status.')
  const detail = requestDetail(state, repo, pr)
  requireThat(detail.commitIndex.has(detail.sourceId) && detail.sourceId === input.sourceCommitId, 'The source changed. Review the updated commit first.')
  const existing = requestRecords(state, pr).reviews.find(review => review.reviewerId === stamp.actor)
  if (existing?.status === input.status && existing.sourceCommitId === detail.sourceId || !existing && input.status === 'unreviewed') return { state }
  const fields = { status: input.status, sourceCommitId: detail.sourceId }
  const id = existing?.id || idFor('rev')
  const reviews = existing ? replace(state.pullRequestReviews, id, { ...fields, ...modified(stamp) }) :
    [...list(state.pullRequestReviews), { id, pullRequestId: pr.id, reviewerId: stamp.actor, ...fields, ...created(stamp) }]
  return { state: updateRequest({ ...state, pullRequestReviews: reviews }, pr, {}, 'review_changed', id, fields, stamp) }
}

function currentHeads(state, repo, pr, input) {
  const detail = requestDetail(state, repo, pr)
  requireThat(detail.sourceId === input.sourceCommitId && detail.destinationId === input.destinationCommitId,
    'A branch changed. Reopen the dialog and review the updated comparison.')
  return detail
}

export function mergePullRequest(state, input, stamp) {
  const { repo, pr } = openRequest(state, input)
  const detail = currentHeads(state, repo, pr, input)
  const { tasks, reviews } = requestRecords(state, pr)
  const reason = mergeAvailability(repo, detail, reviewChecks(repo, pr, detail, tasks, reviews))
  requireThat(!reason, reason)
  requireThat(['merge_commit', 'squash'].includes(input.strategy), 'Choose a merge strategy.')
  const closeReason = closeBranchReason(state, repo, pr, detail.source)
  requireThat(!input.closeSource || !closeReason, closeReason)
  const parents = input.strategy === 'squash' ? [detail.destinationId] : [detail.destinationId, detail.sourceId]
  // With an empty destination, the source is the merge commit’s only parent and already contains the result.
  const changes = !detail.destinationId && input.strategy === 'merge_commit' ? [] : detail.mergeChanges
  const commit = recordCommit(repo, detail.destination, `Merge pull request #${pr.number}: ${pr.title}`, parents, changes, stamp)
  let next = advanceBranch(state, repo, detail.destination, commit, stamp)
  if (input.closeSource) next = { ...next, branches: replace(next.branches, detail.source.id, { closedAt: stamp.now, closedBy: stamp.actor, ...modified(stamp) }) }
  const fields = { status: 'merged', sourceCommitId: detail.sourceId, destinationCommitId: detail.destinationId,
    mergedAt: stamp.now, mergedBy: stamp.actor, mergeCommitId: commit.id, mergeStrategy: input.strategy, sourceBranchClosed: Boolean(input.closeSource) }
  return { state: updateRequest(next, pr, fields, 'merged', commit.id, fields, stamp), result: commit }
}

export function declinePullRequest(state, input, stamp) {
  const { repo, pr } = openRequest(state, input)
  const detail = currentHeads(state, repo, pr, input)
  const fields = { status: 'declined', sourceCommitId: detail.sourceId, destinationCommitId: detail.destinationId,
    declinedAt: stamp.now, declinedBy: stamp.actor, declineReason: input.reason.trim() }
  return { state: updateRequest(state, pr, fields, 'declined', pr.id, fields, stamp) }
}
