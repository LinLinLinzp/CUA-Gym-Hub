import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from '../utils/dataManager.js'
import { applyAction } from './actions.js'

const AccountContext = createContext(null)
export const APP = 'audible'

export function AccountProvider({ initialState, children }) {
  const latest = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  function act(action) {
    const result = applyAction(latest.current, action, new Date())
    if (result.state) {
      latest.current = result.state
      saveState(APP, result.state)
      setState(result.state)
    }
    setNotice(result.notice)
    return Boolean(result.state)
  }

  return (
    <AccountContext.Provider value={{ state, notice, setNotice, act }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
