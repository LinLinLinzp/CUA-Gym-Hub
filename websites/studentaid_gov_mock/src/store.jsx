import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'studentaid_gov_mock'
const Account = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)
  function commit(update) {
    const next = update(current.current)
    if (next === current.current) return
    current.current = next
    setState(next)
    saveState(APP, next)
  }
  return <Account.Provider value={{ state, commit }}>{children}</Account.Provider>
}

export const useAccount = () => useContext(Account)
