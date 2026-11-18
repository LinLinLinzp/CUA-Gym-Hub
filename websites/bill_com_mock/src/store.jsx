import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'
import { createContext, useContext, useRef, useState } from 'react'


export const APP = 'bill_com_mock'
const StateContext = createContext(null)

export function Store({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function transact(operation, ...args) {
    return withSessionWrite(APP, async () => {
      try {
        const snapshot = await readCurrentState(current.current)
        const result = operation(snapshot, ...args)
        if (result.state) {
          await saveAcknowledged(APP, result.state)
          current.current = result.state
          setState(result.state)
        }
        return result
      } catch {
        return { error: 'Your change could not be saved. Try again.' }
      }
    })
  }

  return <StateContext.Provider value={{ state, transact }}>{children}</StateContext.Provider>
}

export function useStore() {
  return useContext(StateContext)
}
