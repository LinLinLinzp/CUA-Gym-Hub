import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'bill_com_mock'
const StateContext = createContext(null)

export function Store({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)

  function transact(operation, ...args) {
    const result = operation(current.current, ...args)
    if (result.state) {
      current.current = result.state
      saveState(APP, result.state)
      setState(result.state)
    }
    return result
  }

  return <StateContext.Provider value={{ state, transact }}>{children}</StateContext.Provider>
}

export function useStore() {
  return useContext(StateContext)
}
