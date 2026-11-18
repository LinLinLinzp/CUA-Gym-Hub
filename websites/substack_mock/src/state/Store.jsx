import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { loadState, saveState } from '../utils/dataManager.js'

const Store = createContext(null)
const app = 'substack'

export const useStore = () => useContext(Store)
export const nameOf = (state, id) => state.users.find(user => user.id === id)?.name || 'Unknown author'

export function StateRoot({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const current = useRef(null)
  useEffect(() => {
    let mounted = true
    async function boot() {
      const loaded = await loadState(app, createInitialData)
      if (!mounted) return
      current.current = loaded
      setState(loaded)
    }
    boot().catch(() => { if (mounted) setError(true) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 4200)
    return () => clearTimeout(id)
  }, [notice])
  function commit(transaction, message) {
    const previous = current.current
    const next = transaction(previous)
    if (!next || next === previous) return null
    saveState(app, next)
    current.current = next
    setState(next)
    if (message) setNotice(typeof message === 'function' ? message(next) : message)
    return next
  }
  if (error) return <main className="startup"><h1>Could not load the workspace</h1><button className="button" onClick={() => window.location.reload()}>Reload</button></main>
  if (!state) return <main className="startup" role="status">Loading Substack…</main>
  return <Store.Provider value={{ state, commit, setNotice }}>
    {children}
    <div className={notice ? 'toast' : 'visually-hidden'} role="status">
      {notice && <><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></>}
    </div>
  </Store.Provider>
}
