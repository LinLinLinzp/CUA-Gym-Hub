import { createContext, useContext, useState } from 'react'
import { getSessionId, saveState } from './utils/dataManager.js'

const Store = createContext(null)
const app = 'delta_mock'

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)

  function commit(action) {
    const sid = getSessionId() || '_default'
    const apply = () => {
      // Consult the template's cache so another tab's confirmation can invalidate this review.
      const cached = localStorage.getItem(`${app}:current:${sid}`)
      const snapshot = cached ? JSON.parse(cached) : state
      const result = action(snapshot)
      if (result.error) {
        setState(snapshot)
        return result
      }
      try {
        saveState(app, result.state)
      } catch {
        return { error: 'Your changes could not be saved. Try confirming again.' }
      }
      setState(result.state)
      return result
    }
    return navigator.locks ? navigator.locks.request(`${app}:${sid}`, apply) : apply()
  }

  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
