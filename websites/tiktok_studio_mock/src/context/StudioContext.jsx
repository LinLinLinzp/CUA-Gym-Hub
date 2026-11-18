import { createContext, useContext, useRef, useState } from 'react'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'
import { createInitialData } from '../data/seed.js'

const APP = 'tiktok_studio_mock'
const StudioContext = createContext(null)
const loads = new Map()

export function openSession(sid) {
  if (sid) sessionStorage.setItem('mock_sid', sid)
  const id = sid || getSessionId()
  if (!loads.has(id)) loads.set(id, loadState(APP, createInitialData))
  return loads.get(id)
}

export function StudioProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  const [notice, setNotice] = useState(null)

  function commit(update) {
    const next = update(current.current)
    if (next === current.current) return false
    saveState(APP, next)
    current.current = next
    setState(next)
    return true
  }

  return <StudioContext.Provider value={{ state, commit, notify: setNotice }}>
    {children}
    {notice && <div className="toast" role="status">
      <span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
    </div>}
  </StudioContext.Provider>
}

export const useStudio = () => useContext(StudioContext)
