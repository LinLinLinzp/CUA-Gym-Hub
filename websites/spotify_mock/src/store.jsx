import { createContext, useContext, useRef, useState } from 'react'
import { applyAction } from './data/actions.js'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'

const StateContext = createContext(null)

export function StateProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const latest = useRef(initialState)
  const [notice, setNotice] = useState(null)

  function announce(message) {
    setNotice((previous) => ({ message, version: (previous?.version || 0) + 1 }))
  }

  async function dispatch(action, message) {
    try {
      return await withSessionWrite('spotify', async () => {
        const current = await readCurrentState(latest.current)
        const next = applyAction(current, action)
        if (!next) return false
        await saveAcknowledged('spotify', next)
        latest.current = next
        setState(next)
        if (message) announce(message)
        return true
      })
    } catch (error) {
      announce(error.message || 'Could not save this change. Try again.')
      return false
    }
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

