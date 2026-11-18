import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'databricks'
const WorkspaceState = createContext()

export function Store({ initialState, children }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  function apply(action) {
    const previous = current.current
    const next = action(previous, {
      actorId: previous.currentUser?.id ?? 'usr-maya',
      createdAt: new Date().toISOString(),
    })
    if (next === previous) return
    current.current = next
    setState(next)
    saveState(APP, next)
  }
  return <WorkspaceState.Provider value={{ state, apply }}>{children}</WorkspaceState.Provider>
}

export function useWorkspace() {
  return useContext(WorkspaceState)
}
