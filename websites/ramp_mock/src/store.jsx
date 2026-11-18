import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'
import { APP, actor, uid } from './utils/format.js'

const Store = createContext(null)

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  const latest = useRef(initial)

  function commit(mutation, message) {
    const current = latest.current
    const actorId = actor(current)?.id
    if (!actorId) throw new Error('The signed-in administrator is missing from this workspace.')
    const now = new Date().toISOString()
    const next = mutation(current, { actorId, now })
    saveState(APP, next)
    latest.current = next
    setState(next)
    setNotice({ message })
  }

  return <Store.Provider value={{ state, commit }}>
    {children}
    <div className="announcement" role="status" aria-live="polite">
      {notice && <div className="toast"><span>{notice.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  </Store.Provider>
}

export const useStore = () => useContext(Store)
export const update = (records, id, replacement) => records.map(record => record?.id === id ? replacement : record)
export const append = (records, record) => [...(Array.isArray(records) ? records : []), record]
export const change = (before, after, keys) => Object.fromEntries(keys.filter(key =>
  JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(key => [key, { from: before[key] ?? null, to: after[key] ?? null }]))

export function activity(state, { actorId, now }, action, objectType, objectId, related = {}, changes = {}) {
  return { ...state, activity: append(state.activity, { id: uid('activity'), action, objectType, objectId, related, actorId, createdAt: now, changes }) }
}
