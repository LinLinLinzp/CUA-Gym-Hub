import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId } from './utils/dataManager.js'
import { loadInitialState } from './utils/loadInitialState.js'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'

const APP = 'doordash'
const AccountContext = createContext(null)

async function loadAccount(storageKey) {
  const stored = await readCurrentState(null)
  if (stored && (localStorage.getItem(storageKey) || Object.keys(createInitialData()).every(key => Object.hasOwn(stored, key)))) {
    localStorage.setItem(storageKey, JSON.stringify(stored))
    return stored
  }
  return loadInitialState(APP, createInitialData)
}

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
    loadAccount(storageKey).then(
      (initial) => {
        if (mounted) publish(initial)
      },
      () => { if (mounted) setError(true) },
    )
    return () => {
      mounted = false
      window.removeEventListener('storage', onStorage)
    }
  }, [storageKey])

  async function commit(update, message) {
    return withSessionWrite(APP, async () => {
      const latest = await readCurrentState(current.current)
      const next = update(latest, new Date().toISOString())
      await saveAcknowledged(APP, next)
      publish(next)
      setNotice({ message })
      return next
    })
  }

  if (error) return <main className="boot" role="alert">Your account couldn’t load. Reload the page to try again.</main>
  if (!state) return <main className="boot" role="status">Loading your account…</main>

  return <AccountContext.Provider value={{ state, commit, notice, setNotice }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
