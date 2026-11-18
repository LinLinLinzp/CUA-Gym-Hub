import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'snowflake_mock'
const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  function commit(transaction) {
    const next = transaction(current.current)
    if (next !== current.current) {
      saveState(APP, next)
      current.current = next
      setState(next)
    }
  }
  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
