import { issueAction, newId, replaceById, rows, text } from './records.js'

export const reviewReasons = ['website_check', 'fixed', 'disagree']

export function submitReview(state, meta, id, form) {
  const issue = rows(state.issues).find((item) => item.id === id)
  if (!issue || issue.status !== 'open') return { error: 'This issue is no longer eligible for review.' }
  const { reason, acknowledged } = form
  if (!reviewReasons.includes(reason) || !Array.isArray(issue.reviewOptions) || !issue.reviewOptions.includes(reason)) {
    return { error: 'This review option is unavailable.' }
  }
  const explanation = text(form.explanation)
  if (reason === 'disagree' && !explanation) return { field: 'explanation', error: 'Explain why you disagree with the issue.' }
  if (reason !== 'disagree' && !acknowledged) return { field: 'acknowledged', error: 'Confirm the issue has been addressed before continuing.' }

  const review = {
    id: newId('rev'), issueId: issue.id, productId: issue.productId ?? null, feedId: issue.feedId ?? null,
    country: issue.country ?? null, reason, acknowledged: Boolean(acknowledged),
    ...(reason === 'disagree' ? { explanation } : {}), status: 'submitted', ...meta,
  }
  const updated = { ...issue, status: 'under_review', latestReviewId: review.id, updatedAt: meta.createdAt }
  const action = issueAction(updated, 'review_requested', { reviewId: review.id }, meta)
  return {
    state: {
      ...state, issues: replaceById(rows(state.issues), new Map([[id, updated]])),
      issueReviews: [...rows(state.issueReviews), review], issueActions: [...rows(state.issueActions), action],
    },
  }
}

