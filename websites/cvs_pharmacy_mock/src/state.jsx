import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'
import { createContext, useContext, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadInitialState } from './utils/loadInitialState.js'

const appId = 'cvs_pharmacy_mock'
const PharmacyContext = createContext(null)

export const loadAccount = () => loadInitialState(appId, createInitialData)

export function PharmacyProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function commit(action) {
    return withSessionWrite(appId, async () => {
      try {
        const snapshot = await readCurrentState(current.current)
        const { next, ...result } = action(snapshot)
        if (next) {
          await saveAcknowledged(appId, next)
          current.current = next
          setState(next)
        }
        return result
      } catch {
        return { error: 'Your change could not be saved. Try again.' }
      }
    })
  }

  return <PharmacyContext.Provider value={{ state, commit }}>{children}</PharmacyContext.Provider>
}

export const usePharmacy = () => useContext(PharmacyContext)
