import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'
import { applyAction } from './actions'

export const APP = 'hugging-face'
const Workspace = createContext(null)

export function WorkspaceProvider({ initial, children }) {
  const latest = useRef(initial)
  const [state, setState] = useState(initial)
  const [notice, setNotice] = useState(null)
  function dispatch(action, payload, message) {
    const result = applyAction(latest.current, action, payload)
    if (result.state) {
      latest.current = result.state
      saveState(APP, result.state)
      setState(result.state)
      setNotice({ id: crypto.randomUUID(), message })
    }
    return result
  }
  return <Workspace.Provider value={{ state, dispatch, notice }}>{children}</Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
