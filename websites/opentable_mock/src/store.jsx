import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed'
import { loadState, saveState } from './utils/dataManager'

const APP = 'opentable'
const Account = createContext(null)

export function AccountProvider({ children }) {
  const [state, setState] = useState(null)
  const [failure, setFailure] = useState(false)
  const [feedback, setFeedback] = useState('')
  const current = useRef(null)
  const boot = useRef(null)

  useEffect(() => {
    let mounted = true
    boot.current ??= loadState(APP, createInitialData)
    boot.current.then(data => {
      if (!mounted) return
      current.current = data
      setState(data)
    }).catch(() => { if (mounted) setFailure(true) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(''), 5000)
    return () => clearTimeout(timeout)
  }, [feedback])

  function commit(change) {
    const outcome = change(current.current)
    if (outcome.next) {
      saveState(APP, outcome.next)
      current.current = outcome.next
      setState(outcome.next)
    }
    return outcome
  }

  if (failure) return <main className="boot"><p>We couldn’t load your account.</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!state) return <main className="boot" role="status">Loading your account…</main>
  return <Account.Provider value={{ state, commit, feedback, notify: setFeedback }}>{children}</Account.Provider>
}

export function useAccount() {
  return useContext(Account)
}
