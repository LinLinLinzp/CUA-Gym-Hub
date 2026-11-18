import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, loadState, saveState } from './utils/dataManager.js'

const APP = 'square_dashboard_mock'
const Store = createContext(null)
const Feedback = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [notice, setNotice] = useState(null)
  const latest = useRef(null)

  useEffect(() => {
    const currentKey = APP + ':current:' + (getSessionId() || '_default')
    const receive = (next) => {
      latest.current = next
      setState(next)
    }
    const sync = (event) => {
      if (event.key === currentKey && event.newValue) receive(JSON.parse(event.newValue))
    }
    window.addEventListener('storage', sync)
    loadState(APP, createInitialData).then(receive)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function commit(action) {
    const result = action(latest.current)
    if (!result.state) return result
    latest.current = result.state
    setState(result.state)
    saveState(APP, result.state)
    setNotice({ id: result.id, message: result.message })
    return result
  }

  if (!state) return <main className="loading" role="status">Loading dashboard…</main>
  return <Store.Provider value={{ state, commit }}>
    <Feedback.Provider value={notice}>
      {children}
      <span className="visually-hidden" role="status">{notice?.message}</span>
    </Feedback.Provider>
  </Store.Provider>
}

export const useStore = () => useContext(Store)
export const useNotice = () => useContext(Feedback)
