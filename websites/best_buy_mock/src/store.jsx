import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadState, saveState } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'
import { prepare } from './model.js'

const APP = 'best_buy_mock'
const AccountContext = createContext(null)

export const useAccount = () => useContext(AccountContext)

export function AccountProvider({ children }) {
  const [state, setState] = useState(null)
  const [message, setMessage] = useState('')
  const current = useRef(null)
  const boot = useRef(null)

  useEffect(() => {
    boot.current ??= loadState(APP, createInitialData)
    let active = true
    boot.current.then((loaded) => {
      if (!active) return
      current.current = loaded
      setState(loaded)
    }).catch(() => {
      if (active) setMessage('Your account could not be loaded. Reload this page to try again.')
    })
    return () => { active = false }
  }, [])

  function commit(action) {
    const prepared = prepare(current.current, action)
    if (prepared.error) return prepared
    const result = prepared.commit()
    current.current = result.state
    saveState(APP, result.state)
    setState(result.state)
    setMessage(result.message)
    return result
  }

  if (!state) return <p className="loading" role="status">{message || 'Loading your account…'}</p>
  return <AccountContext.Provider value={{ state, commit, message, dismissMessage: () => setMessage('') }}>
    {children}
  </AccountContext.Provider>
}

