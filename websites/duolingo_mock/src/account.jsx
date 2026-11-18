import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadState, saveState, withSid } from './utils/dataManager.js'
import { createInitialData } from './data/seed.js'

const APP = 'duolingo'
const AccountContext = createContext(null)
let boot

async function loadAccount() {
  const postUrl = withSid('/post')
  const fetch = window.fetch
  let baseline
  // The shared loader returns before its baseline POST completes. Wait for
  // that request before a user action can send a newer snapshot.
  window.fetch = (input, options) => {
    const response = fetch.call(window, input, options)
    if (input === postUrl && options?.method === 'POST') baseline = response
    return response
  }
  let state
  try {
    state = await loadState(APP, createInitialData)
  } finally {
    window.fetch = fetch
  }
  await baseline?.catch(() => {})
  return state
}

export function AccountProvider({ children }) {
  const [state, setState] = useState(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState(null)
  const current = useRef(null)
  const noticeId = useRef(0)

  useEffect(() => {
    boot ??= loadAccount()
    let mounted = true
    boot.then(data => {
      if (!mounted) return
      current.current = data
      setState(data)
    }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3800)
    return () => window.clearTimeout(timer)
  }, [notice])

  function notify(message) {
    setNotice({ id: ++noticeId.current, message })
  }

  function commit(update, message) {
    const previous = current.current
    const next = update(previous, new Date().toISOString())
    if (next === previous) return false
    current.current = next
    saveState(APP, next)
    setState(next)
    if (message) notify(message)
    return true
  }

  if (failed) return <main className="frame page"><h1>Account unavailable</h1><button onClick={() => window.location.reload()}>Reload account</button></main>
  if (!state) return <main className="frame page" role="status">Loading your account…</main>
  return <AccountContext.Provider value={{ state, commit, notice, notify }}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
