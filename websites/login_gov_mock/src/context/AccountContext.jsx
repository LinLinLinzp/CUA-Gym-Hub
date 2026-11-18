import { createContext, useContext, useRef, useState } from 'react'
import { readCurrentState, saveAcknowledged, withSessionWrite } from '../utils/stateWrites.js'

export const APP = 'login_gov_mock'
const AccountContext = createContext(null)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const current = useRef(initialState)

  function commit(change, message) {
    return withSessionWrite(APP, async () => {
      try {
        const snapshot = await readCurrentState(current.current)
        const next = change(snapshot)
        if (!next) return false
        await saveAcknowledged(APP, next)
        current.current = next
        setState(next)
        if (message) setNotice({ message })
        return true
      } catch {
        setNotice({ message: 'Your change could not be saved. Try again.' })
        return false
      }
    })
  }

  return (
    <AccountContext.Provider value={{ state, commit, notice, clearNotice: () => setNotice(null) }}>
      {children}
    </AccountContext.Provider>
  )
}

export const useAccount = () => useContext(AccountContext)
