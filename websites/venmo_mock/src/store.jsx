import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const AccountContext = createContext(null)
export const useAccount = () => useContext(AccountContext)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const latest = useRef(initialState)

  function commit(mutate) {
    const next = mutate(latest.current)
    latest.current = next
    setState(next)
    saveState('venmo', next)
  }

  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}
