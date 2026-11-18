import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager'
import { byId } from './utils/model'

export const APP = 'zapier_mock'
const Store = createContext(null)

export function WorkspaceProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [notice, setNotice] = useState('')
  function dispatch(change, message) {
    const next = change(current.current)
    if (!next || next === current.current) return false
    current.current = next
    setState(next)
    saveState(APP, next)
    if (message) setNotice(message)
    return true
  }
  return <Store.Provider value={{ state, dispatch, notice, setNotice }}>{children}</Store.Provider>
}

export const useWorkspace = () => useContext(Store)
export const currentUser = (state) => byId(state.users, state.workspace?.currentUserId)
