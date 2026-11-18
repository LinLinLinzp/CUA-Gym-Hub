import { createContext, useContext, useState } from 'react'
import { getSessionId, saveState } from './utils/dataManager'

const AccountState = createContext(null)

export function Store({ app, initialState, children }) {
  const [state, setState] = useState(initialState)
  function apply(change) {
    // The state helper updates this session cache synchronously on each save.
    const key = `${app}:current:${getSessionId() || '_default'}`
    const cached = localStorage.getItem(key)
    const current = cached ? JSON.parse(cached) : state
    const next = change(current)
    if (!next || next === current) {
      setState(current)
      return false
    }
    saveState(app, next)
    setState(next)
    return true
  }

  return <AccountState.Provider value={{ state, apply }}>{children}</AccountState.Provider>
}

export function useAccount() {
  return useContext(AccountState)
}

export function actor(state) {
  return state.profile.id
}

export function newId(prefix, rows) {
  let id
  do {
    const suffix = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16).padStart(8, '0')).join('')
    id = `${prefix}-${suffix}`
  } while (rows.some(row => row.id === id))
  return id
}
