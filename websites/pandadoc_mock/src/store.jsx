import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createInitialData } from './data/seed.js'
import { getSessionId, mergeWithDefaults, saveState } from './utils/dataManager.js'
import { loadInitialState } from './utils/loadInitialState.js'
import { items } from './pricing.js'

const APP = 'pandadoc_mock'
const Store = createContext(null)
let boot

async function readState() {
  const sid = getSessionId()
  const response = await fetch(sid ? '/state?sid=' + encodeURIComponent(sid) : '/state', {
    cache: 'no-store', signal: AbortSignal.timeout(3000),
  })
  if (!response.ok) throw new Error('The workspace could not be reached. Try again.')
  const data = await response.json()
  return data.has_custom_state ? data.stored_state : null
}

async function loadWorkspace() {
  const sid = getSessionId()
  const loadedKey = APP + ':loaded:' + (sid || '_default')
  const currentKey = APP + ':current:' + (sid || '_default')
  try {
    const current = await readState()
    if (current) {
      const merged = mergeWithDefaults(createInitialData(), current)
      // An already initialized workspace must never send another baseline snapshot.
      if (localStorage.getItem(loadedKey) || JSON.stringify(merged) === JSON.stringify(current)) {
        localStorage.setItem(currentKey, JSON.stringify(merged))
        localStorage.setItem(loadedKey, '1')
        return merged
      }
    }
  } catch {
    // The template can recover the previous on-device account if Harbor is unavailable.
  }
  return loadInitialState(APP, createInitialData)
}

async function confirm(eventId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await readState()
    if (items(current?.activity).some(event => event.id === eventId)) return current
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('The workspace could not confirm this change. Refresh or try again.')
}

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const current = useRef(null)
  const queue = useRef(Promise.resolve())

  function display(next) {
    current.current = next
    setState(next)
  }

  useEffect(() => {
    boot ??= loadWorkspace()
    boot.then(display, () => setLoadError(true))
  }, [])

  function commit(mutate) {
    async function apply() {
      const persisted = await readState()
      const previous = persisted ? mergeWithDefaults(current.current, persisted) : current.current
      let next
      try {
        next = mutate(previous)
      } catch (error) {
        if (JSON.stringify(previous) !== JSON.stringify(current.current)) display(previous)
        throw error
      }
      saveState(APP, next)
      const eventId = next.activity.at(-1).id
      display(await confirm(eventId))
      return next
    }

    const execute = () => navigator.locks
      ? navigator.locks.request(APP + ':' + (getSessionId() || '_default'), apply)
      : apply()
    const pending = queue.current.then(execute)
    queue.current = pending.catch(() => {})
    return pending
  }

  if (loadError) return <main className="loading"><p>The workspace could not load.</p><button onClick={() => window.location.reload()}>Retry</button></main>
  if (!state) return <main className="loading" role="status">Loading workspace…</main>
  return <Store.Provider value={{ state, commit }}>{children}</Store.Provider>
}

export const useWorkspace = () => useContext(Store)
