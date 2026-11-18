import { attributes, eligibleEmails, findEmail, findService, isVerified, owned } from './selectors.js'

export function serviceConnection(state, serviceId) {
  return owned(state, 'connections').find(item => item.serviceId === serviceId)
}

function snapshot(state, connection) {
  return {
    status: connection.status ?? null,
    sharedEmailId: connection.sharedEmailId ?? null,
    sharedEmailAddress: findEmail(state, connection.sharedEmailId)?.address ?? null,
    sharedAttributes: attributes(connection.sharedAttributes),
  }
}

function recordConnection(state, before, after, type) {
  const connections = Array.isArray(state.connections) ? state.connections : []
  const events = Array.isArray(state.connectionEvents) ? state.connectionEvents : []
  const event = {
    id: `evt_${crypto.randomUUID()}`,
    connectionId: after.id,
    accountId: after.accountId,
    serviceId: after.serviceId,
    actorId: state.account.id,
    type,
    createdAt: after.updatedAt,
    before: before ? snapshot(state, before) : null,
    after: snapshot(state, after),
  }
  return {
    ...state,
    connections: before ? connections.map(item => item === before ? after : item) : [...connections, after],
    connectionEvents: [...events, event],
  }
}

export function connectService(state, serviceId, emailId) {
  const service = findService(state, serviceId)
  if (!state.account?.id || !service || (service.requiresVerifiedIdentity && !isVerified(state))
    || !eligibleEmails(state).some(email => email.id === emailId)) return null
  const before = serviceConnection(state, serviceId)
  if (before && before.status !== 'disconnected') return null

  const now = new Date().toISOString()
  const after = {
    ...before,
    id: before?.id ?? `conn_${crypto.randomUUID()}`,
    accountId: state.account.id, serviceId, status: 'connected', sharedEmailId: emailId,
    sharedAttributes: attributes(service.requestedAttributes),
    createdAt: before?.createdAt ?? now, connectedAt: now, updatedAt: now,
  }
  delete after.disconnectedAt
  return recordConnection(state, before, after, before ? 'reconnected' : 'connected')
}

export function changeSharedEmail(state, connectionId, emailId) {
  const before = owned(state, 'connections').find(item => item.id === connectionId)
  if (before?.status !== 'connected' || !findService(state, before.serviceId) || before.sharedEmailId === emailId
    || !eligibleEmails(state).some(email => email.id === emailId)) return null
  const after = { ...before, sharedEmailId: emailId, updatedAt: new Date().toISOString() }
  return recordConnection(state, before, after, 'shared_email_changed')
}

export function disconnectService(state, connectionId) {
  const before = owned(state, 'connections').find(item => item.id === connectionId)
  if (before?.status !== 'connected' || !findService(state, before.serviceId)) return null
  const now = new Date().toISOString()
  const after = { ...before, status: 'disconnected', disconnectedAt: now, updatedAt: now }
  return recordConnection(state, before, after, 'disconnected')
}
