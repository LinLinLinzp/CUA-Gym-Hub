import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, saveState } from './utils/dataManager.js'

const APP = 'smartsheet_mock'
const Store = createContext(null)

export function StoreProvider({ children }) {
  const current = useRef({ state: null, raw: null })
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState(false)
  // Observe the current-state key written by the shared Harbor client.
  const [storageKey] = useState(() => APP + ':current:' + (getSessionId() || '_default'))

  function receive(snapshot, raw) {
    current.current = { state: snapshot, raw }
    setState(snapshot)
  }

  useEffect(() => {
    let mounted = true
    function synchronize(event) {
      if (event.storageArea !== localStorage || event.key !== storageKey) return
      const raw = localStorage.getItem(storageKey)
      if (raw && raw !== current.current.raw) receive(JSON.parse(raw), raw)
    }

    window.addEventListener('storage', synchronize)
    loadState(APP, createInitialData).then(initial => {
      if (!mounted) return
      const raw = localStorage.getItem(storageKey)
      if (raw !== current.current.raw || !current.current.state) receive(raw ? JSON.parse(raw) : initial, raw)
    }).catch(() => { if (mounted) setLoadError(true) })
    return () => {
      mounted = false
      window.removeEventListener('storage', synchronize)
    }
  }, [storageKey])

  function commit(transaction) {
    // A user action can arrive before this tab receives the storage event.
    const raw = localStorage.getItem(storageKey)
    const previous = raw && raw !== current.current.raw ? JSON.parse(raw) : current.current.state
    const next = transaction(previous)
    if (next === previous) {
      if (previous !== current.current.state) receive(previous, raw)
      return false
    }
    const savedRaw = JSON.stringify(next)
    saveState(APP, next)
    receive(next, savedRaw)
    return true
  }

  if (!state) return <main className="loading" role="status">{loadError ? 'Unable to load Smartsheet. Reload the page to try again.' : 'Loading Smartsheet…'}</main>
  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export function useStore() {
  return useContext(Store)
}
