import { createContext, useContext, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { loadState, saveState } from './utils/dataManager.js'

const APP = 'target'
const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)
export const boot = () => loadState(APP, createInitialData)

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function transact(change) {
    const result = change(current.current)
    if (result.state && result.state !== current.current) {
      current.current = result.state
      setState(result.state)
      saveState(APP, result.state)
    }
    return result
  }

  return <StoreContext.Provider value={{ state, transact }}>{children}</StoreContext.Provider>
}
