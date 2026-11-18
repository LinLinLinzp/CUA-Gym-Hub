import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { getSessionId, loadState, saveState } from '../utils/dataManager.js'
import { signedIn } from '../utils/model.js'

const APP = 'bitbucket_mock'
const Store = createContext(null)
export const useStore = () => useContext(Store)

export function AppProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const latest = useRef(null)

  useEffect(() => {
    let active = true
    const key = `${APP}:current:${getSessionId() || '_default'}`
    function install(value) {
      latest.current = value
      setState(value)
    }
    function sync(event) {
      if (event.key === key && event.newValue) install(JSON.parse(event.newValue))
    }
    loadState(APP, createInitialData).then(value => {
      if (!active) return
      install(value)
      window.addEventListener('storage', sync)
    }).catch(() => {
      if (active) setError('The workspace could not be loaded. Reload the page to try again.')
    })
    return () => {
      active = false
      window.removeEventListener('storage', sync)
    }
  }, [])

  const transact = useCallback((mutation, input) => {
    const current = latest.current
    const actor = signedIn(current)
    if (!actor) return { error: 'A signed-in workspace member is required to make changes.' }
    try {
      const { state: next, result } = mutation(current, input, { actor: actor.id, now: new Date().toISOString() })
      if (next === current) return { result }
      saveState(APP, next)
      latest.current = next
      setState(next)
      return { result }
    } catch (failure) {
      return { error: failure.message }
    }
  }, [])

  if (!state) return <main className="boot" role={error ? 'alert' : 'status'}>{error || 'Loading workspace…'}</main>
  return <Store.Provider value={{ state, user: signedIn(state), transact }}>{children}</Store.Provider>
}
