import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadInitialState } from './utils/loadInitialState.js'

const APP = 'sephora'
const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const current = useRef(null)
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    loadInitialState(APP, createInitialData).then((loaded) => {
      if (active) {
        current.current = loaded
        setState(loaded)
      }
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [])

  function commit(mutate) {
    return withSessionWrite(APP, async () => {
      try {
        const snapshot = await readCurrentState(current.current)
        const result = mutate(snapshot)
        if (result.state) {
          await saveAcknowledged(APP, result.state)
          current.current = result.state
          setState(result.state)
        }
        return result
      } catch {
        return { error: 'Your change could not be saved. Try again.' }
      }
    })
  }

  if (error) return <main className="container loading"><h1>Account unavailable</h1><p>Reload the page to try again.</p></main>
  if (!state) return <main className="container loading" aria-busy="true"><p role="status">Loading your account…</p></main>

  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)
