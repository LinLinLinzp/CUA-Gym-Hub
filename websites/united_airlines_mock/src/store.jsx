import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'united-airlines'
const Store = createContext(null)

export function StoreProvider({ initial, children }) {
  const current = useRef(initial)
  const [world, setWorld] = useState(initial)

  function commit(mutation) {
    const result = mutation(current.current)
    if (!result.world) return result
    saveState(APP, result.world)
    current.current = result.world
    setWorld(result.world)
    return result
  }

  return <Store.Provider value={{ world, commit }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
