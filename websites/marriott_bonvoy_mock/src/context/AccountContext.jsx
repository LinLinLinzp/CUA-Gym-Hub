import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from '../utils/dataManager'

export const APP = 'marriott_bonvoy'
const AccountContext = createContext(null)

export function AccountProvider({ initial, children }) {
  const [data, setData] = useState(initial)
  const latest = useRef(initial)

  function commit(update) {
    const next = update(latest.current)
    if (!next || next === latest.current) return false
    latest.current = next
    setData(next)
    saveState(APP, next)
    return true
  }

  return <AccountContext.Provider value={{ data, commit }}>{children}</AccountContext.Provider>
}

export const useAccount = () => useContext(AccountContext)
