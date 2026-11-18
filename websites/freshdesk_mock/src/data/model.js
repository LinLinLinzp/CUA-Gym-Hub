export const STATUSES = ['open', 'pending', 'resolved', 'closed']
export const PRIORITIES = ['low', 'medium', 'high', 'urgent']
export const TYPES = ['question', 'incident', 'problem', 'request']
export const SOURCES = ['email', 'portal', 'phone', 'chat']
export const PROPERTY_OPTIONS = { status: STATUSES, priority: PRIORITIES, type: TYPES, source: SOURCES }
export const MATCH_FIELDS = ['groupId', 'source', 'type']
export const TARGET_FIELDS = {
  firstResponseMinutes: 'First response',
  everyResponseMinutes: 'Every response',
  resolutionMinutes: 'Resolution',
}
export const PLACEHOLDERS = {
  '{{ticket.requester.name}}': 'Requester name',
  '{{ticket.id}}': 'Ticket ID',
  '{{ticket.subject}}': 'Ticket subject',
}

export const records = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : []
export const find = (items, id) => id == null ? undefined : records(items).find(item => item.id === id)
export const actor = state => state.account?.currentAgentId ?? null
export const agentName = (state, id) => find(state.agents, id)?.name || (id ? 'Unknown agent' : 'Agent')
export const initials = name => String(name).trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
export const label = value => value ? String(value).replace(/^./, letter => letter.toUpperCase()) : 'Unavailable'
export const text = value => String(value ?? '').toLowerCase()
export const ticketNumber = ticket => ticket.number ?? ticket.id
export const stamp = () => new Date().toISOString()
export const isDone = ticket => ['resolved', 'closed'].includes(ticket.status)

export function uid(prefix) {
  // The offline site can be served over HTTP, where randomUUID is unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [prefix, hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

export function eligibleAgents(state, groupId) {
  return records(state.agents).filter(agent => !groupId || (Array.isArray(agent.groupIds) && agent.groupIds.includes(groupId)))
}

export function dateValue(value) {
  return value ? new Date(value).getTime() : NaN
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
})
export function dateLabel(value) {
  const time = dateValue(value)
  return Number.isFinite(time) ? `${dateFormat.format(time)} UTC` : '—'
}

export function nextDeadline(ticket) {
  return [
    !ticket.firstRespondedAt && ticket.firstResponseDueAt,
    ticket.nextResponseDueAt,
    !isDone(ticket) && ticket.resolutionDueAt,
  ].filter(value => Number.isFinite(dateValue(value))).sort((a, b) => dateValue(a) - dateValue(b))[0] ?? null
}

export const overdue = (deadline, now = new Date()) => dateValue(deadline) < now.getTime()

export function orderedPolicies(state) {
  return records(state.slaPolicies).filter(policy => !policy.deletedAt).sort((a, b) =>
    Number(Boolean(a.isDefault)) - Number(Boolean(b.isDefault)) ||
    (Number(a.rank) || 0) - (Number(b.rank) || 0))
}

function matchingPolicy(state, ticket) {
  const policies = orderedPolicies(state).filter(policy => policy.enabled)
  const custom = policies.find(policy => {
    const conditions = records(policy.conditions)
    const matches = condition => MATCH_FIELDS.includes(condition.field) && Boolean(condition.value) &&
      ticket[condition.field] === condition.value
    return !policy.isDefault && conditions.length &&
      (policy.matchMode === 'any' ? conditions.some(matches) : conditions.every(matches))
  })
  return custom ?? policies.find(policy => policy.isDefault)
}

