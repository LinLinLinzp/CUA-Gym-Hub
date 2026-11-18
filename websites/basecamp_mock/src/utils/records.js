export const array = (value) => Array.isArray(value) ? value : []
export const sameId = (a, b) => a != null && b != null && String(a) === String(b)
export const byId = (records, id) => array(records).find((record) => sameId(record.id, id))
export const active = (record) => record != null && (record.status ?? 'active') === 'active'
export const idOrder = (a, b) => String(a.id).localeCompare(String(b.id))
export const byPosition = (a, b) => position(a) - position(b) || idOrder(a, b)
const position = (record) => Number.isFinite(record.position) ? record.position : 0
export const nextPosition = (records) => records.reduce((last, record) => Math.max(last, position(record)), -1) + 1
export const inProject = (records, project) => array(records).filter((record) => sameId(record.projectId, project.id))
export const hasId = (ids, id) => array(ids).some((value) => sameId(value, id))
export const membersOf = (state, project) => array(state.people).filter((person) => hasId(project.memberIds, person.id))
export const listsOf = (state, project) => inProject(state.todoLists, project).filter(active).sort(byPosition)
export const tasksOf = (state, list) => inProject(state.todos, { id: list.projectId })
  .filter((todo) => active(todo) && sameId(todo.listId, list.id)).sort(byPosition)
export const projectTasks = (state, project) => listsOf(state, project).flatMap((list) => tasksOf(state, list))
export const boardOf = (state, project) => inProject(state.messageBoards, project)[0]
export const scheduleOf = (state, project) => inProject(state.schedules, project)[0]
export const boardMessages = (state, project, board) => inProject(state.messages, project)
  .filter((message) => sameId(message.boardId, board?.id))
export const scheduleEntries = (state, project, schedule) => inProject(state.scheduleEntries, project)
  .filter((entry) => active(entry) && sameId(entry.scheduleId, schedule?.id))
export const commentsOf = (state, parent, type) => array(state.comments)
  .filter((comment) => active(comment) && comment.parentType === type &&
    sameId(comment.projectId, parent.projectId) && sameId(comment.parentId, parent.id))
  .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) || idOrder(a, b))

export function orderedMessages(state, project, board) {
  const messages = boardMessages(state, project, board).filter(active)
  const publication = (message) => message.publishedAt ?? message.createdAt ?? ''
  const dates = new Map(messages.map((message) => {
    const published = publication(message)
    const latest = board.sortOrder === 'latest_comment' ? commentsOf(state, message, 'message').at(-1)?.createdAt : null
    return [message.id, latest && latest > published ? latest : published]
  }))
  return messages.sort((a, b) => {
    const pins = Boolean(b.pinnedAt) - Boolean(a.pinnedAt)
    if (pins) return pins
    if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return b.pinnedAt.localeCompare(a.pinnedAt)
    const order = board.sortOrder === 'alphabetical'
      ? (a.subject ?? '').localeCompare(b.subject ?? '', undefined, { sensitivity: 'base' })
      : dates.get(b.id).localeCompare(dates.get(a.id))
    return order || idOrder(a, b)
  })
}

export const matches = (query, ...values) => {
  const needle = query.trim().toLowerCase()
  return !needle || values.some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export function textOf(html) {
  const template = document.createElement('template')
  template.innerHTML = html ?? ''
  template.content.querySelectorAll('script,style,iframe,object,embed,template').forEach((node) => node.remove())
  template.content.querySelectorAll('p,div,li,br').forEach((node) => node.after(' '))
  return template.content.textContent.replace(/\s+/g, ' ').trim()
}
