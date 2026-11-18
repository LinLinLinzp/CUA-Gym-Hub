import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'zotero'
const Store = createContext(null)

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [message, announce] = useState(null)
  function commit(change) {
    const previous = current.current
    const timestamp = new Date().toISOString()
    const next = change(previous, { actorId: previous.account?.id ?? null, updatedAt: timestamp }, timestamp)
    if (next === previous) return false
    current.current = next
    setState(next)
    saveState(APP, next)
    return true
  }

  return <Store.Provider value={{ state, commit, message, announce }}>{children}</Store.Provider>
}

export function useStore() {
  return useContext(Store)
}
