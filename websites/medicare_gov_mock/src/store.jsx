import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'medicare-gov'
const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const currentState = useRef(initialState)

  function append(collection, createRecord) {
    const record = createRecord(currentState.current)
    if (!record) return null
    const next = { ...currentState.current, [collection]: [...records(currentState.current[collection]), record] }
    currentState.current = next
    setState(next)
    saveState(APP, next)
    return record
  }

  return <AccountContext.Provider value={{ state, append }}>{children}</AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)
export const records = (items) => Array.isArray(items) ? items.filter(Boolean) : []
export const activity = (prefix, actorId) => ({
  id: prefix + '-' + (crypto.randomUUID?.() ?? Array.from(
    crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')),
  actorId,
  createdAt: new Date().toISOString(),
})
