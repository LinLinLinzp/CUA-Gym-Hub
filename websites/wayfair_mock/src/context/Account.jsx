import { createContext, useContext, useEffect, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'

const AccountContext = createContext(null)
export const APP = 'wayfair_mock'
export const useAccount = () => useContext(AccountContext)

function saveRequest(nextState) {
  const fetch = window.fetch
  let request
  // The shared template starts fetch synchronously without returning its promise.
  // Capture that request so the session lock lasts through acknowledgement.
  window.fetch = (...args) => {
    request = fetch.apply(window, args)
    return request
  }
  try {
    saveState(APP, nextState)
  } finally {
    window.fetch = fetch
  }
  return request
}

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [sid] = useState(getSessionId)
  const stateKey = APP + ':current:' + (sid || '_default')

  useEffect(() => {
    function sync(event) {
      if (event.storageArea === localStorage && event.key === stateKey && event.newValue) {
        setState(JSON.parse(event.newValue))
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [stateKey])

  function transact(build) {
    const commit = async () => {
      const current = await loadState(APP, createInitialData)
      const { nextState, record } = build(current, new Date())
      if (nextState) {
        try {
          const response = await saveRequest(nextState)
          if (!response.ok) throw new Error('The state server rejected the change.')
        } catch {
          localStorage.setItem(stateKey, JSON.stringify(current))
          setState(current)
          throw new Error('We couldn’t save this change. Try again.')
        }
        setState(nextState)
      }
      return record
    }
    return navigator.locks
      ? navigator.locks.request(APP + ':' + (sid || '_default'), commit)
      : commit()
  }

  return <AccountContext.Provider value={{ state, transact }}>{children}</AccountContext.Provider>
}
