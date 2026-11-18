import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './seed.js'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'

const APP = 'wordpress_com_mock'
const Store = createContext(null)

export function StoreProvider({ children, sid }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const latest = useRef(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let active = true
    const accept = (value) => {
      if (!active) return
      latest.current = value
      setState(value)
    }
    loadState(APP, createInitialData).then(accept).catch(() => {
      if (active) setError('The workspace could not load. Reload the page to try again.')
    })
    const key = APP + ':current:' + (sid || '_default')
    const onStorage = (event) => {
      if (event.storageArea === localStorage && event.key === key && event.newValue) {
        try { accept(JSON.parse(event.newValue)) } catch { /* Keep the current state if the cache is invalid. */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.removeEventListener('storage', onStorage)
    }
  }, [sid])

  const notify = useCallback((message) => setNotice({ message }), [])
  const commit = useCallback((action) => {
    if (getSessionId() !== sid || !latest.current) return { error: 'This workspace session is no longer active.' }
    const current = latest.current
    const result = action(current, { now: new Date().toISOString(), actor: current.currentUserId ?? null })
    if (result.next && result.next !== current) {
      saveState(APP, result.next)
      latest.current = result.next
      setState(result.next)
    }
    if (result.message) notify(result.message)
    return result
  }, [notify, sid])

  if (error) return <main className="neutral" role="alert">{error}</main>
  if (!state) return <main className="neutral" role="status">Loading workspace…</main>
  return <Store.Provider value={{ state, commit, notify }}>
    {children}
    {notice && <div className="toast" role="status"><span>{notice.message}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)}>×</button></div>}
  </Store.Provider>
}

export const useStore = () => useContext(Store)
