import { activeAttempt, findService, isVerified, records } from './selectors.js'

export const methodNames = { online: 'Online', in_person: 'In person' }
export const documentNames = { state_id: 'State ID', drivers_license: 'Driver’s license', passport: 'Passport' }
export const documentTypes = method => method === 'online'
  ? ['state_id', 'drivers_license', 'passport']
  : method === 'in_person' ? ['state_id', 'drivers_license'] : []

export function startAttempt(state, serviceId) {
  if (!state.account?.id || isVerified(state) || activeAttempt(state)) return null
  const now = new Date().toISOString()
  const attempt = {
    id: `va_${crypto.randomUUID()}`,
    accountId: state.account.id,
    actorId: state.account.id,
    ...(findService(state, serviceId) ? { serviceId } : {}),
    status: 'in_progress',
    step: 'method',
    sampleIdentityConfirmed: false,
    sampleContactConfirmed: false,
    createdAt: now,
    updatedAt: now,
  }
  return { ...state, verificationAttempts: [...(Array.isArray(state.verificationAttempts) ? state.verificationAttempts : []), attempt] }
}

export function updateAttempt(state, expected, change) {
  const attempt = activeAttempt(state)
  if (!attempt || attempt !== expected) return null
  const now = new Date()
  const next = change(attempt, now)
  if (!next) return null
  const updatedAt = now.toISOString()
  return {
    ...state,
    verificationAttempts: state.verificationAttempts.map(item => item === attempt ? { ...next, updatedAt } : item),
    ...(next.status === 'verified' ? {
      identity: {
        ...state.identity, accountId: state.account.id, status: 'verified', verifiedAt: updatedAt,
        verificationAttemptId: attempt.id, updatedAt,
      },
    } : {}),
  }
}

export function visitExpired(attempt, now = new Date()) {
  const deadline = Date.parse(attempt.visitDeadlineAt)
  return Number.isFinite(deadline) && now.getTime() >= deadline
}

export function reviewReady(attempt) {
  return documentTypes(attempt.method).includes(attempt.documentType)
    && attempt.sampleIdentityConfirmed === true && attempt.sampleContactConfirmed === true
}

export function submitAttempt(attempt, now) {
  if (attempt.status !== 'in_progress' || attempt.step !== 'review' || !reviewReady(attempt)) return null
  const submitted = { ...attempt, submittedAt: now.toISOString() }
  if (attempt.method === 'online') return finishAttempt(submitted, now)
  return {
    ...submitted, status: 'pending_in_person', step: 'visit',
    visitReference: `VISIT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    visitDeadlineAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function finishAttempt(attempt, now) {
  return { ...attempt, status: 'verified', step: 'complete', completedAt: now.toISOString() }
}

export function completedAttempt(state) {
  return records(state.verificationAttempts).find(item => item.accountId === state.account?.id
    && item.id === state.identity?.verificationAttemptId && item.status === 'verified')
}
