import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from '../data/seed.js'
import { loadState, saveState } from '../utils/dataManager.js'
import { actionContext } from '../data/model.js'

const APP = 'walmart'
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(false)
  const current = useRef(null)

  useEffect(() => {
    loadState(APP, createInitialData).then(next => {
      current.current = next
      setState(next)
    }).catch(() => setError(true))
  }, [])

  function commit(change, input) {
    const world = current.current
    try {
      const result = change(world, input, actionContext(world))
      if (result.state) {
        saveState(APP, result.state)
        current.current = result.state
        setState(result.state)
      }
      return result
    } catch (exception) {
      console.error(exception)
      return { error: 'Your changes could not be saved. Please try again.' }
    }
  }

  if (error) return <main className="frame loading"><p role="alert">We couldn’t load your shopping session.</p><button className="button secondary" onClick={() => window.location.reload()}>Reload</button></main>
  if (!state) return <main className="frame loading" role="status">Loading…</main>
  return <StoreContext.Provider value={{ state, commit }}>{children}</StoreContext.Provider>
}

export function useStore() {
  return useContext(StoreContext)
}
