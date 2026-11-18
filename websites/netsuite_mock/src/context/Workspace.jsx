import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'

const StoreContext = createContext(null)
const ToastContext = createContext(null)
const ThemeContext = createContext('workspace')
const pendingLoads = new Map()

function loadWorkspace(sid) {
  if (!pendingLoads.has(sid)) {
    const request = loadState('netsuite', createInitialData).finally(() => pendingLoads.delete(sid))
    pendingLoads.set(sid, request)
  }
  return pendingLoads.get(sid)
}

function Store({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const stateRef = useRef(null)
  const committing = useRef(false)

  useEffect(() => {
    let active = true
    loadWorkspace(getSessionId()).then((loaded) => {
      if (!active) return
      stateRef.current = loaded
      setState(loaded)
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  function commit(mutate) {
    if (committing.current) return null
    committing.current = true
    try {
      const current = stateRef.current
      const result = mutate(current)
      if (result.state !== current) {
        saveState('netsuite', result.state)
        stateRef.current = result.state
        setState(result.state)
      }
      return result
    } finally {
      committing.current = false
    }
  }

  if (error) return <main className="boot" role="alert">The workspace could not load. <button onClick={() => window.location.reload()}>Reload</button></main>
  if (!state) return <main className="boot" role="status">Loading workspace…</main>
  return <StoreContext.Provider value={{ state, commit }}>{children}</StoreContext.Provider>
}

export function Workspace({ children }) {
  const [toast, setToast] = useState('')
  return (
    <ThemeContext.Provider value="workspace">
      <ToastContext.Provider value={setToast}>
        <Store>{children}</Store>
        {toast && <div className="toast" role="status"><span>{toast}</span><button aria-label="Dismiss confirmation" onClick={() => setToast('')}>×</button></div>}
      </ToastContext.Provider>
    </ThemeContext.Provider>
  )
}

export const useWorkspace = () => useContext(StoreContext)
export const useToast = () => useContext(ToastContext)
export const useTheme = () => useContext(ThemeContext)
