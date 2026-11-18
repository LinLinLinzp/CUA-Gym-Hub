import { statusesFor } from './catalog.js'

export const records = (value) => Array.isArray(value) ? value.filter(record => record && typeof record === 'object') : []
export const findRecord = (value, id) => records(value).find(record => record.id === id)
export const normalized = (value) => String(value ?? '').trim().toLowerCase()
export const matchesText = (query, ...values) => values.some(value => normalized(value).includes(normalized(query)))
export const unique = (values) => [...new Set(values)]
export const newId = (prefix) => prefix + '-' + crypto.randomUUID()
export const replace = (items, record) => (items ?? []).map(item => item?.id === record.id ? record : item)

export function metadata(state) {
  const now = new Date().toISOString()
  const actor = state.currentUser?.id || 'user-001'
  return {
    created: { createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor },
    updated: { updatedAt: now, updatedBy: actor },
    now, actor,
  }
}

export function log(state, meta, action, entityType, entityId, personIds = [], runId = null) {
  return {
    ...state, activityLog: [...(state.activityLog ?? []), {
      id: newId('activity'), action, entityType, entityId, actorId: meta.actor,
      createdAt: meta.now, personIds, quantity: personIds.length, runId,
    }],
  }
}

export function staticLists(state) {
  return records(state.lists).filter(list => list.kind === 'static')
}

function databasePeople(state) {
  return [...new Map(records(state.people).map(person => [person.id, person])).values()]
}

export function linkedPeople(state, links, key, id) {
  const ids = new Set(records(links).filter(link => link[key] === id).map(link => link.personId))
  return databasePeople(state).filter(person => ids.has(person.id))
}

export function programMembers(state, programId) {
  const links = new Map(records(state.programMembers).filter(link => link.programId === programId).map(link => [link.personId, link]))
  return databasePeople(state).flatMap(person => links.has(person.id) ? [{ ...person, membership: links.get(person.id) }] : [])
}

export const ruleFields = {
  country: { label: 'Country', operators: ['is', 'isNot'] },
  company: { label: 'Company', operators: ['is', 'isNot', 'contains'] },
  lifecycleStage: { label: 'Lifecycle stage', operators: ['is', 'isNot'] },
  memberOfList: { label: 'Member of static list', operators: ['in', 'notIn'] },
}
export const operators = { is: 'Is', isNot: 'Is not', contains: 'Contains', in: 'Is a member', notIn: 'Is not a member' }
export const triggerTypes = { personCreated: 'Person is created', addedToList: 'Added to list' }
export const flowTypes = { addToList: 'Add to List', removeFromList: 'Remove from List', changeProgramStatus: 'Change Program Status' }

function validRule(state, rule) {
  if (!Object.hasOwn(ruleFields, rule.field)) return false
  return ruleFields[rule.field].operators.includes(rule.operator) && Boolean(normalized(rule.value)) &&
    (rule.field !== 'memberOfList' || staticLists(state).some(list => list.id === rule.value))
}

export function validAudience(state, config) {
  const rules = records(config.rules)
  return config.matchMode === 'everyone' ||
    (['all', 'any'].includes(config.matchMode) && rules.length > 0 && rules.every(rule => validRule(state, rule)))
}

export function qualifiedPeople(state, config) {
  const people = databasePeople(state)
  if (config.matchMode === 'everyone') return people
  const rules = records(config.rules)
  if (!rules.length || !['all', 'any'].includes(config.matchMode)) return []
  const listIds = new Set(staticLists(state).map(list => list.id))
  const memberships = new Map()
  for (const link of records(state.listMembers)) {
    if (!memberships.has(link.listId)) memberships.set(link.listId, new Set())
    memberships.get(link.listId).add(link.personId)
  }

  const predicates = rules.map(rule => {
    if (!Object.hasOwn(ruleFields, rule.field) || !ruleFields[rule.field].operators.includes(rule.operator)) return () => false
    const expected = normalized(rule.value)
    if (!expected) return () => false
    if (rule.field === 'memberOfList') {
      if (!listIds.has(rule.value)) return () => false
      const members = memberships.get(rule.value)
      return person => Boolean(members?.has(person.id)) === (rule.operator === 'in')
    }
    return person => {
      const actual = normalized(person[rule.field])
      if (!actual) return false
      if (rule.operator === 'contains') return actual.includes(expected)
      return (actual === expected) === (rule.operator === 'is')
    }
  })
  return people.filter(person => config.matchMode === 'all'
    ? predicates.every(test => test(person)) : predicates.some(test => test(person)))
}

export function listPeople(state, list) {
  return list.kind === 'smart' ? qualifiedPeople(state, list) : linkedPeople(state, state.listMembers, 'listId', list.id)
}

