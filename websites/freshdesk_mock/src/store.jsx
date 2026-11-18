import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'freshdesk'
const Store = createContext(null)

export function AccountProvider({ initialState, children }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  function commit(transaction) {
    const next = transaction(current.current)
    if (next === current.current) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    return true
  }
  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export const useAccount = () => useContext(Store)
