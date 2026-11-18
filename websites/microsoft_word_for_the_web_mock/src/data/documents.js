import { actorOf, isActive, rows } from './access.js'
import { normalizeBody } from './body.js'

export function newId(prefix) {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${id}`
}
export const updated = (actor, time) => ({ updatedAt: time, updatedByUserId: actor })
export const created = (actor, time) => ({ createdAt: time, createdByUserId: actor, ...updated(actor, time) })
export const replaceRow = (list, id, update) => list.map((row) => row.id === id ? { ...row, ...update } : row)

export function upsertActivity(state, id, patch, time) {
  const actor = actorOf(state)?.id
  if (!actor) return rows(state, 'documentActivity')
  const activity = rows(state, 'documentActivity')
  const previous = activity.find((entry) => entry.documentId === id && entry.userId === actor)
  if (previous) return replaceRow(activity, previous.id, { ...patch, ...updated(actor, time) })
  return [...activity, {
    id: newId('activity'), documentId: id, userId: actor, openedAt: null, isFavorite: false,
    ...patch, ...created(actor, time),
  }]
}

export function recordActivity(state, id, patch) {
  if (!actorOf(state)) return state
  return { ...state, documentActivity: upsertActivity(state, id, patch, new Date().toISOString()) }
}

export function makeDocument(state, { template, source } = {}) {
  const actor = actorOf(state)?.id
  const time = new Date().toISOString()
  const id = newId('doc')
  const base = template?.name || (source ? `${source.title || 'Document'} copy` : 'Document')
  const names = new Set(rows(state, 'documents').filter(isActive).filter((doc) => doc.ownerId === actor)
    .map((doc) => doc.title?.toLowerCase()))
  let title = base
  for (let suffix = 2; names.has(title.toLowerCase()); suffix += 1) title = `${base} ${suffix}`
  const body = normalizeBody(template?.body ?? source?.body, id)
  return {
    id, title, ownerId: actor, locationLabel: 'OneDrive · Documents',
    originTemplateId: template?.id ?? null, copiedFromDocumentId: source?.id ?? null,
    status: 'active', deletedAt: null, deletedByUserId: null, revision: 0,
    body: { blocks: body.blocks.map((block, index) => ({ ...block, id: `${id}_block_${index + 1}` })) },
    tracking: { mode: 'off', ...created(actor, time) }, ...created(actor, time),
  }
}

export function addDocument(state, doc) {
  if (!doc.ownerId) return state
  return {
    ...state, documents: [...rows(state, 'documents'), doc],
    documentActivity: upsertActivity(state, doc.id, { openedAt: doc.createdAt }, doc.createdAt),
  }
}

export function renameDocument(state, id, text) {
  const actor = actorOf(state)?.id
  const doc = rows(state, 'documents').find((entry) => entry.id === id)
  const title = text.trim()
  if (!title || title === doc?.title || !actor || !isActive(doc)) return state
  return { ...state, documents: replaceRow(rows(state, 'documents'), id, { title, ...updated(actor, new Date().toISOString()) }) }
}

export function deleteDocument(state, id) {
  const actor = actorOf(state)?.id
  const doc = rows(state, 'documents').find((entry) => entry.id === id)
  if (!actor || actor !== doc?.ownerId || !isActive(doc)) return state
  const time = new Date().toISOString()
  return { ...state, documents: replaceRow(rows(state, 'documents'), id, {
    status: 'deleted', deletedAt: time, deletedByUserId: actor, ...updated(actor, time),
  }) }
}
