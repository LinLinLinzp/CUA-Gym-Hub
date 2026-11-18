import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, saveState } from './utils/dataManager.js'

const APP = 'doordash'
const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState(null)
  const current = useRef(null)
  const sid = useRef(getSessionId())
  const storageKey = `${APP}:current:${sid.current || '_default'}`

  function publish(next) {
    current.current = next
    setState(next)
  }

  useEffect(() => {
    let mounted = true
    function onStorage(event) {
      if (event.key === storageKey && event.newValue) publish(JSON.parse(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    loadState(APP, createInitialData).then(
      (initial) => {
        if (mounted) publish(JSON.parse(localStorage.getItem(storageKey)) || initial)
      },
      () => { if (mounted) setError(true) },
    )
    return () => {
      mounted = false
      window.removeEventListener('storage', onStorage)
    }
  }, [storageKey])

  async function commit(update, message) {
    function apply() {
      const latest = JSON.parse(localStorage.getItem(storageKey)) || current.current
      const next = update(latest, new Date().toISOString())
      saveState(APP, next)
      publish(next)
      setNotice({ message })
      return next
    }

    if (navigator.locks) return navigator.locks.request(storageKey, apply)
    return apply()
  }

  if (error) return <main className="boot" role="alert">Your account couldn’t load. Reload the page to try again.</main>
  if (!state) return <main className="boot" role="status">Loading your account…</main>

  return <AccountContext.Provider value={{ state, commit, notice, setNotice }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
