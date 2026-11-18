import {
  actor, dateValue, diffFields, eligibleAgents, find, isDone, MATCH_FIELDS,
  orderedPolicies, records, slaFields, stamp, uid,
} from './model.js'

function ticketEvent(state, ticketId, type, createdAt, changes, conversationId = null) {
  return { id: uid('te'), ticketId, type, actorId: actor(state), createdAt, changes, conversationId }
}

export function createTicket(state, ticketId, fields, requester) {
  const now = stamp()
  const contacts = records(state.contacts)
  const existing = requester.id ? find(contacts, requester.id) :
    contacts.find(contact => contact.email?.toLowerCase() === requester.email?.toLowerCase())
  if (!existing && requester.id) return state
  const contact = existing ?? { id: uid('con'), name: requester.name, email: requester.email, createdAt: now, createdBy: actor(state) }
  const tickets = records(state.tickets)
  const numbers = tickets.flatMap(ticket => ticket.number != null && Number.isSafeInteger(Number(ticket.number)) ? [Number(ticket.number)] : [])
  const number = (numbers.length ? numbers.reduce((max, value) => Math.max(max, value)) : 1000) + 1
  const ticket = {
    id: ticketId, number, ...fields, requesterId: contact.id, tags: [],
    createdBy: actor(state), createdAt: now, updatedAt: now,
    resolvedAt: isDone(fields) ? now : null, closedAt: fields.status === 'closed' ? now : null,
    firstRespondedAt: null, lastCustomerReplyAt: null, lastRespondedAt: null,
    firstResponseDueOverrideAt: null, resolutionDueOverrideAt: null,
  }
  Object.assign(ticket, slaFields(state, ticket, { creating: true }))
  return {
    ...state,
    contacts: existing ? state.contacts : [...contacts, contact],
    tickets: [...tickets, ticket],
    ticketEvents: [...records(state.ticketEvents), ticketEvent(state, ticketId, 'created', now, {})],
  }
}

function lifecycle(ticket, status, now) {
  if (!status || ticket.status === status) return {}
  return {
    status,
    resolvedAt: ['resolved', 'closed'].includes(status) ? ticket.resolvedAt ?? now : null,
    closedAt: status === 'closed' ? now : null,
  }
}

export function editTickets(state, ids, properties) {
  const now = stamp()
  const events = []
  const tickets = records(state.tickets).map(ticket => {
    if (!ids.has(ticket.id)) return ticket
    const groupId = 'groupId' in properties ? properties.groupId : ticket.groupId
    if (properties.assigneeId && !eligibleAgents(state, groupId).some(agent => agent.id === properties.assigneeId) &&
        (properties.assigneeId !== ticket.assigneeId || ('groupId' in properties && properties.groupId !== ticket.groupId))) return ticket
    const next = { ...ticket, ...properties, ...lifecycle(ticket, properties.status, now) }
    if (['priority', ...MATCH_FIELDS].some(field => (next[field] ?? null) !== (ticket[field] ?? null))) {
      Object.assign(next, slaFields(state, next))
    }
    const changes = diffFields(ticket, next)
    if (!Object.keys(changes).length) return ticket
    next.updatedAt = now
    events.push(ticketEvent(state, ticket.id, 'updated', now, { ...changes, ...diffFields(ticket, next, ['updatedAt']) }))
    return next
  })
  return events.length ? { ...state, tickets, ticketEvents: [...records(state.ticketEvents), ...events] } : state
}

function saveTicketChange(state, ticket, patch, type, now, message) {
  const next = { ...ticket, ...patch, updatedAt: now }
  const event = ticketEvent(state, ticket.id, type, now, diffFields(ticket, next), message?.id)
  return {
    ...state,
    tickets: records(state.tickets).map(row => row.id === ticket.id ? next : row),
    ticketEvents: [...records(state.ticketEvents), event],
    ...(message && { ticketConversations: [...records(state.ticketConversations), message] }),
  }
}

