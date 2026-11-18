import { active, array, boardOf, byId, inProject, nextPosition, sameId, scheduleOf, tasksOf } from './records.js'

function updateRecord(state, collection, id, change) {
  const records = array(state[collection])
  const index = records.findIndex((record) => sameId(record.id, id))
  if (index < 0) return state
  const record = records[index]
  const updated = change(record)
  if (updated === record) return state
  const nextRecords = records.slice()
  nextRecords[index] = updated
  return { ...state, [collection]: nextRecords }
}

function createRecord(state, { collection, id, fields, stamp }) {
  const records = array(state[collection])
  if (byId(records, id)) return state
  const project = byId(state.projects, fields.projectId)
  if (!project) return state
  const list = collection === 'todos' ? byId(inProject(state.todoLists, project), fields.listId) : null
  if (collection === 'todos' && !active(list)) return state
  if (collection === 'messages' && !sameId(boardOf(state, project)?.id, fields.boardId)) return state
  if (collection === 'scheduleEntries' && !sameId(scheduleOf(state, project)?.id, fields.scheduleId)) return state
  if (collection === 'comments') {
    const parentCollection = fields.parentType === 'todo' ? 'todos' : 'messages'
    const parent = byId(inProject(state[parentCollection], project), fields.parentId)
    if (!active(parent)) return state
    if (fields.parentType === 'todo' && !active(byId(inProject(state.todoLists, project), parent.listId))) return state
  }

  const record = { ...fields, id, createdById: stamp.updatedById, createdAt: stamp.updatedAt, ...stamp }
  if (collection === 'todoLists') record.position = nextPosition(inProject(records, project))
  if (collection === 'todos') record.position = nextPosition(tasksOf(state, list))
  return { ...state, [collection]: [...records, record] }
}

function changePositions(todos, stamp, ordered, movedId, destinationId) {
  const positions = new Map(ordered.map((task, index) => [String(task.id), index]))
  return todos.map((task) => {
    const position = positions.get(String(task.id))
    if (position === undefined) return task
    const listId = sameId(task.id, movedId) ? String(destinationId) : task.listId
    return task.position === position && task.listId === listId ? task : { ...task, position, listId, ...stamp }
  })
}

function positionTodo(state, { id, projectId, listId, destinationId, neighborId, direction, stamp }) {
  const lists = inProject(state.todoLists, { id: projectId })
  const list = byId(lists, listId)
  if (!active(list)) return state
  const ordered = tasksOf(state, list)
  const item = byId(ordered, id)
  if (!item) return state

  if (destinationId != null) {
    const target = byId(lists, destinationId)
    if (!active(target) || sameId(list.id, target.id)) return state
    const source = changePositions(array(state.todos), stamp, ordered.filter((task) => task !== item))
    return { ...state, todos: changePositions(source, stamp, [...tasksOf(state, target), item], id, target.id) }
  }

  const open = ordered.filter((task) => !task.completed)
  const index = open.indexOf(item)
  const neighbor = open.findIndex((task) => sameId(task.id, neighborId))
  // Moving to the chosen side of a neighboring task is safe to repeat after a lost response.
  if (index < 0 || neighbor < 0 || (index - neighbor) * direction >= 0) return state
  open.splice(index, 1)
  open.splice(neighbor, 0, item)
  let nextOpen = 0
  return { ...state, todos: changePositions(array(state.todos), stamp, ordered.map((task) => task.completed ? task : open[nextOpen++])) }
}

function restoreRecord(state, { collection, id, projectId, stamp }) {
  const project = byId(state.projects, projectId)
  if (!project) return state
  return updateRecord(state, collection, id, (record) => {
    if (record.status !== 'trashed' || !sameId(record.projectId, projectId)) return record
    if (collection === 'todos' && !active(byId(inProject(state.todoLists, project), record.listId))) return record
    if (collection === 'scheduleEntries' && !sameId(record.scheduleId, scheduleOf(state, project)?.id)) return record
    if (collection === 'messages') {
      const { statusBeforeTrash, ...remaining } = record
      if (!sameId(record.boardId, boardOf(state, project)?.id)) return record
      if (statusBeforeTrash === 'draft' && !sameId(record.createdById, stamp.updatedById)) return record
      return { ...remaining, status: statusBeforeTrash === 'draft' ? 'draft' : 'active', ...stamp }
    }
    return { ...record, status: 'active', ...stamp }
  })
}

function editRecord(state, { collection, id, fields, stamp }) {
  return updateRecord(state, collection, id, (record) => {
    if (record.status === 'trashed') return record
    const changes = { ...fields }
    if (collection === 'todos' && 'completed' in changes && Boolean(record.completed) === changes.completed) return record
    if (collection === 'messages') {
      if (changes.status === 'draft' && active(record)) return record
      if (changes.status === 'trashed') changes.statusBeforeTrash = record.status === 'draft' ? 'draft' : 'active'
      if (changes.status === 'active' && active(record)) delete changes.publishedAt
      if (!changes.status && 'pinnedAt' in changes &&
        (!active(record) || Boolean(record.pinnedAt) === Boolean(changes.pinnedAt))) return record
    }
    const changed = Object.entries(changes).some(([key, value]) => JSON.stringify(record[key]) !== JSON.stringify(value))
    return changed ? { ...record, ...changes, ...stamp } : record
  })
}

// Persist business actions so the same change can be applied to a newer server snapshot.
export function applyMutation(state, mutation) {
  switch (mutation.type) {
    case 'add': return createRecord(state, mutation)
    case 'update': return editRecord(state, mutation)
    case 'positionTodo': return positionTodo(state, mutation)
    case 'restore': return restoreRecord(state, mutation)
    default: return state
  }
}
