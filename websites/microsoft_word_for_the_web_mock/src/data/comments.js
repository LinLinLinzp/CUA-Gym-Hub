import { actorOf, directRole, rows } from './access.js'
import { inBounds, normalizeBody } from './body.js'
import { created, newId, updated } from './documents.js'

export function mentionableUsers(state, doc) {
  return rows(state, 'users').filter((user) => user.name && (user.id === state.currentUserId || directRole(state, doc, user)))
}

function mentionIds(body, people) {
  const lower = body.toLowerCase()
  return people.filter((person) => {
    const name = '@' + person.name.toLowerCase()
    for (let i = lower.indexOf(name); i >= 0; i = lower.indexOf(name, i + name.length)) {
      if (!/[\p{L}\p{N}]/u.test(lower[i + name.length] ?? '')) return true
    }
    return false
  }).map((person) => person.id)
}

const message = (actor, time, body, people) => ({
  id: newId('msg'), authorId: actor, body, mentionUserIds: mentionIds(body, people), createdAt: time,
  editedAt: null, editedByUserId: null, deletedAt: null, deletedByUserId: null,
})

export function postThread(state, doc, anchor, body, id) {
  const actor = actorOf(state)?.id
  if (!actor || !anchor || !body.trim()) return state
  const activeDoc = rows(state, 'documents').find((entry) => entry.id === doc.id)
  const accepted = normalizeBody(activeDoc?.body, doc.id)
  const storedAnchor = inBounds(accepted, anchor) ? anchor : { ...anchor, detached: true }
  const time = new Date().toISOString()
  const thread = {
    id, documentId: doc.id, anchor: storedAnchor, status: 'active', resolvedAt: null, resolvedByUserId: null,
    deletedAt: null, deletedByUserId: null,
    messages: [message(actor, time, body.trim(), mentionableUsers(state, doc))],
    ...created(actor, time),
  }
  return { ...state, commentThreads: [...rows(state, 'commentThreads'), thread] }
}

export function updateThread(state, doc, threadId, action, { text = '', messageId } = {}) {
  const actor = actorOf(state)?.id
  const threads = rows(state, 'commentThreads')
  const thread = threads.find((entry) => entry.id === threadId && entry.documentId === doc.id)
  if (!actor || !thread || thread.status === 'deleted') return state
  const time = new Date().toISOString()
  const messages = thread.messages ?? []
  const body = text.trim()
  let patch
  if (action === 'resolve' && thread.status !== 'resolved') {
    patch = { status: 'resolved', resolvedAt: time, resolvedByUserId: actor }
  } else if (action === 'reopen' && thread.status === 'resolved') {
    patch = { status: 'active', resolvedAt: null, resolvedByUserId: null }
  } else if (action === 'reply' && body && thread.status !== 'resolved') {
    patch = { messages: [...messages, message(actor, time, body, mentionableUsers(state, doc))] }
  } else if (action === 'edit' || action === 'delete') {
    const current = messages.find((entry) => entry.id === messageId)
    if (!current || current.deletedAt || current.authorId !== actor || (action === 'edit' && (!body || body === current.body))) return state
    const deletion = { deletedAt: time, deletedByUserId: actor }
    const changes = action === 'delete' ? deletion : {
      body, mentionUserIds: mentionIds(body, mentionableUsers(state, doc)), editedAt: time, editedByUserId: actor,
    }
    patch = { messages: messages.map((entry) => entry.id === messageId ? { ...entry, ...changes } : entry) }
    if (action === 'delete' && messages[0]?.id === messageId) Object.assign(patch, { status: 'deleted', ...deletion })
  }
  if (!patch) return state
  return { ...state, commentThreads: threads.map((entry) => entry === thread ? { ...thread, ...patch, ...updated(actor, time) } : entry) }
}
