import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function commit(change) {
    const result = change(current.current)
    if (!result.state || result.state === current.current) return result
    saveState('grubhub', result.state)
    current.current = result.state
    setState(result.state)
    return result
  }

  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
