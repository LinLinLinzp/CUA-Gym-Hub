import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'docker_hub_mock'
const Store = createContext(null)

function id(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `${prefix}-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}

export function StoreProvider({ initial, children }) {
  const latest = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)

  function commit(type, mutate) {
    const previous = latest.current
    const timestamp = new Date().toISOString()
    const actor = previous.account?.userId ?? null
    const updated = { updatedAt: timestamp, updatedBy: actor }
    const created = { ...updated, status: 'active', createdAt: timestamp, createdBy: actor }
    const deleted = { ...updated, status: 'deleted', deletedAt: timestamp, deletedBy: actor }
    const result = mutate(previous, { id, created, updated, deleted })
    if (!result) return null

    const { collections, targets, changes, value } = result
    const event = { id: id('evt'), type, actorId: actor, createdAt: timestamp, targets }
    if (changes) event.changes = changes
    const next = { ...previous, ...collections, activity: [...(previous.activity ?? []), event] }
    saveState(APP, next)
    latest.current = next
    setState(next)
    return value ?? true
  }

  function announce(message) {
    setNotice(previous => ({ message, sequence: (previous?.sequence ?? 0) + 1 }))
  }

  return <Store.Provider value={{ state, commit, notice, announce, dismiss: () => setNotice(null) }}>
    {children}
  </Store.Provider>
}

export const useStore = () => useContext(Store)

