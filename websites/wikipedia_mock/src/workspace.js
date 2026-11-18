import { createContext, createElement, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'wikipedia_mock'
const Workspace = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const current = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  function commit(change) {
    const next = change(current.current)
    if (next === current.current) return false
    current.current = next
    saveState(APP, next)
    setState(next)
    return true
  }

  return createElement(Workspace.Provider, { value: { state, commit, notice, setNotice } }, children)
}

export function useWorkspace() {
  return useContext(Workspace)
}
