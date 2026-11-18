import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const WorkspaceContext = createContext(null)
const APP = 'twitch'

export const makeId = prefix => prefix + '-' + crypto.randomUUID()

export function difference(before, after) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) =>
    JSON.stringify(before?.[key] ?? null) !== JSON.stringify(value ?? null)
  ).map(([key, value]) => [key, { from: before?.[key] ?? null, to: value ?? null }]))
}

export function audit(tx, action, targetType, targetId, before, after) {
  return { id: makeId('change'), action, actorId: tx.actorId, targetType, targetId,
    status: 'applied', changes: difference(before, after), createdAt: tx.now }
}

export const appendChanges = (state, events) => [...(state.stateChanges ?? []), ...events]

export function WorkspaceProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const latest = useRef(initial)
  const [notice, setNotice] = useState(null)

  function commit(mutate, message) {
    const current = latest.current
    const tx = { now: new Date().toISOString(), actorId: current.account?.id || 'creator-001' }
    const next = mutate(current, tx)
    if (!next || next === current) return false
    saveState(APP, next)
    latest.current = next
    setState(next)
    setNotice({ text: message, id: crypto.randomUUID() })
    return true
  }

  return <WorkspaceContext.Provider value={{ state, commit }}>
    {children}
    <div className="notice" role="status">{notice && <div key={notice.id} className="toast">
      {notice.text}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
    </div>}</div>
  </WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)

export function editRecord(current, collection, id, patch, tx, action, targetType) {
  const records = current[collection] ?? []
  const before = records.find(record => record.id === id)
  if (!before || !Object.keys(difference(before, patch)).length) return current
  const after = { ...before, ...patch, updatedAt: tx.now }
  return { ...current, [collection]: records.map(record => record.id === id ? after : record),
    stateChanges: appendChanges(current, [audit(tx, action, targetType, id, before, after)]) }
}

export function editSettings(current, key, patch, tx, action) {
  const before = current[key]
  if (!Object.keys(difference(before, patch)).length) return current
  const after = { ...before, ...patch, updatedAt: tx.now }
  return { ...current, [key]: after, stateChanges: appendChanges(current, [audit(tx, action, key, after.id, before, after)]) }
}
