import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'sap_concur'
const Workspace = createContext(null)

export function WorkspaceProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const latest = useRef(initial)
  function commit(command) {
    const current = latest.current
    const next = command(current)
    if (current === next) return false
    latest.current = next
    setState(next)
    saveState(APP, next)
    return true
  }
  return <Workspace.Provider value={{ state, commit }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
