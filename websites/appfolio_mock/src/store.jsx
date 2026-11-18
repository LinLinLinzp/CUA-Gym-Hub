import { createContext, useContext, useRef, useState } from 'react'
import { saveState } from './utils/dataManager.js'

export const APP = 'appfolio'
const Store = createContext(null)

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const [notice, setNotice] = useState(null)
  const current = useRef(initialState)

  function commit(update) {
    const previous = current.current
    const audit = { at: new Date().toISOString(), actor: previous.account?.id || 'staff-001' }
    const { state: next, record, message, path } = update(previous, audit)
    current.current = next
    saveState(APP, next)
    setState(next)
    setNotice({ message, path })
    return record
  }

  return <Store.Provider value={{ state, commit, notice, dismiss: () => setNotice(null) }}>{children}</Store.Provider>
}

export function useWorkspace() {
  return useContext(Store)
}
