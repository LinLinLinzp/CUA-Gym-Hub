import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, saveState } from './utils/dataManager.js'

const APP = 'usps'
const Store = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState(false)
  const current = useRef(null)

  useEffect(() => {
    const sid = getSessionId() || '_default'
    const storageKey = `${APP}:current:${sid}`
    let mounted = true
    const receive = (next) => {
      current.current = next
      setState(next)
    }
    const syncTab = (event) => {
      if (event.key === storageKey && event.newValue && current.current) {
        receive(JSON.parse(event.newValue))
      }
    }
    window.addEventListener('storage', syncTab)
    loadState(APP, createInitialData).then(next => {
      if (mounted) receive(next)
    }).catch(() => {
      if (mounted) setLoadError(true)
    })
    return () => {
      mounted = false
      window.removeEventListener('storage', syncTab)
    }
  }, [])

  function commit(change, message) {
    const updated = change(current.current)
    saveState(APP, updated)
    current.current = updated
    setState(updated)
    setNotice(message)
  }

  if (loadError) return <main className="loading"><h1>Account unavailable</h1><p>Reload this page to try again.</p></main>
  if (!state) return <main className="loading" role="status">Loading your USPS account…</main>
  return <Store.Provider value={{ state, notice, setNotice, commit }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
