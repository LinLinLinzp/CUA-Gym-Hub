import { createContext, useContext, useRef, useState } from 'react'
import { mutate } from './actions.js'
import { saveState } from './utils/dataManager.js'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState('')
  const latest = useRef(initialState)

  function commit(command, data) {
    const result = mutate(latest.current, command, data)
    saveState('brex', result.state)
    latest.current = result.state
    setState(result.state)
    return result.id
  }

  return <WorkspaceContext.Provider value={{ state, latest, commit, setNotice }}>
    {children}
    <div className="notification-region" role="status">{notice && <div className="notification">
      <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
    </div>}</div>
  </WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)
