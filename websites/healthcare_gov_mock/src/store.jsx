import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'

const Store = createContext(null)
export const useStore = () => useContext(Store)

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const latest = useRef(initial)

  // A transaction computes its result against the current snapshot before any render.
  function commit(change) {
    const { state: next, ...result } = change(latest.current)
    if (next && next !== latest.current) {
      latest.current = next
      setState(next)
      saveState('healthcare_gov_mock', next)
    }
    return result
  }

  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}
