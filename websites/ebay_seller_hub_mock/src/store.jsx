import React, { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'ebay-seller-hub'
const StoreContext = createContext(null)

export function Store({ initialState, children }) {
  const latest = useRef(initialState)
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)

  function commit(action, message) {
    try {
      const previous = latest.current
      const next = action(previous)
      if (previous === next) return { error: 'No changes to save.' }
      saveState(APP, next)
      latest.current = next
      setState(next)
      setNotice(message)
      return { ok: true }
    } catch (error) {
      return { error: error.message }
    }
  }

  return <StoreContext.Provider value={{ state, commit, notice, setNotice }}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