const MINUTE = 60000
function addMinutes(start, minutes, policy, schedules) {
  const startTime = dateValue(start)
  if (!Number.isFinite(startTime) || !Number.isSafeInteger(minutes) || minutes <= 0) return null
  if (policy.hoursMode !== 'business') {
    const due = new Date(startTime + minutes * MINUTE)
    return Number.isFinite(due.getTime()) ? due.toISOString() : null
  }
  const schedule = find(schedules, policy.scheduleId)
  const weekdays = new Set(Array.isArray(schedule?.weekdays) ? schedule.weekdays.filter(day => Number.isInteger(day) && day >= 0 && day < 7) : [])
  const { startMinute, endMinute } = schedule ?? {}
  if (!weekdays.size || (schedule.timeZone && schedule.timeZone !== 'UTC') ||
      !Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute < 0 ||
      endMinute > 1440 || startMinute >= endMinute) return null

  const dayLength = 1440 * MINUTE
  const weekLength = 7 * dayLength
  const weekCapacity = weekdays.size * (endMinute - startMinute) * MINUTE
  let remaining = minutes * MINUTE
  let day = Math.floor(startTime / dayLength) * dayLength
  let cursor = startTime
  while (Number.isFinite(new Date(day).getTime())) {
    if (weekdays.has(new Date(day).getUTCDay())) {
      const from = Math.max(cursor, day + startMinute * MINUTE)
      const available = day + endMinute * MINUTE - from
      if (available > 0) {
        if (remaining <= available) {
          const due = new Date(from + remaining)
          return Number.isFinite(due.getTime()) ? due.toISOString() : null
        }
        remaining -= available
        // At a day boundary, full weeks repeat. Keep the final week for an exact end time.
        const weeks = Math.floor((remaining - 1) / weekCapacity)
        day += weeks * weekLength
      }
    }
    day += dayLength
    cursor = day
  }
  return null
}

export function slaFields(state, ticket, { creating = false } = {}) {
  const policy = matchingPolicy(state, ticket)
  const targets = policy?.targets?.[ticket.priority]
  const due = (start, target) => targets ? addMinutes(start, targets[target], policy, state.businessSchedules) : null
  const waiting = ticket.firstRespondedAt && dateValue(ticket.lastCustomerReplyAt) >
    dateValue(ticket.lastRespondedAt || ticket.firstRespondedAt)
  return {
    slaPolicyId: policy?.id ?? null,
    firstResponseDueAt: ticket.firstRespondedAt ? ticket.firstResponseDueAt ?? null :
      ticket.firstResponseDueOverrideAt ?? due(ticket.createdAt, 'firstResponseMinutes'),
    nextResponseDueAt: waiting ? due(ticket.lastCustomerReplyAt, 'everyResponseMinutes') : null,
    resolutionDueAt: !creating && isDone(ticket) ? ticket.resolutionDueAt ?? null :
      ticket.resolutionDueOverrideAt ?? due(ticket.createdAt, 'resolutionMinutes'),
  }
}

export function diffFields(before, after, keys = Object.keys(after)) {
  return Object.fromEntries(keys.flatMap(field => {
    const from = before[field] ?? null
    const to = after[field] ?? null
    return JSON.stringify(from) === JSON.stringify(to) ? [] : [[field, { from, to }]]
  }))
}

export function visibleResponse(state, response, library = false) {
  if (response.deletedAt) return false
  const currentAgent = find(state.agents, actor(state))
  if (response.visibility === 'myself') return Boolean(actor(state)) && response.ownerId === actor(state)
  if (response.visibility !== 'groups') return true
  if (library && currentAgent?.role === 'admin') return true
  return Array.isArray(response.groupIds) && Array.isArray(currentAgent?.groupIds) &&
    response.groupIds.some(id => currentAgent.groupIds.includes(id))
}

export function personalize(body, ticket, requester) {
  const values = {
    '{{ticket.requester.name}}': requester?.name || 'there',
    '{{ticket.id}}': ticket.number ?? ticket.id ?? 'unavailable',
    '{{ticket.subject}}': ticket.subject || 'your ticket',
  }
  return String(body ?? '').replace(/\{\{[^{}]*\}\}/g, token => values[token] ?? token)
}

export const responseMatches = (response, query) =>
  [response.title, response.body, response.shortCode].some(value => text(value).includes(text(query).trim()))
