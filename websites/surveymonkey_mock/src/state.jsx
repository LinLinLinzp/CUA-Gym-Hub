import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSessionId, saveState } from './utils/dataManager.js'

export const APP = 'surveymonkey'
const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  // Match the current-state key written by the Harbor data manager.
  const [storageKey] = useState(() => APP + ':current:' + (getSessionId() || '_default'))
  const latest = useRef(initialState)
  const serialized = useRef(JSON.stringify(initialState))

  function syncStorage() {
    const saved = localStorage.getItem(storageKey)
    if (!saved || saved === serialized.current) return
    latest.current = JSON.parse(saved)
    serialized.current = saved
    setState(latest.current)
  }

  useEffect(() => {
    const receive = event => {
      if (event.storageArea === localStorage && event.key === storageKey) syncStorage()
    }
    window.addEventListener('storage', receive)
    return () => window.removeEventListener('storage', receive)
  }, [storageKey])

  function change(update) {
    syncStorage()
    const next = update(latest.current)
    if (!next || next === latest.current) return false
    latest.current = next
    setState(next)
    saveState(APP, next)
    serialized.current = localStorage.getItem(storageKey)
    return true
  }

  return <WorkspaceContext.Provider value={{ state, change }}>{children}</WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)
