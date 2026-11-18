import { rows } from '../utils/display.js'

export const makeId = (prefix) => prefix + '-' + crypto.randomUUID()
export const updated = ({ actor, now }) => ({ updatedAt: now, updatedBy: actor })
export function created(prefix, stamp) {
  return { id: makeId(prefix), createdAt: stamp.now, createdBy: stamp.actor, ...updated(stamp) }
}
export const error = (message, field) => ({ error: message, field })
export const unchanged = { unchanged: true }
export const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)
export function difference(before, after) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => !equal(value, before[key])))
}
export const slugify = (text) => String(text || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')

export function event(action, targetType, record, stamp, details = {}) {
  return {
    id: makeId('activity'), action, targetType, targetId: record.id, actorId: stamp.actor, createdAt: stamp.now,
    contentType: targetType === 'comment' ? record.contentType ?? null : null,
    contentId: targetType === 'comment' ? record.contentId ?? null : null,
    fromStatus: record.status ?? null, toStatus: null, relatedIds: [], ...details,
  }
}

export function appendActivity(state, entries) {
  return [...rows(state.activity), ...entries]
}
