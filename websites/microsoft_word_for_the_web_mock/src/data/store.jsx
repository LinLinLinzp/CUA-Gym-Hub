import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSessionId, loadState, mergeWithDefaults, saveState, withSid } from '../utils/dataManager.js'
import { createInitialData } from './seed.js'

const APP = 'microsoft_word_for_the_web_mock'
const Store = createContext(null)

function currentKey() {
  return `${APP}:current:${getSessionId() || '_default'}`
}

export async function loadWorkspace() {
  const cached = localStorage.getItem(currentKey())
  const state = await loadState(APP, createInitialData)
  if (!cached) return state

  // A link or document can be changed from a separate browser using the same session.
  try {
    const response = await fetch(withSid('/state'), { cache: 'no-store' })
    if (response.ok) {
      const { stored_state: server, has_custom_state: exists } = await response.json()
      if (exists && server && typeof server === 'object') return mergeWithDefaults(createInitialData(), server)
    }
  } catch { /* Use the loaded cache if the server is unreachable. */ }
  return state
}

export function StoreProvider({ initialState, children }) {
  const [state, setState] = useState(initialState)
  const current = useRef(initialState)
  const commit = useCallback((update) => {
    const next = update(current.current)
    if (next === current.current) return
    current.current = next
    setState(next)
    saveState(APP, next)
  }, [])

  useEffect(() => {
    const key = currentKey()
    function sync(event) {
      if (event.key !== key || !event.newValue) return
      current.current = JSON.parse(event.newValue)
      setState(current.current)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export function useWorkspace() {
  return useContext(Store)
}
