import { byBoard, changed, created, find, list, nextId, nextNumber, requireThat, scoped, sprintChoices, story, update, workStates, workTypes } from './model.js'

export const workFields = ['type','title','description','acceptanceCriteria','state','assignedToId','priority','storyPoints','areaPath','sprintId','tags','parentId','boardOrder']
const equalField = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export class WorkItemConflict extends Error {
  constructor(fields) {
    super('These fields changed since you started editing. Load their latest values and review them before saving.')
    this.fields = fields
  }
}

export function lane(data, teamId, status, projectId) {
  return scoped(data.workItems, projectId).filter((item) => item.teamId === teamId && item.state === status && story(item)).sort(byBoard)
}
export function endOrder(data, teamId, status, projectId) {
  return scoped(data.workItems, projectId).reduce((max, item) => item.teamId === teamId && item.state === status ? Math.max(max, Number(item.boardOrder) || 0) : max, 0) + 100
}

export function recordWork(data, item, old, action, actor, now) {
  const changes = {}
  for (const field of workFields) {
    const from = old?.[field] ?? null
    const to = item[field] ?? null
    if (!old || !equalField(from, to)) changes[field] = { from, to }
  }
  if (old && !Object.keys(changes).length) return data
  const revisions = list(data.workItemRevisions)
  return {
    ...data,
    workItems: old ? update(list(data.workItems), item) : [...list(data.workItems), item],
    workItemRevisions: [...revisions, { id: nextId(revisions, 'rev-' + item.id + '-'), workItemId: item.id, action, changes, ...created(actor, now) }],
  }
}

export function saveWork(data, projectId, teamId, id, input, actor, now, originals = {}) {
  const existing = find(scoped(data.workItems, projectId), id)
  requireThat(!id || existing, 'This work item is unavailable.')
  const team = find(scoped(data.teams, projectId), existing?.teamId ?? teamId)
  requireThat(existing || team, 'Select an available team to create a work item.')
  const updates = { ...input }
  if (Object.hasOwn(updates, 'title')) updates.title = updates.title.trim()
  if (existing) {
    const conflicts = []
    for (const field of Object.keys(updates)) {
      if (equalField(updates[field], existing[field])) delete updates[field]
      else if (!equalField(originals[field], existing[field])) conflicts.push(field)
    }
    if (conflicts.length) throw new WorkItemConflict(conflicts)
  }
  const editing = (field) => !existing || Object.hasOwn(updates, field)
  requireThat(!editing('title') || updates.title, 'Enter a title.')
  requireThat(!editing('type') || workTypes.includes(updates.type), 'Select a work item type.')
  requireThat(!editing('state') || workStates.includes(updates.state), 'Select a work item state.')
  const project = find(data.projects, projectId)
  requireThat(!updates.assignedToId || list(project?.memberIds).includes(updates.assignedToId) && find(data.users, updates.assignedToId), 'Select an assignee from this project.')
  requireThat(!updates.sprintId || find(sprintChoices(data, projectId, team?.id), updates.sprintId), 'Choose an iteration for this team.')
  requireThat(!editing('priority') || Number.isInteger(updates.priority) && updates.priority >= 1 && updates.priority <= 4, 'Priority must be from 1 to 4.')
  requireThat(!editing('storyPoints') || updates.storyPoints === null || Number.isFinite(updates.storyPoints) && updates.storyPoints >= 0, 'Story points must be positive or zero.')
  if (updates.parentId) {
    const projectItems = scoped(data.workItems, projectId)
    const ids = new Set(id ? [id] : [])
    requireThat(find(projectItems, updates.parentId), 'Select a parent in this project.')
    for (let parent = find(projectItems, updates.parentId); parent; parent = find(projectItems, parent.parentId)) {
      requireThat(!ids.has(parent.id), 'This parent would create a cycle.')
      ids.add(parent.id)
    }
  }
  const item = existing ? { ...existing, ...updates } : {
    ...created(actor, now), ...updates, projectId, teamId: team.id,
    id: nextNumber([...list(data.workItems), ...list(data.workItemRevisions).map((revision) => ({ id: revision.workItemId }))]),
  }
  if (editing('state')) item.boardOrder = endOrder(data, item.teamId, item.state, projectId)
  Object.assign(item, changed(actor, now))
  return [recordWork(data, item, existing, existing ? 'edit' : 'create', actor, now), item.id]
}

