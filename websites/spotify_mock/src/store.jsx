import { createContext, useContext, useRef, useState } from 'react'
import { applyAction } from './data/actions.js'
import { saveState } from './utils/dataManager.js'

const StateContext = createContext(null)

export function StateProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const latest = useRef(initialState)
  const [notice, setNotice] = useState(null)

  function announce(message) {
    setNotice((previous) => ({ message, version: (previous?.version || 0) + 1 }))
  }

  function dispatch(action, message) {
    const next = applyAction(latest.current, action)
    if (!next) return false
    latest.current = next
    saveState('spotify', next)
    setState(next)
    if (message) announce(message)
    return true
  }

  return (
    <StateContext.Provider value={{ state, dispatch, announce }}>
      {children}
      <div className="feedback" role="status">
        {notice && <div key={notice.version} className="notice">{notice.message}</div>}
      </div>
    </StateContext.Provider>
  )
}
export const useAccount = () => useContext(StateContext)

