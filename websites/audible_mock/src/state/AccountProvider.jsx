import { createContext, useContext, useRef, useState } from 'react'
import { readCurrentState, saveAcknowledged, withSessionWrite } from '../utils/harborPersistence.js'
import { applyAction } from './actions.js'

const AccountContext = createContext(null)
export const APP = 'audible'

export function AccountProvider({ initialState, children }) {
  const latest = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  async function act(action) {
    try {
      return await withSessionWrite(APP, async () => {
        const result = applyAction(await readCurrentState(latest.current), action, new Date())
        if (result.state) {
          await saveAcknowledged(APP, result.state)
          latest.current = result.state
          setState(result.state)
        }
        setNotice(result.notice)
        return Boolean(result.state)
      })
    } catch (error) {
      setNotice({ error: true, message: error.message || 'The change could not be saved.' })
      return false
    }
  }

  return (
    <AccountContext.Provider value={{ state, notice, setNotice, act }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
