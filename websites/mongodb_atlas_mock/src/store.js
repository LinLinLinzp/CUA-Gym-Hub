import { useRef, useState } from 'react'
import { loadState } from './utils/dataManager.js'
import { saveWorkspaceState } from './utils/saveWorkspaceState.js'
import { createInitialData } from './data/seed.js'
import { rows } from './workspace.jsx'

const APP = 'mongodb-atlas'
export const loadWorkspace = () => loadState(APP, createInitialData)

const entityTypes = {
  clusters: 'cluster', databaseUsers: 'database_user',
  projectUsers: 'project_user', ipAccessList: 'ip_access',
}
function equal(a, b) {
  if ((a ?? null) === (b ?? null)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]))
}

export function useWorkspaceStore() {
  const [state, setState] = useState(null)
  const current = useRef(null)

  function accept(next) {
    current.current = next
    setState(next)
  }

  function mutate(projectId, key, id, action, fields) {
    const previous = current.current
    const records = rows(previous[key])
    const original = id ? records.find(row => row?.id === id && row.projectId === projectId) : null
    if (!projectId || (id && !original)) return false

    const now = new Date().toISOString()
    const actorId = previous.account?.id || 'acct_avery'
    const values = typeof fields === 'function' ? fields(now) : fields
    const changes = Object.fromEntries(Object.entries(values)
      .filter(([field, value]) => !original || !equal(original[field], value)))
    if (original && !Object.keys(changes).length) return false

    const metadata = { updatedAt: now, updatedBy: actorId }
    const entity = original
      ? { ...original, ...changes, ...metadata }
      : { id: crypto.randomUUID(), projectId, ...values, createdAt: now, createdBy: actorId, ...metadata }
    const affected = original ? { ...changes, ...metadata } : entity
    const event = {
      id: crypto.randomUUID(), projectId, actorId, entityType: entityTypes[key], entityId: entity.id,
      action, status: 'completed', createdAt: now,
      changes: Object.fromEntries(Object.entries(affected)
        .filter(([field, value]) => !original || !equal(original[field], value))
        .map(([field, value]) => [field, { before: original?.[field] ?? null, after: value }])),
    }
    const next = {
      ...previous,
      [key]: original ? records.map(row => row === original ? entity : row) : [...records, entity],
      activityLog: [...rows(previous.activityLog), event],
    }
    saveWorkspaceState(APP, next)
    accept(next)
    return true
  }

  return { state, accept, mutate }
}
