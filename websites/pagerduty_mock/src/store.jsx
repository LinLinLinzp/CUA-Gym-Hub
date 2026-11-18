import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const Context = createContext(null)
const APP = 'pagerduty'

export const list = value => Array.isArray(value) ? value : []
export const find = (items, id) => list(items).find(item => item.id === id)
export const label = (items, id, missing = 'Unavailable') => id ? find(items, id)?.name || missing : '—'
export const open = item => item.status === 'triggered' || item.status === 'acknowledged'
export const named = value => value ? value[0].toUpperCase() + value.slice(1) : '—'
export const initials = name => (name || '?').split(' ').slice(0, 2).map(word => word[0]).join('')
export const uid = () => globalThis.crypto?.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('-')
export const editStamp = (actor, now) => ({ updatedBy: actor, updatedAt: now })
export const createStamp = (actor, now) => ({ createdBy: actor, createdAt: now, ...editStamp(actor, now) })
export const put = (items, record) => find(items, record.id) ? list(items).map(item => item.id === record.id ? record : item) : [...list(items), record]
export const event = (type, entityType, entityId, actorId, createdAt, details) => ({ id: uid(), type, entityType, entityId, actorId, createdAt, details })
export const withEvents = (state, events) => ({ ...state, activity: [...list(state.activity), ...events] })
export function changesFor(item, values) {
  const changes = Object.entries(values).map(([key, value]) => [key, { before: item[key] ?? null, after: value ?? null }])
  return Object.fromEntries(changes.filter(([, { before, after }]) => JSON.stringify(before) !== JSON.stringify(after)))
}
export const dateLabel = (value, timeZone = 'UTC') => {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value))
  } catch { return dateLabel(value, 'UTC') }
}
export const relative = value => {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  const minutes = Math.round((Date.parse(value) - Date.now()) / 60000)
  if (Math.abs(minutes) < 1) return 'Just now'
  const [factor, unit] = Math.abs(minutes) < 60 ? [1, 'minute'] : Math.abs(minutes) < 1440 ? [60, 'hour'] : [1440, 'day']
  if (Math.abs(minutes) > 10080) return dateLabel(value)
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(minutes / factor), unit)
}

export function Store({ initial, children }) {
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState('')
  const live = useRef(initial)
  function commit(action, message) {
    const current = live.current
    const actor = current.account?.currentUserId
    if (!actor) return 'The current responder is unavailable.'
    const next = action(current, actor, new Date().toISOString())
    if (typeof next === 'string') return next
    if (!next || next === current) return 'No changes to save.'
    live.current = next
    saveState(APP, next)
    setState(next)
    setNotice(message)
    return ''
  }
  return <Context.Provider value={{ state, commit, notice, clearNotice: () => setNotice('') }}>{children}</Context.Provider>
}
export const useStore = () => useContext(Context)
export { APP }