export function validTriggers(state, triggers) {
  const listIds = new Set(staticLists(state).map(list => list.id))
  return records(triggers).every(trigger => trigger.type === 'personCreated' ||
    (trigger.type === 'addedToList' && listIds.has(trigger.listId)))
}

export function validFlow(state, campaign, flow = campaign.flow) {
  const program = findRecord(state.programs, campaign.programId)
  const listIds = new Set(staticLists(state).map(list => list.id))
  const steps = records(flow)
  return Boolean(program) && steps.length > 0 && steps.every(step => {
    if (step.type === 'changeProgramStatus') return statusesFor(program).includes(step.status)
    return ['addToList', 'removeFromList'].includes(step.type) && listIds.has(step.listId)
  })
}

export const campaignMode = (campaign) => campaign.mode ?? (records(campaign.triggers).length ? 'trigger' : 'batch')

export function campaignReady(state, campaign) {
  const triggers = records(campaign.triggers)
  return validAudience(state, campaign) && validFlow(state, campaign) &&
    (campaignMode(campaign) === 'trigger' ? triggers.length > 0 && validTriggers(state, triggers) : triggers.length === 0)
}

export const campaignLocked = (campaign) => ['scheduled', 'active'].includes(campaign.status)

export function changeMembership(state, meta, { type, id, personIds, operation, status }) {
  const program = type === 'program'
  const collection = program ? 'programMembers' : 'listMembers'
  const relation = program ? 'programId' : 'listId'
  const original = state[collection] ?? []
  const existing = new Map(records(original).filter(link => link[relation] === id).map(link => [link.personId, link]))
  const people = new Set(records(state.people).map(person => person.id))
  const changes = new Map()

  for (const personId of unique(personIds)) {
    if (!people.has(personId)) continue
    const link = existing.get(personId)
    if (operation === 'remove') {
      if (link) changes.set(personId, null)
    } else if (!link) {
      changes.set(personId, program
        ? { id: newId('program-member'), programId: id, personId, status, ...meta.created }
        : { id: newId('list-member'), listId: id, personId, createdAt: meta.now, createdBy: meta.actor })
    } else if (program && operation === 'status' && link.status !== status) {
      changes.set(personId, { ...link, status, ...meta.updated })
    }
  }

  if (!changes.size) return { state, personIds: [] }
  const links = original.flatMap(link => {
    if (link?.[relation] !== id || !changes.has(link.personId)) return [link]
    return changes.get(link.personId) ? [changes.get(link.personId)] : []
  })
  for (const [personId, link] of changes) {
    if (!existing.has(personId)) links.push(link)
  }
  const next = { ...state, [collection]: links }
  if (!program) {
    const list = findRecord(state.lists, id)
    next.lists = replace(state.lists, { ...list, ...meta.updated })
  }
  return { state: next, personIds: [...changes.keys()] }
}

export function runCampaign(state, campaign, scheduledAt = null) {
  if (campaignMode(campaign) !== 'batch' || campaignLocked(campaign) || !campaignReady(state, campaign)) return state
  const meta = metadata(state)
  if (scheduledAt && !(new Date(scheduledAt).getTime() > new Date(meta.now).getTime())) return state
  const personIds = scheduledAt ? [] : unique(qualifiedPeople(state, campaign).map(person => person.id))
  const stepResults = []
  let next = state

  if (!scheduledAt) {
    for (const step of records(campaign.flow)) {
      const programStep = step.type === 'changeProgramStatus'
      const targetId = programStep ? campaign.programId : step.listId
      const result = changeMembership(next, meta, {
        type: programStep ? 'program' : 'list', id: targetId, personIds,
        operation: programStep ? 'status' : step.type === 'addToList' ? 'add' : 'remove',
        status: step.status,
      })
      next = result.state
      stepResults.push({ stepId: step.id, type: step.type, targetId, personIds: result.personIds, changedCount: result.personIds.length })
    }
  }

  const status = scheduledAt ? 'scheduled' : 'completed'
  const run = {
    id: newId('run'), campaignId: campaign.id, programId: campaign.programId, status, scheduledAt,
    startedAt: scheduledAt ? null : meta.now, completedAt: scheduledAt ? null : meta.now, canceledAt: null,
    processedPersonIds: personIds, processedCount: personIds.length, stepResults, ...meta.created,
  }
  return log({
    ...next, campaignRuns: [...(next.campaignRuns ?? []), run],
    smartCampaigns: replace(next.smartCampaigns, { ...campaign, status, ...meta.updated }),
  }, meta, 'campaign_run_' + status, 'smartCampaign', campaign.id, personIds, run.id)
}

