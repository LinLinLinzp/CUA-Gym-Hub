import { find, list, uid } from './utils/format.js'

export function routingFor(state, type, amount) {
  const policy = list(state.policies).find(item => item.kind === (type === 'bill' ? 'bill_approvals' : 'spend_request_approvals'))
  const rules = policy?.rules
  const routing = { policyId: policy?.id ?? null, version: policy?.version ?? null, firstReviewerId: rules?.firstReviewerId ?? null,
    secondReviewerId: rules?.secondReviewerId ?? null, thresholdAmount: rules?.thresholdAmount ?? null }
  const first = routing.firstReviewerId && find(state.people, routing.firstReviewerId)
  const backup = state.workspace?.currentUserId && find(state.people, state.workspace.currentUserId)
  const reviewerIds = (first || backup)?.id ? [(first || backup).id] : []
  const second = routing.secondReviewerId && find(state.people, routing.secondReviewerId)
  if (reviewerIds.length && second?.id && !reviewerIds.includes(second.id) && routing.thresholdAmount != null
    && Number(routing.thresholdAmount) > 0 && amount >= Number(routing.thresholdAmount)) reviewerIds.push(second.id)
  return { reviewerIds, routing, fallback: !first && Boolean(backup) }
}

export function newApproval(state, context, { subjectType, subjectId, title, requesterId, amount, currency }) {
  const { reviewerIds, routing } = routingFor(state, subjectType, amount)
  if (!reviewerIds.length) throw new Error('Add a valid reviewer or signed-in administrator before submitting.')
  return { id: uid('approval'), subjectType, subjectId, title, requesterId, amount, currency, status: 'pending',
    reviewerIds, stepIndex: 0, routing, decisions: [], createdBy: context.actorId, createdAt: context.now, updatedAt: context.now }
}
