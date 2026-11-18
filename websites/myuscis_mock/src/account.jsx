import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'

const AccountContext = createContext(null)
const APP = 'myuscis'

export function AccountProvider({ children }) {
  const [state, setState] = useState(null)
  const current = useRef(null)
  const boot = useRef(null)

  useEffect(() => {
    boot.current ??= loadState(APP, createInitialData)
    boot.current.then(initial => {
      current.current = initial
      setState(initial)
    })
  }, [])

  function commit(update) {
    const next = update(current.current)
    if (!next || next === current.current) return false
    current.current = next
    saveState(APP, next)
    setState(next)
    return true
  }

  if (!state) return <main className="loading" aria-busy="true">Loading your account…</main>
  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
