import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const latest = useRef(initialState)
  const [notice, setNotice] = useState('')

  function commit(update) {
    const result = update(latest.current)
    if (result.error || !result.state || result.state === latest.current) return result
    saveState('ikea', result.state)
    latest.current = result.state
    setState(result.state)
    return result
  }

  return <AccountContext.Provider value={{ state, commit, announce: setNotice }}>
    {children}
    <div className={notice ? 'notice' : 'sr-only'} role="status">
      {notice}{notice && <button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>}
    </div>
  </AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
