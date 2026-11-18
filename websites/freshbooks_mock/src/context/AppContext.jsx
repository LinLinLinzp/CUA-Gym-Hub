import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from '../utils/dataManager.js'

export const APP = 'freshbooks'
const AppContext = createContext(null)

export function AppProvider({ initial, children }) {
  const current = useRef(initial)
  const [state, setState] = useState(initial)
  const [toast, setToast] = useState('')
  const toastTimeout = useRef(null)
  function notify(message) {
    clearTimeout(toastTimeout.current)
    setToast(message)
    toastTimeout.current = setTimeout(() => setToast(''), 4200)
  }
  function commit(command, message) {
    const next = command(current.current)
    if (next !== current.current) {
      current.current = next
      saveState(APP, next)
      setState(next)
      if (message) notify(message)
    }
    return next
  }
  return <AppContext.Provider value={{ state, commit, notify }}>
    {children}
    <div className="toast-zone" role="status" aria-live="polite">
      {toast && <div className="toast">{toast}<button type="button" onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  </AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
