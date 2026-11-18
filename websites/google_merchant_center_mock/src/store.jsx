import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'

const APP = 'google-merchant-center'
const Store = createContext(null)

export { rows, active } from './data/records.js'
export const useStore = () => useContext(Store)

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const latest = useRef(null)

  useEffect(() => {
    loadState(APP, createInitialData).then((next) => {
      latest.current = next
      setState(next)
    }).catch(() => setError(true))
  }, [])

  function commit(mutation) {
    const current = latest.current
    const meta = { actor: current.account?.actorId || 'usr-maya', createdAt: new Date().toISOString() }
    const result = mutation(current, meta)
    if (result.state && result.state !== current) {
      saveState(APP, result.state)
      latest.current = result.state
      setState(result.state)
    }
    return result
  }

  if (error) return <main className="loading"><p>Could not load the workspace.</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!state) return <main className="loading" role="status">Loading workspace…</main>
  return <Store.Provider value={{ state, commit, setNotice }}>
    {children}
    {notice && <div className="notice"><span role="status">{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button></div>}
  </Store.Provider>
}

