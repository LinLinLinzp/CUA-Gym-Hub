import { createContext, useContext, useState } from 'react'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'

const Store = createContext(null)
const app = 'delta_mock'

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)

  function commit(action) {
    return withSessionWrite(app, async () => {
      try {
        const snapshot = await readCurrentState(state)
        const result = action(snapshot)
        if (result.error) {
          setState(snapshot)
          return result
        }
        await saveAcknowledged(app, result.state)
        setState(result.state)
        return result
      } catch {
        return { error: 'Your changes could not be saved. Try confirming again.' }
      }
    })
  }

  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
