import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { saveState } from './utils/dataManager.js'
import { loadInitialState } from './utils/loadInitialState.js'

const APP = 'blackboard_mock'
const Store = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState('')
  const current = useRef(null)

  useEffect(() => {
    loadInitialState(APP, createInitialData).then((loaded) => {
      current.current = loaded
      setState(loaded)
    })
  }, [])

  function commit(change, message) {
    const previous = current.current
    const next = change(previous, {
      createdAt: new Date().toISOString(),
      actorId: previous.account.id,
    })
    if (previous === next) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    setNotice(message)
    return true
  }

  return <Store.Provider value={{ state, notice, setNotice, commit }}>{children}</Store.Provider>
}

export const useStore = () => useContext(Store)