export function moveCard(data, projectId, teamId, id, status, beforeId, actor, now) {
  const item = find(scoped(data.workItems, projectId), id)
  requireThat(item && item.teamId === teamId && story(item) && workStates.includes(status), 'This card cannot be moved on the selected board.')
  const cards = lane(data, teamId, status, projectId)
  if (beforeId === id) return [data]
  const targets = cards.filter((row) => row.id !== id)
  const before = targets.findIndex((row) => row.id === beforeId)
  const index = before >= 0 ? before : targets.length
  if (item.state === status && cards.findIndex((row) => row.id === id) === index) return [data]

  const lower = targets[index - 1]
  const upper = targets[index]
  const afterOrder = Number(lower?.boardOrder) || 0
  const beforeOrder = Number(upper?.boardOrder) || 0
  const order = lower && upper ? afterOrder / 2 + beforeOrder / 2 : lower ? afterOrder + 100 : upper ? beforeOrder - 100 : 100
  const moved = { ...item, state: status, boardOrder: order, ...changed(actor, now) }
  const action = item.state === status ? 'reorder' : 'move'
  if (lower && order <= afterOrder || upper && order >= beforeOrder) {
    const ordered = [...targets.slice(0,index), moved, ...targets.slice(index)]
    // Normalize ranks if injected data has ties or a floating-point gap is exhausted.
    const shifted = (index + 1) * 100 === item.boardOrder ? 50 : 0
    const ranks = new Map(ordered.map((row, i) => [row.id, (i + 1) * 100 + shifted]))
    const normalized = { ...data, workItems: list(data.workItems).map((row) =>
      row.id !== id && ranks.has(row.id) ? { ...row, boardOrder: ranks.get(row.id) } : row) }
    return [recordWork(normalized, { ...moved, boardOrder: ranks.get(id) }, item, action, actor, now)]
  }
  return [recordWork(data, moved, item, action, actor, now)]
}

export function bulkWork(data, projectId, teamId, ids, field, value, actor, now) {
  const team = find(scoped(data.teams, projectId), teamId)
  const sprint = field === 'sprintId'
  requireThat(team && ids.length, 'Select work items from an available team.')
  requireThat(!value || (sprint ? find(sprintChoices(data, projectId, teamId), value)
    : list(team.memberIds).includes(value) && find(data.users, value)), sprint ? 'Select an iteration for this team.' : 'Select a member of this team.')
  const rows = ids.map((id) => find(scoped(data.workItems, projectId), id))
  requireThat(rows.every((row) => row?.teamId === teamId), 'One or more work items are unavailable for this team.')
  return [rows.reduce((next, item) => recordWork(next, { ...item, [field]: value, ...changed(actor, now) }, item,
    sprint ? 'bulkSprint' : 'bulkAssign', actor, now), data)]
}

export function addDiscussion(data, projectId, id, text, actor, now) {
  const item = find(scoped(data.workItems, projectId), id)
  const body = text.trim()
  requireThat(item && body, 'Enter a discussion comment.')
  const comments = list(data.workItemComments)
  return [{ ...data, workItemComments: [...comments, { id: nextId(comments, 'wic-' + id + '-'), workItemId: id, body, ...created(actor, now) }],
    workItems: update(list(data.workItems), { ...item, ...changed(actor, now) }) }]
}

export function closeLinkedWork(data, projectId, ids, actor, now) {
  return [...new Set(ids)].reduce((next, id) => {
    const item = find(scoped(next.workItems, projectId), id)
    if (!item || item.state === 'Closed') return next
    return recordWork(next, { ...item, state: 'Closed', boardOrder: endOrder(next, item.teamId, 'Closed', projectId), ...changed(actor, now) },
      item, 'closeFromPullRequest', actor, now)
  }, data)
}
