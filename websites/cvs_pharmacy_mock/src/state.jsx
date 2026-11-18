import { createContext, useContext, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'

const appId = 'cvs_pharmacy_mock'
const PharmacyContext = createContext(null)

export const loadAccount = () => loadState(appId, createInitialData)

export function PharmacyProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function commit(action) {
    const { next, ...result } = action(current.current)
    if (next) {
      saveState(appId, next)
      current.current = next
      setState(next)
    }
    return result
  }

  return <PharmacyContext.Provider value={{ state, commit }}>{children}</PharmacyContext.Provider>
}

export const usePharmacy = () => useContext(PharmacyContext)
