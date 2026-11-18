import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

const WorkspaceContext = createContext(null)
export const APP = 'marketo'

export function WorkspaceProvider({ initialState, children }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(timeout)
  }, [notice])

  function commit(mutate, message) {
    const previous = current.current
    const next = mutate(previous)
    if (next === previous) return false
    current.current = next
    setState(next)
    saveState(APP, next)
    setNotice({ message })
    return true
  }

  return <WorkspaceContext.Provider value={{ state, commit, notice, dismiss: () => setNotice(null) }}>
    {children}
  </WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)

