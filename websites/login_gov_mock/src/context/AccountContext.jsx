import { createContext, useContext, useRef, useState } from 'react'
import { persistState } from '../utils/stateWrites.js'

export const APP = 'login_gov_mock'
const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const current = useRef(initialState)

  function commit(change, message) {
    const next = change(current.current)
    if (!next) return false
    current.current = next
    persistState(APP, next)
    setState(next)
    if (message) setNotice({ message })
    return true
  }

  return (
    <AccountContext.Provider value={{ state, commit, notice, clearNotice: () => setNotice(null) }}>
      {children}
    </AccountContext.Provider>
  )
}

export const useAccount = () => useContext(AccountContext)
