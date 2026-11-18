import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId } from './utils/dataManager.js'
import { loadInitialState } from './utils/loadInitialState.js'
import { readCurrentState, saveAcknowledged, withSessionWrite } from './utils/harborPersistence.js'

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
    loadInitialState(APP, createInitialData).then(receive)
    return () => window.removeEventListener('storage', sync)
  }, [])

  async function commit(action) {
    try {
      return await withSessionWrite(APP, async () => {
        const result = action(await readCurrentState(latest.current))
        if (!result.state) return result
        await saveAcknowledged(APP, result.state)
        latest.current = result.state
        setState(result.state)
        setNotice({ id: result.id, message: result.message })
        return result
      })
    } catch (error) {
      return { error: error.message || 'Could not save this change. Try again.' }
    }
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
