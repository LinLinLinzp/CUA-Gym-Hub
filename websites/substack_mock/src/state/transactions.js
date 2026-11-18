export const newId = prefix => {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `${prefix}_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}

export function actionContext(state) {
  const now = new Date()
  const createdAt = now.toISOString()
  const actorId = state.currentUserId
  const publicationId = state.publication.id
  const event = (type, entityId, details) => ({ id: newId('evt'), type, publicationId, actorId, createdAt, entityId, details })
  return {
    now, createdAt, actorId, publicationId, event,
    created: { createdAt, createdById: actorId },
    updated: { updatedAt: createdAt, updatedById: actorId },
  }
}

export const replace = (list, record) => list.map(item => item.id === record.id ? record : item)
