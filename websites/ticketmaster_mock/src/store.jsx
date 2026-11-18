import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { applyAction } from './data/actions.js'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, mergeWithDefaults, saveState, withSid } from './utils/dataManager.js'

const APP = 'ticketmaster'
const AccountContext = createContext(null)
const syncError = 'We couldn’t confirm this change. Check the current status and try again.'

async function readAccount() {
  const response = await fetch(withSid('/state'), { cache: 'no-store', signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error('Account state is unavailable')
  const { stored_state } = await response.json()
  return mergeWithDefaults(createInitialData(), stored_state)
}

export function AccountProvider({ children }) {
  const [world, setWorld] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState(false)
  const current = useRef(null)
  const committing = useRef(false)

  useEffect(() => {
    let mounted = true
    loadState(APP, createInitialData).then((state) => {
      if (!mounted) return
      current.current = state
      setWorld(state)
    }).catch(() => { if (mounted) setLoadError(true) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const sid = getSessionId()
    const key = `${APP}:current:${sid || '_default'}`
    function syncAccount(event) {
      if (event.key !== key || !event.newValue || !current.current) return
      const latest = JSON.parse(event.newValue)
      current.current = latest
      setWorld(latest)
    }
    window.addEventListener('storage', syncAccount)
    return () => window.removeEventListener('storage', syncAccount)
  }, [])

  async function commit(action) {
    if (committing.current) return 'An account change is already in progress.'
    committing.current = true
    setPending(true)
    const sid = getSessionId()
    const key = `${APP}:current:${sid || '_default'}`
    let latest

    function display(state) {
      const serialized = JSON.stringify(state)
      if (localStorage.getItem(key) !== serialized) localStorage.setItem(key, serialized)
      current.current = state
      setWorld(state)
    }

    async function submit() {
      latest = await readAccount()
      const next = applyAction(latest, action)
      if (typeof next === 'string') {
        display(latest)
        return next
      }

      const expected = JSON.stringify(next)
      saveState(APP, next)
      // The shared adapter starts the POST without returning its response.
      // Keep the browser lock until the server can read back the snapshot.
      for (const delay of [0, 40, 120, 320, 800]) {
        if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay))
        latest = await readAccount()
        if (JSON.stringify(latest) === expected) {
          display(latest)
          return ''
        }
      }
      display(latest)
      return syncError
    }

    try {
      return await (navigator.locks ? navigator.locks.request(key, submit) : submit())
    } catch {
      if (latest) display(latest)
      return syncError
    } finally {
      committing.current = false
      setPending(false)
    }
  }

  if (loadError) return <main className="loading" role="alert">We couldn’t load your account. Reload this page to try again.</main>
  if (!world) return <main className="loading" role="status">Loading your account…</main>
  return <AccountContext.Provider value={{ world, commit, pending }}>{children}</AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)
