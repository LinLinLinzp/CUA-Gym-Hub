import { find, leaveTypes, list, newId, utcDate, weekdays } from './model.js'

export function requestedDays(form) {
  const days = weekdays(form.startDate, form.endDate)
  if (form.duration === 'half_day') return form.startDate === form.endDate && days === 1 ? 0.5 : 0
  return form.duration === 'full_day' ? days : 0
}

function validate(form, state, id) {
  if (find(state.workers, form.workerId)?.type !== 'employee') return 'Select an employee.'
  if (!Object.hasOwn(leaveTypes, form.type)) return 'Select a leave type.'
  if (!utcDate(form.startDate) || !utcDate(form.endDate)) return 'Enter valid start and end dates.'
  if (form.endDate < form.startDate) return 'End date must be on or after the start date.'
  if (!requestedDays(form)) return form.duration === 'half_day' ? 'A half day must be on a single weekday.' : 'Select a date range with at least one weekday.'
  if (list(state.timeOffRequests).some(item => (!id || item.id !== id) && item.workerId === form.workerId &&
      ['pending', 'approved'].includes(item.status) && utcDate(item.startDate) && utcDate(item.endDate) &&
      item.startDate <= form.endDate && item.endDate >= form.startDate)) {
    return 'These dates overlap a pending or approved request for this employee.'
  }
  return ''
}

const eventFor = (action, request) => ({
  action: 'time_off.' + action, entityType: 'time_off_request', entityId: request.id,
  relatedIds: [request.workerId].filter(Boolean),
})

export function saveRequest(form, id) {
  return (state, { actor, at }) => {
    const requests = list(state.timeOffRequests)
    const existing = find(requests, id)
    if (id && existing?.status !== 'pending') return { error: 'Only pending requests can be edited.' }
    const error = validate(form, state, id)
    if (error) return { error }
    const request = {
      ...existing, id: existing?.id || newId('tor'), workerId: form.workerId,
      type: form.type, status: 'pending', startDate: form.startDate, endDate: form.endDate,
      duration: form.duration, days: requestedDays(form), note: form.note.trim(),
      createdBy: existing?.createdBy || actor, createdAt: existing?.createdAt || at, updatedAt: at,
      reviewedBy: null, reviewedAt: null, decisionNote: null, cancelledAt: null,
    }
    return {
      changes: { timeOffRequests: existing ? requests.map(item => item.id === id ? request : item) : [...requests, request] },
      event: eventFor(existing ? 'edited' : 'requested', request), id: request.id,
      message: existing ? 'Request updated.' : 'Time off requested.',
    }
  }
}

const messages = { approved: 'Request approved.', denied: 'Request denied.', cancelled: 'Request withdrawn.' }
export function resolveRequest(id, status, note) {
  return (state, { actor, at }) => {
    const request = find(state.timeOffRequests, id)
    if (request?.status !== 'pending') return { error: 'Only pending requests can be reviewed or withdrawn.' }
    if (!Object.hasOwn(messages, status)) return { error: 'Select a request action.' }
    const details = status === 'cancelled' ? { cancelledAt: at }
      : { reviewedBy: actor, reviewedAt: at, decisionNote: status === 'denied' ? note.trim() || null : null }
    const updated = { ...request, ...details, status, updatedAt: at }
    return {
      changes: { timeOffRequests: list(state.timeOffRequests).map(item => item.id === id ? updated : item) },
      event: eventFor(status, updated), id, message: messages[status],
    }
  }
}

