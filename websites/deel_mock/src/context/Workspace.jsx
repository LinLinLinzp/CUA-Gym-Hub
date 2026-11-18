import { createContext, useContext, useEffect, useState } from 'react'
import { getSessionId, loadState, mergeWithDefaults, saveState, withSid } from '../utils/dataManager.js'
import { createInitialData } from '../data/seed.js'
import { list, newId } from '../data/model.js'

const Workspace = createContext(null)
const app = 'deel'

function withSessionLock(task) {
  const name = app + ':state:' + (getSessionId() || '_default')
  return navigator.locks ? navigator.locks.request(name, task) : task()
}

async function readStoredState(path, signal) {
  const response = await fetch(path, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Could not read workspace state')
  return (await response.json()).stored_state
}

async function waitForSave(path, eventId) {
  // The shared Harbor client sends its POST without returning a promise.
  // Hold the lock until the persisted activity confirms the write.
  const signal = AbortSignal.timeout(4000)
  while (!signal.aborted) {
    const stored = await readStoredState(path, signal)
    if (list(stored?.activity).some(event => event.id === eventId)) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Workspace save could not be confirmed')
}

export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    withSessionLock(() => loadState(app, createInitialData)).then(initial => {
      if (mounted) setState(initial)
    })
    return () => { mounted = false }
  }, [])

  function commit(apply) {
    const path = withSid('/state')
    return withSessionLock(async () => {
      const stored = await readStoredState(path, AbortSignal.timeout(4000))
      const previous = stored ? mergeWithDefaults(createInitialData(), stored) : state
      const actor = previous.currentUser?.id || 'usr-jordan'
      const at = new Date().toISOString()
      const result = apply(previous, { actor, at })
      if (result.error) {
        setState(previous)
        return result
      }
      const { changes, event, id, message: announcement } = result
      const eventId = newId('evt')
      const next = {
        ...previous, ...changes,
        activity: [...list(previous.activity), { ...event, id: eventId, actorId: actor, createdAt: at }],
      }
      saveState(app, next)
      await waitForSave(path, eventId)
      setState(next)
      setMessage(announcement)
      return { id }
    }).catch(() => ({ error: 'Could not confirm the workspace change. Check the record before retrying.' }))
  }

  return <Workspace.Provider value={{ state, commit }}>
    <div className="announce" role="status" aria-atomic="true">{message}</div>
    {state ? children : <main className="container loading" aria-busy="true">Loading workspace…</main>}
  </Workspace.Provider>
}

export const useWorkspace = () => useContext(Workspace)