export function sendMessage(state, ticketId, fields) {
  const ticket = find(state.tickets, ticketId)
  if (!ticket || !fields.body.trim()) return state
  const now = stamp()
  const message = {
    id: uid('msg'), ticketId, authorId: actor(state), kind: fields.kind,
    visibility: fields.kind === 'reply' ? 'public' : fields.visibility, body: fields.body.trim(),
    cannedResponseIds: fields.kind === 'reply' ? [...new Set(fields.cannedResponseIds)] : [], createdAt: now,
  }
  const patch = lifecycle(ticket, fields.status, now)
  if (message.visibility === 'public') {
    patch.firstRespondedAt = ticket.firstRespondedAt ?? now
    patch.lastRespondedAt = now
    patch.nextResponseDueAt = null
  }
  return saveTicketChange(state, ticket, patch, fields.kind === 'reply' ? 'reply_sent' : 'note_added', now, message)
}

export function overrideDue(state, ticketId, dueDates) {
  const ticket = find(state.tickets, ticketId)
  if (!ticket) return state
  const patch = {}
  for (const field of ['firstResponse', 'resolution']) {
    const value = dueDates[field]
    if (Number.isFinite(dateValue(value)) && value !== ticket[`${field}DueAt`]) {
      patch[`${field}DueAt`] = value
      patch[`${field}DueOverrideAt`] = value
    }
  }
  return Object.keys(patch).length ? saveTicketChange(state, ticket, patch, 'sla_due_dates_updated', stamp()) : state
}

function adminEvent(state, entityType, entityId, action, createdAt, changes) {
  return { id: uid('ae'), entityType, entityId, action, actorId: actor(state), createdAt, changes }
}

const ENTITY_KEYS = {
  sla_policy: 'slaPolicies',
  canned_response: 'cannedResponses',
  canned_response_folder: 'cannedResponseFolders',
}

export function saveAdminRecord(state, entityType, id, fields, action = 'updated') {
  const key = ENTITY_KEYS[entityType]
  const existing = find(state[key], id)
  const collection = records(state[key])
  const now = stamp()
  const patch = action === 'deleted' ? { deletedAt: now } : fields
  const record = existing ? { ...existing, ...patch } : {
    id: id ?? uid(entityType === 'sla_policy' ? 'sla' : entityType === 'canned_response' ? 'cr' : 'crf'),
    ...(entityType === 'canned_response' ? { ownerId: actor(state) } : { createdBy: actor(state) }),
    createdAt: now,
    ...(entityType !== 'canned_response_folder' && { deletedAt: null }),
    ...patch,
  }
  if (existing && !Object.keys(diffFields(existing, record)).length) return state
  record.updatedAt = now
  const event = adminEvent(state, entityType, record.id, existing ? action : 'created', now, diffFields(existing ?? {}, record))
  return {
    ...state,
    [key]: existing ? collection.map(item => item.id === id ? record : item) : [...collection, record],
    adminEvents: [...records(state.adminEvents), event],
  }
}

export function movePolicy(state, id, offset) {
  const ordered = orderedPolicies(state).filter(policy => !policy.isDefault)
  const index = ordered.findIndex(policy => policy.id === id)
  const nextIndex = index + offset
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return state
  const moved = ordered[index]
  ordered[index] = ordered[nextIndex]
  ordered[nextIndex] = moved
  const ranks = new Map(ordered.map((policy, rank) => [policy.id, rank + 1]))
  return rerankPolicies(state, ranks)
}

export function createPolicy(state, fields) {
  const policies = orderedPolicies(state)
  const rank = Math.max(0, ...policies.filter(policy => !policy.isDefault).map(policy => Number(policy.rank) || 0)) + 1
  const next = saveAdminRecord(state, 'sla_policy', null, { ...fields, isDefault: false, rank })
  return rerankPolicies(next, new Map(policies.filter(policy => policy.isDefault && Number(policy.rank) <= rank)
    .map(policy => [policy.id, rank + 1])))
}

function rerankPolicies(state, ranks) {
  const now = stamp()
  const events = []
  const slaPolicies = records(state.slaPolicies).map(policy => {
    const rank = ranks.get(policy.id)
    if (rank === undefined || policy.rank === rank) return policy
    const next = { ...policy, rank, updatedAt: now }
    events.push(adminEvent(state, 'sla_policy', policy.id, 'reordered', now, diffFields(policy, next)))
    return next
  })
  return events.length ? { ...state, slaPolicies, adminEvents: [...records(state.adminEvents), ...events] } : state
}
