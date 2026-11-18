import { createContext, useContext, useRef, useState } from 'react'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'

const AccountContext = createContext(null)
export const useAccount = () => useContext(AccountContext)

export function AccountProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const latest = useRef(initialState)

  function commit(mutate) {
    return withSessionWrite('venmo', async () => {
      const next = mutate(await readCurrentState(latest.current))
      await saveAcknowledged('venmo', next)
      latest.current = next
      setState(next)
    })
  }

  return <AccountContext.Provider value={{ state, commit }}>{children}</AccountContext.Provider>
}
